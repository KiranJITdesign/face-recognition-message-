export interface User {
  id: string;
  email: string;
  name: string;
}

export type AttachmentType = 'image' | 'pdf' | 'text' | 'other';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface WrappedKey {
  wrapped: Uint8Array;
  nonce: Uint8Array;
  salt: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  senderPublicKey: Uint8Array;
}
