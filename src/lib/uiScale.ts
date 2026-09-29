import { useEffect, useState } from 'react';

/** Root font size relative to 16px (see the `html` rule in index.css). */
export function uiScale(): number {
  if (typeof window === 'undefined') return 1;
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px / 16 : 1;
}

/**
 * The current UI scale, updated when the window is resized. Use it for sizes
 * that are given in pixels to a library, such as Monaco's font size.
 */
export function useUiScale(): number {
  const [scale, setScale] = useState(uiScale);
  useEffect(() => {
    const onResize = () => setScale(uiScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}
