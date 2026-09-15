# Union Find and Disjoint Set Union

## T — TL;DR

DSU maintains undirected connected components while edges are added, using representatives, path compression, and union by size.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Disjoint set union answers a narrow but useful question: after repeatedly connecting pairs, are two items in the same undirected group? It avoids restarting a full graph traversal after every new connection.

### Mental Model

Imagine friend groups represented by a group leader. `find` asks for the leader of a person; `union` combines two groups by making one leader point to the other. Path compression makes future questions jump closer to the leader.

### First Trace

Start with groups `{0}`, `{1}`, `{2}`. `union(0, 1)` creates `{0, 1}`. `union(1, 2)` finds that `1` belongs to the first group and combines `2`, giving `{0, 1, 2}`. A later union of `0` and `2` returns false because they already share a group.

## K — Key Concepts

```ts
class DisjointSet {
	private readonly parent: number[];
	private readonly size: number[];
	constructor(count: number) {
		this.parent = Array.from({ length: count }, (_, index) => index);
		this.size = new Array<number>(count).fill(1);
	}
	find(value: number): number {
		if (this.parent[value] !== value) this.parent[value] = this.find(this.parent[value]);
		return this.parent[value];
	}
	union(left: number, right: number): boolean {
		let a = this.find(left);
		let b = this.find(right);
		if (a === b) return false;
		if (this.size[a] < this.size[b]) [a, b] = [b, a];
		this.parent[b] = a;
		this.size[a] += this.size[b];
		return true;
	}
}
```

`union` returning false means an edge connects vertices already in one component and would create a cycle. Amortized operation cost is $O(alpha(n))$.

## W — Why It Matters

DSU is the right tool for incremental network connectivity, account merging, cycle detection, and Kruskal's MST. It is much cheaper than rerunning a full traversal after every added edge.

## I — Interview Q&A

### What does path compression do?

It points every visited node directly to its representative, flattening future searches.

### Why union by size?

Attaching the smaller tree beneath the larger one limits tree height.

### Can DSU return a shortest path?

No. It remembers component membership, not the route or edge direction.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using DSU for directed reachability. **Fix:** use DFS/BFS for directed paths.
- **Pitfall:** Checking raw parents instead of roots. **Fix:** compare `find(a)` and `find(b)`.
- **Pitfall:** Forgetting size/rank updates. **Fix:** update only the new root's metadata.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Process undirected edges in order and return the first edge that creates a cycle, or `null`.

### Solution

```ts
function firstRedundantEdge(
	vertexCount: number,
	edges: readonly (readonly [number, number])[]
): readonly [number, number] | null {
	const sets = new DisjointSet(vertexCount);
	for (const edge of edges) {
		if (!sets.union(edge[0], edge[1])) return edge;
	}
	return null;
}
```

**Right now:** Find the first edge that closes a cycle in a triangle by tracing representatives.
