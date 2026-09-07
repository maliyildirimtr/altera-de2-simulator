export type ComponentCategory = 
  | 'logic'
  | 'io'
  | 'wires'
  | 'plexers'
  | 'flipflops'
  | 'memory'
  | 'arithmetic'
  | 'switches'
  | 'misc';

export interface ComponentPort {
  id: string;
  name: string;
  label?: string;
  direction: 'input' | 'output';
  bitWidth?: number;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  iconName: string;
  symbolType: 'gate' | 'box' | 'io' | 'power' | 'display' | 'note';
  width: number;
  height: number;
  inputs: ComponentPort[];
  outputs: ComponentPort[];
  /**
   * Generates the Verilog snippet when added to schematic.
   * If it requires a submodule definition, it will include it.
   */
  generateVerilog: (instName: string, outNetPrefix: string) => {
    submoduleCode?: string;
    instanceCode: string;
    wiresToDeclare?: string[];
  };
}

export const CATEGORY_METADATA: Record<ComponentCategory, { label: string; icon: string; order: number }> = {
  logic: { label: 'Logic (Mantık Kapıları)', icon: 'Zap', order: 1 },
  io: { label: 'IO (Giriş/Çıkış)', icon: 'Sliders', order: 2 },
  wires: { label: 'Wires & Connections (Bağlantılar)', icon: 'GitFork', order: 3 },
  plexers: { label: 'Plexers (Seçiciler/Çözücüler)', icon: 'Maximize2', order: 4 },
  flipflops: { label: 'Flip-Flops & Latches (Temel Hafıza)', icon: 'Layers', order: 5 },
  memory: { label: 'Memory (Gelişmiş Bellek)', icon: 'Database', order: 6 },
  arithmetic: { label: 'Arithmetic (Aritmetik Birimler)', icon: 'PlusCircle', order: 7 },
  switches: { label: 'Switches (Anahtarlar & Röleler)', icon: 'ToggleRight', order: 8 },
  misc: { label: 'Misc & Peripherals (Çevre Birimleri)', icon: 'Cpu', order: 9 },
};

export const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  // ─── 1. LOGIC ─────────────────────────────────────────────────────────────
  and_gate: {
    id: 'and_gate',
    name: 'AND Gate',
    category: 'logic',
    description: 'İki girişli VE mantık kapısı (Y = A & B)',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0 & 0; // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  nand_gate: {
    id: 'nand_gate',
    name: 'NAND Gate',
    category: 'logic',
    description: 'İki girişli VE-DEĞİL mantık kapısı (Y = ~(A & B))',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = ~(0 & 0); // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  or_gate: {
    id: 'or_gate',
    name: 'OR Gate',
    category: 'logic',
    description: 'İki girişli VEYA mantık kapısı (Y = A | B)',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0 | 0; // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  nor_gate: {
    id: 'nor_gate',
    name: 'NOR Gate',
    category: 'logic',
    description: 'İki girişli VEYA-DEĞİL mantık kapısı (Y = ~(A | B))',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = ~(0 | 0); // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  xor_gate: {
    id: 'xor_gate',
    name: 'XOR Gate',
    category: 'logic',
    description: 'İki girişli ÖZEL-VEYA kapısı (Y = A ^ B)',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0 ^ 0; // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  xnor_gate: {
    id: 'xnor_gate',
    name: 'XNOR Gate',
    category: 'logic',
    description: 'İki girişli ÖZEL-VEYA-DEĞİL kapısı (Y = ~(A ^ B))',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 60,
    height: 40,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }, { id: 'in1', name: 'B', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = ~(0 ^ 0); // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  not_gate: {
    id: 'not_gate',
    name: 'NOT Gate (Inverter)',
    category: 'logic',
    description: 'Tersleyici mantık kapısı (Y = ~A)',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 50,
    height: 30,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = ~0; // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  buffer_gate: {
    id: 'buffer_gate',
    name: 'Buffer',
    category: 'logic',
    description: 'Sinyal tamponlayıcı (Y = A)',
    iconName: 'Zap',
    symbolType: 'gate',
    width: 50,
    height: 30,
    inputs: [{ id: 'in0', name: 'A', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0; // ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },
  tristate_buffer: {
    id: 'tristate_buffer',
    name: 'Tristate Buffer',
    category: 'logic',
    description: 'Üç durumlu tampon (Enable=1 ise Y=A, aksi halde High-Z)',
    iconName: 'Zap',
    symbolType: 'box',
    width: 70,
    height: 50,
    inputs: [{ id: 'in', name: 'A', direction: 'input' }, { id: 'en', name: 'EN', direction: 'input' }],
    outputs: [{ id: 'out', name: 'Y', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0; // ${inst} tristate`,
        wiresToDeclare: [out]
      };
    }
  },

  // ─── 2. IO (GİRİŞ/ÇIKIŞ) ──────────────────────────────────────────────────
  digital_input: {
    id: 'digital_input',
    name: 'Digital Input (Toggle)',
    category: 'io',
    description: 'Şema üzerinde tıklanarak 0/1 değiştirilen interaktif giriş pini',
    iconName: 'Sliders',
    symbolType: 'io',
    width: 50,
    height: 50,
    inputs: [],
    outputs: [{ id: 'out', name: 'Q', direction: 'output' }],
    generateVerilog: (inst) => {
      const pinName = `IN_${inst}`;
      return {
        instanceCode: `// Input Pin: ${pinName}`,
        wiresToDeclare: [pinName]
      };
    }
  },
  output_probe: {
    id: 'output_probe',
    name: 'Output Probe',
    category: 'io',
    description: 'Bağlanan hattın anlık lojik seviyesini gösteren çıkış probu',
    iconName: 'Activity',
    symbolType: 'io',
    width: 50,
    height: 50,
    inputs: [{ id: 'in', name: 'D', direction: 'input' }],
    outputs: [],
    generateVerilog: (inst) => {
      const pinName = `OUT_${inst}`;
      return {
        instanceCode: `  assign ${pinName} = 0; // Output probe`,
        wiresToDeclare: [pinName]
      };
    }
  },
  clock_input: {
    id: 'clock_input',
    name: 'Clock Generator',
    category: 'io',
    description: 'Periyodik saat sinyali üreteci (50 MHz / Ayarlanabilir saat)',
    iconName: 'Clock',
    symbolType: 'io',
    width: 55,
    height: 45,
    inputs: [],
    outputs: [{ id: 'clk', name: 'CLK', direction: 'output' }],
    generateVerilog: (inst) => {
      const pinName = `CLK_${inst}`;
      return {
        instanceCode: `// Clock generator ${pinName}`,
        wiresToDeclare: [pinName]
      };
    }
  },
  push_button: {
    id: 'push_button',
    name: 'Push Button (Active-Low)',
    category: 'io',
    description: 'DE2 Key tarzı anlık bas-bırak butonu (Normalde 1, basılınca 0)',
    iconName: 'CircleDot',
    symbolType: 'io',
    width: 50,
    height: 50,
    inputs: [],
    outputs: [{ id: 'btn', name: 'KEY_N', direction: 'output' }],
    generateVerilog: (inst) => {
      const pinName = `KEY_${inst}`;
      return {
        instanceCode: `// Pushbutton ${pinName}`,
        wiresToDeclare: [pinName]
      };
    }
  },
  single_led: {
    id: 'single_led',
    name: 'Single LED (Red/Green)',
    category: 'io',
    description: 'Lojik 1 ile yanan, 0 ile sönen LED göstergesi',
    iconName: 'Sun',
    symbolType: 'display',
    width: 45,
    height: 45,
    inputs: [{ id: 'd', name: 'A', direction: 'input' }],
    outputs: [],
    generateVerilog: (inst) => {
      const pinName = `LED_${inst}`;
      return {
        instanceCode: `  assign ${pinName} = 0; // LED indicator`,
        wiresToDeclare: [pinName]
      };
    }
  },

  // ─── 3. WIRES & CONNECTIONS ───────────────────────────────────────────────
  const_vcc: {
    id: 'const_vcc',
    name: 'Constant High (VCC / 1)',
    category: 'wires',
    description: 'Sürekli Lojik 1 (High / Güç) seviyesi sağlayan besleme hattı',
    iconName: 'ArrowUpCircle',
    symbolType: 'power',
    width: 40,
    height: 35,
    inputs: [],
    outputs: [{ id: 'vcc', name: '1', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_vcc`;
      return {
        instanceCode: `  assign ${out} = 1'b1;`,
        wiresToDeclare: [out]
      };
    }
  },
  const_gnd: {
    id: 'const_gnd',
    name: 'Constant Low (GND / 0)',
    category: 'wires',
    description: 'Sürekli Lojik 0 (Low / Toprak) seviyesi sağlayan şasi hattı',
    iconName: 'ArrowDownCircle',
    symbolType: 'power',
    width: 40,
    height: 35,
    inputs: [],
    outputs: [{ id: 'gnd', name: '0', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_gnd`;
      return {
        instanceCode: `  assign ${out} = 1'b0;`,
        wiresToDeclare: [out]
      };
    }
  },

  // ─── 4. PLEXERS ───────────────────────────────────────────────────────────
  mux2: {
    id: 'mux2',
    name: '2-to-1 Multiplexer',
    category: 'plexers',
    description: 'Seçim ucuna (S) göre I0 veya I1 girişini çıkışa aktarır (Y = S ? I1 : I0)',
    iconName: 'Maximize2',
    symbolType: 'box',
    width: 80,
    height: 80,
    inputs: [
      { id: 'i0', name: 'i0', direction: 'input' },
      { id: 'i1', name: 'i1', direction: 'input' },
      { id: 's', name: 's', direction: 'input' }
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'output' }],
    generateVerilog: (inst) => {
      const submoduleCode = `module mux2 (
    input logic i0, i1, s,
    output logic out
);
    assign out = s ? i1 : i0;
endmodule`;

      const wires = [`w_${inst}_i0`, `w_${inst}_i1`, `w_${inst}_s`, `w_${inst}_out`];
      const instanceCode = `  mux2 ${inst} (
    .i0(${wires[0]}),
    .i1(${wires[1]}),
    .s(${wires[2]}),
    .out(${wires[3]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  mux4: {
    id: 'mux4',
    name: '4-to-1 Multiplexer',
    category: 'plexers',
    description: '2 bitlik seçim hattına (S1, S0) göre 4 girişten birini seçer',
    iconName: 'Maximize2',
    symbolType: 'box',
    width: 90,
    height: 100,
    inputs: [
      { id: 'i0', name: 'i0', direction: 'input' },
      { id: 'i1', name: 'i1', direction: 'input' },
      { id: 'i2', name: 'i2', direction: 'input' },
      { id: 'i3', name: 'i3', direction: 'input' },
      { id: 's0', name: 's0', direction: 'input' },
      { id: 's1', name: 's1', direction: 'input' }
    ],
    outputs: [{ id: 'out', name: 'out', direction: 'output' }],
    generateVerilog: (inst) => {
      const submoduleCode = `module mux4 (
    input logic i0, i1, i2, i3, s0, s1,
    output logic out
);
    assign out = s1 ? (s0 ? i3 : i2) : (s0 ? i1 : i0);
endmodule`;

      const wires = [`w_${inst}_i0`, `w_${inst}_i1`, `w_${inst}_i2`, `w_${inst}_i3`, `w_${inst}_s0`, `w_${inst}_s1`, `w_${inst}_out`];
      const instanceCode = `  mux4 ${inst} (
    .i0(${wires[0]}),
    .i1(${wires[1]}),
    .i2(${wires[2]}),
    .i3(${wires[3]}),
    .s0(${wires[4]}),
    .s1(${wires[5]}),
    .out(${wires[6]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  demux2: {
    id: 'demux2',
    name: '1-to-2 Demultiplexer',
    category: 'plexers',
    description: 'Tek girişi (IN) seçim hattına göre Y0 veya Y1 çıkışına yönlendirir',
    iconName: 'Minimize2',
    symbolType: 'box',
    width: 80,
    height: 75,
    inputs: [
      { id: 'in', name: 'in', direction: 'input' },
      { id: 's', name: 's', direction: 'input' }
    ],
    outputs: [
      { id: 'y0', name: 'y0', direction: 'output' },
      { id: 'y1', name: 'y1', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module demux2 (
    input logic in, s,
    output logic y0, y1
);
    assign y0 = ~s & in;
    assign y1 = s & in;
endmodule`;

      const wires = [`w_${inst}_in`, `w_${inst}_s`, `w_${inst}_y0`, `w_${inst}_y1`];
      const instanceCode = `  demux2 ${inst} (
    .in(${wires[0]}),
    .s(${wires[1]}),
    .y0(${wires[2]}),
    .y1(${wires[3]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  decoder2to4: {
    id: 'decoder2to4',
    name: '2-to-4 Decoder',
    category: 'plexers',
    description: '2 bitlik ikili kodu 4 hatlık aktif-yüksek çıkışa çözer',
    iconName: 'Grid',
    symbolType: 'box',
    width: 90,
    height: 100,
    inputs: [
      { id: 'a', name: 'a', direction: 'input' },
      { id: 'b', name: 'b', direction: 'input' },
      { id: 'en', name: 'en', direction: 'input' }
    ],
    outputs: [
      { id: 'y0', name: 'y0', direction: 'output' },
      { id: 'y1', name: 'y1', direction: 'output' },
      { id: 'y2', name: 'y2', direction: 'output' },
      { id: 'y3', name: 'y3', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module decoder2to4 (
    input logic a, b, en,
    output logic y0, y1, y2, y3
);
    assign y0 = en & ~a & ~b;
    assign y1 = en & a & ~b;
    assign y2 = en & ~a & b;
    assign y3 = en & a & b;
endmodule`;

      const wires = [`w_${inst}_a`, `w_${inst}_b`, `w_${inst}_en`, `w_${inst}_y0`, `w_${inst}_y1`, `w_${inst}_y2`, `w_${inst}_y3`];
      const instanceCode = `  decoder2to4 ${inst} (
    .a(${wires[0]}),
    .b(${wires[1]}),
    .en(${wires[2]}),
    .y0(${wires[3]}),
    .y1(${wires[4]}),
    .y2(${wires[5]}),
    .y3(${wires[6]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },

  // ─── 5. FLIP-FLOPS & LATCHES ──────────────────────────────────────────────
  d_flip_flop: {
    id: 'd_flip_flop',
    name: 'D Flip-Flop (D-FF)',
    category: 'flipflops',
    description: 'Saat kenarında veri girişi D\'yi çıkış Q\'ya kaydeden temel bellek hücresi',
    iconName: 'Layers',
    symbolType: 'box',
    width: 85,
    height: 80,
    inputs: [
      { id: 'clk', name: 'clk', direction: 'input' },
      { id: 'd', name: 'd', direction: 'input' }
    ],
    outputs: [
      { id: 'q', name: 'q', direction: 'output' },
      { id: 'qn', name: 'qn', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module d_flip_flop (
    input logic clk, d,
    output logic q, qn
);
    reg q_reg;
    always @(posedge clk) begin
        q_reg <= d;
    end
    assign q = q_reg;
    assign qn = ~q_reg;
endmodule`;

      const wires = [`w_${inst}_clk`, `w_${inst}_d`, `w_${inst}_q`, `w_${inst}_qn`];
      const instanceCode = `  d_flip_flop ${inst} (
    .clk(${wires[0]}),
    .d(${wires[1]}),
    .q(${wires[2]}),
    .qn(${wires[3]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  jk_flip_flop: {
    id: 'jk_flip_flop',
    name: 'JK Flip-Flop',
    category: 'flipflops',
    description: 'J/K girişlerine göre Tut (00), Sıfırla (01), Birle (10) veya Tersle (11) yapan hafıza hücresi',
    iconName: 'Layers',
    symbolType: 'box',
    width: 85,
    height: 90,
    inputs: [
      { id: 'clk', name: 'clk', direction: 'input' },
      { id: 'j', name: 'j', direction: 'input' },
      { id: 'k', name: 'k', direction: 'input' }
    ],
    outputs: [
      { id: 'q', name: 'q', direction: 'output' },
      { id: 'qn', name: 'qn', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module jk_flip_flop (
    input logic clk, j, k,
    output logic q, qn
);
    reg q_reg;
    always @(posedge clk) begin
        if (j & ~k) q_reg <= 1;
        else if (~j & k) q_reg <= 0;
        else if (j & k) q_reg <= ~q_reg;
    end
    assign q = q_reg;
    assign qn = ~q_reg;
endmodule`;

      const wires = [`w_${inst}_clk`, `w_${inst}_j`, `w_${inst}_k`, `w_${inst}_q`, `w_${inst}_qn`];
      const instanceCode = `  jk_flip_flop ${inst} (
    .clk(${wires[0]}),
    .j(${wires[1]}),
    .k(${wires[2]}),
    .q(${wires[3]}),
    .qn(${wires[4]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  t_flip_flop: {
    id: 't_flip_flop',
    name: 'T Flip-Flop (Toggle)',
    category: 'flipflops',
    description: 'T=1 olduğunda her saat darbesinde durumunu tersleyen (toggle) sayaç elemanı',
    iconName: 'Layers',
    symbolType: 'box',
    width: 85,
    height: 80,
    inputs: [
      { id: 'clk', name: 'clk', direction: 'input' },
      { id: 't', name: 't', direction: 'input' }
    ],
    outputs: [
      { id: 'q', name: 'q', direction: 'output' },
      { id: 'qn', name: 'qn', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module t_flip_flop (
    input logic clk, t,
    output logic q, qn
);
    reg q_reg;
    always @(posedge clk) begin
        if (t) q_reg <= ~q_reg;
    end
    assign q = q_reg;
    assign qn = ~q_reg;
endmodule`;

      const wires = [`w_${inst}_clk`, `w_${inst}_t`, `w_${inst}_q`, `w_${inst}_qn`];
      const instanceCode = `  t_flip_flop ${inst} (
    .clk(${wires[0]}),
    .t(${wires[1]}),
    .q(${wires[2]}),
    .qn(${wires[3]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },

  // ─── 6. MEMORY ────────────────────────────────────────────────────────────
  counter4: {
    id: 'counter4',
    name: '4-bit Binary Counter',
    category: 'memory',
    description: 'Her saat darbesinde 0-15 arası sayan ve elde (TC / Carry) veren 4-bitlik ikili sayaç',
    iconName: 'TrendingUp',
    symbolType: 'box',
    width: 95,
    height: 105,
    inputs: [
      { id: 'clk', name: 'clk', direction: 'input' },
      { id: 'rst', name: 'rst', direction: 'input' },
      { id: 'en', name: 'en', direction: 'input' }
    ],
    outputs: [
      { id: 'q0', name: 'q0', direction: 'output' },
      { id: 'q1', name: 'q1', direction: 'output' },
      { id: 'q2', name: 'q2', direction: 'output' },
      { id: 'q3', name: 'q3', direction: 'output' },
      { id: 'tc', name: 'tc', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module counter4 (
    input logic clk, rst, en,
    output logic q0, q1, q2, q3, tc
);
    reg [3:0] count;
    always @(posedge clk) begin
        if (rst) count <= 0;
        else if (en) count <= count + 1;
    end
    assign q0 = count[0];
    assign q1 = count[1];
    assign q2 = count[2];
    assign q3 = count[3];
    assign tc = (count == 4'b1111) & en;
endmodule`;

      const wires = [`w_${inst}_clk`, `w_${inst}_rst`, `w_${inst}_en`, `w_${inst}_q0`, `w_${inst}_q1`, `w_${inst}_q2`, `w_${inst}_q3`, `w_${inst}_tc`];
      const instanceCode = `  counter4 ${inst} (
    .clk(${wires[0]}),
    .rst(${wires[1]}),
    .en(${wires[2]}),
    .q0(${wires[3]}),
    .q1(${wires[4]}),
    .q2(${wires[5]}),
    .q3(${wires[6]}),
    .tc(${wires[7]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },

  // ─── 7. ARITHMETIC ────────────────────────────────────────────────────────
  half_adder: {
    id: 'half_adder',
    name: 'Half Adder',
    category: 'arithmetic',
    description: 'İki adet 1 bitlik sayıyı toplayan yarım toplayıcı (S = A ^ B, C = A & B)',
    iconName: 'PlusCircle',
    symbolType: 'box',
    width: 80,
    height: 75,
    inputs: [
      { id: 'a', name: 'a', direction: 'input' },
      { id: 'b', name: 'b', direction: 'input' }
    ],
    outputs: [
      { id: 's', name: 's', direction: 'output' },
      { id: 'c', name: 'c', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module half_adder (
    input logic a, b,
    output logic s, c
);
    assign s = a ^ b;
    assign c = a & b;
endmodule`;

      const wires = [`w_${inst}_a`, `w_${inst}_b`, `w_${inst}_s`, `w_${inst}_c`];
      const instanceCode = `  half_adder ${inst} (
    .a(${wires[0]}),
    .b(${wires[1]}),
    .s(${wires[2]}),
    .c(${wires[3]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  full_adder: {
    id: 'full_adder',
    name: 'Full Adder',
    category: 'arithmetic',
    description: 'A, B ve önceki elden gelen Cin girişini toplayan tam toplayıcı',
    iconName: 'PlusCircle',
    symbolType: 'box',
    width: 85,
    height: 85,
    inputs: [
      { id: 'a', name: 'a', direction: 'input' },
      { id: 'b', name: 'b', direction: 'input' },
      { id: 'cin', name: 'cin', direction: 'input' }
    ],
    outputs: [
      { id: 's', name: 's', direction: 'output' },
      { id: 'cout', name: 'cout', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module full_adder (
    input logic a, b, cin,
    output logic s, cout
);
    assign s = a ^ b ^ cin;
    assign cout = (a & b) | (cin & (a ^ b));
endmodule`;

      const wires = [`w_${inst}_a`, `w_${inst}_b`, `w_${inst}_cin`, `w_${inst}_s`, `w_${inst}_cout`];
      const instanceCode = `  full_adder ${inst} (
    .a(${wires[0]}),
    .b(${wires[1]}),
    .cin(${wires[2]}),
    .s(${wires[3]}),
    .cout(${wires[4]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },
  comparator4: {
    id: 'comparator4',
    name: '4-bit Comparator',
    category: 'arithmetic',
    description: 'A ve B sayılarını karşılaştırır (A > B, A == B, A < B)',
    iconName: 'Scale',
    symbolType: 'box',
    width: 90,
    height: 90,
    inputs: [
      { id: 'a0', name: 'a0', direction: 'input' },
      { id: 'a1', name: 'a1', direction: 'input' },
      { id: 'b0', name: 'b0', direction: 'input' },
      { id: 'b1', name: 'b1', direction: 'input' }
    ],
    outputs: [
      { id: 'gt', name: 'gt', direction: 'output' },
      { id: 'eq', name: 'eq', direction: 'output' },
      { id: 'lt', name: 'lt', direction: 'output' }
    ],
    generateVerilog: (inst) => {
      const submoduleCode = `module comparator4 (
    input logic a0, a1, b0, b1,
    output logic gt, eq, lt
);
    assign gt = {a1, a0} > {b1, b0};
    assign eq = {a1, a0} == {b1, b0};
    assign lt = {a1, a0} < {b1, b0};
endmodule`;

      const wires = [`w_${inst}_a0`, `w_${inst}_a1`, `w_${inst}_b0`, `w_${inst}_b1`, `w_${inst}_gt`, `w_${inst}_eq`, `w_${inst}_lt`];
      const instanceCode = `  comparator4 ${inst} (
    .a0(${wires[0]}),
    .a1(${wires[1]}),
    .b0(${wires[2]}),
    .b1(${wires[3]}),
    .gt(${wires[4]}),
    .eq(${wires[5]}),
    .lt(${wires[6]})
  );`;

      return {
        submoduleCode,
        instanceCode,
        wiresToDeclare: wires
      };
    }
  },

  // ─── 8. SWITCHES & RELAYS ─────────────────────────────────────────────────
  spst_switch: {
    id: 'spst_switch',
    name: 'SPST Switch',
    category: 'switches',
    description: 'Tek kutuplu tek yönlü aç/kapa mekanik anahtar',
    iconName: 'ToggleLeft',
    symbolType: 'box',
    width: 60,
    height: 45,
    inputs: [{ id: 'in', name: 'A', direction: 'input' }],
    outputs: [{ id: 'out', name: 'B', direction: 'output' }],
    generateVerilog: (inst, prefix) => {
      const out = `${prefix}_${inst}_out`;
      return {
        instanceCode: `  assign ${out} = 0; // SPST Switch ${inst}`,
        wiresToDeclare: [out]
      };
    }
  },

  // ─── 9. MISC & PERIPHERALS ────────────────────────────────────────────────
  text_note: {
    id: 'text_note',
    name: 'Text Box / Note',
    category: 'misc',
    description: 'Devre şeması üzerine açıklayıcı not ve etiket ekleme bloğu',
    iconName: 'FileText',
    symbolType: 'note',
    width: 140,
    height: 60,
    inputs: [],
    outputs: [],
    generateVerilog: (inst) => {
      return {
        instanceCode: `// Note: ${inst}`
      };
    }
  },
  buzzer: {
    id: 'buzzer',
    name: 'Buzzer / Audio',
    category: 'misc',
    description: 'Lojik 1 seviyesinde sesli geri bildirim veren piezo buzzer göstergesi',
    iconName: 'Volume2',
    symbolType: 'box',
    width: 60,
    height: 50,
    inputs: [{ id: 'in', name: 'IN', direction: 'input' }],
    outputs: [],
    generateVerilog: (inst) => {
      return {
        instanceCode: `// Buzzer: ${inst}`
      };
    }
  }
};
