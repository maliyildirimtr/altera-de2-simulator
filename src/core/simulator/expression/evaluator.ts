import type { Expr, Stmt, LValue, AlwaysBlock } from './ast';

export interface EvalContext {
  state: Record<string, number>;
  nextState: Record<string, number>;
  /**
   * Declared bit widths of nets (`logic [3:0] n` -> 4). Used where Verilog
   * semantics depend on width: concatenation and bitwise NOT of a vector.
   * A net missing here is treated as 1 bit, the engine's historic default.
   */
  widths?: Record<string, number>;
  /**
   * When set, the value each net had before its first write in this pass, so
   * a settle loop can tell whether a pass changed anything without copying
   * the whole state.
   */
  trace?: Map<string, number | undefined>;
}

/** Self-determined width of an expression, when it is known; null otherwise. */
export function exprWidth(expr: Expr, ctx: EvalContext): number | null {
  switch (expr.type) {
    case 'Literal':
      return expr.width ?? null;
    case 'Identifier':
      return ctx.widths?.[expr.name] ?? null;
    case 'BitSelect': {
      if (expr.high.type !== 'Literal' || (expr.low && expr.low.type !== 'Literal')) return 1;
      return expr.low ? Math.abs(expr.high.value - expr.low.value) + 1 : 1;
    }
    case 'Concat': {
      let total = 0;
      for (const e of expr.expressions) total += exprWidth(e, ctx) ?? 1;
      return total;
    }
    case 'Unary':
      return expr.operator === '!' || expr.operator.startsWith('R') ? 1 : exprWidth(expr.right, ctx);
    case 'Binary':
      if (['&&', '||', '==', '!=', '<', '>', '<=', '>='].includes(expr.operator)) return 1;
      return null;
    default:
      return null;
  }
}

const maskOf = (width: number) => (width >= 32 ? 0xffffffff : (1 << width) - 1);

export function createSafeState(initialValues: Record<string, number> = {}): Record<string, number> {
  const state = Object.create(null);
  for (const [k, v] of Object.entries(initialValues)) {
    state[k] = v;
  }
  return state;
}

export function evaluateExpr(expr: Expr, ctx: EvalContext): number {
  switch (expr.type) {
    case 'Literal':
      return expr.value;
    
    case 'Identifier':
      return ctx.state[expr.name] ?? 0;
    
    case 'BitSelect': {
      const val = ctx.state[expr.name] ?? 0;
      const high = evaluateExpr(expr.high, ctx);
      const low = expr.low ? evaluateExpr(expr.low, ctx) : high;
      const shift = Math.min(high, low);
      const width = Math.abs(high - low) + 1;
      const mask = (1 << width) - 1;
      return (val >>> shift) & mask;
    }
    
    case 'Unary': {
      const right = evaluateExpr(expr.right, ctx);
      switch (expr.operator) {
        case '~': {
          // A declared vector inverts all of its bits, e.g. ~4'b0101 = 4'b1010.
          const w = exprWidth(expr.right, ctx);
          if (w !== null && w > 1) return (~right & maskOf(w)) >>> 0;
          if (right !== 0 && right !== 1) {
            throw new Error(`Vector bitwise NOT is unsupported without width metadata. Value was: ${right}`);
          }
          return (~right) & 1;
        }
        case '!': return (!right) ? 1 : 0;
        case 'R&': {
          const w = exprWidth(expr.right, ctx) ?? 1;
          const m = maskOf(w);
          return ((right & m) >>> 0) === (m >>> 0) ? 1 : 0;
        }
        case 'R|': return right !== 0 ? 1 : 0;
        case 'R^': {
          let v = right >>> 0;
          let p = 0;
          while (v) { p ^= v & 1; v >>>= 1; }
          return p;
        }
        case '-': return -right;
        case '+': return right;
        default: throw new Error(`Unknown unary operator: ${expr.operator}`);
      }
    }
    
    case 'Binary': {
      const left = evaluateExpr(expr.left, ctx);
      const right = evaluateExpr(expr.right, ctx);
      switch (expr.operator) {
        case '+': return (left + right) | 0;
        case '*': return Math.imul(left, right);
        case '&&': return left !== 0 && right !== 0 ? 1 : 0;
        case '||': return left !== 0 || right !== 0 ? 1 : 0;
        case '-': return (left - right) | 0;
        case '&': return left & right;
        case '|': return left | right;
        case '^': return left ^ right;
        case '^~':
        case '~^': return ~(left ^ right);
        case '==': return left === right ? 1 : 0;
        case '!=': return left !== right ? 1 : 0;
        case '<': return left < right ? 1 : 0;
        case '>': return left > right ? 1 : 0;
        case '<=': return left <= right ? 1 : 0;
        case '>=': return left >= right ? 1 : 0;
        case '<<': return left << right;
        case '>>': return left >>> right; // logical shift right
        default: throw new Error(`Unknown binary operator: ${expr.operator}`);
      }
    }
    
    case 'Conditional': {
      const condition = evaluateExpr(expr.condition, ctx);
      if (condition !== 0) {
        return evaluateExpr(expr.trueBranch, ctx);
      } else {
        return evaluateExpr(expr.falseBranch, ctx);
      }
    }
    
    case 'Concat': {
      // e.g. {a, b, c} where we assume 1-bit for each unless otherwise known, 
      // but without width typing, standard concat in simple simulators assumes 1-bit or explicit widths.
      // For DE2 Phase 7, standard {a,b} without types mapped to shifts: (a << 1) | b
      // Each part takes its declared width ({4'b0000, nibble} is 8 bits);
      // parts of unknown width count as one bit, the engine's old behaviour.
      let res = 0;
      for (let i = 0; i < expr.expressions.length; i++) {
        const part = expr.expressions[i];
        const val = evaluateExpr(part, ctx);
        const w = Math.min(32, exprWidth(part, ctx) ?? 1);
        res = w >= 32 ? val : ((res * (1 << w)) + (val & maskOf(w))) >>> 0;
      }
      return res;
    }
    
    default:
      throw new Error(`Unsupported expression type: ${(expr as any).type}`);
  }
}

function setLValue(target: LValue, value: number, isBlocking: boolean, ctx: EvalContext) {
  const targetObj = isBlocking ? ctx.state : ctx.nextState;
  if (isBlocking && ctx.trace && !ctx.trace.has(target.name)) ctx.trace.set(target.name, ctx.state[target.name]);

  if (target.type === 'Identifier') {
    // A declared vector keeps only its own bits: a 4-bit counter wraps 15 → 0.
    const w = ctx.widths?.[target.name];
    targetObj[target.name] = w && w < 32 ? (value & maskOf(w)) >>> 0 : value;
  } else if (target.type === 'BitSelect') {
    const name = target.name;
    const high = evaluateExpr(target.high, ctx);
    const low = target.low ? evaluateExpr(target.low, ctx) : high;
    
    let currentVal = 0;
    if (isBlocking) {
      currentVal = ctx.state[name] ?? 0;
    } else {
      // If we are doing multiple <= to the same register bits, we build upon nextState if present.
      currentVal = (name in ctx.nextState) ? ctx.nextState[name] : (ctx.state[name] ?? 0);
    }

    const minBit = Math.min(high, low);
    const width = Math.abs(high - low) + 1;
    const mask = ((1 << width) - 1) << minBit;
    const shiftedValue = (value & ((1 << width) - 1)) << minBit;
    
    const newVal = (currentVal & ~mask) | shiftedValue;
    targetObj[name] = newVal;
  }
}

export function evaluateStmt(stmt: Stmt, ctx: EvalContext) {
  switch (stmt.type) {
    case 'Assign': {
      const val = evaluateExpr(stmt.value, ctx);
      setLValue(stmt.target, val, stmt.isBlocking, ctx);
      break;
    }
    case 'Block': {
      for (const s of stmt.statements) {
        evaluateStmt(s, ctx);
      }
      break;
    }
    case 'If': {
      const cond = evaluateExpr(stmt.condition, ctx);
      if (cond !== 0) {
        evaluateStmt(stmt.thenBranch, ctx);
      } else if (stmt.elseBranch) {
        evaluateStmt(stmt.elseBranch, ctx);
      }
      break;
    }
    case 'Case': {
      const cond = evaluateExpr(stmt.condition, ctx);
      let matched = false;
      for (const c of stmt.cases) {
        if (c.value === 'default') {
          continue;
        }
        if (evaluateExpr(c.value, ctx) === cond) {
          evaluateStmt(c.stmt, ctx);
          matched = true;
          break;
        }
      }
      if (!matched) {
        const def = stmt.cases.find(c => c.value === 'default');
        if (def) {
          evaluateStmt(def.stmt, ctx);
        }
      }
      break;
    }
    default:
      throw new Error(`Unsupported statement type: ${(stmt as any).type}`);
  }
}

export function commitNextState(ctx: EvalContext) {
  const trace = ctx.trace;
  for (const k in ctx.nextState) {
    if (trace && !trace.has(k)) trace.set(k, ctx.state[k]);
    ctx.state[k] = ctx.nextState[k];
  }
  ctx.nextState = Object.create(null); // Reset nextState
}

export function isEdgeActive(block: AlwaysBlock, state: Record<string, number>): boolean {
  if (block.edge === 'none') return true;
  if (!block.signal) return true;
  
  const curr = state[block.signal] ?? 0;
  const prev = state[`__prev_${block.signal}`] ?? 0;
  
  if (block.edge === 'posedge') {
    return curr === 1 && prev === 0;
  } else if (block.edge === 'negedge') {
    return curr === 0 && prev === 1;
  }
  
  return false;
}
