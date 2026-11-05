import { describe, expect, it } from 'vitest';
import {
  decryptFile,
  decryptFileKey,
  computeFileHash,
  encryptFile,
  encryptFileKey,
  generateFileKey,
  validateFileType,
} from './attachments';
import { deriveKey } from './keyPair';
import { secureWipe } from './utils';
import { unwrapPrivateKey, wrapPrivateKey } from './wrapping';

function asFile(bytes: Uint8Array, type = 'application/octet-stream'): File {
  return new Blob([bytes], { type }) as File;
}

describe('encrypted attachments', () => {
  it('round-trips an attachment that spans multiple stream chunks', async () => {
    const bytes = Uint8Array.from({ length: 180_123 }, (_, index) => index % 251);
    const file = asFile(bytes);
    const key = await generateFileKey();
    const { encrypted, hash } = await encryptFile(file, key);
    const decrypted = await decryptFile(encrypted, key);

    expect(decrypted).toEqual(bytes);
    expect(hash).toBe(await computeFileHash(file));
    secureWipe(decrypted);
    secureWipe(key);
  });

  it('round-trips empty files with an authenticated final chunk', async () => {
    const key = await generateFileKey();
    const { encrypted } = await encryptFile(asFile(new Uint8Array()), key);

    const decrypted = await decryptFile(encrypted, key);
    expect(decrypted).toHaveLength(0);
    secureWipe(decrypted);
    secureWipe(key);
  });

  it('rejects altered, truncated, and unsupported encrypted data', async () => {
    const key = await generateFileKey();
    const { encrypted } = await encryptFile(asFile(new TextEncoder().encode('private attachment')), key);
    const altered = encrypted.slice();
    altered[altered.length - 1] ^= 0x01;

    await expect(decryptFile(altered, key)).rejects.toThrow();
    await expect(decryptFile(encrypted.slice(0, -1), key)).rejects.toThrow();
    const unsupported = encrypted.slice();
    unsupported[4] = 2;
    await expect(decryptFile(unsupported, key)).rejects.toThrow(/Unsupported/);
    secureWipe(key);
  });

  it('rejects decryption with the wrong key', async () => {
    const key = await generateFileKey();
    const wrongKey = await generateFileKey();
    const { encrypted } = await encryptFile(asFile(new Uint8Array([1, 2, 3])), key);

    await expect(decryptFile(encrypted, wrongKey)).rejects.toThrow();
    secureWipe(key);
    secureWipe(wrongKey);
  });

  it('wraps file keys and rejects a different wrapping key', async () => {
    const fileKey = await generateFileKey();
    const wrappingKey = await generateFileKey();
    const wrongWrappingKey = await generateFileKey();
    const wrapped = await encryptFileKey(fileKey, wrappingKey);

    const decryptedKey = await decryptFileKey(wrapped.wrapped, wrapped.nonce, wrappingKey);
    expect(decryptedKey).toEqual(fileKey);
    secureWipe(decryptedKey);
    await expect(decryptFileKey(wrapped.wrapped, wrapped.nonce, wrongWrappingKey)).rejects.toThrow();
    secureWipe(fileKey);
    secureWipe(wrappingKey);
    secureWipe(wrongWrappingKey);
  });

  it('wraps private keys and requires valid KDF context values', async () => {
    const privateKey = new Uint8Array([9, 8, 7, 6]);
    const wrappingKey = await generateFileKey();
    const wrapped = await wrapPrivateKey(privateKey, wrappingKey);

    const unwrappedKey = await unwrapPrivateKey(wrapped, wrappingKey);
    expect(unwrappedKey).toEqual(privateKey);
    await expect(deriveKey(new Uint8Array(32), 'short')).rejects.toThrow(/exactly 8 bytes/);
    secureWipe(unwrappedKey);
    secureWipe(wrappingKey);
  });

  it('validates file content instead of trusting a spoofed MIME type', async () => {
    const spoofedImage = asFile(new TextEncoder().encode('this is not a png'), 'image/png');
    const result = await validateFileType(spoofedImage, ['image']);
    expect(result.valid).toBe(false);

    const pdf = asFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), 'application/pdf');
    expect(await validateFileType(pdf, ['pdf'])).toMatchObject({ valid: true, type: 'pdf' });

    const textWithUnknownMime = asFile(new TextEncoder().encode('plain text'), 'application/octet-stream');
    expect(await validateFileType(textWithUnknownMime, ['text'])).toMatchObject({
      valid: true,
      type: 'text',
      mimeType: 'text/plain',
    });

    const mismatchedPdf = asFile(new TextEncoder().encode('plain text'), 'application/pdf');
    expect((await validateFileType(mismatchedPdf, ['text'])).valid).toBe(false);
  });
});
