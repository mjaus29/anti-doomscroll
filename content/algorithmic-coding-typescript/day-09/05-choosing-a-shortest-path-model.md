# Choosing a Shortest Path Model

## T — TL;DR

Choose the shortest-path algorithm from the vertex state, edge direction, weight range, and number of sources before writing the loop.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Choosing a shortest-path algorithm is a classification step. Before coding, identify what a vertex means and what kind of cost each edge carries; the wrong choice can return a believable but incorrect answer.

### Mental Model

Think of a toolbox. BFS is the plain tape measure for equal-cost steps. 0-1 BFS is a two-pocket tool for free or one-cost moves. Dijkstra is a priority tool for non-negative costs. Bellman-Ford is the slower tool that can handle discounts or negative edges.

### First Trace

If every move costs `1`, use BFS. If moves cost only `0` or `1`, use a deque. If costs are `2`, `5`, and `0`, use Dijkstra. If one cost is `-3`, Dijkstra's safety proof is gone, so choose Bellman-Ford.

## K — Key Concepts

| Problem shape         | Candidate              |
| --------------------- | ---------------------- |
| Unweighted            | BFS                    |
| Weights `0` or `1`    | 0-1 BFS                |
| Nonnegative weights   | Dijkstra               |
| Negative edges        | Bellman-Ford           |
| Small all-pairs graph | Floyd-Warshall         |
| Weighted DAG          | topological relaxation |

The vertex may be an expanded state such as `(cell, keys)` rather than only a physical location. Keep `previous` when the route, not only its cost, is required.

## W — Why It Matters

Algorithm selection is the core interview judgment. In production routing, a wrong weight assumption can produce a plausible but invalid path, which is more dangerous than a visible error.

## I — Interview Q&A

### What four facts do you identify first?

The vertex definition, edge definition, weight range, and required output such as one distance, all distances, or a route.

### How do you support multiple sources?

Initialize every source at distance zero and enqueue them together; this is multi-source BFS or Dijkstra.

### Why can the same cell appear twice in a state graph?

Different resources or permissions can create different future options, so the full state is not just the physical cell.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Choosing Dijkstra because the graph is weighted. **Fix:** check for negative edges first.
- **Pitfall:** Treating a stateful route as location-only. **Fix:** include resource state in the vertex.
- **Pitfall:** Reconstructing an unreachable path. **Fix:** check that the target distance is finite first.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Write a model-selection function for a weighted shortest-path prompt based on its edge weights.

### Solution

```ts
type PathModel = '0-1-bfs' | 'dijkstra' | 'bellman-ford';

function choosePathModel(weights: readonly number[]): PathModel {
	if (weights.every((weight) => weight === 0 || weight === 1)) return '0-1-bfs';
	if (weights.every((weight) => weight >= 0)) return 'dijkstra';
	return 'bellman-ford';
}
```

If every edge has weight one, ordinary BFS is simpler; this function assumes the caller has already identified a weighted model.

**Right now:** For one route problem, write its complete vertex and edge definitions before naming an algorithm.
