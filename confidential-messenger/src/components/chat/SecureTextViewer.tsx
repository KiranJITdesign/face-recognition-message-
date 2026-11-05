'use client';

import { useEffect, useState } from 'react';
import { decryptFile } from '@/lib/crypto/attachments';
import { secureWipe } from '@/lib/crypto/utils';

interface SecureTextViewerProps {
  encryptedData: Uint8Array;
  fileKey: Uint8Array;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function SecureTextViewer({ encryptedData, fileKey, onClose, onError }: SecureTextViewerProps) {
  const [text, setText] = useState('');
  useEffect(() => {
    let cancelled = false;
    let plaintext: Uint8Array | undefined;
    void decryptFile(encryptedData, fileKey).then(bytes => {
      plaintext = bytes;
      if (!cancelled) setText(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    }).catch(error => {
      if (!cancelled) onError?.(error instanceof Error ? error.message : 'Failed to decrypt text');
    }).finally(() => {
      if (plaintext) secureWipe(plaintext);
    });
    return () => {
      cancelled = true;
    };
  }, [encryptedData, fileKey, onError]);

  return (
    <section role="dialog" aria-modal="true" aria-label="Confidential text attachment" className="fixed inset-0 z-50 overflow-auto bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">Confidential text</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Close</button>
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6">{text}</pre>
      </div>
    </section>
  );
}
