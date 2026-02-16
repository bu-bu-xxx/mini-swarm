import type { AgentNode, PipelineEdge } from '../types';

/**
 * Compute parallel execution groups using Kahn's algorithm (topological sort by level).
 * Nodes at the same level have no dependencies between them and can run in parallel.
 */
export function identifyParallelGroups(nodes: AgentNode[], edges: PipelineEdge[]): string[][] {
  const incomingCount = new Map<string, number>();
  for (const node of nodes) {
    incomingCount.set(node.id, 0);
  }
  for (const edge of edges) {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
  }

  const levels: string[][] = [];
  const visited = new Set<string>();
  let currentLevel = nodes.filter((n) => (incomingCount.get(n.id) || 0) === 0).map((n) => n.id);

  while (currentLevel.length > 0) {
    levels.push([...currentLevel]);
    for (const id of currentLevel) visited.add(id);

    const nextLevel: string[] = [];
    for (const edge of edges) {
      if (visited.has(edge.source) && !visited.has(edge.target)) {
        const allIncomingVisited = edges
          .filter((e) => e.target === edge.target)
          .every((e) => visited.has(e.source));
        if (allIncomingVisited && !nextLevel.includes(edge.target)) {
          nextLevel.push(edge.target);
        }
      }
    }
    currentLevel = nextLevel;
  }

  // Add orphan nodes not reached by traversal (e.g. in cycles)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      levels.push([node.id]);
      visited.add(node.id);
    }
  }

  return levels.filter((l) => l.length > 0);
}

/**
 * Check if adding an edge from `source` to `target` would create a cycle.
 * Uses DFS from `target` following existing edges to see if `source` is reachable.
 */
export function wouldCreateCycle(
  edges: PipelineEdge[],
  source: string,
  target: string,
): boolean {
  // If adding source→target, check if target can already reach source (cycle)
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  // DFS from target: can we reach source?
  const visited = new Set<string>();
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adjacency.get(current) || [];
    for (const n of neighbors) {
      stack.push(n);
    }
  }
  return false;
}
