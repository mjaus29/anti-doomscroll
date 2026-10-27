# Matrix Traversal

## T — TL;DR

A matrix (grid) is an array of rows, and each cell is `grid[row][col]`. Most grid problems are a loop over cells plus two habits: check bounds before you read a neighbour, and use a *direction array* (a list of row/column steps) instead of four copied `if` blocks.

**Reach for it when:**

- The input is a 2D array: a board, an image, a map.
- You need neighbours of a cell (up, down, left, right).
- You walk the grid in a special order (spiral, diagonal, layer by layer).

## K — Key Concepts

### Picture it

A spreadsheet: rows go down, columns go across. "Row 2, column 3" is one cell. Moving "up" means row minus 1; moving "right" means column plus 1. Step off the edge and there is no cell, so check before you step.

### Walk through it

Neighbours of `(1, 0)` in a 3×3 grid (rows `0..2`, cols `0..2`), using `directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]`:

| Direction | Step | Neighbour | In bounds? |
| :-------- | :--- | :-------- | :--------- |
| up | `[-1, 0]` | `(0, 0)` | yes |
| down | `[1, 0]` | `(2, 0)` | yes |
| left | `[0, -1]` | `(1, -1)` | no: column `-1` |
| right | `[0, 1]` | `(1, 1)` | yes |

Bounds rule: `0 <= row < rows` and `0 <= col < cols`.

### The template

```ts
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [1, 0], [0, -1], [0, 1], // up, down, left, right
];

type Grid = readonly (readonly number[])[];

function neighbourSum(grid: Grid, row: number, col: number): number {
  const rows = grid.length;
  const cols = grid[0].length;
  let sum = 0;
  for (const [dRow, dCol] of DIRECTIONS) {
    const nextRow = row + dRow;
    const nextCol = col + dCol;
    const inBounds = nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols;
    if (!inBounds) continue; // check before reading
    sum += grid[nextRow][nextCol];
  }
  return sum;
}

// Safe 2D creation: one NEW row array per row
function makeGrid(rows: number, cols: number, fill: number): number[][] {
  return Array.from({ length: rows }, () => new Array<number>(cols).fill(fill));
}
```

**Time:** `O(rows × cols)` to visit every cell · **Space:** `O(1)` extra for neighbour checks.

### Interview classic: Spiral Matrix

Return all values in spiral order: across the top, down the right side, back along the bottom, up the left, then repeat inward.
Example: `[[1, 2, 3], [4, 5, 6], [7, 8, 9]]` → `[1, 2, 3, 6, 9, 8, 7, 4, 5]`.

- **Brute force:** simulate with a `visited` grid and turn when you hit a wall or a visited cell — `O(m × n)` time but `O(m × n)` extra space.
- **Key insight:** keep four boundaries (`top`, `bottom`, `left`, `right`). Walk one edge, then shrink that boundary. No visited grid needed.

```ts
function spiralOrder(matrix: Grid): number[] {
  const result: number[] = [];
  if (matrix.length === 0) return result;
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;

  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col++) result.push(matrix[top][col]);
    top++;
    for (let row = top; row <= bottom; row++) result.push(matrix[row][right]);
    right--;
    if (top <= bottom) { // a single remaining row was already walked
      for (let col = right; col >= left; col--) result.push(matrix[bottom][col]);
      bottom--;
    }
    if (left <= right) { // a single remaining column was already walked
      for (let row = bottom; row >= top; row--) result.push(matrix[row][left]);
      left++;
    }
  }
  return result;
}
```

The two `if` checks stop the walk from repeating a row or column when the remaining area is one cell thick.

### Variation: Rotate Image

Rotate an `n × n` matrix 90° clockwise **in place**. Trick: transpose (swap across the main diagonal), then reverse each row.

```ts
function rotate(matrix: number[][]): void {
  const n = matrix.length;
  for (let row = 0; row < n; row++) {
    for (let col = row + 1; col < n; col++) { // col > row: swap each pair once
      [matrix[row][col], matrix[col][row]] = [matrix[col][row], matrix[row][col]];
    }
  }
  for (const line of matrix) line.reverse();
}
```

## W — Why It Matters

- Grids appear in board games, images, maps, and seating charts, so interviewers use them often.
- Bounds checks and direction arrays come back in Day 10 (Number of Islands, Rotting Oranges).
- Spiral Matrix tests careful boundary handling, which interviewers watch closely.
- Clean grid code (named `row`/`col`, one direction array) is far easier to debug live.

## I — Interview Q&A

### Q: Why `grid[row][col]` and not `grid[x][y]`?

`x`/`y` invites mixing up order. The outer array is rows, so `grid[row][col]` reads correctly and prevents swapped-index bugs.

### Q: How would you rotate counter-clockwise?

Transpose, then reverse the order of the rows (or reverse each column) instead of each row.

### Q: How do you handle a non-square grid?

Read `rows = grid.length` and `cols = grid[0].length` separately, and never assume they are equal.

## C — Common Pitfalls + Fix

### ❌ Creating rows with `fill([])`

```ts
const shared: number[][] = new Array(3).fill([]);  // ❌ every row is the same array
const grid: number[][] = Array.from({ length: 3 }, () => []); // ✅ separate rows
```

### ❌ Checking bounds after reading

`grid[-1][0]` throws, because `grid[-1]` is `undefined`. Check the bounds first, then read.

### ❌ Swapping the whole matrix when transposing

Looping `col` from `0` swaps every pair twice, which undoes the transpose. Start `col` at `row + 1`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Set Matrix Zeroes:** if a cell is `0`, set its entire row and column to `0`. Change the matrix in place.

`[[1, 1, 1], [1, 0, 1], [1, 1, 1]]` → `[[1, 0, 1], [0, 0, 0], [1, 0, 1]]`

<details><summary>Hint</summary>

First record which rows and columns contain a zero (two `Set`s). Then do a second pass that zeroes those cells.

</details>

### Solution

```ts
function setZeroes(matrix: number[][]): void {
  const zeroRows = new Set<number>();
  const zeroCols = new Set<number>();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col] === 0) {
        zeroRows.add(row);
        zeroCols.add(col);
      }
    }
  }
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (zeroRows.has(row) || zeroCols.has(col)) matrix[row][col] = 0;
    }
  }
}
```

**Time:** `O(m × n)` · **Space:** `O(m + n)`. Recording first and writing second stops new zeros from spreading further. (The `O(1)`-space version stores the flags in the first row and column.)

**Right now:** Trace `spiralOrder([[1, 2, 3, 4], [5, 6, 7, 8]])` and write the four boundary values after each loop.
