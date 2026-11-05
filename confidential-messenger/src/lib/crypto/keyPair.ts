import sodium from 'libsodium-wrappers';
import { KeyPair } from '@/types';

export async function generateX25519KeyPair(): Promise<KeyPair> {
  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function generateX25519KeyPairFromSeed(seed: Uint8Array): Promise<KeyPair> {
  await sodium.ready;
  const keyPair = sodium.crypto_box_seed_keypair(seed);
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

export async function computeSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_scalarmult(privateKey, publicKey);
}

export async function deriveKey(
  sharedSecret: Uint8Array,
  context: string = 'msg-key1',
  keyLength: number = 32
): Promise<Uint8Array> {
  await sodium.ready;
  if (new TextEncoder().encode(context).length !== 8) {
    throw new Error('Key derivation context must be exactly 8 bytes');
  }
  if (keyLength < 16 || keyLength > 64) {
    throw new Error('Derived key length must be between 16 and 64 bytes');
  }
  return sodium.crypto_kdf_derive_from_key(
    keyLength,
    0,
    context,
    sharedSecret
  );
}

export async function deriveKeyFromKeys(
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  context: string = 'msg-key1',
  keyLength: number = 32
): Promise<Uint8Array> {
  const sharedSecret = await computeSharedSecret(privateKey, publicKey);
  const derived = await deriveKey(sharedSecret, context, keyLength);
  sodium.memzero(sharedSecret);
  return derived;
}

export async function generateSeed(): Promise<Uint8Array> {
  await sodium.ready;
  return crypto.getRandomValues(new Uint8Array(sodium.crypto_box_SEEDBYTES));
}
