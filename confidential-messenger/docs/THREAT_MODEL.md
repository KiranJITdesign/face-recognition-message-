# Confidential Messenger threat model

## Scope and security goals

This prototype demonstrates browser-side encryption of attachment bytes and safe handling of short-lived client keys. Its goal is to prevent an untrusted file-storage service from reading an attachment when only the serialized encrypted bytes are available. It is not yet a complete end-to-end messaging product.

## Assets and data flow

- Attachment plaintext and file keys exist in browser memory during encryption and viewing.
- The attachment format is `CFAT`, version 1, followed by a libsodium secretstream header and length-prefixed authenticated ciphertext records. Each record is independently authenticated; the final record must carry the authenticated final tag.
- Attachment encryption uses libsodium `crypto_secretstream_xchacha20poly1305`; file keys are generated randomly. The optional key-wrapping helpers use libsodium `crypto_secretbox`.
- This UI keeps encrypted bytes and keys in React memory only. It does not upload attachments, persist keys, distribute keys to recipients, or implement messaging transport.
- Audit events are stored in local storage on the current device and contain only action types and timestamps. They are user-editable, not tamper-proof, and are erased by panic wipe.

## Adversaries and trust boundaries

The design considers a storage operator or network observer who can see ciphertext but does not have the file key, accidental MIME-type spoofing, and malformed or modified ciphertext. The browser, its JavaScript runtime, the user’s device, application deployment, and any future key-distribution service remain trusted.

## Controls

- Validate supported file signatures or strict UTF-8 text content before accepting an attachment; cap plaintext and decrypted data at 50 MiB.
- Authenticate every encrypted stream record, reject malformed framing, and require the final authentication tag.
- Apply per-request CSP nonces and security response headers; disallow plugins and framing.
- Keep audit events free of filenames, message text, and key material.
- Panic wipe clears tracked in-memory sensitive byte arrays, web storage, accessible Cache Storage, service-worker registrations, and enumerable IndexedDB databases.
- Security tests cover multi-chunk and empty-file round trips, tampering, truncation, wrong keys, key wrapping, and MIME spoofing.

## Important limitations

- JavaScript cannot guarantee erasure of every copy of a secret: garbage collection, browser internals, crash dumps, and immutable strings are outside the app’s control. Panic wipe is best-effort local cleanup, not remote revocation or forensic erasure.
- A decrypted file explicitly downloaded by the user is outside the app’s origin storage and is not removed by panic wipe.
- A compromised device, malicious browser extension, XSS, developer tools, or hostile same-origin script can access plaintext and keys. CSP is defense in depth, not a substitute for safe code and dependency review.
- The confidential badge does not prove that a recipient received or verified a message. The current attachment demo has no network persistence or recipient key exchange.
- Audit entries are local and mutable, and are deleted when panic wipe runs.
- Watermarks and context-menu/keyboard restrictions cannot prevent screenshots, photography, or other capture.
- The attachment hash is a plaintext integrity identifier for callers; it is not included in the encrypted format and is not an authenticity or sender-identity proof.

## Verification

Run `npm test` for the targeted cryptography and attachment-validation tests, and `npm run build` for the production build. Review the deployed CSP against any future third-party scripts, fonts, analytics, or API origins before enabling them.
