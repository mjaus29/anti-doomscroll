# Multi-Source BFS: Rotting Oranges

## T — TL;DR

*Multi-source BFS* puts **every** starting cell in the queue at once, then runs one normal BFS. The search spreads from all sources in parallel, so each cell gets its distance to the **nearest** source in one `O(rows · cols)` pass instead of one BFS per source.

**Reach for it when:**

- Something spreads from many places at the same time (fire, rot, infection, signal).
- You need each cell's distance to the **nearest** of several targets.
- The question asks "how many minutes / rounds until everything is reached?"

## K — Key Concepts

### Picture it

Drop five pebbles into a pond at the same moment. The ripples grow together, and wherever two ripples meet, a spot is claimed by whichever pebble was closer. BFS with all pebbles in the queue at time 0 builds exactly those ripples.

### Walk through it

Grid: `2` = rotten orange, `1` = fresh, `0` = empty. Each minute, rot spreads to fresh oranges up/down/left/right.

```text
2 1 1
1 1 0
0 1 1
```

| Minute | Queue holds (this level) | Newly rotten | Fresh left |
| :----- | :----------------------- | :----------- | :--------- |
| 0 | (0, 0) | — | 6 |
| 1 | (0, 0) | (1, 0), (0, 1) | 4 |
| 2 | (1, 0), (0, 1) | (1, 1), (0, 2) | 2 |
| 3 | (1, 1), (0, 2) | (2, 1) | 1 |
| 4 | (2, 1) | (2, 2) | 0 → answer `4` |

The trick is processing **one whole level per loop**: everything in the queue at the start of a minute rots its neighbours, and only then does the clock move on.

### The template

```ts
// Distance from every cell to its nearest source cell (-1 = unreachable).
function nearestSourceDistance(
  rows: number, cols: number, sources: readonly [number, number][],
): number[][] {
  const distance: number[][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(-1));
  const queue: [number, number][] = [];
  for (const [row, col] of sources) {   // all sources start at distance 0
    distance[row][col] = 0;
    queue.push([row, col]);
  }

  const moves: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head++) {
    const [row, col] = queue[head];
    for (const [rowStep, colStep] of moves) {
      const nextRow = row + rowStep;
      const nextCol = col + colStep;
      if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
      if (distance[nextRow][nextCol] !== -1) continue; // already reached sooner
      distance[nextRow][nextCol] = distance[row][col] + 1;
      queue.push([nextRow, nextCol]);
    }
  }
  return distance;
}
```

**Time:** `O(rows · cols)` · **Space:** `O(rows · cols)` — each cell is queued once, no matter how many sources there are.

Why one BFS is enough: imagine one extra "super source" joined to every real source. A plain BFS from it reaches the real sources at step 1 and everything else in nearest-first order. Putting all sources in the queue first is the same thing.

### Interview classic: Rotting Oranges

Return the minutes until no fresh orange is left, or `-1` if some fresh orange can never rot.
Example: the grid above → `4`. `[[2, 1, 1], [0, 1, 1], [1, 0, 1]]` → `-1` (bottom-left is cut off).

- **Brute force:** each minute, scan the whole grid and rot neighbours of rotten oranges — `O((rows · cols)²)`.
- **Key insight:** every rotten orange is a source at minute 0. Run BFS one level at a time, and count levels that rot at least one orange.

```ts
function orangesRotting(input: readonly number[][]): number {
  const grid = input.map((row) => [...row]);
  const rows = grid.length;
  const cols = grid[0].length;
  let queue: [number, number][] = [];
  let fresh = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === 2) queue.push([row, col]); // every source at once
      else if (grid[row][col] === 1) fresh++;
    }
  }

  const moves: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let minutes = 0;
  while (queue.length > 0 && fresh > 0) {
    const nextLevel: [number, number][] = [];  // oranges that rot this minute
    for (const [row, col] of queue) {
      for (const [rowStep, colStep] of moves) {
        const nextRow = row + rowStep;
        const nextCol = col + colStep;
        if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
        if (grid[nextRow][nextCol] !== 1) continue;
        grid[nextRow][nextCol] = 2;             // mark when queued
        fresh--;
        nextLevel.push([nextRow, nextCol]);
      }
    }
    queue = nextLevel;
    minutes++;
  }
  return fresh === 0 ? minutes : -1;
}
```

Using a fresh array per level makes "one level = one minute" explicit. The template's distance grid would give the same answer as its largest value.

## W — Why It Matters

- Rotting Oranges, 01 Matrix, Walls and Gates, and "distance to nearest X" questions all use this exact idea.
- Real uses: nearest store for every address, spread of fire or outages, map distance fields in games.
- Interviewers listen for "put all sources in first" instead of running BFS from each source.

## I — Interview Q&A

### Q: Why not run a BFS from each rotten orange and take the minimum?

That costs `O(k · rows · cols)` for `k` sources. One multi-source BFS gives the same nearest distances in `O(rows · cols)`.

### Q: Why the `fresh > 0` check in the loop condition?

Without it, the last level of newly rotten oranges runs one more round that rots nothing, and the minute count is one too high.

### Q: How do you detect impossible cases?

Count fresh oranges at the start and decrease the count as they rot. If any remain when the queue is empty, return `-1`.

## C — Common Pitfalls + Fix

### ❌ Starting BFS from one source at a time

Each source's BFS overwrites the others and the timing is wrong. Queue all sources before the loop starts.

### ❌ Counting minutes per orange, not per level

`minutes++` inside the inner loop counts oranges, not minutes. Increase it once per level.

### ❌ Ignoring fresh oranges that can never rot

```ts
return minutes;                         // ❌ ignores oranges that never rot
return fresh === 0 ? minutes : -1;      // ✅
```

### ❌ Marking cells on pop

A fresh orange next to two rotten ones gets queued twice and `fresh` drops twice. Mark it rotten as soon as you queue it.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**01 Matrix:** given a grid of `0`s and `1`s with at least one `0`, return a grid where each cell holds the number of steps (up/down/left/right) to its nearest `0`.

`[[0, 0, 0], [0, 1, 0], [1, 1, 1]]` → `[[0, 0, 0], [0, 1, 0], [1, 2, 1]]`

<details><summary>Hint</summary>

Every `0` is a source at distance 0. Run one BFS outward from all of them.

</details>

### Solution

```ts
function updateMatrix(mat: readonly number[][]): number[][] {
  const rows = mat.length;
  const cols = mat[0].length;
  const distance: number[][] = mat.map((row) => row.map(() => -1));
  const queue: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (mat[row][col] === 0) { distance[row][col] = 0; queue.push([row, col]); }
    }
  }

  const moves: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let head = 0; head < queue.length; head++) {
    const [row, col] = queue[head];
    for (const [rowStep, colStep] of moves) {
      const nextRow = row + rowStep;
      const nextCol = col + colStep;
      if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
      if (distance[nextRow][nextCol] !== -1) continue; // a closer 0 got here first
      distance[nextRow][nextCol] = distance[row][col] + 1;
      queue.push([nextRow, nextCol]);
    }
  }
  return distance;
}
```

**Time:** `O(rows · cols)` · **Space:** `O(rows · cols)`. BFS reaches cells in nearest-first order, so the first distance written to a cell is already the smallest.

**Right now:** Trace `orangesRotting` on `[[2, 1, 1], [0, 1, 1], [1, 0, 1]]` level by level and confirm the bottom-left orange is never queued.
