# Grid DP: Unique Paths

## T — TL;DR

When you move through a grid only **right** or **down**, every cell can be reached only from the cell above it or the cell to its left. Fill the grid row by row, and each cell's answer comes from those two neighbours, which are already filled.

**Reach for it when:**

- You move through a grid in limited directions (usually right/down).
- The question asks for the number of paths, or the cheapest/most valuable path.
- Some cells are blocked or have a cost.

## K — Key Concepts

### Picture it

A city of one-way streets that only run east or south. To count routes to any corner, add the routes arriving from the north and from the west. Start in the north-west corner and sweep the city like reading a page.

### The four questions (Unique Paths)

- **State:** `paths[r][c]` = number of ways to reach cell `(r, c)` from the top-left.
- **Transition:** `paths[r][c] = paths[r - 1][c] + paths[r][c - 1]` (arrived from above or from the left).
- **Base case:** the whole top row and left column are `1` — there is only one straight way to reach them.
- **Answer:** `paths[rows - 1][cols - 1]`.

### Walk through it

A `3 × 4` grid. Each cell = above + left.

| | col 0 | col 1 | col 2 | col 3 |
| :- | :- | :- | :- | :- |
| **row 0** | 1 | 1 | 1 | 1 |
| **row 1** | 1 | 2 | 3 | 4 |
| **row 2** | 1 | 3 | 6 | **10** |

For example, row 2, col 2 = `3` (above) + `3` (left) = `6`. Answer `10`.

### The template

```ts
function uniquePaths(rows: number, cols: number): number {
  // Safe 2D creation: Array.from gives each row its own array.
  const paths: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(1));
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      paths[r][c] = paths[r - 1][c] + paths[r][c - 1]; // from above + from left
    }
  }
  return paths[rows - 1][cols - 1];
}
```

**Time:** `O(rows × cols)` · **Space:** `O(rows × cols)` — each cell is filled once from two neighbours.

**Space saver:** you only ever read the row above, so one array of length `cols` is enough: `row[c] += row[c - 1]` (before the update `row[c]` still holds "above"; `row[c - 1]` already holds "left").

### Interview classic: Minimum Path Sum

Each cell holds a cost. Moving only right or down from top-left to bottom-right, return the smallest total cost (including both corners).
Example: `[[1, 3, 1], [1, 5, 1], [4, 2, 1]]` → `7` (1 → 3 → 1 → 1 → 1).

- **Brute force:** try every path — exponential.
- **Key insight:** the cheapest way into a cell is its own cost plus the cheaper of "cheapest into above" and "cheapest into left."

- **State:** `cost[r][c]` = cheapest total to reach `(r, c)`. **Base case:** `cost[0][0] = grid[0][0]`; first row and column can only add up in a straight line. **Answer:** bottom-right cell.

```ts
function minPathSum(grid: readonly (readonly number[])[]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const cost: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) cost[r][c] = grid[0][0];
      else if (r === 0) cost[r][c] = cost[r][c - 1] + grid[r][c]; // only from left
      else if (c === 0) cost[r][c] = cost[r - 1][c] + grid[r][c]; // only from above
      else cost[r][c] = Math.min(cost[r - 1][c], cost[r][c - 1]) + grid[r][c];
    }
  }
  return cost[rows - 1][cols - 1];
}
```

Filled table for the example:

| | col 0 | col 1 | col 2 |
| :- | :- | :- | :- |
| **row 0** | 1 | 4 | 5 |
| **row 1** | 2 | 7 | 6 |
| **row 2** | 6 | 8 | **7** |

Same template: "add the two neighbours" became "take the cheaper neighbour and add this cell."

## W — Why It Matters

- Grid DP is the gentlest introduction to 2D states; the two-string lessons next use the exact same table shape.
- Common interview set: Unique Paths, Unique Paths II, Minimum Path Sum, Triangle, Maximal Square, Dungeon Game.
- Real uses: image seam carving, route costs on tile maps, and sequence alignment.

## I — Interview Q&A

### Q: Is there a math formula for Unique Paths?

Yes. Every path is `rows - 1` downs and `cols - 1` rights in some order, so the count is "choose `rows - 1` positions out of `rows + cols - 2`." It is `O(min(rows, cols))`, but the DP is easier to adapt to obstacles and costs.

### Q: Why can't this handle moving in all four directions?

With up and left moves allowed, a cell could depend on cells you have not filled yet, so there is no safe fill order. That becomes a shortest-path problem (BFS or Dijkstra, Day 12).

### Q: Can you do Minimum Path Sum in `O(1)` extra space?

Yes, by writing the totals into the input grid itself. Mention that it mutates the caller's data and ask whether that is allowed.

## C — Common Pitfalls + Fix

### ❌ Creating the 2D array with `fill`

```ts
const grid = new Array(rows).fill(new Array(cols).fill(0)); // ❌ all rows: one array
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0)); // ✅
```

### ❌ Forgetting the first row and column

They have only one neighbour. Reading `cost[-1][c]` gives `undefined`, and `undefined + 1` is `NaN`.

### ❌ Mixing up rows and columns

`grid[r][c]` is row first. Name loop variables `r` and `c` (or `row` and `col`), never `i` and `j`, so swapped indexes stand out.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Unique Paths II:** the grid now has obstacles (`1` = blocked, `0` = open). Moving only right or down, count the paths from top-left to bottom-right that avoid every obstacle.

`[[0, 0, 0], [0, 1, 0], [0, 0, 0]]` → `2`

<details><summary>Hint</summary>

Same state and transition, but a blocked cell has `0` paths. Careful: a blocked cell in the first row also blocks every cell to its right.

</details>

### Solution

```ts
function uniquePathsWithObstacles(grid: readonly (readonly number[])[]): number {
  const cols = grid[0].length;
  const row: number[] = new Array(cols).fill(0); // paths into each cell, this row
  row[0] = grid[0][0] === 1 ? 0 : 1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) row[c] = 0;          // nobody passes through a wall
      else if (c > 0) row[c] += row[c - 1];       // above (old row[c]) + left
    }
  }
  return row[cols - 1];
}
```

**Time:** `O(rows × cols)` · **Space:** `O(cols)`. Setting blocked cells to `0` makes the "above + left" rule handle every obstacle, including ones on the edges.

**Right now:** Fill the table for `[[0, 0], [1, 1], [0, 0]]` by hand and confirm the answer is `0`.
