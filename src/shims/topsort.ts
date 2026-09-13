class EdgeNode<T> {
  public id: T;
  public afters: T[] = [];
  constructor(id: T) {
    this.id = id;
  }
}

function sortDesc(a: any, b: any) {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

export function topsort<T>(edges: T[][], options?: { continueOnCircularDependency: boolean }): T[] {
  const nodes: { [key: string]: EdgeNode<T> } = {};
  const opts = options || { continueOnCircularDependency: false };
  const sorted: T[] = [];
  const visited: { [key: string]: boolean } = {};

  edges.forEach((edge: T[]) => {
    const fromEdge: T = edge[0];
    const fromStr: string = String(fromEdge);
    let fromNode: EdgeNode<T>;

    if (!(fromNode = nodes[fromStr])) {
      fromNode = nodes[fromStr] = new EdgeNode<T>(fromEdge);
    }

    edge.forEach((toEdge: T) => {
      if (toEdge === fromEdge) return;
      const toEdgeStr: string = String(toEdge);
      if (!nodes[toEdgeStr]) {
        nodes[toEdgeStr] = new EdgeNode<T>(toEdge);
      }
      fromNode.afters.push(toEdge);
    });
  });

  const keys: string[] = Object.keys(nodes);
  keys.sort(sortDesc);
  keys.forEach(function visit(idstr: string, ancestorsIn: any) {
    const node: EdgeNode<T> = nodes[idstr];
    if (!node) return;
    const id: T = node.id;

    if (visited[idstr]) return;

    const ancestors: T[] = Array.isArray(ancestorsIn) ? ancestorsIn : [];
    ancestors.push(id);
    visited[idstr] = true;

    node.afters.sort(sortDesc);
    node.afters.forEach((afterID: T) => {
      if (ancestors.indexOf(afterID) >= 0) {
        if (opts.continueOnCircularDependency) return;
        throw new Error(
          'Circular chain found: ' +
            id +
            ' must be before ' +
            afterID +
            ' due to a direct order specification, but ' +
            afterID +
            ' must be before ' +
            id +
            ' based on other specifications.'
        );
      }
      visit(String(afterID), ancestors.map((v) => v));
    });

    sorted.unshift(id);
  });

  return sorted;
}

(topsort as any).default = topsort;
(topsort as any).topsort = topsort;

export default topsort;
