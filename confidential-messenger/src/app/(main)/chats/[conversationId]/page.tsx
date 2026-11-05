'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  checkFileSize,
  decryptFile,
  encryptFile,
  generateFileKey,
  validateFileType,
} from '@/lib/crypto/attachments';
import { secureWipe } from '@/lib/crypto/utils';
import { appendAuditEvent } from '@/lib/security/auditLog';

interface EncryptedAttachment {
  name: string;
  mimeType: string;
  size: number;
  encrypted: Uint8Array;
  fileKey: Uint8Array;
}

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const [attachment, setAttachment] = useState<EncryptedAttachment | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(false);
  const activeConversationRef = useRef(conversationId);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (attachment) secureWipe(attachment.fileKey);
    };
  }, [attachment]);

  useEffect(() => {
    if (activeConversationRef.current === conversationId) return;
    activeConversationRef.current = conversationId;
    setAttachment(current => {
      if (current) secureWipe(current.fileKey);
      return null;
    });
    setError('');
    setIsEncrypting(false);
  }, [conversationId]);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setError('');
    const sizeCheck = checkFileSize(file);
    if (!sizeCheck.valid) {
      setError(sizeCheck.error ?? 'File size is not allowed');
      return;
    }

    let validation: Awaited<ReturnType<typeof validateFileType>>;
    try {
      validation = await validateFileType(file, ['image', 'pdf', 'text']);
    } catch (validationError) {
      if (isMountedRef.current && activeConversationRef.current === conversationId) {
        setError(validationError instanceof Error ? validationError.message : 'Attachment validation failed');
      }
      return;
    }
    if (!isMountedRef.current || activeConversationRef.current !== conversationId) return;
    if (!validation.valid) {
      setError(validation.error ?? 'File type is not allowed');
      return;
    }

    setIsEncrypting(true);
    let fileKey: Uint8Array | undefined;
    let keepFileKey = false;
    try {
      fileKey = await generateFileKey();
      const { encrypted } = await encryptFile(file, fileKey);
      if (!isMountedRef.current || activeConversationRef.current !== conversationId) return;
      appendAuditEvent('attachment_encrypted');
      setAttachment({
        name: file.name,
        mimeType: validation.mimeType ?? file.type ?? 'application/octet-stream',
        size: file.size,
        encrypted,
        fileKey,
      });
      keepFileKey = true;
    } catch (encryptionError) {
      if (isMountedRef.current && activeConversationRef.current === conversationId) {
        setError(encryptionError instanceof Error ? encryptionError.message : 'Attachment encryption failed');
      }
    } finally {
      if (fileKey && !keepFileKey) secureWipe(fileKey);
      if (isMountedRef.current && activeConversationRef.current === conversationId) setIsEncrypting(false);
    }
  };

  const handleDecryptAndDownload = async () => {
    if (!attachment) return;
    setError('');
    let plaintext: Uint8Array | undefined;
    try {
      plaintext = await decryptFile(attachment.encrypted, attachment.fileKey);
      if (!isMountedRef.current || activeConversationRef.current !== conversationId) return;
      appendAuditEvent('attachment_decrypted');
      const url = URL.createObjectURL(new Blob([plaintext], { type: attachment.mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (decryptionError) {
      if (isMountedRef.current && activeConversationRef.current === conversationId) {
        setError(decryptionError instanceof Error ? decryptionError.message : 'Attachment decryption failed');
      }
    } finally {
      if (plaintext) secureWipe(plaintext);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-white">
      <header className="border-b border-white/10 bg-slate-950/60 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="eyebrow">Private conversation</p>
            <h1 className="text-xl font-semibold">Chat: {conversationId}</h1>
          </div>
          <span className="text-xs text-white/50">Attachment encryption enabled</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <div className="mb-8 flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <div>
              <h2 className="text-lg font-semibold">Encrypted attachments</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/55">
                Files are encrypted in your browser and held only in memory for this session. This demo does not upload or persist attachments.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv"
            onChange={handleFileSelected}
            aria-label="Choose an attachment"
          />
          {!attachment ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
              <p className="text-sm text-white/65">Choose an image, PDF, or plain-text file (up to 50 MB).</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isEncrypting}
                className="mt-5 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                {isEncrypting ? 'Encrypting locally…' : 'Choose file'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{attachment.name}</p>
                <p className="mt-1 text-xs text-white/50">
                  Encrypted · {(attachment.size / 1024).toFixed(1)} KB · key held in memory
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleDecryptAndDownload}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/15"
                >
                  Decrypt &amp; download
                </button>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/65 transition hover:bg-white/5"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p>}
          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-white/40">
            Encryption protects the local attachment bytes; it does not send files to a recipient or secure the conversation service.
          </p>
        </section>
      </main>
    </div>
  );
}
