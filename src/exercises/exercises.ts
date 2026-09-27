/**
 * Combinational exercises with automatic checking (see grader.ts).
 * Each reference solution defines the exact ports the student must use.
 */
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
}

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
];

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
