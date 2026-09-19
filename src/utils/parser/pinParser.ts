import { pinDictionary } from './de2Dictionary';
import { normaliseLcdSignal } from '../../core/peripherals/lcdSignals';

export interface ParsedPort {
  portName: string; // The name in the user's verilog top module (e.g. "my_sw[0]")
  physicalPin: string | null; // Physical pin string (e.g. "PIN_N25")
  virtualComponent: string | null; // Mapped board component (e.g. "SW[0]")
}

/**
 * Attempts to automatically guess the mapped component from the user's port name.
 * e.g. "sw[0]", "SW[12]", "btn_1", "LEDR[3]"
 */
export function autoMapPort(portName: string): string | null {
  const upper = portName.toUpperCase();
  
  if (upper === 'CLK' || upper === 'CLOCK') return 'CLOCK_50';

  // LCD signals, before the generic LED/SW matcher below: LCD_DATA3 would
  // otherwise be caught by the (LED)(\D*)(\d+) branch and mapped to LEDR[3].
  const lcd = normaliseLcdSignal(portName);
  if (lcd) return lcd;

  // Handle HEX arrays like HEX0[0] or HEX0_0
  const hexMatch = upper.match(/HEX(\d+)\D+(\d+)/);
  if (hexMatch) {
    return `HEX${hexMatch[1]}[${hexMatch[2]}]`;
  }

  // Handle standard 1D arrays or scalars: SW0, SW[0], KEY_1, KEY[3]
  const match = upper.match(/(SW|KEY|BTN|LEDG|LEDR|LED)(\D*)(\d+)/);
  if (match) {
    let type = match[1];
    const indexStr = match[3];

    // Normalize types
    if (type === 'BTN') type = 'KEY';
    if (type === 'LED') type = 'LEDR'; // Default generic led to Red

    return `${type}[${indexStr}]`;
  }

  /*
   * Bare bus names, checked LAST so they can never shadow an indexed match.
   *
   *   output [6:0]  HEX0   ->  HEX0    (the whole display)
   *   output [17:0] LEDR   ->  LEDR    (the whole red bank)
   *
   * This is the natural way to write a DE2 design, and without it such a port
   * maps to nothing at all when there is no .qsf to name the pins
   * individually. The mapping layer expands a bus name using the port's
   * declared width, so a scalar port that happens to be called `SW` still
   * resolves to one switch rather than to eighteen.
   */
  if (/^HEX\d+$/.test(upper)) return upper;
  if (upper === 'SW' || upper === 'KEY' || upper === 'LEDR' || upper === 'LEDG') return upper;

  return null;
}

export function parseQsf(qsfContent: string): ParsedPort[] {
  const ports: ParsedPort[] = [];
  const lines = qsfContent.split('\n');

  // set_location_assignment PIN_N25 -to SW[0]
  const regex = /set_location_assignment\s+([A-Za-z0-9_]+)\s+-to\s+([A-Za-z0-9_\[\]]+)/i;

  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;

    const match = line.match(regex);
    if (match) {
      const physicalPin = match[1].toUpperCase();
      const portName = match[2];
      
      let virtualComponent = pinDictionary[physicalPin] || null;
      if (!virtualComponent) {
        // Fallback to auto-mapping based on port name
        virtualComponent = autoMapPort(portName);
      }

      ports.push({ portName, physicalPin, virtualComponent });
    }
  }
  return ports;
}

export function parseXdc(xdcContent: string): ParsedPort[] {
  const ports: ParsedPort[] = [];
  const lines = xdcContent.split('\n');

  // Examples:
  // set_property PACKAGE_PIN V17 [get_ports {sw[0]}]
  // set_property -dict { PACKAGE_PIN V17   IOSTANDARD LVCMOS33 } [get_ports { sw[0] }]
  
  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;

    // A simpler regex to find PACKAGE_PIN and the get_ports target
    const pinMatch = line.match(/PACKAGE_PIN\s+([A-Za-z0-9_]+)/i);
    const portMatch = line.match(/get_ports\s*\{?\s*([A-Za-z0-9_\[\]]+)\s*\}?/i);

    if (pinMatch && portMatch) {
      const physicalPin = pinMatch[1].toUpperCase();
      const portName = portMatch[1];

      let virtualComponent = pinDictionary[physicalPin] || null;
      if (!virtualComponent) {
        virtualComponent = autoMapPort(portName);
      }

      ports.push({ portName, physicalPin, virtualComponent });
    }
  }
  return ports;
}
