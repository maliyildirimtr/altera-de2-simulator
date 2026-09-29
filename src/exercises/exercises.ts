/**
 * Exercises with automatic checking (see grader.ts). Combinational ones are
 * checked against every input combination; sequential ones are run through a
 * fixed list of clock cycles. Each reference solution defines the exact ports
 * the student must use.
 */
import type { SequentialSpec } from './grader';
import { compileVerilog } from '../core/simulator/verilogEngine';
export type Lang = 'en' | 'tr';
export type Text = Record<Lang, string>;

export interface Exercise {
  id: string;
  level: 'beginner' | 'intermediate';
  title: Text;
  prompt: Text;
  hint: Text;
  /** Module header the student starts from (ports fixed, body empty). */
  starter: string;
  /** Known-good solution used to compute the expected truth table. Never shown. */
  reference: string;
  /** Present for clocked exercises: the clock port and the cycle-by-cycle stimulus. */
  sequential?: SequentialSpec;
}

/** Build a stimulus list: `rows` lists input values per cycle in `names` order. */
const cycles = (names: string[], rows: number[][]): Record<string, number>[] =>
  rows.map((values) => Object.fromEntries(names.map((name, i) => [name, values[i] ?? 0])));

const RESET_THEN_RUN = (extra: number[][]) => cycles(['rst', 'en'], [[1, 0], ...extra]);

export const EXERCISES: Exercise[] = [
  {
    id: 'and_or',
    level: 'beginner',
    title: { en: 'AND-OR function', tr: 'VE-VEYA fonksiyonu' },
    prompt: {
      en: 'Drive y with (a AND b) OR c.',
      tr: 'y çıkışını (a VE b) VEYA c olacak şekilde sür.',
    },
    hint: { en: 'Bitwise operators: & for AND, | for OR.', tr: 'Bit düzeyi operatörler: VE için &, VEYA için |.' },
    starter: `module and_or (
    input  logic a,
    input  logic b,
    input  logic c,
    output logic y
);

    // Your code here

endmodule
`,
    reference: `module and_or (input logic a, input logic b, input logic c, output logic y);
    assign y = (a & b) | c;
endmodule`,
  },
  {
    id: 'half_adder',
    level: 'beginner',
    title: { en: 'Half adder', tr: 'Yarım toplayıcı' },
    prompt: {
      en: 'Add the single bits a and b. sum is the result bit, carry is the carry-out.',
      tr: 'Tek bitlik a ve b\'yi topla. sum sonuç biti, carry elde çıkışıdır.',
    },
    hint: { en: 'sum is 1 when exactly one input is 1 (XOR); carry needs both (AND).', tr: 'sum, girişlerden yalnızca biri 1 iken 1 olur (XOR); carry için ikisi de 1 olmalı (AND).' },
    starter: `module half_adder (
    input  logic a,
    input  logic b,
    output logic sum,
    output logic carry
);

    // Your code here

endmodule
`,
    reference: `module half_adder (input logic a, input logic b, output logic sum, output logic carry);
    assign sum = a ^ b;
    assign carry = a & b;
endmodule`,
  },
  {
    id: 'full_adder',
    level: 'beginner',
    title: { en: 'Full adder', tr: 'Tam toplayıcı' },
    prompt: {
      en: 'Add three single bits a, b and cin. Produce sum and cout.',
      tr: 'Üç tek bitlik girişi (a, b, cin) topla. sum ve cout çıkışlarını üret.',
    },
    hint: { en: 'sum = a ^ b ^ cin. cout is 1 when at least two inputs are 1.', tr: 'sum = a ^ b ^ cin. cout, en az iki giriş 1 iken 1 olur.' },
    starter: `module full_adder (
    input  logic a,
    input  logic b,
    input  logic cin,
    output logic sum,
    output logic cout
);

    // Your code here

endmodule
`,
    reference: `module full_adder (input logic a, input logic b, input logic cin, output logic sum, output logic cout);
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (cin & (a ^ b));
endmodule`,
  },
  {
    id: 'majority3',
    level: 'beginner',
    title: { en: 'Majority voter', tr: 'Çoğunluk devresi' },
    prompt: {
      en: 'y is 1 when at least two of a, b, c are 1.',
      tr: 'a, b, c girişlerinden en az ikisi 1 ise y = 1 olsun.',
    },
    hint: { en: 'OR together every pair: (a&b) | (a&c) | (b&c).', tr: 'Tüm ikili VE\'leri VEYA\'la: (a&b) | (a&c) | (b&c).' },
    starter: `module majority3 (
    input  logic a,
    input  logic b,
    input  logic c,
    output logic y
);

    // Your code here

endmodule
`,
    reference: `module majority3 (input logic a, input logic b, input logic c, output logic y);
    assign y = (a & b) | (a & c) | (b & c);
endmodule`,
  },
  {
    id: 'mux2',
    level: 'beginner',
    title: { en: '2:1 multiplexer', tr: '2:1 çoklayıcı' },
    prompt: {
      en: 'y follows d0 when sel is 0 and d1 when sel is 1.',
      tr: 'sel = 0 iken y = d0, sel = 1 iken y = d1 olsun.',
    },
    hint: { en: 'The conditional operator works well: sel ? d1 : d0.', tr: 'Koşul operatörü işe yarar: sel ? d1 : d0.' },
    starter: `module mux2 (
    input  logic d0,
    input  logic d1,
    input  logic sel,
    output logic y
);

    // Your code here

endmodule
`,
    reference: `module mux2 (input logic d0, input logic d1, input logic sel, output logic y);
    assign y = sel ? d1 : d0;
endmodule`,
  },
  {
    id: 'parity4',
    level: 'beginner',
    title: { en: 'Parity bit', tr: 'Eşlik (parity) biti' },
    prompt: {
      en: 'p is 1 when the 4-bit input d contains an odd number of 1s.',
      tr: '4 bitlik d girişinde tek sayıda 1 varsa p = 1 olsun.',
    },
    hint: { en: 'XOR all four bits together.', tr: 'Dört biti birbirleriyle XOR\'la.' },
    starter: `module parity4 (
    input  logic [3:0] d,
    output logic       p
);

    // Your code here

endmodule
`,
    reference: `module parity4 (input logic [3:0] d, output logic p);
    assign p = d[0] ^ d[1] ^ d[2] ^ d[3];
endmodule`,
  },
  {
    id: 'mux4',
    level: 'intermediate',
    title: { en: '4:1 multiplexer', tr: '4:1 çoklayıcı' },
    prompt: {
      en: 'Select one bit of d using the 2-bit sel: y = d[sel].',
      tr: '2 bitlik sel ile d\'nin bir bitini seç: y = d[sel].',
    },
    hint: { en: 'Nest two conditionals on sel[1] and sel[0].', tr: 'sel[1] ve sel[0] üzerinde iç içe iki koşul kullan.' },
    starter: `module mux4 (
    input  logic [3:0] d,
    input  logic [1:0] sel,
    output logic       y
);

    // Your code here

endmodule
`,
    reference: `module mux4 (input logic [3:0] d, input logic [1:0] sel, output logic y);
    assign y = sel[1] ? (sel[0] ? d[3] : d[2]) : (sel[0] ? d[1] : d[0]);
endmodule`,
  },
  {
    id: 'decoder2to4',
    level: 'intermediate',
    title: { en: '2-to-4 decoder with enable', tr: 'Yetkilendirmeli 2\'ye 4 kod çözücü' },
    prompt: {
      en: 'When en is 1, set exactly the bit y[a] to 1. When en is 0, all outputs are 0.',
      tr: 'en = 1 iken yalnızca y[a] biti 1 olsun. en = 0 iken tüm çıkışlar 0 olsun.',
    },
    hint: { en: 'Write one assign per output bit, e.g. y[2] = en & a[1] & ~a[0].', tr: 'Her çıkış biti için bir assign yaz, örn. y[2] = en & a[1] & ~a[0].' },
    starter: `module decoder2to4 (
    input  logic [1:0] a,
    input  logic       en,
    output logic [3:0] y
);

    // Your code here

endmodule
`,
    reference: `module decoder2to4 (input logic [1:0] a, input logic en, output logic [3:0] y);
    assign y[0] = en & ~a[1] & ~a[0];
    assign y[1] = en & ~a[1] &  a[0];
    assign y[2] = en &  a[1] & ~a[0];
    assign y[3] = en &  a[1] &  a[0];
endmodule`,
  },
  {
    id: 'comparator2',
    level: 'intermediate',
    title: { en: '2-bit comparator', tr: '2 bitlik karşılaştırıcı' },
    prompt: {
      en: 'Compare the unsigned 2-bit numbers a and b. Exactly one of gt, eq, lt is 1.',
      tr: 'İşaretsiz 2 bitlik a ve b sayılarını karşılaştır. gt, eq, lt çıkışlarından yalnızca biri 1 olmalı.',
    },
    hint: { en: 'Relational operators work on vectors: assign gt = (a > b);', tr: 'Karşılaştırma operatörleri vektörlerle çalışır: assign gt = (a > b);' },
    starter: `module comparator2 (
    input  logic [1:0] a,
    input  logic [1:0] b,
    output logic       gt,
    output logic       eq,
    output logic       lt
);

    // Your code here

endmodule
`,
    reference: `module comparator2 (input logic [1:0] a, input logic [1:0] b, output logic gt, output logic eq, output logic lt);
    assign gt = (a[1] & ~b[1]) | (~(a[1] ^ b[1]) & a[0] & ~b[0]);
    assign eq = ~(a[1] ^ b[1]) & ~(a[0] ^ b[0]);
    assign lt = (~a[1] & b[1]) | (~(a[1] ^ b[1]) & ~a[0] & b[0]);
endmodule`,
  },
  {
    id: 'bin2gray',
    level: 'intermediate',
    title: { en: 'Binary to Gray code', tr: 'İkiliden Gray koduna' },
    prompt: {
      en: 'Convert the 4-bit binary b to Gray code g: the top bit is copied, every other bit is b[i+1] XOR b[i].',
      tr: '4 bitlik ikili b sayısını Gray koduna (g) çevir: en üst bit aynen kalır, diğerleri b[i+1] XOR b[i].',
    },
    hint: { en: 'g[3] = b[3]; g[2] = b[3] ^ b[2]; …', tr: 'g[3] = b[3]; g[2] = b[3] ^ b[2]; …' },
    starter: `module bin2gray (
    input  logic [3:0] b,
    output logic [3:0] g
);

    // Your code here

endmodule
`,
    reference: `module bin2gray (input logic [3:0] b, output logic [3:0] g);
    assign g[3] = b[3];
    assign g[2] = b[3] ^ b[2];
    assign g[1] = b[2] ^ b[1];
    assign g[0] = b[1] ^ b[0];
endmodule`,
  },
  {
    id: 'adder4',
    level: 'intermediate',
    title: { en: '4-bit adder', tr: '4 bitlik toplayıcı' },
    prompt: {
      en: 'Add the 4-bit numbers a and b. s is the 4-bit sum, cout the carry out of bit 3.',
      tr: '4 bitlik a ve b sayılarını topla. s 4 bitlik toplam, cout 3. bitten çıkan eldedir.',
    },
    hint: { en: 'Chain four full adders, or write the sum bit by bit with carries.', tr: 'Dört tam toplayıcıyı zincirle ya da toplamı elde bitleriyle bit bit yaz.' },
    starter: `module adder4 (
    input  logic [3:0] a,
    input  logic [3:0] b,
    output logic [3:0] s,
    output logic       cout
);

    // Your code here

endmodule
`,
    reference: `module adder4 (input logic [3:0] a, input logic [3:0] b, output logic [3:0] s, output logic cout);
    logic c1, c2, c3;
    assign s[0] = a[0] ^ b[0];
    assign c1   = a[0] & b[0];
    assign s[1] = a[1] ^ b[1] ^ c1;
    assign c2   = (a[1] & b[1]) | (c1 & (a[1] ^ b[1]));
    assign s[2] = a[2] ^ b[2] ^ c2;
    assign c3   = (a[2] & b[2]) | (c2 & (a[2] ^ b[2]));
    assign s[3] = a[3] ^ b[3] ^ c3;
    assign cout = (a[3] & b[3]) | (c3 & (a[3] ^ b[3]));
endmodule`,
  },
  /* ── Sequential (clocked) ─────────────────────────────────────────── */
  {
    id: 'dff_en',
    level: 'intermediate',
    title: { en: 'D flip-flop with enable', tr: 'Yetkili (enable) D flip-flop' },
    prompt: {
      en: 'On every rising edge of clk, copy d into q, but only while en is 1. When en is 0, q keeps its value.',
      tr: 'clk\'nin her yükselen kenarında d\'yi q\'ya kopyala; ama yalnızca en 1 iken. en 0 olduğunda q değerini korur.',
    },
    hint: {
      en: 'Use always_ff @(posedge clk) with an if (en) q <= d; inside. Use <= (non-blocking) in clocked blocks.',
      tr: 'always_ff @(posedge clk) içinde if (en) q <= d; kullan. Saatli bloklarda <= (non-blocking) atama kullan.',
    },
    starter: `module dff_en (
    input  logic clk,
    input  logic en,
    input  logic d,
    output logic q
);

    // Your code here

endmodule
`,
    reference: `module dff_en (input logic clk, input logic en, input logic d, output logic q);
    always_ff @(posedge clk) begin
        if (en) q <= d;
    end
endmodule`,
    sequential: {
      clock: 'clk',
      steps: cycles(['en', 'd'], [[1, 1], [0, 0], [0, 1], [1, 0], [1, 1], [0, 0], [1, 1], [1, 0]]),
    },
  },
  {
    id: 'counter4',
    level: 'intermediate',
    title: { en: '4-bit counter', tr: '4 bitlik sayıcı' },
    prompt: {
      en: 'Build a counter. On each rising edge of clk: if rst is 1, count becomes 0; otherwise, if en is 1, count increases by one (15 wraps to 0).',
      tr: 'Bir sayıcı yap. clk\'nin her yükselen kenarında: rst 1 ise count 0 olur; değilse ve en 1 ise count bir artar (15\'ten sonra 0\'a döner).',
    },
    hint: {
      en: 'Synchronous reset: check rst first inside always_ff @(posedge clk), then else if (en) count <= count + 1;',
      tr: 'Senkron reset: always_ff @(posedge clk) içinde önce rst\'yi kontrol et, sonra else if (en) count <= count + 1;',
    },
    starter: `module counter4 (
    input  logic       clk,
    input  logic       rst,
    input  logic       en,
    output logic [3:0] count
);

    // Your code here

endmodule
`,
    reference: `module counter4 (input logic clk, input logic rst, input logic en, output logic [3:0] count);
    always_ff @(posedge clk) begin
        if (rst) count <= 4'd0;
        else if (en) count <= (count + 4'd1) & 4'hF;
    end
endmodule`,
    sequential: {
      clock: 'clk',
      steps: RESET_THEN_RUN([
        [0, 1], [0, 1], [0, 1], [0, 0], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1],
        [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [1, 1], [0, 1],
      ]),
    },
  },
  {
    id: 'shift4',
    level: 'intermediate',
    title: { en: '4-bit shift register', tr: '4 bitlik kaydırmalı yazmaç' },
    prompt: {
      en: 'On each rising edge of clk, shift q one place to the left and put din into bit 0. rst (synchronous) clears q to 0000.',
      tr: 'clk\'nin her yükselen kenarında q\'yu bir basamak sola kaydır ve din\'i 0. bite koy. rst (senkron) q\'yu 0000 yapar.',
    },
    hint: {
      en: 'Write each bit: q[3] <= q[2]; q[2] <= q[1]; q[1] <= q[0]; q[0] <= din; (or q <= ((q << 1) | din) & 4\'hF;).',
      tr: 'Her biti ayrı yaz: q[3] <= q[2]; q[2] <= q[1]; q[1] <= q[0]; q[0] <= din; (ya da q <= ((q << 1) | din) & 4\'hF;).',
    },
    starter: `module shift4 (
    input  logic       clk,
    input  logic       rst,
    input  logic       din,
    output logic [3:0] q
);

    // Your code here

endmodule
`,
    reference: `module shift4 (input logic clk, input logic rst, input logic din, output logic [3:0] q);
    always_ff @(posedge clk) begin
        if (rst) q <= 4'd0;
        else q <= ((q << 1) | din) & 4'hF;
    end
endmodule`,
    sequential: {
      clock: 'clk',
      steps: cycles(['rst', 'din'], [[1, 0], [0, 1], [0, 0], [0, 1], [0, 1], [0, 0], [0, 0], [0, 1], [1, 1], [0, 1]]),
    },
  },
  {
    id: 'edge_detect',
    level: 'intermediate',
    title: { en: 'Rising-edge detector', tr: 'Yükselen kenar dedektörü' },
    prompt: {
      en: 'pulse must be 1 for exactly one cycle when sig changes from 0 to 1 (compared with its value at the previous clock edge). Otherwise pulse is 0.',
      tr: 'sig 0\'dan 1\'e geçtiğinde (bir önceki saat kenarındaki değerine göre) pulse tam bir çevrim boyunca 1 olmalı. Diğer durumlarda pulse 0\'dır.',
    },
    hint: {
      en: 'Inside always_ff @(posedge clk): pulse <= sig & ~prev; prev <= sig; — prev holds sig from the previous edge. Outputs are read just after each edge, so pulse must be a register too.',
      tr: 'always_ff @(posedge clk) içinde: pulse <= sig & ~prev; prev <= sig; — prev, sig\'in bir önceki kenardaki değerini tutar. Çıkışlar her kenardan hemen sonra okunduğu için pulse da bir yazmaç olmalı.',
    },
    starter: `module edge_detect (
    input  logic clk,
    input  logic sig,
    output logic pulse
);

    // Your code here

endmodule
`,
    reference: `module edge_detect (input logic clk, input logic sig, output logic pulse);
    logic prev;
    always_ff @(posedge clk) begin
        pulse <= sig & ~prev;
        prev <= sig;
    end
endmodule`,
    sequential: {
      clock: 'clk',
      steps: cycles(['sig'], [[0], [0], [1], [1], [1], [0], [1], [0], [0], [1], [1]]),
    },
  },
  {
    id: 'seq101',
    level: 'intermediate',
    title: { en: 'FSM: "101" sequence detector', tr: 'FSM: "101" dizi dedektörü' },
    prompt: {
      en: 'Read one bit of din per clock edge. found must be 1 right after the edge that reads the final 1 of the pattern 1, 0, 1, and 0 otherwise (overlaps count: 10101 gives two hits). rst returns to the start state.',
      tr: 'Her saat kenarında din\'den bir bit oku. 1, 0, 1 dizisinin son 1\'ini okuyan kenardan hemen sonra found 1, diğer durumlarda 0 olmalı (örtüşmeler sayılır: 10101 iki kez bulur). rst başlangıç durumuna döndürür.',
    },
    hint: {
      en: 'Use a state register with S0 (nothing), S1 (seen 1), S2 (seen 10). In S2 a 1 means found <= 1 and the machine continues in S1. Set found inside the clocked block (default found <= 0).',
      tr: 'S0 (hiçbir şey), S1 (1 görüldü), S2 (10 görüldü) durumlarıyla bir durum yazmacı kullan. S2\'de gelen 1 için found <= 1 yap ve S1\'e geç. found\'u saatli bloğun içinde ata (varsayılan found <= 0).',
    },
    starter: `module seq101 (
    input  logic clk,
    input  logic rst,
    input  logic din,
    output logic found
);

    // Your code here

endmodule
`,
    reference: `module seq101 (input logic clk, input logic rst, input logic din, output logic found);
    logic [1:0] state;
    always_ff @(posedge clk) begin
        if (rst) begin
            state <= 2'd0;
            found <= 1'b0;
        end else begin
            found <= 1'b0;
            case (state)
                2'd0: if (din) state <= 2'd1;
                2'd1: if (!din) state <= 2'd2;
                2'd2: begin
                    if (din) begin
                        found <= 1'b1;
                        state <= 2'd1;
                    end else begin
                        state <= 2'd0;
                    end
                end
                default: state <= 2'd0;
            endcase
        end
    end
endmodule`,
    sequential: {
      clock: 'clk',
      steps: cycles(['rst', 'din'], [
        [1, 0], [0, 1], [0, 0], [0, 1], [0, 0], [0, 1], [0, 1], [0, 0], [0, 0], [0, 1], [0, 0], [0, 1], [1, 0], [0, 1],
      ]),
    },
  },
];

/* ── Teacher-made tasks (carried inside an assignment link) ────────── */

/** A task a teacher writes: a reference solution defines the ports and the right answers. */
export interface CustomTaskSpec {
  title: string;
  prompt: string;
  hint?: string;
  /** Known-good Verilog; never shown to the student. */
  reference: string;
}

const custom = new Map<string, Exercise>();
let customLoaded = false;

/** Reads the active assignment once, so its tasks are known on every page. */
function ensureCustom() {
  if (customLoaded) return;
  customLoaded = true;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('logiclab_assignment_v1') : null;
    const specs = raw ? (JSON.parse(raw)?.assignment?.custom as CustomTaskSpec[] | undefined) : undefined;
    if (Array.isArray(specs)) registerCustomTasks(specs);
  } catch {
    /* no assignment */
  }
}

export const customId = (i: number) => `c_${i}`;

/**
 * Turns teacher tasks into exercises (ids c_0, c_1 …). A task whose module
 * has an input called clk or clock is graded cycle by cycle, with any
 * reset/rst/clr input held high in the first cycle.
 */
export function buildCustomExercises(specs: CustomTaskSpec[]): Exercise[] {
  return specs.map((spec, i) => {
    const engine = compileVerilog(spec.reference);
    const widths = engine.portWidths ?? {};
    const name = /\bmodule\s+(\w+)/.exec(spec.reference)?.[1] ?? `task${i}`;
    const port = (dir: string, p: string) => `    ${dir} logic ${(widths[p] ?? 1) > 1 ? `[${(widths[p] ?? 1) - 1}:0] ` : ''}${p}`;
    const starter = `module ${name} (\n${[...engine.inputs.map((p) => port('input ', p)), ...engine.outputs.map((p) => port('output', p))].join(',\n')}\n);\n\n    // Your code here\n\nendmodule\n`;
    const clock = engine.inputs.find((p) => /^(clk|clock)$/i.test(p));
    let sequential: Exercise['sequential'];
    if (clock) {
      const others = engine.inputs.filter((p) => p !== clock);
      const reset = others.find((p) => /^(rst|reset|clr|clear)$/i.test(p));
      let seed = 7 + i;
      const rnd = (w: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 8) & ((1 << Math.min(w, 16)) - 1); };
      sequential = {
        clock,
        steps: Array.from({ length: 16 }, (_, k) => Object.fromEntries(others.map((p) => [p, p === reset ? (k === 0 ? 1 : 0) : rnd(widths[p] ?? 1)]))),
      };
    }
    const text = (x: string) => ({ en: x, tr: x });
    return { id: customId(i), level: 'beginner', title: text(spec.title), prompt: text(spec.prompt), hint: text(spec.hint || ''), starter, reference: spec.reference, ...(sequential ? { sequential } : {}) };
  });
}

export function registerCustomTasks(specs: CustomTaskSpec[]) {
  customLoaded = true;
  custom.clear();
  try {
    buildCustomExercises(specs).forEach((e) => custom.set(e.id, e));
  } catch {
    /* a task that no longer compiles is left out */
  }
}

/** Built-in exercises followed by the active assignment's own tasks. */
export function allExercises(): Exercise[] {
  ensureCustom();
  return [...EXERCISES, ...custom.values()];
}

export function getExercise(id: string): Exercise | undefined {
  ensureCustom();
  return EXERCISES.find((e) => e.id === id) ?? custom.get(id);
}

/** Reference module for a truth table: one output value per input combination (first input = MSB). */
export function tableReference(name: string, inputs: string[], outputs: string[], table: number[][]): string {
  const n = inputs.length;
  const lines = [`module ${name} (`, [...inputs.map((p) => `    input  logic ${p}`), ...outputs.map((p) => `    output logic ${p}`)].join(',\n'), ');', '    always_comb begin', `        case ({${inputs.join(', ')}})`];
  for (let m = 0; m < 1 << n; m++) {
    const body = outputs.map((o, k) => `${o} = 1'b${table[m]?.[k] ? 1 : 0};`).join(' ');
    lines.push(`            ${n}'d${m}: begin ${body} end`);
  }
  lines.push(`            default: begin ${outputs.map((o) => `${o} = 1'b0;`).join(' ')} end`, '        endcase', '    end', 'endmodule', '');
  return lines.join('\n');
}
