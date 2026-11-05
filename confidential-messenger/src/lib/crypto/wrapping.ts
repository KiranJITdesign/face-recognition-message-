import sodium from 'libsodium-wrappers';
import { WrappedKey, KeyPair } from '@/types';
import { generateSalt, generateNonce, secureWipe, trackSensitiveBuffer } from './utils';
import { generateX25519KeyPair } from './keyPair';

export async function wrapPrivateKey(
  privateKey: Uint8Array,
  wrappingKey: Uint8Array,
  salt?: Uint8Array
): Promise<WrappedKey> {
  await sodium.ready;
  if (wrappingKey.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('Invalid wrapping key length');
  }
  
  const actualSalt = salt || generateSalt();
  const derivedKey = sodium.crypto_generichash(32, actualSalt, wrappingKey);
  try {
    const nonce = generateNonce(sodium.crypto_secretbox_NONCEBYTES);
    const wrapped = sodium.crypto_secretbox_easy(privateKey, nonce, derivedKey);
    return { wrapped, nonce, salt: actualSalt };
  } finally {
    secureWipe(derivedKey);
  }
}

export async function unwrapPrivateKey(
  wrappedKey: WrappedKey,
  wrappingKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  if (wrappingKey.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('Invalid wrapping key length');
  }
  
  const derivedKey = sodium.crypto_generichash(32, wrappedKey.salt, wrappingKey);
  try {
    const privateKey = sodium.crypto_secretbox_open_easy(
      wrappedKey.wrapped,
      wrappedKey.nonce,
      derivedKey
    );
    if (!privateKey) throw new Error('Failed to unwrap private key: decryption failed');
    return trackSensitiveBuffer(privateKey);
  } finally {
    secureWipe(derivedKey);
  }
}

export async function deriveWrappingKeyFromPRF(
  prfOutput: Uint8Array,
  context: string = 'vaultkey'
): Promise<Uint8Array> {
  await sodium.ready;
  if (prfOutput.length !== 32) throw new Error('PRF output must be 32 bytes');
  if (new TextEncoder().encode(context).length !== 8) {
    throw new Error('Key derivation context must be exactly 8 bytes');
  }
  return sodium.crypto_kdf_derive_from_key(
    32,
    0,
    context,
    prfOutput
  );
}

export async function generateWrappedKeyPair(
  wrappingKey: Uint8Array,
  salt?: Uint8Array
): Promise<{
  keyPair: KeyPair;
  wrappedKey: WrappedKey;
}> {
  const keyPair = await generateX25519KeyPair();
  const wrappedKey = await wrapPrivateKey(keyPair.privateKey, wrappingKey, salt);
  
  secureWipe(keyPair.privateKey);
  
  return { keyPair, wrappedKey };
}

export async function generateWrappingKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  if (salt.length !== sodium.crypto_pwhash_SALTBYTES) {
    throw new Error('Passphrase salt has an invalid length');
  }
  const encoded = new TextEncoder().encode(passphrase);
  try {
    return trackSensitiveBuffer(sodium.crypto_pwhash(
      32,
      encoded,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    ));
  } finally {
    secureWipe(encoded);
  }
}
