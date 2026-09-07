export type LogicNodeType = 'INPUT' | 'AND' | 'OR' | 'XOR' | 'NOT' | 'NAND' | 'NOR' | 'XNOR' | 'OUTPUT';

export interface LogicNode {
  id: string;
  type: LogicNodeType;
  label: string;
  children: LogicNode[];
}

// Tokenizer for Verilog boolean expressions
function tokenize(expr: string): string[] {
  const regex = /([a-zA-Z0-9_]+(?:\[\d+(?::\d+)?\])?|&&|\|\||~&|~\||\^~|~\^|[&|^~!()])/g;
  const tokens: string[] = [];
  let match;
  while ((match = regex.exec(expr)) !== null) {
    let t = match[1];
    if (t === '&&') t = '&';
    else if (t === '||') t = '|';
    else if (t === '!') t = '~';
    tokens.push(t);
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = {
  '~': 5,
  '&': 4,
  '~&': 4,
  '^': 3,
  '~^': 3,
  '^~': 3,
  '|': 2,
  '~|': 2,
};

let globalIdCounter = 0;
function nextId() {
  return `node_${globalIdCounter++}`;
}

export function parseExpression(outputName: string, expr: string): LogicNode {
  const tokens = tokenize(expr);
  
  // Shunting Yard to postfix
  const outputQueue: string[] = [];
  const operatorStack: string[] = [];
  
  for (const token of tokens) {
    if (/^[a-zA-Z0-9_]+(?:\[\d+(?::\d+)?\])?$/.test(token)) {
      outputQueue.push(token);
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.pop(); // discard '('
    } else if (PRECEDENCE[token]) {
      while (
        operatorStack.length > 0 && 
        operatorStack[operatorStack.length - 1] !== '(' &&
        PRECEDENCE[operatorStack[operatorStack.length - 1]] >= PRECEDENCE[token]
      ) {
        if (token === '~' && operatorStack[operatorStack.length - 1] === '~') {
          break; // right associative
        }
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    }
  }
  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop()!);
  }

  // Evaluate postfix to AST
  const astStack: LogicNode[] = [];
  
  for (const token of outputQueue) {
    if (PRECEDENCE[token]) {
      if (token === '~') {
        const a = astStack.pop();
        if (a) {
          astStack.push({
            id: nextId(),
            type: 'NOT',
            label: 'NOT',
            children: [a]
          });
        }
      } else {
        const b = astStack.pop();
        const a = astStack.pop();
        if (a && b) {
          let type: LogicNodeType = 'AND';
          if (token === '|') type = 'OR';
          else if (token === '^') type = 'XOR';
          else if (token === '~&') type = 'NAND';
          else if (token === '~|') type = 'NOR';
          else if (token === '~^' || token === '^~') type = 'XNOR';
          astStack.push({
            id: nextId(),
            type,
            label: type,
            children: [a, b]
          });
        }
      }
    } else {
      astStack.push({
        id: nextId(),
        type: 'INPUT',
        label: token,
        children: []
      });
    }
  }

  const rootAst = astStack[0] || { id: nextId(), type: 'INPUT', label: '0', children: [] };
  
  return {
    id: nextId(),
    type: 'OUTPUT',
    label: outputName,
    children: [rootAst]
  };
}

export function parseVerilogAssigns(code: string, moduleOutputs: string[]): LogicNode[] {
  globalIdCounter = 0;
  const cleanCode = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const assignRegex = /assign\s+([a-zA-Z0-9_]+)\s*=\s*(.*?);/g;
  
  const allOutputs: LogicNode[] = [];
  let m;
  while ((m = assignRegex.exec(cleanCode)) !== null) {
    const outName = m[1];
    const expr = m[2];
    allOutputs.push(parseExpression(outName, expr));
  }

  const outputMap = new Map<string, LogicNode>();
  allOutputs.forEach(out => outputMap.set(out.label, out.children[0]));

  function substitute(node: LogicNode, visited: Set<string>): LogicNode {
    if (node.type === 'INPUT') {
      if (outputMap.has(node.label) && !visited.has(node.label)) {
        visited.add(node.label);
        const sub = substitute(outputMap.get(node.label)!, visited);
        visited.delete(node.label);
        return sub;
      }
      return node; 
    }
    return {
      ...node,
      id: nextId(),
      children: node.children.map(c => substitute(c, visited))
    };
  }

  const finalOutputs: LogicNode[] = [];
  allOutputs.forEach(out => {
    // Only return if it's a real output port
    if (moduleOutputs.includes(out.label)) {
      finalOutputs.push({
        ...out,
        children: out.children.map(c => substitute(c, new Set()))
      });
    }
  });

  return finalOutputs.length > 0 ? finalOutputs : allOutputs; // Fallback to all if no moduleOutputs match
}

export function toMathEquation(node: LogicNode): string {
  if (node.type === 'INPUT') return node.label;
  if (node.type === 'OUTPUT') return `${node.label} = ${toMathEquation(node.children[0])}`;
  
  if (node.type === 'NOT') {
    const inner = node.children[0].type === 'INPUT' ? node.children[0].label : `(${toMathEquation(node.children[0])})`;
    return `~${inner}`;
  }
  
  const a = toMathEquation(node.children[0]);
  const b = toMathEquation(node.children[1]);
  
  let op = '';
  if (node.type === 'AND') op = '·';
  if (node.type === 'OR') op = '+';
  if (node.type === 'XOR') op = '⊕';
  
  return `(${a} ${op} ${b})`;
}
