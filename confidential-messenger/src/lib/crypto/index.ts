export async function generateKeyPair() {
  return { publicKey: new Uint8Array(), privateKey: new Uint8Array() };
}
export function secureWipe(buffer: Uint8Array) {
  if (buffer) buffer.fill(0);
}
