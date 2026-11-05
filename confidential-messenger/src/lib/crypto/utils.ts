import sodium from 'libsodium-wrappers';

let sodiumReady: Promise<void> | null = null;
const sensitiveBuffers = new Set<Uint8Array>();

async function ensureSodium() {
  if (!sodiumReady) {
    sodiumReady = sodium.ready;
  }
  await sodiumReady;
}

export function toBase64Url(buffer: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < buffer.length; offset += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(base64url: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(base64url)) {
    throw new Error('Invalid base64url value');
  }
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function secureWipe(buffer: Uint8Array): void {
  buffer.fill(0);
  sensitiveBuffers.delete(buffer);
}

export function trackSensitiveBuffer<T extends Uint8Array>(buffer: T): T {
  sensitiveBuffers.add(buffer);
  return buffer;
}

export function wipeSensitiveBuffers(): void {
  for (const buffer of sensitiveBuffers) buffer.fill(0);
  sensitiveBuffers.clear();
}

export function generateNonce(size?: number): Uint8Array {
  const actualSize = size ?? 24;
  return sodium.randombytes_buf(actualSize);
}

export function generateSalt(size: number = 32): Uint8Array {
  return sodium.randombytes_buf(size);
}

export async function hashSha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

export async function hashSha512(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-512', data);
  return new Uint8Array(digest);
}

export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

export function uint8ArrayToArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteLength + arr.byteOffset);
}

export function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
