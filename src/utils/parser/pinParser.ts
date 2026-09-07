import { pinDictionary } from './de2Dictionary';

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

  // Regex to find things like SW0, SW[0], KEY_1, KEY[3]
  const match = upper.match(/(SW|KEY|BTN|LEDG|LEDR|LED|HEX)(\D*)(\d+)/);
  if (match) {
    let type = match[1];
    const indexStr = match[3];

    // Normalize types
    if (type === 'BTN') type = 'KEY';
    if (type === 'LED') type = 'LEDR'; // Default generic led to Red

    return `${type}[${indexStr}]`;
  }
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
