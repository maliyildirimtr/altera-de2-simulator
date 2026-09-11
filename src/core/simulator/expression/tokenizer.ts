export type TokenType = 
  | 'Identifier'
  | 'Number'
  | 'Operator'
  | 'Punctuation'
  | 'Keyword'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  'begin', 'end', 'if', 'else', 'case', 'endcase', 'default',
  'always', 'always_ff', 'always_comb', 'posedge', 'negedge', 'assign'
]);

// Sorted by length to match longest first
const OPERATORS = [
  '<=', '>=', '==', '!=', '<<', '>>', 
  '+', '-', '&', '|', '^', '~', '!', '<', '>', '?', ':', '='
];

const PUNCTUATION = new Set(['(', ')', '[', ']', '{', '}', ';', ',', '@']);

export class Tokenizer {
  private pos = 0;
  private input = '';

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const token = this.nextToken();
      if (!token) {
        throw new Error(`Unexpected character at index ${this.pos}: '${this.input[this.pos]}'`);
      }
      tokens.push(token);
    }
    tokens.push({ type: 'EOF', value: '', start: this.pos, end: this.pos });
    return tokens;
  }

  private skipWhitespace() {
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (/\s/.test(c)) {
        this.pos++;
      } else if (c === '/' && this.input[this.pos + 1] === '/') {
        // Line comment
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.pos++;
        }
      } else if (c === '/' && this.input[this.pos + 1] === '*') {
        // Block comment
        this.pos += 2;
        while (this.pos < this.input.length && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
          this.pos++;
        }
        this.pos += 2;
      } else {
        break;
      }
    }
  }

  private nextToken(): Token | null {
    const c = this.input[this.pos];

    // Numbers: e.g. 4'b0000, 8'hFF, 10, 1'b1
    // A number can start with a digit.
    if (/[0-9]/.test(c)) {
      const start = this.pos;
      let val = '';
      
      // Match base/width part e.g., 4'b
      const widthBaseMatch = this.input.slice(this.pos).match(/^(\d+'[bBoOdDhH][0-9a-fA-FxXzZ_]+)/i);
      if (widthBaseMatch) {
        val = widthBaseMatch[1];
        this.pos += val.length;
        return { type: 'Number', value: val, start, end: this.pos };
      }

      // Plain decimal
      while (this.pos < this.input.length && /[0-9_]/.test(this.input[this.pos])) {
        val += this.input[this.pos];
        this.pos++;
      }
      return { type: 'Number', value: val, start, end: this.pos };
    }

    // Identifiers and Keywords
    if (/[a-zA-Z_]/.test(c)) {
      const start = this.pos;
      let val = '';
      while (this.pos < this.input.length && /[a-zA-Z0-9_$]/.test(this.input[this.pos])) {
        val += this.input[this.pos];
        this.pos++;
      }
      if (KEYWORDS.has(val)) {
        return { type: 'Keyword', value: val, start, end: this.pos };
      }
      return { type: 'Identifier', value: val, start, end: this.pos };
    }

    // Operators
    for (const op of OPERATORS) {
      if (this.input.startsWith(op, this.pos)) {
        const start = this.pos;
        this.pos += op.length;
        return { type: 'Operator', value: op, start, end: this.pos };
      }
    }

    // Punctuation
    if (PUNCTUATION.has(c)) {
      const start = this.pos;
      this.pos++;
      return { type: 'Punctuation', value: c, start, end: this.pos };
    }

    return null;
  }
}

export function parseVerilogLiteralVal(lit: string): number {
  lit = lit.trim().replace(/_/g, '');
  const binMatch = lit.match(/^\d+'b([01xXzZ]+)$/i);
  if (binMatch) return parseInt(binMatch[1].replace(/[xXzZ]/g, '0'), 2) || 0;
  const hexMatch = lit.match(/^\d+'h([0-9a-fA-F]+)$/i);
  if (hexMatch) return parseInt(hexMatch[1], 16) || 0;
  const decMatch = lit.match(/^\d+'d([0-9]+)$/i);
  if (decMatch) return parseInt(decMatch[1], 10) || 0;
  const octMatch = lit.match(/^\d+'o([0-7]+)$/i);
  if (octMatch) return parseInt(octMatch[1], 8) || 0;
  if (/^\d+$/.test(lit)) return parseInt(lit, 10);
  return 0;
}
