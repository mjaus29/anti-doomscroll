# Minimum Spanning Trees

## T — TL;DR

An MST minimizes total edge cost while connecting every vertex; it is a connectivity structure, not a shortest-path tree.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

An MST answers a different question from shortest path: how can we connect every location with the least total cable, not how can one traveler reach one destination cheaply?

### Mental Model

Imagine installing roads between towns. Sort possible roads from cheapest to most expensive and accept a road when it joins two currently separate groups. Skip roads that only make a loop; they add cost without connecting anything new.

### First Trace

For edges `(0, 1, 1)`, `(1, 2, 2)`, and `(0, 2, 3)`, accept the cost `1` edge, then the cost `2` edge. All three towns are connected with total `3`; skip the cost `3` edge because it would close a cycle.

## K — Key Concepts

Kruskal sorts edges by weight and adds an edge only when it joins two different DSU components. The cut property says the lightest edge crossing a component cut is safe.

```ts
type Edge = readonly [weight: number, from: number, to: number];
```

Choose exactly `V - 1` edges for a connected graph. If fewer are chosen, the input is disconnected. Prim grows one tree using the cheapest edge crossing its frontier and is often natural with adjacency lists.

## W — Why It Matters

MSTs model network design, cable layout, clustering, and low-cost infrastructure. Confusing MST with shortest paths is a frequent interview mistake because both mention weighted graphs.

## I — Interview Q&A

### Why skip an edge that joins the same DSU component?

It creates a cycle and cannot help connect a new component in a spanning tree.

### What is the difference from Dijkstra?

Dijkstra minimizes routes from a source; MST minimizes total cost of one global connected structure.

### When does Kruskal detect disconnection?

When it finishes with fewer than `V - 1` accepted edges.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Returning a route instead of total connection cost. **Fix:** clarify the objective.
- **Pitfall:** Forgetting to sort edges. **Fix:** Kruskal's proof depends on increasing weight.
- **Pitfall:** Assuming all graphs are connected. **Fix:** verify accepted edge count.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return the total weight of an MST using Kruskal, or `null` if the graph is disconnected.

### Solution

```ts
function kruskal(vertexCount: number, edges: readonly Edge[]): number | null {
	const sets = new DisjointSet(vertexCount);
	const ordered = [...edges].sort((left, right) => left[0] - right[0]);
	let total = 0;
	let chosen = 0;

	for (const [weight, from, to] of ordered) {
		if (!sets.union(from, to)) continue;
		total += weight;
		chosen += 1;
		if (chosen === vertexCount - 1) return total;
	}
	return vertexCount <= 1 || chosen === vertexCount - 1 ? total : null;
}
```

`DisjointSet` is the class from the previous topic. Sorting dominates at $O(E log E)$.

**Right now:** Say whether your next weighted graph prompt asks for a route or a connected network.
