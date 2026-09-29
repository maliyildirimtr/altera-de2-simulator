/**
 * Automatic placement for the gate designer: parts in columns by logic depth
 * (inputs left, outputs right), ordered within a column so wires cross as
 * little as a few barycentre sweeps allow, then fitted into the canvas.
 * Pure: the caller supplies each part's size.
 */
import { CLOCKED, PARTS, SINKS, SOURCES, type Circuit, type GateNode } from './circuit';

export interface LayoutOptions {
  width: number;
  height: number;
  size: (n: GateNode) => { w: number; h: number };
  margin?: number;
  /** Pin positions of a placed part, for routing wires that skip columns. */
  ports?: { out: (n: GateNode, pin: number) => { x: number; y: number }; in: (n: GateNode, pin: number) => { x: number; y: number } };
}

const isSource = (n: GateNode) => SOURCES.includes(n.type) || n.type === 'CONST0' || n.type === 'CONST1' || n.type === 'CONST';
const isSink = (n: GateNode) => SINKS.includes(n.type) || n.type === 'SEG7';

export function autoLayout(c: Circuit, opts: LayoutOptions): Circuit {
  const margin = opts.margin ?? 30;
  const byId = new Map(c.nodes.map((n) => [n.id, n]));
  const drivers = new Map<string, string[]>();
  const users = new Map<string, string[]>();
  // Data inputs of a clocked part usually close a feedback loop, so only its
  // clock (a ripple counter's chain) and direct inputs count towards depth.
  const depthDrivers = new Map<string, string[]>();
  for (const w of c.wires) {
    if (!byId.has(w.from) || !byId.has(w.to) || w.from === w.to) continue;
    (drivers.get(w.to) ?? drivers.set(w.to, []).get(w.to)!).push(w.from);
    const to = byId.get(w.to)!;
    if (!CLOCKED.includes(to.type) || PARTS[to.type].clock === w.pin || isSource(byId.get(w.from)!)) {
      (depthDrivers.get(w.to) ?? depthDrivers.set(w.to, []).get(w.to)!).push(w.from);
    }
    (users.get(w.from) ?? users.set(w.from, []).get(w.from)!).push(w.to);
  }

  // Depth: longest path from a source. Edges into clocked parts do not add
  // depth (they close feedback loops), and a cycle is cut where it is found.
  const level = new Map<string, number>();
  const busy = new Set<string>();
  const depth = (id: string): number => {
    const known = level.get(id);
    if (known !== undefined) return known;
    const n = byId.get(id)!;
    if (isSource(n) || busy.has(id)) return 0;
    busy.add(id);
    let d = 0;
    for (const from of depthDrivers.get(id) ?? []) d = Math.max(d, depth(from) + 1);
    busy.delete(id);
    level.set(id, d);
    return d;
  };
  c.nodes.forEach((n) => depth(n.id));
  // Parts with no driver that are not sources sit next to what they feed.
  for (const n of c.nodes) {
    if (isSource(n) || isSink(n) || (drivers.get(n.id) ?? []).length) continue;
    const next = (users.get(n.id) ?? []).map((u) => level.get(u) ?? 1);
    level.set(n.id, next.length ? Math.max(0, Math.min(...next) - 1) : 1);
  }
  const inner = c.nodes.filter((n) => !isSink(n));
  const last = Math.max(0, ...inner.map((n) => level.get(n.id) ?? 0));
  // Every output and display in one last column.
  for (const n of c.nodes) if (isSink(n)) level.set(n.id, last + 1);
  for (const n of c.nodes) if (isSource(n)) level.set(n.id, 0);

  const columns: GateNode[][] = [];
  for (const n of c.nodes) (columns[level.get(n.id)!] ??= []).push(n);
  const cols = columns.map((col) => col ?? []).filter((col) => col.length);
  // Start from the drawn order (top to bottom), then sweep.
  cols.forEach((col) => col.sort((a, b) => a.y - b.y || a.x - b.x));
  const pos = new Map<string, number>();
  const index = () => cols.forEach((col) => col.forEach((n, i) => pos.set(n.id, i / Math.max(1, col.length - 1))));
  index();
  const bary = (n: GateNode, from: Map<string, string[]>, fallback: number) => {
    const list = (from.get(n.id) ?? []).map((id) => pos.get(id)).filter((v): v is number => v !== undefined);
    return list.length ? list.reduce((s, v) => s + v, 0) / list.length : fallback;
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    const forward = sweep % 2 === 0;
    // The inputs keep their drawn order (a, b, c … as the student placed them).
    const order = (forward ? cols.slice(1) : cols.slice(0, -1).reverse()).filter((col) => !col.every(isSource));
    for (const col of order) {
      const keyed = col.map((n, i) => ({ n, k: bary(n, forward ? drivers : users, pos.get(n.id) ?? i) }));
      keyed.sort((a, b) => a.k - b.k);
      col.splice(0, col.length, ...keyed.map((x) => x.n));
      col.forEach((n, i) => pos.set(n.id, i / Math.max(1, col.length - 1)));
    }
  }

  // Coordinates: columns left to right, parts stacked with a gap, each column
  // centred. A column taller than the canvas is split into narrow sub-columns.
  const usableW = opts.width - 2 * margin;
  const usableH = opts.height - 2 * margin;
  const minGapY = 10;
  const SUB_GAP = 16;
  const stacks = cols.map((col) => {
    const out: GateNode[][] = [[]];
    let h = 0;
    for (const n of col) {
      const sh = opts.size(n).h;
      if (out[out.length - 1].length && h + sh > usableH) {
        out.push([]);
        h = 0;
      }
      out[out.length - 1].push(n);
      h += sh + minGapY;
    }
    return out;
  });
  const partW = cols.map((col) => Math.max(...col.map((n) => opts.size(n).w)));
  const colW = stacks.map((st, ci) => st.length * partW[ci] + (st.length - 1) * SUB_GAP);
  const naturalGapX = 90;
  const totalW = colW.reduce((s2, w) => s2 + w, 0);
  const gapX = cols.length > 1 ? Math.max(24, Math.min(naturalGapX * 1.6, (usableW - totalW) / (cols.length - 1))) : 0;
  const placed = new Map<string, { x: number; y: number }>();
  let x = margin;
  stacks.forEach((st, ci) => {
    st.forEach((sub, si) => {
      const subH = sub.reduce((s2, n) => s2 + opts.size(n).h, 0);
      const gapY = sub.length > 1 ? Math.max(minGapY, Math.min(40, (usableH - subH) / (sub.length - 1))) : 0;
      const height = subH + gapY * (sub.length - 1);
      let y = margin + Math.max(0, (usableH - height) / 2);
      const sx = x + si * (partW[ci] + SUB_GAP);
      for (const n of sub) {
        const sz = opts.size(n);
        placed.set(n.id, { x: Math.round((sx + (partW[ci] - sz.w) / 2) / 10) * 10, y: Math.round(y) });
        y += sz.h + gapY;
      }
    });
    x += colW[ci] + gapX;
  });
  const nodes = c.nodes.map((n) => {
    const p = placed.get(n.id)!;
    const { rot: _rot, ...rest } = n;
    void _rot;
    return { ...rest, x: p.x, y: p.y };
  });
  // Wires that skip a column get a route of their own: along their own row
  // when nothing is in the way, otherwise through a channel under the parts
  // they pass. Other wires are left to the automatic router.
  const placedById = new Map(nodes.map((n) => [n.id, n]));
  const colOf = new Map<string, number>();
  cols.forEach((col, ci) => col.forEach((n) => colOf.set(n.id, ci)));
  const colLeft: number[] = [];
  const colRight: number[] = [];
  cols.forEach((col, ci) => {
    colLeft[ci] = Math.min(...col.map((n) => placedById.get(n.id)!.x));
    colRight[ci] = Math.max(...col.map((n) => placedById.get(n.id)!.x + opts.size(n).w));
  });
  const channels = new Map<string, number>();
  const wires = c.wires.map(({ bends: _b, ...w }) => {
    void _b;
    const a = placedById.get(w.from);
    const b = placedById.get(w.to);
    const ca = colOf.get(w.from);
    const cb = colOf.get(w.to);
    if (!opts.ports || !a || !b || ca === undefined || cb === undefined || cb - ca < 2) return w;
    const pa = opts.ports.out(a, w.fromPin ?? 0);
    const between = cols.slice(ca + 1, cb).flat().map((n) => ({ n: placedById.get(n.id)!, s: opts.size(n) }));
    const blocked = (y: number) => between.some(({ n, s }) => y > n.y - 8 && y < n.y + s.h + 8);
    let cy = pa.y;
    if (blocked(cy)) {
      const key = `${ca}-${cb}`;
      const k = channels.get(key) ?? 0;
      channels.set(key, k + 1);
      cy = Math.max(...between.map(({ n, s }) => n.y + s.h)) + 16 + k * 8;
    }
    const x1 = colRight[ca] + 14 + ((w.fromPin ?? 0) % 4) * 4;
    const x2 = colLeft[cb] - 14 - (w.pin % 4) * 4;
    return cy === pa.y ? { ...w, bends: [x2] } : { ...w, bends: [x1, cy, x2] };
  });
  return { nodes, wires };
}
