# Connected Components and Flood Fill

## T — TL;DR

Scan every vertex and start one BFS or DFS for each unvisited vertex; each traversal discovers exactly one connected component.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Connected components answer, "How many separate groups are there?" Flood fill answers, "Which cells belong to the same group as this starting cell?" Both are one traversal repeated from unvisited starts.

### Mental Model

Imagine islands on a map. Start walking on one land cell and mark every land cell connected to it; that is one island. Continue scanning until you find land you have not visited, then start the next island count.

### First Trace

For graph edges `0 - 1` and `2 - 3`, a traversal from `0` marks `{0, 1}` and counts one component. The scan later reaches unvisited `2`, marks `{2, 3}`, and counts the second component.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Count the number of islands in a binary grid. This is **Number of Islands**.

**Best interview-ready solution:**

1. **Recognize components:** each unvisited land cell starts one island traversal.
2. **Run BFS or DFS from that cell.**
3. **Mark land as visited when discovered so the same island is not counted twice.**
4. **Continue scanning after the traversal ends to find disconnected islands.**
5. **Complexity:** O(rows times columns) time and O(rows times columns) worst-case space.

**Code solution:**

```ts
// Pseudocode: each unvisited land cell starts a traversal that marks its entire island.
function countIslands(grid: string[][]): number {
	let islands = 0;
	const directions = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	] as const;
	for (let row = 0; row < grid.length; row += 1) {
		for (let column = 0; column < grid[row].length; column += 1) {
			if (grid[row][column] !== '1') continue;
			islands += 1;
			const stack: Array<[number, number]> = [[row, column]];
			grid[row][column] = '0';
			while (stack.length > 0) {
				const [currentRow, currentColumn] = stack.pop() as [number, number];
				for (const [rowDelta, columnDelta] of directions) {
					const nextRow = currentRow + rowDelta;
					const nextColumn = currentColumn + columnDelta;
					if (grid[nextRow]?.[nextColumn] !== '1') continue;
					grid[nextRow][nextColumn] = '0';
					stack.push([nextRow, nextColumn]);
				}
			}
		}
	}
	return islands;
}
```

Flood fill uses the same rule on a grid: capture the original value, replace a cell when it is discovered, and enqueue matching neighbors. Marking on discovery prevents duplicate work.

```ts
function countComponents(graph: readonly number[][]): number {
	const visited = new Set<number>();
	let count = 0;
	for (let start = 0; start < graph.length; start += 1) {
		if (visited.has(start)) continue;
		count += 1;
		const stack = [start];
		visited.add(start);
		while (stack.length > 0) {
			const vertex = stack.pop() as number;
			for (const neighbor of graph[vertex]) {
				if (visited.has(neighbor)) continue;
				visited.add(neighbor);
				stack.push(neighbor);
			}
		}
	}
	return count;
}
```

## W — Why It Matters

Components model islands, user groups, network regions, and dependency clusters. The pattern is also a clean way to distinguish traversal order from the membership rule.

## I — Interview Q&A

### Why start a traversal from every vertex?

One traversal reaches only the component containing its start; scanning all vertices finds disconnected components too.

### Why mark when discovered?

Two frontier items may point to the same vertex. Early marking ensures it enters the worklist once.

### When is DSU better?

When undirected edges are added incrementally and you need connectivity queries without rerunning a full traversal.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Counting every vertex as a component. **Fix:** increment only when starting from unvisited state.
- **Pitfall:** Marking after processing. **Fix:** mark on enqueue or push.
- **Pitfall:** Replacing the source before saving its value. **Fix:** capture the original cell first.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Count connected components in an undirected adjacency list.

### Solution

```ts
function countComponents(graph: readonly number[][]): number {
	const visited = new Set<number>();
	let count = 0;
	for (let start = 0; start < graph.length; start += 1) {
		if (visited.has(start)) continue;
		count += 1;
		const stack = [start];
		visited.add(start);
		while (stack.length > 0) {
			const vertex = stack.pop() as number;
			for (const neighbor of graph[vertex]) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor);
					stack.push(neighbor);
				}
			}
		}
	}
	return count;
}
```

**Right now:** Pick one vertex in a disconnected graph and mark every vertex its traversal can reach.
