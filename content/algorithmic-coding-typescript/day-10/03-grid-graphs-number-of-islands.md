# Grid Graphs: Number of Islands

## T — TL;DR

A grid is a graph in disguise: each cell is a node, and its up, down, left, and right cells are its neighbours. You don't build an adjacency list; a **directions array** gives the neighbours on the fly. Then the usual DFS or BFS with a visited mark works.

**Reach for it when:**

- The input is a 2D grid of `"1"`/`"0"`, land/water, walls/paths, or colours.
- The question asks about regions, connected areas, spreading, or paths between cells.
- "Count the groups" or "size of the biggest group" of touching cells.

## K — Key Concepts

### Picture it

Look at a map with islands. To count them, put your finger on any land square you haven't coloured yet: that is a new island. Colour it and every land square touching it, spreading out until you hit water. Then look for the next uncoloured land square.

### Walk through it

```text
1 1 0 0
1 0 0 1
0 0 1 1
```

| Step | Cell (row, col) | Action and why |
| :--- | :-------------- | :------------- |
| 1 | (0, 0) | Land, not visited. Island count = 1. DFS sinks (0, 0), (1, 0), (0, 1). |
| 2 | (0, 1), (0, 2) ... (1, 2) | Already sunk or water. Skip. |
| 3 | (1, 3) | Land, not visited. Count = 2. DFS sinks (1, 3), (2, 3), (2, 2). |
| 4 | remaining cells | All water or sunk. Answer: `2`. |

"Sink" means change the cell to `"0"` so it is never counted again. That is the visited mark.

### The template

```ts
const DIRECTIONS: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function visitRegion(grid: string[][], startRow: number, startCol: number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const stack: [number, number][] = [[startRow, startCol]];
  grid[startRow][startCol] = "0";                  // mark on push

  while (stack.length > 0) {
    const [row, col] = stack.pop()!;
    for (const [rowStep, colStep] of DIRECTIONS) {
      const nextRow = row + rowStep;
      const nextCol = col + colStep;
      if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
      if (grid[nextRow][nextCol] !== "1") continue; // water or already visited
      grid[nextRow][nextCol] = "0";
      stack.push([nextRow, nextCol]);
    }
  }
}
```

**Time:** `O(rows · cols)` · **Space:** `O(rows · cols)` in the worst case for the stack — each cell is pushed at most once and checks 4 neighbours.

The bounds check comes **before** reading the cell. An explicit stack is used because a recursive DFS on a 1000 × 1000 all-land grid could be a million calls deep.

### Interview classic: Number of Islands

Given a grid of `"1"` (land) and `"0"` (water), count the islands. An island is land cells joined up/down/left/right.
Example: the grid above → `2`.

- **Brute force:** for every pair of land cells, check if a path joins them — far too slow.
- **Key insight:** it is Number of Connected Components on a grid. Scan every cell; each unvisited land cell starts a new island, and one flood fill marks the whole island.

```ts
function numIslands(input: readonly string[][]): number {
  const grid = input.map((row) => [...row]); // copy: don't sink the caller's map
  let islands = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (grid[row][col] === "1") {
        islands++;                   // first touch of a new island
        visitRegion(grid, row, col); // sink the whole island
      }
    }
  }
  return islands;
}
```

**Flood Fill** (the paint-bucket tool) is the same `visitRegion` walk: start at one pixel and recolour every touching pixel of the same colour.

## W — Why It Matters

- Grid problems are among the most common interview questions: islands, mazes, rotting oranges, word search.
- Real uses: paint-bucket tools, map regions, game boards, image segmentation.
- Interviewers listen for a clean bounds check, a clear visited mark, and whether you mutate the input.

## I — Interview Q&A

### Q: Can you avoid modifying the grid?

Yes. Keep a separate `visited` 2D boolean array, or a `Set` of `row * cols + col` numbers. It costs `O(rows · cols)` extra space.

### Q: What if diagonal cells also count as touching?

Add the four diagonal moves to `DIRECTIONS`. Nothing else changes.

### Q: DFS or BFS here?

Either works for counting, since you only need "which cells are connected". BFS is required when the question asks for the shortest number of steps.

## C — Common Pitfalls + Fix

### ❌ Bounds check after reading the cell

```ts
if (grid[nextRow][nextCol] === "1" && nextRow >= 0) // ❌ grid[-1] is undefined → crash
if (nextRow >= 0 && ... && grid[nextRow][nextCol] === "1") // ✅ check bounds first
```

### ❌ Mixing up rows and columns

`grid[row][col]`: row is the vertical position, `grid.length` rows; col is horizontal, `grid[0].length` columns. Name them `row`/`col`, not `i`/`j`.

### ❌ Comparing to the number `1`

The input is often strings. `"1" === 1` is `false`, so nothing gets counted. Check the type in the problem.

### ❌ Marking visited on pop instead of push

The same cell can be pushed by several neighbours first, so the stack can hold many copies of one cell.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Max Area of Island:** given a grid of numbers `1` (land) and `0` (water), return the number of cells in the largest island, or `0` if there is no land.

`[[0, 1, 1], [1, 1, 0], [0, 0, 1]]` → `4`

<details><summary>Hint</summary>

Use the same flood fill, but count how many cells you pop. Keep the best count.

</details>

### Solution

```ts
function maxAreaOfIsland(input: readonly number[][]): number {
  const grid = input.map((row) => [...row]);
  const rows = grid.length;
  const cols = grid[0].length;
  const moves: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let best = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] !== 1) continue;
      grid[row][col] = 0;
      const stack: [number, number][] = [[row, col]];
      let area = 0;
      while (stack.length > 0) {
        const [cellRow, cellCol] = stack.pop()!;
        area++;                                  // one cell of this island
        for (const [rowStep, colStep] of moves) {
          const nextRow = cellRow + rowStep;
          const nextCol = cellCol + colStep;
          if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
          if (grid[nextRow][nextCol] !== 1) continue;
          grid[nextRow][nextCol] = 0;
          stack.push([nextRow, nextCol]);
        }
      }
      best = Math.max(best, area);
    }
  }
  return best;
}
```

**Time:** `O(rows · cols)` · **Space:** `O(rows · cols)`. Each cell is popped once, so counting pops counts the island's cells exactly.

**Right now:** Draw a 3 × 3 grid with three separate islands and predict what `numIslands` returns before tracing it.
