# Grid Graphs

## T — TL;DR

Treat each cell as an implicit graph vertex, generate valid neighbors with direction vectors, and make coordinate rules explicit.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A grid problem is a graph problem where the edges are implied by movement rules. You do not need to build every edge; generate the valid neighboring cells when you stand on one cell.

### Mental Model

Picture a person walking on a tiled floor. From `(row, column)`, four-direction movement means up, down, left, and right. Walls and borders remove some choices. A visited mark says, "we have already solved this tile in this state."

### First Trace

From `(0, 0)` in a rectangular grid, test `(1, 0)`, `(-1, 0)`, `(0, 1)`, and `(0, -1)`. Keep only positions inside the grid and not blocked. Then repeat from each accepted neighbor.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return the minutes until all fresh oranges become rotten, or minus one if some cannot be reached. This is **Rotting Oranges**.

**Best interview-ready solution:**

1. **Recognize multi-source BFS:** every rotten orange is a starting source at time zero.
2. **Enqueue all rotten cells before processing.**
3. **Spread to fresh neighbors one level at a time and count fresh cells.**
4. **The last BFS level is the elapsed time; remaining fresh cells mean failure.**
5. **Complexity:** O(rows times columns) time and space.

**Code solution:**

```ts
// Pseudocode: enqueue all rotten cells and spread one BFS layer per minute.
function rottingMinutes(grid: number[][]): number {
	const queue: Array<[number, number]> = [];
	let fresh = 0;
	for (let row = 0; row < grid.length; row += 1) {
		for (let column = 0; column < grid[row].length; column += 1) {
			if (grid[row][column] === 2) queue.push([row, column]);
			else if (grid[row][column] === 1) fresh += 1;
		}
	}
	let head = 0;
	let minutes = 0;
	const directions = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	] as const;
	while (head < queue.length && fresh > 0) {
		const levelEnd = queue.length;
		while (head < levelEnd) {
			const [row, column] = queue[head++];
			for (const [rowDelta, columnDelta] of directions) {
				const nextRow = row + rowDelta;
				const nextColumn = column + columnDelta;
				if (grid[nextRow]?.[nextColumn] !== 1) continue;
				grid[nextRow][nextColumn] = 2;
				fresh -= 1;
				queue.push([nextRow, nextColumn]);
			}
		}
		minutes += 1;
	}
	return fresh === 0 ? minutes : -1;
}
```

```ts
const directions = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
] as const;

function inBounds(row: number, column: number, grid: readonly string[]): boolean {
	return row >= 0 && row < grid.length && column >= 0 && column < grid[row].length;
}
```

Decide whether movement is four-way or diagonal, whether a cell is blocked, and whether visited state is only coordinates or `(coordinate, resource)`. Mark on enqueue or entry.

## W — Why It Matters

Grid problems are graph problems without an explicit edge list. This model powers maze routing, image processing, flood fill, games, and a large interview category.

## I — Interview Q&A

### Why not build every grid edge first?

Neighbor rules are local, so generating them on demand saves memory and keeps the model direct.

### What changes when movement has costs?

Track distances and choose BFS, 0-1 BFS, or Dijkstra according to the cost range.

### What belongs in the visited key?

Every state component that can change future moves, such as keys collected or remaining energy.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Swapping row and column. **Fix:** name both variables and keep `(row, column)` everywhere.
- **Pitfall:** Visiting out of bounds. **Fix:** centralize `inBounds`.
- **Pitfall:** Reusing a coordinate with different resources. **Fix:** include resource state in the key.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Count the number of `1` cells connected to a starting cell by four-directional moves. Mutate a copy or the provided grid to mark visited cells.

### Solution

```ts
function connectedArea(grid: number[][], row: number, column: number): number {
	if (grid[row]?.[column] !== 1) return 0;
	const queue: Array<[number, number]> = [[row, column]];
	let head = 0;
	grid[row][column] = 0;
	const directions = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	] as const;
	let area = 0;

	while (head < queue.length) {
		const [currentRow, currentColumn] = queue[head++];
		area += 1;
		for (const [rowDelta, columnDelta] of directions) {
			const nextRow = currentRow + rowDelta;
			const nextColumn = currentColumn + columnDelta;
			if (grid[nextRow]?.[nextColumn] !== 1) continue;
			grid[nextRow][nextColumn] = 0;
			queue.push([nextRow, nextColumn]);
		}
	}
	return area;
}
```

**Right now:** Write the four neighbors of a cell at `(2, 3)` before coding.
