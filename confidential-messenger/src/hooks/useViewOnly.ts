'use client';

import { useEffect, useRef } from 'react';

interface ViewOnlyOptions {
  enabled: boolean;
  blockContextMenu?: boolean;
  blockKeyboardShortcuts?: boolean;
  blockDrag?: boolean;
}

export function useViewOnly({
  enabled,
  blockContextMenu = false,
  blockKeyboardShortcuts = false,
  blockDrag = false,
}: ViewOnlyOptions) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (event: MouseEvent) => {
      if (blockContextMenu && ref.current?.contains(event.target as Node)) event.preventDefault();
    };
    const handleDragStart = (event: DragEvent) => {
      if (blockDrag && ref.current?.contains(event.target as Node)) event.preventDefault();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!blockKeyboardShortcuts || !ref.current?.contains(document.activeElement)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['c', 'p', 's', 'u'].includes(key)) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, blockContextMenu, blockKeyboardShortcuts, blockDrag]);

  return { ref };
}
