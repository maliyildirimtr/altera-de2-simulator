import type { Expr, LValue, Stmt, BlockStmt, IfStmt, CaseStmt, AssignStmt, AlwaysBlock, ModuleAST } from './ast';
import { Tokenizer, parseVerilogLiteralVal } from './tokenizer';
import type { Token } from './tokenizer';

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(input: string) {
    const tokenizer = new Tokenizer(input);
    this.tokens = tokenizer.tokenize();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private check(type: string, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private match(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.current++;
      return true;
    }
    return false;
  }

  private consume(type: string, value?: string, message?: string): Token {
    if (this.check(type, value)) {
      return this.tokens[this.current++];
    }
    const p = this.peek();
    const prev = this.tokens[this.current - 1];
    throw new Error(message || `Expected ${type}${value ? ` '${value}'` : ''} at index ${p.start}, got ${p.type} '${p.value}'. Prev was ${prev?.type} '${prev?.value}'`);
  }

  // --- Expressions ---

  public parseExpr(): Expr {
    return this.conditional();
  }

  private conditional(): Expr {
    let expr = this.bitwiseOr();

    if (this.match('Operator', '?')) {
      const trueBranch = this.parseExpr();
      this.consume('Operator', ':');
      const falseBranch = this.parseExpr();
      expr = { type: 'Conditional', condition: expr, trueBranch, falseBranch };
    }

    return expr;
  }

  private bitwiseOr(): Expr {
    let expr = this.bitwiseXor();
    while (this.match('Operator', '|')) {
      const operator = this.previous().value;
      const right = this.bitwiseXor();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private bitwiseXor(): Expr {
    let expr = this.bitwiseAnd();
    while (this.match('Operator', '^') || this.match('Operator', '~^') || this.match('Operator', '^~')) {
      const operator = this.previous().value;
      const right = this.bitwiseAnd();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private bitwiseAnd(): Expr {
    let expr = this.equality();
    while (this.match('Operator', '&')) {
      const operator = this.previous().value;
      const right = this.equality();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.relational();
    while (this.match('Operator', '==') || this.match('Operator', '!=')) {
      const operator = this.previous().value;
      const right = this.relational();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private relational(): Expr {
    let expr = this.shift();
    while (this.match('Operator', '<') || this.match('Operator', '>') || this.match('Operator', '<=') || this.match('Operator', '>=')) {
      const operator = this.previous().value;
      const right = this.shift();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private shift(): Expr {
    let expr = this.addition();
    while (this.match('Operator', '<<') || this.match('Operator', '>>')) {
      const operator = this.previous().value;
      const right = this.addition();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private addition(): Expr {
    let expr = this.unary();
    while (this.match('Operator', '+') || this.match('Operator', '-')) {
      const operator = this.previous().value;
      const right = this.unary();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match('Operator', '~') || this.match('Operator', '!') || this.match('Operator', '-') || this.match('Operator', '+')) {
      const operator = this.previous().value;
      const right = this.unary();
      return { type: 'Unary', operator, right };
    }
    return this.primary();
  }

  private primary(): Expr {
    if (this.match('Number')) {
      return { type: 'Literal', value: parseVerilogLiteralVal(this.previous().value) };
    }

    if (this.match('Identifier')) {
      const name = this.previous().value;
      if (this.match('Punctuation', '[')) {
        const high = this.parseExpr();
        let low: Expr | undefined;
        if (this.match('Operator', ':')) {
          low = this.parseExpr();
        }
        this.consume('Punctuation', ']');
        return { type: 'BitSelect', name, high, low };
      }
      return { type: 'Identifier', name };
    }

    if (this.match('Punctuation', '(')) {
      const expr = this.parseExpr();
      this.consume('Punctuation', ')');
      return expr;
    }

    if (this.match('Punctuation', '{')) {
      const expressions: Expr[] = [];
      do {
        expressions.push(this.parseExpr());
      } while (this.match('Punctuation', ','));
      this.consume('Punctuation', '}');
      return { type: 'Concat', expressions };
    }

    throw new Error(`Unexpected token at index ${this.peek().start}: ${this.peek().value}`);
  }

  // --- Statements ---

  public parseModuleBody(): ModuleAST {
    const continuousAssigns: AssignStmt[] = [];
    const alwaysBlocks: AlwaysBlock[] = [];

    while (!this.isAtEnd()) {
      if (this.match('Keyword', 'assign')) {
        continuousAssigns.push(this.assignStatement());
      } else if (this.check('Keyword', 'always_comb') || this.check('Keyword', 'always_ff') || this.check('Keyword', 'always')) {
        const header = this.parseAlwaysBlockHeader();
        const body = this.parseStatement();
        alwaysBlocks.push({ edge: header.edge, signal: header.signal, body });
      } else {
        throw new Error(`Expected 'assign' or 'always' at index ${this.peek().start}, got ${this.peek().value}`);
      }
    }
    return { continuousAssigns, alwaysBlocks };
  }

  public parseStatement(): Stmt {
    if (this.match('Keyword', 'begin')) {
      return this.blockStatement();
    }
    if (this.match('Keyword', 'if')) {
      return this.ifStatement();
    }
    if (this.match('Keyword', 'case')) {
      return this.caseStatement();
    }
    
    // Fallback to Assignment statement
    return this.assignStatement();
  }

  private blockStatement(): BlockStmt {
    const statements: Stmt[] = [];
    // Allow optional label: begin : label
    if (this.match('Operator', ':')) {
      this.consume('Identifier');
    }
    while (!this.check('Keyword', 'end') && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }
    this.consume('Keyword', 'end');
    if (this.match('Operator', ':')) { // optional end : label
      this.consume('Identifier');
    }
    return { type: 'Block', statements };
  }

  private ifStatement(): IfStmt {
    this.consume('Punctuation', '(');
    const condition = this.parseExpr();
    this.consume('Punctuation', ')');

    const thenBranch = this.parseStatement();
    let elseBranch: Stmt | undefined;

    if (this.match('Keyword', 'else')) {
      elseBranch = this.parseStatement();
    }

    return { type: 'If', condition, thenBranch, elseBranch };
  }

  private caseStatement(): CaseStmt {
    this.consume('Punctuation', '(');
    const condition = this.parseExpr();
    this.consume('Punctuation', ')');

    const cases: { value: Expr | 'default'; stmt: Stmt }[] = [];

    while (!this.check('Keyword', 'endcase') && !this.isAtEnd()) {
      if (this.match('Keyword', 'default')) {
        this.consume('Operator', ':');
        const stmt = this.parseStatement();
        cases.push({ value: 'default', stmt });
      } else {
        const val = this.parseExpr();
        this.consume('Operator', ':');
        const stmt = this.parseStatement();
        cases.push({ value: val, stmt });
      }
    }
    this.consume('Keyword', 'endcase');
    return { type: 'Case', condition, cases };
  }

  private assignStatement(): AssignStmt {
    // Parse LValue
    let target: LValue;
    const name = this.consume('Identifier').value;
    if (this.match('Punctuation', '[')) {
      const high = this.parseExpr();
      let low: Expr | undefined;
      if (this.match('Operator', ':')) {
        low = this.parseExpr();
      }
      this.consume('Punctuation', ']');
      target = { type: 'BitSelect', name, high, low };
    } else {
      target = { type: 'Identifier', name };
    }

    let isBlocking = true;
    if (this.match('Operator', '=')) {
      isBlocking = true;
    } else if (this.match('Operator', '<=')) {
      isBlocking = false;
    } else {
      throw new Error(`Expected assignment operator (= or <=) at index ${this.peek().start}`);
    }

    const value = this.parseExpr();
    this.consume('Punctuation', ';');

    return { type: 'Assign', target, value, isBlocking };
  }

  public parseAlwaysBlockHeader(): Omit<AlwaysBlock, 'body'> {
    let edge: 'posedge' | 'negedge' | 'none' = 'none';
    let signal: string | undefined;

    if (this.match('Keyword', 'always_comb') || this.match('Keyword', 'always')) {
      // For always @(*) or just always, we treat it as none/combinational.
      if (this.match('Punctuation', '@')) {
        this.consume('Punctuation', '(');
        if (this.match('Operator', '*')) {
          // @(*)
        } else {
          // might be always @(posedge clk) but starting with just always
          if (this.match('Keyword', 'posedge')) {
            edge = 'posedge';
            signal = this.consume('Identifier').value;
          } else if (this.match('Keyword', 'negedge')) {
            edge = 'negedge';
            signal = this.consume('Identifier').value;
          } else {
            // some other sensitivity list, treat as none for this scope
            while (!this.check('Punctuation', ')') && !this.isAtEnd()) {
              this.current++;
            }
          }
        }
        this.consume('Punctuation', ')');
      }
    } else if (this.match('Keyword', 'always_ff')) {
      this.consume('Punctuation', '@');
      this.consume('Punctuation', '(');
      if (this.match('Keyword', 'posedge')) {
        edge = 'posedge';
      } else if (this.match('Keyword', 'negedge')) {
        edge = 'negedge';
      }
      if (edge !== 'none') {
        signal = this.consume('Identifier').value;
      }
      this.consume('Punctuation', ')');
    }

    return { edge, signal };
  }
}
