/**
 * Shareable project links.
 *
 * A project is serialised to JSON, deflate-compressed and base64url-encoded
 * into the `p` query parameter of the tool's hash route, e.g.
 * `https://lab.maliyildirimtr.com/#/schematic?p=…`. Nothing is uploaded: the
 * link itself carries the source code.
 */
import type { TargetTool } from './exampleHandoff';

export interface SharedFile {
  name: string;
  content: string;
}

export interface SharePayload {
  v: 1;
  tool: TargetTool;
  files: SharedFile[];
  /** Waveform only. */
  testbench?: SharedFile | null;
  /** DE2 only: pin assignments as edited in the inspector. */
  pinMappings?: unknown[];
}

/** Longest link we hand out; chat apps and some browsers truncate beyond this. */
export const MAX_SHARE_URL_LENGTH = 32_000;

export const SHARE_PARAM = 'p';

const ROUTES: Record<TargetTool, string> = {
  de2: '/de2-simulator',
  waveform: '/waveform',
  schematic: '/schematic',
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const body = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export async function encodeSharePayload(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await pipeThrough(json, new CompressionStream('deflate-raw')));
}

export async function decodeSharePayload(encoded: string): Promise<SharePayload> {
  const json = await pipeThrough(fromBase64Url(encoded), new DecompressionStream('deflate-raw'));
  const data = JSON.parse(new TextDecoder().decode(json));
  if (!data || data.v !== 1 || !Array.isArray(data.files)) throw new Error('Unsupported share link.');
  const isFile = (f: unknown): f is SharedFile =>
    !!f && typeof (f as SharedFile).name === 'string' && typeof (f as SharedFile).content === 'string';
  if (!data.files.every(isFile)) throw new Error('Malformed share link.');
  if (data.testbench != null && !isFile(data.testbench)) throw new Error('Malformed share link.');
  return data as SharePayload;
}

export async function buildShareUrl(payload: SharePayload): Promise<string> {
  const encoded = await encodeSharePayload(payload);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${ROUTES[payload.tool]}?${SHARE_PARAM}=${encoded}`;
}
