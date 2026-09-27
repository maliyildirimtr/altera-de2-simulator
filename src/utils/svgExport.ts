/**
 * Standalone SVG/PNG export of a rendered DigitalJS/JointJS paper.
 *
 * The live SVG is styled by external stylesheets (DigitalJS + theme CSS), so a
 * plain copy would render unstyled elsewhere. The clone gets each element's
 * computed presentation properties inlined, a tight viewBox and a background.
 */
const STYLE_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin', 'opacity', 'display', 'visibility',
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline',
] as const;

export interface Box { x: number; y: number; width: number; height: number }

export function serializeStyledSvg(svg: SVGSVGElement, bbox: Box, background: string, padding = 24): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = svg.querySelectorAll('*');
  const dst = clone.querySelectorAll('*');
  for (let i = 0; i < src.length && i < dst.length; i++) {
    const cs = getComputedStyle(src[i]);
    const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    dst[i].setAttribute('style', style);
    dst[i].removeAttribute('class');
  }
  // Interactive-only elements (port magnets hover, tools) are not useful on paper.
  clone.querySelectorAll('.joint-tools, .joint-highlight-stroke').forEach((n) => n.remove());

  const x = bbox.x - padding;
  const y = bbox.y - padding;
  const w = Math.ceil(bbox.width + padding * 2);
  const h = Math.ceil(bbox.height + padding * 2);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.removeAttribute('style');

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(x));
  bg.setAttribute('y', String(y));
  bg.setAttribute('width', String(w));
  bg.setAttribute('height', String(h));
  bg.setAttribute('fill', background);
  clone.insertBefore(bg, clone.firstChild);

  return new XMLSerializer().serializeToString(clone);
}

export async function svgToPngBlob(svgText: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png')
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, type = 'text/plain'): void {
  downloadBlob(new Blob([text], { type }), filename);
}
