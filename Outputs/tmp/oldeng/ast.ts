export type Expr =
  | LiteralExpr
  | IdentifierExpr
  | BitSelectExpr
  | UnaryExpr
  | BinaryExpr
  | ConditionalExpr
  | ConcatExpr;

export interface LiteralExpr { type: 'Literal'; value: number; }
export interface IdentifierExpr { type: 'Identifier'; name: string; }
export interface BitSelectExpr { type: 'BitSelect'; name: string; high: Expr; low?: Expr; }
export interface UnaryExpr { type: 'Unary'; operator: string; right: Expr; }
export interface BinaryExpr { type: 'Binary'; operator: string; left: Expr; right: Expr; }
export interface ConditionalExpr { type: 'Conditional'; condition: Expr; trueBranch: Expr; falseBranch: Expr; }
export interface ConcatExpr { type: 'Concat'; expressions: Expr[]; }

export type LValue = 
  | { type: 'Identifier'; name: string }
  | { type: 'BitSelect'; name: string; high: Expr; low?: Expr };

export type Stmt =
  | AssignStmt
  | IfStmt
  | BlockStmt
  | CaseStmt;

export interface AssignStmt {
  type: 'Assign';
  target: LValue;
  value: Expr;
  isBlocking: boolean; // true for '=' and continuous assign, false for '<='
}

export interface IfStmt {
  type: 'If';
  condition: Expr;
  thenBranch: Stmt;
  elseBranch?: Stmt;
}

export interface BlockStmt {
  type: 'Block';
  statements: Stmt[];
}

export interface CaseStmt {
  type: 'Case';
  condition: Expr;
  cases: { value: Expr | 'default'; stmt: Stmt }[];
}

export interface AlwaysBlock {
  edge: 'posedge' | 'negedge' | 'none';
  signal?: string; // e.g., 'CLOCK_50'
  body: Stmt;
}

export interface ModuleAST {
  continuousAssigns: AssignStmt[];
  alwaysBlocks: AlwaysBlock[];
}

