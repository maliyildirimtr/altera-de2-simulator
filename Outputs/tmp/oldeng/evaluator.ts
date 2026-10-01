import type { Expr, Stmt, LValue, AlwaysBlock } from './ast';

export interface EvalContext {
  state: Record<string, number>;
  nextState: Record<string, number>;
}

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
        case '~': 
          if (right !== 0 && right !== 1) {
            throw new Error(`Vector bitwise NOT is unsupported without width metadata. Value was: ${right}`);
          }
          return (~right) & 1;
        case '!': return (!right) ? 1 : 0;
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
      let res = 0;
      for (let i = 0; i < expr.expressions.length; i++) {
        const val = evaluateExpr(expr.expressions[i], ctx);
        // Assuming 1 bit width for each element in {a, b} to match old behavior
        res = (res << 1) | (val & 1);
      }
      return res;
    }
    
    default:
      throw new Error(`Unsupported expression type: ${(expr as any).type}`);
  }
}

function setLValue(target: LValue, value: number, isBlocking: boolean, ctx: EvalContext) {
  const targetObj = isBlocking ? ctx.state : ctx.nextState;
  
  if (target.type === 'Identifier') {
    targetObj[target.name] = value;
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
  for (const [k, v] of Object.entries(ctx.nextState)) {
    ctx.state[k] = v;
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
