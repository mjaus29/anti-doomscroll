# Dijkstra's Algorithm

Dijkstra finds shortest paths from one source when every edge weight is nonnegative. It repeatedly finalizes the unsettled vertex with the smallest known distance.

## Priority queue and stale entries

A common TypeScript implementation pushes improved distances instead of implementing decrease-key. When an old entry is removed, skip it if it is no longer current.

```ts
type WeightedEdge = readonly [to: number, weight: number];
type QueueEntry = readonly [distance: number, vertex: number];

function dijkstra(graph: readonly WeightedEdge[][], source: number): number[] {
	const distance = new Array<number>(graph.length).fill(Infinity);
	const queue: QueueEntry[] = [[0, source]];
	distance[source] = 0;

	while (queue.length > 0) {
		queue.sort((left, right) => left[0] - right[0]);
		const [currentDistance, vertex] = queue.shift() as QueueEntry;
		if (currentDistance !== distance[vertex]) continue;

		for (const [neighbor, weight] of graph[vertex]) {
			const candidate = currentDistance + weight;
			if (candidate >= distance[neighbor]) continue;
			distance[neighbor] = candidate;
			queue.push([candidate, neighbor]);
		}
	}

	return distance;
}
```

The example queue is readable but not asymptotically optimal because sorting and shifting are expensive. Replace it with the min-heap from Day 7 for large inputs.

## Why nonnegative weights matter

Once Dijkstra removes the smallest queue entry, no later path can improve it only because every future edge adds at least zero. A negative edge breaks that proof and may invalidate a finalized distance.

## Practice

## Checkpoint

State exactly why the next minimum is safe to finalize. If edge weights can be negative, choose another algorithm.

# Dijkstra's Algorithm

## T — TL;DR

Dijkstra finalizes the smallest unsettled distance and is correct only when every edge weight is nonnegative.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Dijkstra finds the cheapest route from one starting point when every move has a non-negative cost. It is the weighted version of BFS, where “one step” is replaced by “total cost.”

### Mental Model

Think of a GPS that keeps a list of possible destinations ordered by current travel time. It always explores the cheapest known destination next. Because future roads cannot subtract time, a route removed from the priority queue is safe to finalize.

### First Trace

Start at `A` with distance `0`. If `A -> B` costs `4` and `A -> C` costs `1`, the queue contains `(4, B)` and `(1, C)`. Visit `C` first. If `C -> B` costs `2`, update `B` from `4` to `3`; the old `(4, B)` entry becomes stale and can be skipped later.

## K — Key Concepts

Relax an edge when `currentDistance + weight` improves the neighbor. Use a min-heap of `[distance, vertex]` entries. If an older entry is popped after a better distance was found, skip it as stale.

```ts
type WeightedEdge = readonly [to: number, weight: number];
type QueueEntry = readonly [distance: number, vertex: number];
```

The proof depends on nonnegative weights: after the smallest entry is removed, every future route adds at least zero and cannot improve it. Keep a `previous` array when the actual route is required.

## W — Why It Matters

Dijkstra is the standard model for routing, network latency, and nonnegative cost planning. Its precondition is as important as its code; choosing it for negative edges is a correctness bug.

## I — Interview Q&A

### What does relaxation mean?

Try the route through the current vertex and replace the neighbor's distance if that route is cheaper.

### Why are stale heap entries safe to skip?

They represent a distance that is no longer the best recorded distance for that vertex, so they cannot improve any relaxation.

### When can you stop early?

When the target is removed from the min-heap with its current best distance, because that is the first finalized target distance.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Allowing negative edge weights. **Fix:** switch to Bellman-Ford or another valid model.
- **Pitfall:** Using an array with repeated sort/shift for large input. **Fix:** use a binary min-heap.
- **Pitfall:** Returning distance without a route when a path is requested. **Fix:** update predecessors with every improvement.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Implement Dijkstra's distance relaxation for a small graph. Use a simple sorted queue for readability, then state what must change for production-scale input.

### Solution

```ts
function dijkstra(graph: readonly WeightedEdge[][], source: number): number[] {
	const distance = new Array<number>(graph.length).fill(Infinity);
	const queue: QueueEntry[] = [[0, source]];
	distance[source] = 0;

	while (queue.length > 0) {
		queue.sort((left, right) => left[0] - right[0]);
		const [currentDistance, vertex] = queue.shift() as QueueEntry;
		if (currentDistance !== distance[vertex]) continue;
		for (const [neighbor, weight] of graph[vertex]) {
			const candidate = currentDistance + weight;
			if (candidate >= distance[neighbor]) continue;
			distance[neighbor] = candidate;
			queue.push([candidate, neighbor]);
		}
	}
	return distance;
}
```

Replace the sorted array with the Day 7 min-heap to reach $O((V + E) log V)$.

**Right now:** Check whether every edge in your next shortest-path problem is nonnegative.
