# Two-Dimensional and Grid DP

## T — TL;DR

For a two-coordinate state such as `(row, column)`, define the incoming transitions and iterate in an order that makes them available.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Two-dimensional DP is for answers that depend on two changing positions, such as a row and column or a position in each of two strings. The table gives every pair of smaller questions a place to live.

### Mental Model

Picture a tiled floor where you can move right or down. Each tile stores how many ways you can arrive there. Its answer comes from the tile above and the tile to its left, because those are the only two legal entrances.

### First Trace

In a clear 2-by-2 grid, the start has `1` path. The cell to its right gets `1`, the cell below gets `1`, and the bottom-right cell gets `1 + 1 = 2`. Blocking one middle cell changes the final count to `1`.

## K — Key Concepts

For right/down grid paths, `dp[row][column]` is the number of ways to reach that cell from the start. A one-row array keeps the previous row in `dp[column]` and the current row's left value in `dp[column - 1]`.

```ts
function countPaths(blocked: readonly boolean[][]): number {
  if (blocked.length === 0 || blocked[0].length === 0) return 0;
  const dp = new Array<number>(blocked[0].length).fill(0);
  dp[0] = blocked[0][0] ? 0 : 1;
  for (const row of blocked) {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column]) dp[column] = 0;
      else if (column > 0) dp[column] += dp[column - 1];
    }
  }
  return dp[dp.length - 1];
}
```

## W — Why It Matters

Two-dimensional DP powers edit distance, grid planning, image transforms, and resource allocation. The interview signal is your dependency order and boundary initialization.

## I — Interview Q&A

### Why does the blocked cell reset to zero?

No valid path can pass through it, so future cells must not inherit paths from that location.

### When is one-row compression safe?

When the transition reads only the previous row's same column and the current row's previous column.

### What if moves include diagonals?

Retain the previous-row previous-column value as a separate `diagonal` variable before overwriting it.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Initializing the blocked start as reachable. **Fix:** set its state from the input first.
- **Pitfall:** Iterating in the wrong direction. **Fix:** match loop order to dependency arrows.
- **Pitfall:** Treating a ragged grid as rectangular. **Fix:** use each row's actual length or reject ragged input.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Count right/down paths through a rectangular grid where `true` cells are blocked.

### Solution

```ts
function countPaths(blocked: readonly boolean[][]): number {
  if (blocked.length === 0 || blocked[0].length === 0) return 0;
  const dp = new Array<number>(blocked[0].length).fill(0);
  dp[0] = blocked[0][0] ? 0 : 1;
  for (const row of blocked) {
    for (let column = 0; column < row.length; column += 1) {
      if (row[column]) dp[column] = 0;
      else if (column > 0) dp[column] += dp[column - 1];
    }
  }
  return dp[dp.length - 1];
}
```

**Right now:** Draw the dependency arrows into one open grid cell.
