# Dijkstra's Shortest Path

## T — TL;DR

**Dijkstra's algorithm** finds the cheapest path from one start node to every other node when edges have non-negative **weights** (costs). It always expands the closest unfinished node next, using a min-heap, so each node is finalized once instead of trying every path.

**Reach for it when:**

- Edges have different costs (time, distance, price) and you need the **minimum total cost**.
- All costs are zero or positive.
- Plain BFS would work if every edge cost `1` — but here they do not.
- The "cost" of a path is built from its edges in a way that never goes down (sum, or max).

## K — Key Concepts

### Picture it

Pour water at the start node. It spreads along pipes, and longer pipes take longer to fill. The order in which nodes get wet is exactly the order of their shortest distance. Dijkstra simulates that: a min-heap always tells you which node the water reaches next.

### Walk through it

Directed edges `[from, to, cost]`: `A→B 4`, `A→C 1`, `C→B 2`, `B→D 1`, `C→D 5`. Start at `A`.
The heap holds `[distance, node]` pairs. A **stale** entry is an old pair whose distance is worse than the best one already found.

| Step | Pop | dist after step | Pushes and why |
| :--- | :-- | :-------------- | :------------- |
| 1 | `[0, A]` | A 0, B 4, C 1 | Push `[4, B]`, `[1, C]`. |
| 2 | `[1, C]` | B 3, D 6 | Via C, B costs `1 + 2 = 3 < 4`: push `[3, B]`. D: `1 + 5`, push `[6, D]`. |
| 3 | `[3, B]` | D 4 | Via B, D costs `3 + 1 = 4 < 6`: push `[4, D]`. |
| 4 | `[4, B]` | — | Stale: `4 > dist[B] = 3`. Skip it. (Ties may pop in either order.) |
| 5 | `[4, D]` | — | D finalized at 4. No outgoing edges. |
| 6 | `[6, D]` | — | Stale. Skip. Heap empty, done. |

Why it is safe: when a node is popped with its current best distance, every other path to it would pass through a node that is at least as far. With no negative edges, that path can only get longer.

### The template

JS has no built-in heap, so the block includes a compact one (Day 8 builds it step by step).

```ts
class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;
  constructor(compare: (a: T, b: T) => number) { this.compare = compare; }
  get size(): number { return this.items.length; }
  push(item: T): void {
    const items = this.items;
    items.push(item);
    let child = items.length - 1;
    while (child > 0) { // sift up while smaller than the parent
      const parent = (child - 1) >> 1;
      if (this.compare(items[child], items[parent]) >= 0) break;
      [items[child], items[parent]] = [items[parent], items[child]];
      child = parent;
    }
  }
  pop(): T | undefined {
    const items = this.items;
    if (items.length <= 1) return items.pop();
    const top = items[0];
    items[0] = items.pop()!;
    let parent = 0;
    while (true) { // sift down toward the smaller child
      const left = 2 * parent + 1;
      const right = left + 1;
      const n = items.length;
      let smallest = parent;
      if (left < n && this.compare(items[left], items[smallest]) < 0) smallest = left;
      if (right < n && this.compare(items[right], items[smallest]) < 0) smallest = right;
      if (smallest === parent) return top;
      [items[parent], items[smallest]] = [items[smallest], items[parent]];
      parent = smallest;
    }
  }
}

type Edge = [to: number, cost: number];

function dijkstra(graph: readonly Edge[][], start: number): number[] {
  const dist = new Array<number>(graph.length).fill(Infinity);
  dist[start] = 0;
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0]); // [distance, node]
  heap.push([0, start]);

  while (heap.size > 0) {
    const [distance, node] = heap.pop()!;
    if (distance > dist[node]) continue; // stale entry: a shorter path was already found
    for (const [next, cost] of graph[node]) {
      const candidate = distance + cost;
      if (candidate < dist[next]) { // relax: found a cheaper way to `next`
        dist[next] = candidate;
        heap.push([candidate, next]);
      }
    }
  }
  return dist;
}
```

**Time:** `O((V + E) log V)` · **Space:** `O(V + E)` — each edge can push one heap entry, and each heap operation costs `log` of the heap size.

### Interview classic: Network Delay Time

`n` computers are labeled `1..n`. `times[i] = [from, to, ms]` is a one-way signal delay. A signal starts at computer `k`. Return how long until every computer has it, or `-1` if some never do.
Example: `times = [[2, 1, 1], [2, 3, 1], [3, 4, 1]]`, `n = 4`, `k = 2` → `2`.

- **Brute force:** explore every path with DFS and keep the minimum per node — exponential in the worst case.
- **Key insight:** the answer is the **largest** shortest distance from `k`. Run Dijkstra once, then take the max.

```ts
function networkDelayTime(times: readonly number[][], n: number, k: number): number {
  const graph: Edge[][] = Array.from({ length: n + 1 }, () => []); // index 0 unused
  for (const [from, to, ms] of times) graph[from].push([to, ms]);

  const dist = dijkstra(graph, k);
  let slowest = 0;
  for (let node = 1; node <= n; node++) slowest = Math.max(slowest, dist[node]);
  return slowest === Infinity ? -1 : slowest;
}
```

All the work is the template. The only new parts are building the adjacency list from the edge list and reading one number out of `dist`.

## W — Why It Matters

- Maps, network routing, and game pathfinding all run Dijkstra or a variant of it (A* adds a distance guess).
- It is the go-to answer for "weighted graph + minimum cost" in interviews.
- Interviewers check that you skip stale heap entries and that you mention why negative weights are not allowed.

## I — Interview Q&A

### Q: Why do negative edge weights break Dijkstra?

Dijkstra finalizes a node the first time it is popped. A negative edge found later could make a path to that node cheaper, but the node is already done. Use Bellman-Ford for graphs with negative edges.

### Q: How would you solve Cheapest Flights Within K Stops?

Plain Dijkstra ignores the stop limit. Use Bellman-Ford limited to `k + 1` rounds, or BFS level by level over stops while tracking the cheapest price per city.

### Q: Why not mark nodes visited when you push them, like BFS?

A node can be pushed with a bad distance first and a better one later. It is only final when popped. Skipping entries where `distance > dist[node]` handles this without a separate visited set.

## C — Common Pitfalls + Fix

### ❌ Forgetting to skip stale entries

Without `if (distance > dist[node]) continue;` the code is still correct but can re-scan the same node's edges many times.

### ❌ Using a sorted array as the queue

Sorting the whole array after every push costs `O(n log n)` per push. Use a heap.

### ❌ Comparing the wrong part of the heap entry

```ts
new MinHeap<[number, number]>((a, b) => a[1] - b[1]); // ❌ sorts by node id
new MinHeap<[number, number]>((a, b) => a[0] - b[0]); // ✅ sorts by distance
```

### ❌ Off-by-one with 1-based node labels

If nodes are `1..n`, build `n + 1` lists and ignore index 0, or every lookup is off by one.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Path With Minimum Effort:** you get a grid of heights. You move up, down, left, or right. The **effort** of a path is the largest height difference between two neighboring cells on it. Return the minimum effort to go from the top-left to the bottom-right cell.

`[[1, 2, 2], [3, 8, 2], [5, 3, 5]]` → `2` (path `1 → 3 → 5 → 3 → 5`)

<details><summary>Hint</summary>

Each cell is a node. Run Dijkstra, but a path's cost is the **max** step so far, not the sum: `candidate = Math.max(effort, step)`.

</details>

### Solution

```ts
function minimumEffortPath(heights: readonly number[][]): number {
  const rows = heights.length;
  const cols = heights[0].length;
  const best = Array.from({ length: rows }, () => new Array<number>(cols).fill(Infinity));
  best[0][0] = 0;
  // Heap entries are [effort, row, col], smallest effort first.
  const heap = new MinHeap<[number, number, number]>((a, b) => a[0] - b[0]);
  heap.push([0, 0, 0]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (heap.size > 0) {
    const [effort, row, col] = heap.pop()!;
    if (row === rows - 1 && col === cols - 1) return effort; // first pop is final
    if (effort > best[row][col]) continue; // stale
    for (const [dr, dc] of directions) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const step = Math.abs(heights[r][c] - heights[row][col]);
      const candidate = Math.max(effort, step); // path cost is its biggest step
      if (candidate < best[r][c]) {
        best[r][c] = candidate;
        heap.push([candidate, r, c]);
      }
    }
  }
  return 0;
}
```

(Uses the `MinHeap` class from the template.) **Time:** `O(R·C log(R·C))` · **Space:** `O(R·C)`. Dijkstra works because taking the max, like adding a non-negative number, never makes a path cheaper.

**Right now:** Add the edge `D→B 1` to the walkthrough graph and predict whether any distance changes before you trace it.
