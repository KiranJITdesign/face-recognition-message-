import sodium from 'libsodium-wrappers';
import type { AttachmentType } from '@/types';
import { hashSha256, secureWipe, toBase64Url, trackSensitiveBuffer } from './utils';

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 64 * 1024;
const FILE_MAGIC = new Uint8Array([0x43, 0x46, 0x41, 0x54]);
const FORMAT_VERSION = 1;
const HEADER_PREFIX_SIZE = 7;

const VALID_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const VALID_TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv']);
const VALID_PDF_TYPES = new Set(['application/pdf']);

interface FileValidationResult {
  valid: boolean;
  type: AttachmentType | null;
  mimeType?: string;
  error?: string;
}

const SIGNATURES: Array<{
  type: AttachmentType;
  mimeType: string;
  offset: number;
  bytes: number[];
  secondary?: { offset: number; bytes: number[] };
}> = [
  { type: 'image', mimeType: 'image/png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'image', mimeType: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { type: 'image', mimeType: 'image/gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    type: 'image',
    mimeType: 'image/webp',
    offset: 0,
    bytes: [0x52, 0x49, 0x46, 0x46],
    secondary: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
  { type: 'pdf', mimeType: 'application/pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
];

export function getAttachmentTypeFromMime(mime: string): AttachmentType {
  if (VALID_IMAGE_TYPES.has(mime)) return 'image';
  if (VALID_PDF_TYPES.has(mime)) return 'pdf';
  if (VALID_TEXT_TYPES.has(mime)) return 'text';
  return 'other';
}

export function checkFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 50MB)`,
    };
  }
  return { valid: true };
}

export async function validateFileType(
  file: File,
  allowedTypes: AttachmentType[]
): Promise<FileValidationResult> {
  const sizeCheck = checkFileSize(file);
  if (!sizeCheck.valid) return { valid: false, type: null, error: sizeCheck.error };

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature = SIGNATURES.find(({ offset, bytes: expected, secondary }) =>
    expected.every((byte, index) => bytes[offset + index] === byte) &&
    (!secondary || secondary.bytes.every((byte, index) => bytes[secondary.offset + index] === byte))
  );
  secureWipe(bytes);
  const declaredType = getAttachmentTypeFromMime(file.type);
  if (signature) {
    if (declaredType !== 'other' && declaredType !== signature.type) {
      return { valid: false, type: null, error: 'File content does not match its declared type' };
    }
    return allowedTypes.includes(signature.type)
      ? { valid: true, type: signature.type, mimeType: signature.mimeType }
      : { valid: false, type: null, error: 'File type is not allowed' };
  }

  if ((declaredType === 'text' || declaredType === 'other') && allowedTypes.includes('text')) {
    const textBytes = new Uint8Array(await file.arrayBuffer());
    try {
      if (textBytes.includes(0)) throw new Error('Binary content is not allowed');
      new TextDecoder('utf-8', { fatal: true }).decode(textBytes);
      return {
        valid: true,
        type: 'text',
        mimeType: VALID_TEXT_TYPES.has(file.type) ? file.type : 'text/plain',
      };
    } catch {
      return { valid: false, type: null, error: 'Text attachment is not valid UTF-8' };
    } finally {
      secureWipe(textBytes);
    }
  }

  return { valid: false, type: null, error: 'File type not allowed or could not be verified' };
}

export async function computeFileHash(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return toBase64Url(await hashSha256(bytes));
  } finally {
    secureWipe(bytes);
  }
}

export async function generateFileKey(): Promise<Uint8Array> {
  await sodium.ready;
  return trackSensitiveBuffer(sodium.randombytes_buf(sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES));
}

export async function encryptFile(
  file: File,
  fileKey: Uint8Array
): Promise<{ encrypted: Uint8Array; hash: string }> {
  await sodium.ready;
  if (file.size > MAX_FILE_SIZE) throw new Error('File exceeds the 50MB limit');
  if (fileKey.length !== sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES) {
    throw new Error('Invalid file encryption key length');
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const { state, header: streamHeader } = sodium.crypto_secretstream_xchacha20poly1305_init_push(fileKey);
  const ciphertextChunks: Uint8Array[] = [];

  try {
    const hash = toBase64Url(await hashSha256(fileBytes));
    for (let offset = 0; offset < fileBytes.length; offset += CHUNK_SIZE) {
      const chunk = fileBytes.subarray(offset, Math.min(offset + CHUNK_SIZE, fileBytes.length));
      const isFinal = offset + chunk.length === fileBytes.length;
      ciphertextChunks.push(sodium.crypto_secretstream_xchacha20poly1305_push(
        state,
        chunk,
        null,
        isFinal ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE
      ));
    }

    if (fileBytes.length === 0) {
      ciphertextChunks.push(sodium.crypto_secretstream_xchacha20poly1305_push(
        state,
        new Uint8Array(0),
        null,
        sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
      ));
    }

    const encryptedLength = HEADER_PREFIX_SIZE + streamHeader.length +
      ciphertextChunks.reduce((total, chunk) => total + 4 + chunk.length, 0);
    const encrypted = new Uint8Array(encryptedLength);
    encrypted.set(FILE_MAGIC);
    encrypted[4] = FORMAT_VERSION;
    new DataView(encrypted.buffer).setUint16(5, streamHeader.length);
    encrypted.set(streamHeader, HEADER_PREFIX_SIZE);

    let outputOffset = HEADER_PREFIX_SIZE + streamHeader.length;
    for (const chunk of ciphertextChunks) {
      new DataView(encrypted.buffer).setUint32(outputOffset, chunk.length);
      outputOffset += 4;
      encrypted.set(chunk, outputOffset);
      outputOffset += chunk.length;
    }

    return { encrypted, hash };
  } finally {
    secureWipe(fileBytes);
    ciphertextChunks.forEach(secureWipe);
  }
}

export async function decryptFile(
  encryptedData: Uint8Array,
  fileKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  if (fileKey.length !== sodium.crypto_secretstream_xchacha20poly1305_KEYBYTES) {
    throw new Error('Invalid file encryption key length');
  }
  if (encryptedData.length > MAX_FILE_SIZE + Math.ceil(MAX_FILE_SIZE / CHUNK_SIZE) * 21 + 128) {
    throw new Error('Encrypted attachment exceeds the supported size limit');
  }
  if (encryptedData.length < HEADER_PREFIX_SIZE ||
      !FILE_MAGIC.every((byte, index) => encryptedData[index] === byte) ||
      encryptedData[4] !== FORMAT_VERSION) {
    throw new Error('Unsupported or malformed encrypted attachment');
  }

  const headerLength = new DataView(encryptedData.buffer, encryptedData.byteOffset, encryptedData.byteLength).getUint16(5);
  const expectedHeaderLength = sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  if (headerLength !== expectedHeaderLength || encryptedData.length < HEADER_PREFIX_SIZE + headerLength + 4) {
    throw new Error('Malformed encrypted attachment header');
  }

  const headerStart = HEADER_PREFIX_SIZE;
  const header = encryptedData.subarray(headerStart, headerStart + headerLength);
  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, fileKey);
  const plaintextChunks: Uint8Array[] = [];
  let offset = headerStart + headerLength;
  let totalPlaintextSize = 0;
  let receivedFinalTag = false;

  try {
    while (offset < encryptedData.length) {
      if (receivedFinalTag || encryptedData.length - offset < 4) {
        throw new Error('Malformed encrypted attachment framing');
      }
      const frameView = new DataView(encryptedData.buffer, encryptedData.byteOffset + offset, 4);
      const chunkLength = frameView.getUint32(0);
      offset += 4;
      if (chunkLength < sodium.crypto_secretstream_xchacha20poly1305_ABYTES ||
          chunkLength > CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES ||
          chunkLength > encryptedData.length - offset) {
        throw new Error('Malformed encrypted attachment chunk');
      }

      const pulled = sodium.crypto_secretstream_xchacha20poly1305_pull(
        state,
        encryptedData.subarray(offset, offset + chunkLength),
        null
      );
      if (pulled === null) throw new Error('Decryption failed: chunk authentication failed');
      offset += chunkLength;
      totalPlaintextSize += pulled.message.length;
      if (totalPlaintextSize > MAX_FILE_SIZE) {
        secureWipe(pulled.message);
        throw new Error('Decrypted attachment exceeds the 50MB limit');
      }
      plaintextChunks.push(pulled.message);
      receivedFinalTag = pulled.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL;
    }

    if (!receivedFinalTag) throw new Error('Encrypted attachment is missing its final authentication tag');
    const plaintext = new Uint8Array(totalPlaintextSize);
    let plaintextOffset = 0;
    for (const chunk of plaintextChunks) {
      plaintext.set(chunk, plaintextOffset);
      plaintextOffset += chunk.length;
    }
    return trackSensitiveBuffer(plaintext);
  } catch (error) {
    plaintextChunks.forEach(secureWipe);
    throw error;
  } finally {
    plaintextChunks.forEach(secureWipe);
  }
}

export async function encryptFileKey(
  fileKey: Uint8Array,
  wrappingKey: Uint8Array
): Promise<{ wrapped: Uint8Array; nonce: Uint8Array }> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  return { wrapped: sodium.crypto_secretbox_easy(fileKey, nonce, wrappingKey), nonce };
}

export async function decryptFileKey(
  wrapped: Uint8Array,
  nonce: Uint8Array,
  wrappingKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_secretbox_open_easy(wrapped, nonce, wrappingKey);
}
