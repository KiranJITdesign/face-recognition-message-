'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { decryptFile } from '@/lib/crypto/attachments';
import { secureWipe } from '@/lib/crypto/utils';
import { useViewOnly } from '@/hooks/useViewOnly';
import { drawWatermarkToCanvas } from './Watermark';

interface SecureImageViewerProps {
  encryptedData?: Uint8Array;
  fileKey?: Uint8Array;
  mimeType?: string;
  watermarkText?: string;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function SecureImageViewer({
  encryptedData,
  fileKey,
  mimeType = 'image/jpeg',
  watermarkText = 'CONFIDENTIAL',
  onClose,
  onError,
}: SecureImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, startX: 0, startY: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: viewOnlyRef } = useViewOnly({
    enabled: true,
    blockContextMenu: true,
    blockKeyboardShortcuts: true,
    blockDrag: true,
  });

  useEffect(() => {
    let cancelled = false;
    const decryptAndRender = async () => {
      if (!encryptedData || !fileKey) {
        onError?.('No encrypted data or file key provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      let plaintext: Uint8Array | undefined;
      try {
        plaintext = await decryptFile(encryptedData, fileKey);
        const bitmap = await createImageBitmap(new Blob([plaintext], { type: mimeType }));
        if (cancelled) {
          bitmap.close();
          return;
        }
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) throw new Error('Image canvas is not available');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        context.drawImage(bitmap, 0, 0);
        drawWatermarkToCanvas(context, watermarkText, canvas.width, canvas.height, 0.1, -25);
        bitmap.close();
      } catch (error) {
        if (!cancelled) onError?.(error instanceof Error ? error.message : 'Failed to decrypt image');
      } finally {
        if (plaintext) secureWipe(plaintext);
        if (!cancelled) setIsLoading(false);
      }
    };

    void decryptAndRender();
    return () => {
      cancelled = true;
    };
  }, [encryptedData, fileKey, mimeType, watermarkText, onError]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    setZoom(current => Math.max(0.1, Math.min(10, current + (event.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setPosition(current => ({
      ...current,
      startX: event.clientX - current.x,
      startY: event.clientY - current.y,
    }));
  }, [zoom]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition(current => ({
      ...current,
      x: event.clientX - rect.left - current.startX,
      y: event.clientY - rect.top - current.startY,
    }));
  }, [isDragging]);

  return (
    <motion.div
      ref={viewOnlyRef}
      role="dialog"
      aria-modal="true"
      aria-label="Encrypted image viewer"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onContextMenu={event => event.preventDefault()}
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/80 p-4">
        <div>
          <p className="text-sm font-semibold">Encrypted image</p>
          <p className="text-xs text-white/50">Viewing is watermarked; screenshots cannot be prevented.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm disabled:opacity-40" onClick={() => setZoom(value => Math.max(0.1, value - 0.25))} disabled={zoom <= 0.1} aria-label="Zoom out">−</button>
          <span className="min-w-12 text-center text-xs text-white/65">{Math.round(zoom * 100)}%</span>
          <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={() => setZoom(value => Math.min(10, value + 0.25))} aria-label="Zoom in">+</button>
          <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0, startX: 0, startY: 0 }); }}>Reset</button>
          <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={onClose}>Close</button>
        </div>
      </header>
      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {isLoading && <p className="text-sm text-white/65">Decrypting image…</p>}
        {!isLoading && (
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
