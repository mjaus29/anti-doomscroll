# 0-1 BFS and Bellman-Ford

The edge-weight range determines the shortest-path tool. When weights are only `0` or `1`, a deque is enough. When negative edges are allowed, Bellman-Ford relaxes all edges repeatedly.

## 0-1 BFS

Put a zero-cost neighbor at the front of the deque and a one-cost neighbor at the back. This preserves increasing distance order without a general heap.

The complexity is $O(V + E)$ when the deque implementation supports both ends efficiently.

## Bellman-Ford relaxation

For every edge `u -> v` with weight `w`, relaxation tries `distance[u] + w` as a better route to `v`. Repeating all edges `V - 1` times is enough for any shortest simple path. A further improvement on the `V`th pass indicates a reachable negative cycle.

```ts
type Edge = readonly [from: number, to: number, weight: number];

function bellmanFord(vertexCount: number, edges: readonly Edge[], source: number): number[] | null {
	const distance = new Array<number>(vertexCount).fill(Infinity);
	distance[source] = 0;

	for (let pass = 0; pass < vertexCount - 1; pass += 1) {
		let changed = false;
		for (const [from, to, weight] of edges) {
			if (distance[from] === Infinity) continue;
			const candidate = distance[from] + weight;
			if (candidate >= distance[to]) continue;
			distance[to] = candidate;
			changed = true;
		}
		if (!changed) return distance;
	}

	for (const [from, to, weight] of edges) {
		if (distance[from] !== Infinity && distance[from] + weight < distance[to]) {
			return null;
		}
	}

	return distance;
}
```

## Practice

## Checkpoint

Distinguish unreachable negative cycles from cycles reachable from the source. The `Infinity` guard is part of the correctness condition.

# 0-1 BFS and Bellman-Ford

## T — TL;DR

Use a deque for edge weights `0` or `1`, and use Bellman-Ford when negative edges require repeated relaxation and cycle detection.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

These algorithms handle weights that do not fit ordinary BFS or Dijkstra. If costs are only `0` and `1`, a deque is enough; if costs may be negative, repeatedly relaxing every edge is safer.

### Mental Model

For 0-1 BFS, a free move goes to the front because it should be processed sooner, while a one-cost move goes to the back. Bellman-Ford is like repeatedly passing better price information along every road until no price improves.

### First Trace

With edge `A -> B` cost `0`, put `B` at the front. With `A -> C` cost `1`, put `C` at the back. In Bellman-Ford, if `A` costs `0` and `A -> B` costs `-2`, update `B` to `-2`; later passes can propagate that improvement.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the cheapest flight from source to destination using at most k stops. This is **Cheapest Flights Within K Stops**.

**Best interview-ready solution:**

1. **Recognize the edge-count limit:** ordinary Dijkstra can use too many stops, so use bounded relaxation or layered DP.
2. **Keep a distance array for the previous layer and a copy for the next layer.**
3. **Relax every edge once per allowed flight, using the previous copy so one round cannot chain unlimited edges.**
4. **After k plus one rounds, return the destination distance or failure.**
5. **Complexity:** O(kE) time and O(V) space; Bellman-Ford-style layering handles negative edge values if the problem permits them.

**Code solution:**

```ts
// Pseudocode: repeat edge relaxations one layer per allowed flight using a copied distance array.
function cheapestFlight(
	vertexCount: number,
	flights: readonly (readonly [from: number, to: number, cost: number])[],
	source: number,
	destination: number,
	maxStops: number
): number {
	let distance = new Array<number>(vertexCount).fill(Infinity);
	distance[source] = 0;
	for (let flight = 0; flight <= maxStops; flight += 1) {
		const next = [...distance];
		for (const [from, to, cost] of flights) {
			if (distance[from] !== Infinity) next[to] = Math.min(next[to], distance[from] + cost);
		}
		distance = next;
	}
	return distance[destination] === Infinity ? -1 : distance[destination];
}
```

**0-1 BFS:** add a zero-cost neighbor to the front of a deque and a one-cost neighbor to the back. It keeps distances ordered in $O(V + E)$.

**Bellman-Ford:** relax every edge up to `V - 1` times. If a reachable edge can still improve on pass `V`, a reachable negative cycle exists.

```ts
type Edge = readonly [from: number, to: number, weight: number];
```

Skip edges whose source distance is `Infinity`; unreachable negative cycles do not affect a source's distances.

## W — Why It Matters

Knowing the edge-weight range prevents invalid shortcuts. These algorithms model tolls, discounts, mode switches, and state transitions that ordinary BFS or Dijkstra cannot handle.

## I — Interview Q&A

### Why does 0-1 BFS beat a heap here?

The restricted weights let a deque preserve the needed distance ordering without arbitrary priority comparisons.

### Why `V - 1` Bellman-Ford passes?

Any shortest simple path uses at most `V - 1` edges; each pass propagates one more edge of path length.

### What does an improvement on the next pass mean?

A reachable negative cycle can keep reducing a distance indefinitely.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Treating negative edges as unreachable by Dijkstra. **Fix:** use Bellman-Ford or a valid specialized model.
- **Pitfall:** Detecting an unreachable negative cycle. **Fix:** guard on finite source distance.
- **Pitfall:** Using `push` for both 0-1 BFS weights. **Fix:** put zero at the front and one at the back.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Implement Bellman-Ford for an edge list. Return `null` if a negative cycle is reachable from `source`.

### Solution

```ts
function bellmanFord(vertexCount: number, edges: readonly Edge[], source: number): number[] | null {
	const distance = new Array<number>(vertexCount).fill(Infinity);
	distance[source] = 0;

	for (let pass = 0; pass < vertexCount - 1; pass += 1) {
		let changed = false;
		for (const [from, to, weight] of edges) {
			if (distance[from] === Infinity) continue;
			if (distance[from] + weight >= distance[to]) continue;
			distance[to] = distance[from] + weight;
			changed = true;
		}
		if (!changed) return distance;
	}
	for (const [from, to, weight] of edges) {
		if (distance[from] !== Infinity && distance[from] + weight < distance[to]) return null;
	}
	return distance;
}
```

**Right now:** Classify one graph edge set as unweighted, 0/1 weighted, nonnegative weighted, or possibly negative.
