import sodium from 'libsodium-wrappers';
import { EncryptedMessage, KeyPair } from '@/types';
import { generateNonce, secureWipe } from './utils';

const NONCE_BYTES = 24;
const KEY_BYTES = 32;

export async function encryptMessage(
  plaintext: string,
  key: Uint8Array
): Promise<EncryptedMessage> {
  await sodium.ready;
  
  const encoded = new TextEncoder().encode(plaintext);
  const nonce = generateNonce(NONCE_BYTES);
  
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    encoded,
    null,
    null,
    nonce,
    key
  );
  
  secureWipe(encoded);
  
  return {
    ciphertext,
    nonce,
    senderPublicKey: new Uint8Array(0),
  };
}

export async function decryptMessage(
  encrypted: EncryptedMessage,
  key: Uint8Array
): Promise<string> {
  await sodium.ready;
  
  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    encrypted.ciphertext,
    null,
    encrypted.nonce,
    key
  );
  
  if (!plaintext) {
    throw new Error('Decryption failed: ciphertext verification failed');
  }
  
  const result = new TextDecoder().decode(plaintext);
  secureWipe(plaintext);
  return result;
}

export async function encryptForRecipient(
  plaintext: string,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: Uint8Array
): Promise<EncryptedMessage & { ephemeralPublicKey: Uint8Array }> {
  await sodium.ready;
  
  const ephemeralKeyPair = sodium.crypto_box_keypair();
  const sharedSecret = sodium.crypto_scalarmult(
    ephemeralKeyPair.privateKey,
    recipientPublicKey
  );
  const messageKey = sodium.crypto_kdf_derive_from_key(
    KEY_BYTES,
    0,
    'message',
    sharedSecret
  );
  
  const encrypted = await encryptMessage(plaintext, messageKey);
  encrypted.senderPublicKey = ephemeralKeyPair.publicKey;
  
  secureWipe(sharedSecret);
  secureWipe(messageKey);
  secureWipe(ephemeralKeyPair.privateKey);
  
  return { ...encrypted, ephemeralPublicKey: ephemeralKeyPair.publicKey };
}

export async function decryptFromSender(
  encrypted: EncryptedMessage & { ephemeralPublicKey?: Uint8Array },
  recipientPrivateKey: Uint8Array
): Promise<string> {
  await sodium.ready;
  
  const ephemeralPublicKey = encrypted.ephemeralPublicKey || encrypted.senderPublicKey;
  if (!ephemeralPublicKey || ephemeralPublicKey.length === 0) {
    throw new Error('No sender public key provided');
  }
  
  const sharedSecret = sodium.crypto_scalarmult(
    recipientPrivateKey,
    ephemeralPublicKey
  );
  const messageKey = sodium.crypto_kdf_derive_from_key(
    KEY_BYTES,
    0,
    'message',
    sharedSecret
  );
  
  const plaintext = await decryptMessage(encrypted, messageKey);
  
  secureWipe(sharedSecret);
  secureWipe(messageKey);
  
  return plaintext;
}

export function generateSymmetricKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_BYTES));
}
