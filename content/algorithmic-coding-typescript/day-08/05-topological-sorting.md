# Topological Sorting

## T — TL;DR

A topological order repeatedly removes vertices with no remaining prerequisites; if vertices remain, the directed graph contains a cycle.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Topological sorting is for prerequisites: produce an order where every required task appears before the task that depends on it. It only makes sense when the directed dependencies have no cycle.

### Mental Model

Think of cooking a recipe. You can begin any step whose ingredients are ready. Completing that step removes one prerequisite from later steps. If no step is ready but unfinished steps remain, the recipe has a circular dependency.

### First Trace

For edges `0 -> 1` and `0 -> 2`, indegree of `0` is `0`, so queue `0` first. Removing `0` decreases indegrees of `1` and `2` to `0`; both are now eligible. A valid order is `[0, 1, 2]` or `[0, 2, 1]`.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return a valid order for completing courses given prerequisite pairs, or an empty result when impossible. This is **Course Schedule II**.

**Best interview-ready solution:**

1. **Model prerequisites as directed edges** from a course to the course that depends on it, or use the reverse consistently.
2. **Compute indegrees and queue every course with zero prerequisites.**
3. **Remove queued courses and decrement dependent indegrees.**
4. **A complete order uses every course; leftover courses indicate a cycle.**
5. **Complexity:** O(V + E) time and O(V + E) space.

**Code solution:**

```ts
// Pseudocode: queue zero-indegree courses, remove them, and unlock their dependents.
function courseOrder(
	courseCount: number,
	prerequisites: readonly (readonly [course: number, prerequisite: number])[]
): number[] {
	const graph = Array.from({ length: courseCount }, () => [] as number[]);
	const indegree = new Array<number>(courseCount).fill(0);
	for (const [course, prerequisite] of prerequisites) {
		graph[prerequisite].push(course);
		indegree[course] += 1;
	}
	const queue: number[] = [];
	for (let course = 0; course < courseCount; course += 1) {
		if (indegree[course] === 0) queue.push(course);
	}
	const order: number[] = [];
	let head = 0;
	while (head < queue.length) {
		const course = queue[head++];
		order.push(course);
		for (const next of graph[course]) if (--indegree[next] === 0) queue.push(next);
	}
	return order.length === courseCount ? order : [];
}
```

Kahn's algorithm tracks indegree. The queue invariant is that every queued vertex has all prerequisites processed.

```ts
function topologicalOrder(graph: readonly number[][]): number[] | null {
	const indegree = new Array<number>(graph.length).fill(0);
	for (const neighbors of graph) for (const neighbor of neighbors) indegree[neighbor] += 1;
	const queue: number[] = [];
	for (let vertex = 0; vertex < graph.length; vertex += 1) {
		if (indegree[vertex] === 0) queue.push(vertex);
	}
	const order: number[] = [];
	let head = 0;
	while (head < queue.length) {
		const vertex = queue[head++];
		order.push(vertex);
		for (const neighbor of graph[vertex]) {
			indegree[neighbor] -= 1;
			if (indegree[neighbor] === 0) queue.push(neighbor);
		}
	}
	return order.length === graph.length ? order : null;
}
```

## W — Why It Matters

Topological sorting models build pipelines, course prerequisites, package dependencies, and workflow stages. It answers dependency order, not shortest route.

## I — Interview Q&A

### Why does a leftover vertex prove a cycle?

Every leftover vertex still has a prerequisite, so no valid next vertex exists; following those dependencies must eventually repeat.

### Can a graph have multiple valid topological orders?

Yes. Any choice among currently zero-indegree vertices may be valid unless the prompt requires a tie rule.

### What is the complexity?

$O(V + E)$ time and $O(V)$ auxiliary space with adjacency lists.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Treating edges as undirected. **Fix:** indegree applies to directed prerequisites.
- **Pitfall:** Returning a partial order on cycles. **Fix:** require `order.length === vertexCount`.
- **Pitfall:** Calling it a shortest path. **Fix:** state that it orders dependencies.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return one topological order of a directed graph, or `null` when a cycle exists.

### Solution

```ts
function topologicalOrder(graph: readonly number[][]): number[] | null {
	const indegree = new Array<number>(graph.length).fill(0);
	for (const neighbors of graph) for (const neighbor of neighbors) indegree[neighbor] += 1;
	const queue: number[] = [];
	for (let vertex = 0; vertex < graph.length; vertex += 1) {
		if (indegree[vertex] === 0) queue.push(vertex);
	}
	const order: number[] = [];
	let head = 0;
	while (head < queue.length) {
		const vertex = queue[head++];
		order.push(vertex);
		for (const neighbor of graph[vertex]) {
			if (--indegree[neighbor] === 0) queue.push(neighbor);
		}
	}
	return order.length === graph.length ? order : null;
}
```

**Right now:** Draw the indegree of each vertex in a three-node dependency chain.
