# Capstone: Build a Route Planner

## T — TL;DR

Build one small typed shortest-route function that combines graph modeling, Dijkstra relaxation, predecessor tracking, and edge-case testing.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

The capstone combines the course's habits in one small problem: read a contract, model a graph, choose Dijkstra because costs are non-negative, track predecessors, and test the result.

### Mental Model

Think of a GPS. It records the cheapest known arrival time for each location and the previous location that produced it. When a cheaper route appears, update both records; when the destination is reached, follow the breadcrumbs backward.

### First Trace

For `A -> B` in `5` minutes and `A -> C -> B` in `2 + 1` minutes, first record `B = 5` and `C = 2`. Visiting `C` then improves `B` to `3` and records `previous[B] = C`. Reversing `B <- C <- A` gives the route `A -> C -> B`.

## K — Key Concepts

- Vertex: a named location.
- Edge: a directed connection with non-negative travel time.
- State: best known distance plus predecessor for each location.
- Invariant: `distance[location]` is the cheapest route discovered so far.
- Stale queue entries are ignored when their distance is no longer current.
- Follow predecessors backward and reverse to reconstruct the route.

For a 5–15 minute session, use a readable sorted queue first. In a second pass, replace it with the Day 7 min-heap to reach $O((V + E) log V)$.

## W — Why It Matters

This capstone compresses the track into a realistic interview task: model unfamiliar input, choose the algorithm from edge constraints, prove relaxation, and verify the route rather than only its cost.

## I — Interview Q&A

### Why is Dijkstra valid here?

Travel times are non-negative, so the smallest unsettled distance is safe to finalize.

### What does `previous` preserve?

The predecessor that produced the current best distance, allowing the chosen shortest route to be reconstructed.

### Which tests matter first?

Direct route, cheaper route found later, unreachable destination, start equals destination, and negative travel time rejection.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Returning a cost without stops. **Fix:** update predecessors on every improvement.
- **Pitfall:** Accepting negative travel times. **Fix:** reject them or change algorithms.
- **Pitfall:** Using `shift()` at scale. **Fix:** replace the readable queue with a min-heap after the first correct pass.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes.

Implement `planRoute` for directed connections `[from, to, minutes]`. Return `{ minutes, stops }`, where `stops` starts at `start` and ends at `destination`, or `null` when unreachable. Travel times are non-negative.

### Solution

```ts
type Connection = readonly [from: string, to: string, minutes: number];
type Route = { minutes: number; stops: string[] };
type QueueEntry = readonly [minutes: number, location: string];

function planRoute(
	connections: readonly Connection[],
	start: string,
	destination: string
): Route | null {
	const graph = new Map<string, Array<[string, number]>>();
	const ensure = (location: string): void => {
		if (!graph.has(location)) graph.set(location, []);
	};

	for (const [from, to, minutes] of connections) {
		if (minutes < 0) throw new Error('Route times must be non-negative');
		ensure(from);
		ensure(to);
		graph.get(from)?.push([to, minutes]);
	}
	ensure(start);
	ensure(destination);

	const distance = new Map<string, number>([[start, 0]]);
	const previous = new Map<string, string>();
	const queue: QueueEntry[] = [[0, start]];

	while (queue.length > 0) {
		queue.sort((left, right) => left[0] - right[0]);
		const [minutes, location] = queue.shift() as QueueEntry;
		if (minutes !== distance.get(location)) continue;
		for (const [next, travelTime] of graph.get(location) ?? []) {
			const candidate = minutes + travelTime;
			if (candidate >= (distance.get(next) ?? Infinity)) continue;
			distance.set(next, candidate);
			previous.set(next, location);
			queue.push([candidate, next]);
		}
	}

	const minutes = distance.get(destination);
	if (minutes === undefined) return null;
	const stops: string[] = [];
	let current = destination;
	while (true) {
		stops.push(current);
		if (current === start) break;
		const predecessor = previous.get(current);
		if (predecessor === undefined) return null;
		current = predecessor;
	}
	stops.reverse();
	return { minutes, stops };
}
```

**Right now:** Test one direct route and one unreachable destination before changing the queue implementation.
