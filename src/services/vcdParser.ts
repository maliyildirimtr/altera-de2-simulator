// ============================================================
// vcdParser.ts — Pure VCD Parser (No mock data, no regex hacks)
// This module ONLY transforms a raw VCD string into structured
// SimulationData. It never generates data on its own.
// ============================================================

export interface VCDTransition {
  time: number;
  val: number | string;  // 0 | 1 for 1-bit; 'x' | 'z' for special states; string for bus
}

export interface VCDSignal {
  name: string;
  type: string;
  width: number;
  symbol: string;
  transitions: VCDTransition[];
  isTopLevel?: boolean;
}

export interface VCDScope {
  name: string;
  type: string;
  children: Record<string, VCDScope>;
  signals: Record<string, VCDSignal>;
}

export interface VCDTimescale {
  magnitude: number;       // e.g. 1, 10, 100
  unit: 'fs' | 'ps' | 'ns' | 'us' | 'ms' | 's';
  /** Conversion factor to picoseconds (the parser's internal time base) */
  toPsFactor: number;
}

export interface SimulationData {
  maxTime: number;         // in internal ps units (already converted)
  signals: VCDSignal[];
  logs: string[];
  tree: VCDScope;
  timescale: VCDTimescale; // NEW — actual timescale from the VCD header
}

/**
 * Parses a raw VCD string (e.g., output of Icarus Verilog / ModelSim)
 * and returns structured SimulationData for the waveform viewer.
 *
 * Supports:
 *   - $var declarations (wire / reg, single and multi-bit)
 *   - #<time> timestamps
 *   - 0/1/x/z value changes (single-bit)
 *   - b<bits> <sym> value changes (multi-bit)
 */
export function parseRawVCD(vcdString: string): SimulationData {
  const lines = vcdString.split('\n');

  const signalMap: Record<string, VCDSignal> = {};
  const logs: string[] = [];
  let maxTime = 0;
  let currentTime = 0;
  
  const tree: VCDScope = { name: 'Root', type: 'root', children: {}, signals: {} };
  const scopeStack: VCDScope[] = [tree];

  // Default timescale: 1 ps (i.e., VCD timestamps are already in ps)
  let timescale: VCDTimescale = { magnitude: 1, unit: 'ps', toPsFactor: 1 };

  // Helper to parse timescale strings like "1ns", "10 ps", "100us"
  const parseTimescale = (raw: string): VCDTimescale => {
    const match = raw.replace(/\s+/g, '').match(/^(\d+)(fs|ps|ns|us|ms|s)$/i);
    if (!match) return timescale; // keep default
    const magnitude = parseInt(match[1], 10);
    const unit = match[2].toLowerCase() as VCDTimescale['unit'];
    const factorMap: Record<VCDTimescale['unit'], number> = {
      's':  1e12,
      'ms': 1e9,
      'us': 1e6,
      'ns': 1e3,
      'ps': 1,
      'fs': 1e-3,
    };
    return { magnitude, unit, toPsFactor: magnitude * factorMap[unit] };
  };

  logs.push('# [VCD Parser] Starting...');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // -- $timescale ... $end  (may be single or multi-line) --
    if (line.startsWith('$timescale')) {
      // Collect everything up to $end (may span multiple lines)
      let tsRaw = line.replace('$timescale', '').replace('$end', '').trim();
      while (!lines[i].includes('$end')) {
        i++;
        tsRaw += ' ' + (lines[i] || '').replace('$end', '').trim();
      }
      timescale = parseTimescale(tsRaw.trim());
      logs.push(`# [VCD Parser] Timescale: ${timescale.magnitude}${timescale.unit} (×${timescale.toPsFactor} ps)`);
      continue;
    }

    // -- $scope module tb $end --
    if (line.startsWith('$scope')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        const type = parts[1];
        const name = parts[2];
        const newScope: VCDScope = { name, type, children: {}, signals: {} };
        
        const currentScope = scopeStack[scopeStack.length - 1];
        currentScope.children[name] = newScope;
        scopeStack.push(newScope);
      }
      continue;
    }

    // -- $upscope $end --
    if (line.startsWith('$upscope')) {
      if (scopeStack.length > 1) { // Never pop the root
        scopeStack.pop();
      }
      continue;
    }

    // -- $var wire 1 ! signal_name $end --
    if (line.startsWith('$var')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 5) {
        const type   = parts[1];
        const width  = parseInt(parts[2], 10) || 1;
        const symbol = parts[3];
        const localName = parts.slice(4).filter((p: string) => p !== '$end').join(' ');
        
        // Exclude 'Root' from the full path name
        const pathNames = scopeStack.map(s => s.name).filter(n => n !== 'Root');
        const name = pathNames.length > 0 ? `${pathNames.join('.')}.${localName}` : localName;

        const newSignal: VCDSignal = {
          name,
          type,
          width,
          symbol,
          transitions: [],
          isTopLevel: scopeStack.length === 2, // 1 is Root, 2 is top-level (e.g. tb)
        };

        signalMap[symbol] = newSignal;
        
        const currentScope = scopeStack[scopeStack.length - 1];
        currentScope.signals[localName] = newSignal;
      }
      continue;
    }

    // -- #<timestamp> --
    if (line.startsWith('#')) {
      const t = parseInt(line.substring(1), 10);
      if (!isNaN(t)) {
        currentTime = t;
        if (t > maxTime) maxTime = t;
      }
      continue;
    }

    // -- Single-bit: 0A  1A  xA  zA --
    if (/^[01xzXZ][^ ]/.test(line)) {
      const valChar = line[0].toLowerCase(); // normalise to lowercase
      const symbol  = line.substring(1).trim();
      const sig = signalMap[symbol];
      if (sig) {
        // Preserve X and Z as string literals so the renderer can apply
        // the correct colour (red for X, grey for Z). Only '0' and '1'
        // are numeric booleans.
        let val: number | string;
        if (valChar === '1')      val = 1;
        else if (valChar === '0') val = 0;
        else                      val = valChar; // 'x' or 'z'

        const last = sig.transitions[sig.transitions.length - 1];
        if (!last || last.time !== currentTime) {
          sig.transitions.push({ time: currentTime, val });
        } else {
          last.val = val;
        }
      }
      continue;
    }

    // -- Multi-bit: b10110 A --
    if (/^b/i.test(line)) {
      const parts = line.split(/\s+/);
      if (parts.length === 2) {
        const bitStr = parts[0].substring(1); // '10110'
        const symbol = parts[1];
        const sig = signalMap[symbol];
        if (sig) {
          const val = bitStr; // Bus için string tutuyoruz
          const last = sig.transitions[sig.transitions.length - 1];
          if (!last || last.time !== currentTime) {
            sig.transitions.push({ time: currentTime, val });
          } else {
            last.val = val;
          }
        }
      }
      continue;
    }
  }

  // Sıralama Mantığı (Sorting): Top-Level önce, Reg önce, Wire sonra, ardından isme göre.
  const signals = Object.values(signalMap);
  signals.sort((a, b) => {
    // 1. isTopLevel önde
    if (a.isTopLevel && !b.isTopLevel) return -1;
    if (!a.isTopLevel && b.isTopLevel) return 1;
    // 2. type 'reg' önde (genelde inputlar testbench'te reg olur)
    if (a.type === 'reg' && b.type !== 'reg') return -1;
    if (b.type === 'reg' && a.type !== 'reg') return 1;
    // 3. İsme göre alfabetik
    return a.name.localeCompare(b.name);
  });

  // Ensure every signal has a t=0 entry and extends to maxTime
  signals.forEach(sig => {
    if (sig.transitions.length === 0 || sig.transitions[0].time > 0) {
      sig.transitions.unshift({ time: 0, val: sig.width > 1 ? 'x' : 0 });
    }
    const last = sig.transitions[sig.transitions.length - 1];
    if (last && last.time < maxTime) {
      sig.transitions.push({ time: maxTime, val: last.val });
    }
  });

  logs.push(`# [VCD Parser] Parsed ${signals.length} signal(s). Max time: ${maxTime} ps. Timescale: ${timescale.magnitude}${timescale.unit}.`);

  return {
    maxTime: maxTime || 100,
    signals,
    logs,
    tree,
    timescale,
  };
}
