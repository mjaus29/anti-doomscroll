# Graph Representations

## T — TL;DR

Choose a graph representation from the dominant operation: neighbor traversal, direct edge lookup, edge sorting, or compact memory.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A graph representation is the way you store relationships so the algorithm can ask its important questions cheaply. The right choice depends on whether you mostly walk neighbors, check one edge, or sort all edges.

### Mental Model

Imagine a city map. An adjacency list gives each city a list of directly connected cities. A matrix is a giant yes/no chart for every possible pair. An edge list is a stack of road cards that is convenient when roads themselves need sorting.

### First Trace

For an undirected edge `[0, 1]`, the adjacency list stores `1` under `0` and `0` under `1`. For a directed edge `0 -> 1`, it stores only `1` under `0`. That one modeling decision changes what traversal can reach.

## K — Key Concepts

For a sparse undirected graph, use an adjacency list and store each edge twice:

```ts
function buildUndirectedGraph(
  vertexCount: number,
  edges: readonly (readonly [number, number])[]
): number[][] {
  const graph = Array.from({ length: vertexCount }, () => [] as number[]);
  for (const [from, to] of edges) {
    graph[from].push(to);
    graph[to].push(from);
  }
  return graph;
}
```

- Adjacency list: $O(V + E)$ space and fast neighbor iteration.
- Matrix: $O(V^2)$ space and $O(1)$ edge lookup.
- Edge list: compact and convenient for sorting edges.
- String labels often need a name-to-ID map for dense arrays.

## W — Why It Matters

The representation can decide whether a graph solution fits memory and whether its claimed complexity is real. This is relevant in route services, dependency graphs, and every graph interview.

## I — Interview Q&A

### Why does an undirected edge appear twice in a list?

Traversal from either endpoint must discover the other, so both directed adjacency entries are stored.

### When is a matrix appropriate?

When the graph is dense or the algorithm repeatedly asks whether a specific edge exists.

### How do you handle string vertex names?

Map names to integer IDs for arrays and keep a reverse map when output needs original names.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Treating directed edges as bidirectional. **Fix:** add the reverse edge only when the contract says undirected.
- **Pitfall:** Mixing zero- and one-based IDs. **Fix:** normalize at the boundary.
- **Pitfall:** Claiming matrix memory is linear. **Fix:** state $O(V^2)$ explicitly.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Build an undirected adjacency list for `vertexCount` vertices from an edge list.

### Solution

```ts
function buildUndirectedGraph(
  vertexCount: number,
  edges: readonly (readonly [number, number])[]
): number[][] {
  const graph = Array.from({ length: vertexCount }, () => [] as number[]);
  for (const [from, to] of edges) {
    graph[from].push(to);
    graph[to].push(from);
  }
  return graph;
}
```

**Right now:** For one edge, say which adjacency entries it creates under directed and undirected rules.
