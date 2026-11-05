'use client';

import { useEffect, useState } from 'react';
import { decryptFile } from '@/lib/crypto/attachments';
import { secureWipe } from '@/lib/crypto/utils';

interface SecurePdfViewerProps {
  encryptedData: Uint8Array;
  fileKey: Uint8Array;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function SecurePdfViewer({ encryptedData, fileKey, onClose, onError }: SecurePdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState('');
  useEffect(() => {
    let cancelled = false;
    let createdUrl = '';
    void decryptFile(encryptedData, fileKey).then(plaintext => {
      createdUrl = URL.createObjectURL(new Blob([plaintext], { type: 'application/pdf' }));
      secureWipe(plaintext);
      if (cancelled) URL.revokeObjectURL(createdUrl);
      else setPdfUrl(createdUrl);
    }).catch(error => {
      if (!cancelled) onError?.(error instanceof Error ? error.message : 'Failed to decrypt PDF');
    });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [encryptedData, fileKey, onError]);

  return (
    <section role="dialog" aria-modal="true" aria-label="Confidential PDF viewer" className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="font-semibold">Confidential PDF</h2>
        <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-2 text-sm">Close</button>
      </div>
      {pdfUrl ? <iframe title="Decrypted PDF attachment" src={pdfUrl} className="min-h-0 flex-1 border-0" /> : <p className="p-6 text-sm text-white/65">Decrypting PDF…</p>}
    </section>
  );
}
