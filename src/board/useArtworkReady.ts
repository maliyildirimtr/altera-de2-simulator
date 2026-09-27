import { useEffect, useState } from 'react';

/**
 * Board artwork is a large raster. Painting the SVG before it has decoded
 * shows the live overlays floating on an empty stage while the image streams
 * in top to bottom, which reads as a broken page. Instead the board stays
 * hidden behind a placeholder until the image is fully decoded, then fades in
 * as one piece.
 *
 * Results are cached per URL, so switching 2D ↔ 2.5D or remounting the
 * simulator after the first visit never flashes the placeholder again.
 */
const ready = new Set<string>();
const pending = new Map<string, Promise<void>>();

export function preloadArtwork(src: string): Promise<void> {
  if (ready.has(src)) return Promise.resolve();
  const existing = pending.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    const done = () => {
      ready.add(src);
      pending.delete(src);
      resolve();
    };
    img.onload = () => {
      // decode() guarantees the first paint of the <image> is complete rather
      // than progressive; fall back to onload where it is unavailable.
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    // A failed load must never leave the board hidden: show the overlays.
    img.onerror = done;
    img.src = src;
  });
  pending.set(src, promise);
  return promise;
}

export function isArtworkReady(src: string): boolean {
  return ready.has(src);
}

/** True once `src` is decoded. Never blocks in environments without `Image`. */
export function useArtworkReady(src: string): boolean {
  const [isReady, setReady] = useState(
    () => ready.has(src) || typeof Image === 'undefined',
  );
  useEffect(() => {
    if (isReady) return;
    let cancelled = false;
    preloadArtwork(src).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src, isReady]);
  return isReady;
}
