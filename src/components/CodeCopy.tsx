'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Wires up the copy buttons that content.ts bakes into every code block.
 * One delegated listener rather than hydrating 5000+ React buttons.
 */
export default function CodeCopy() {
  useEffect(() => {
    async function onClick(e: MouseEvent) {
      const button = (e.target as HTMLElement).closest('[data-copy]') as HTMLElement | null;
      if (!button) return;

      const code = button.parentElement?.querySelector('code');
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code.textContent ?? '');
        // No-op wherever Analytics did not load (dev, preview, /admin).
        window.gtag?.('event', 'code_copy', {
          language: code.className.match(/language-([\w-]+)/)?.[1] ?? 'unknown',
          page_path: location.pathname,
        });
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 1400);
      } catch {
        button.textContent = 'Press ⌘C';
      }
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
