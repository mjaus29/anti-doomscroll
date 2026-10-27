# Union-Find

## T — TL;DR

*Union-Find* (also called *Disjoint Set Union*) keeps track of which items are in the same group. It supports two operations: **find** (who is my group's leader?) and **union** (merge two groups). With two small tricks, both run in nearly `O(1)` time.

**Reach for it when:**

- Edges arrive one at a time and you must keep asking "are these two connected?"
- You need to count groups, or detect the first edge that creates a cycle.
- The words "merge", "group", "connected", or "same set" appear.

## K — Key Concepts

### Picture it

Every person in a town belongs to one club, and each club has a **leader**. Everyone knows one person to ask, who knows one person to ask, up to the leader. To check if two people share a club, compare their leaders. To merge two clubs, the leader of the smaller club agrees to follow the leader of the bigger one.

### Walk through it

`parent[x]` is the person `x` asks; a leader is its own parent. Five items, start with `parent = [0, 1, 2, 3, 4]` and every `size` = 1.

| Step | Operation | Leaders found | `parent` after | Why |
| :--- | :-------- | :------------ | :------------- | :-- |
| 1 | union(0, 1) | 0, 1 | `[0, 0, 2, 3, 4]` | Equal sizes: 1 follows 0. |
| 2 | union(2, 3) | 2, 3 | `[0, 0, 2, 2, 4]` | 3 follows 2. |
| 3 | union(1, 3) | 0, 2 | `[0, 0, 0, 2, 4]` | Different groups. 2 follows 0. |
| 4 | find(3) | 3 → 2 → 0 | `[0, 0, 0, 0, 4]` | Path compression: 3 now points straight at 0. |
| 5 | union(0, 3) | 0, 0 | unchanged | Same leader: already connected. |

Two groups remain: `{0, 1, 2, 3}` and `{4}`.

### The template

```ts
class UnionFind {
  parent: number[];
  size: number[];
  groups: number;

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, index) => index); // own leader
    this.size = new Array(n).fill(1);
    this.groups = n;
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(a: number, b: number): boolean {
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) return false;           // already in the same group
    if (this.size[rootA] < this.size[rootB]) [rootA, rootB] = [rootB, rootA];
    this.parent[rootB] = rootA;                  // union by size: small under big
    this.size[rootA] += this.size[rootB];
    this.groups--;
    return true;
  }
}
```

*Path compression* means: after finding the leader, point every item on the way directly at it, so the next find is one step. *Union by size* means the smaller group joins the bigger one, so chains stay short.

**Time:** nearly `O(1)` per operation (the exact bound is the inverse Ackermann function, which is under 5 for any real input) · **Space:** `O(n)`.

### Interview classic: Redundant Connection

A tree with nodes `1..n` had one extra edge added, so now it has exactly one cycle. Given the edges in order, return the edge that can be removed to make it a tree again (the last such edge in the input).
Example: `[[1, 2], [1, 3], [2, 3]]` → `[2, 3]`.

- **Brute force:** remove each edge in turn and check if the rest is a tree with DFS — `O(E · (V + E))`.
- **Key insight:** add edges one by one. The first edge whose two ends already share a leader closes a loop. That edge is the answer.

```ts
function findRedundantConnection(edges: readonly [number, number][]): [number, number] {
  const groups = new UnionFind(edges.length + 1); // labels start at 1
  for (const [a, b] of edges) {
    if (!groups.union(a, b)) return [a, b];       // already connected → cycle edge
  }
  return [-1, -1];                                // input promises a cycle exists
}
```

`union` returning `false` is the whole cycle check. With DFS you would have to search the graph again for every edge.

## W — Why It Matters

- Union-Find answers "connected?" questions on a growing graph much faster than repeated DFS.
- It is the core of Kruskal's minimum spanning tree and of many "accounts merge" or "friend circles" problems.
- Interviewers listen for both optimisations by name and for what `union` returning `false` means.

## I — Interview Q&A

### Q: What happens without path compression and union by size?

Groups can form a long chain, like a linked list, and `find` becomes `O(n)`. Either trick alone helps a lot; together they make operations almost constant time.

### Q: Union-Find or DFS for counting components?

Both are `O(V + E)` for a fixed graph. Union-Find wins when edges arrive over time and you must answer after each one. DFS is simpler to write for a single count.

### Q: Can Union-Find split a group apart?

No. It only merges. If edges can be removed, you need a different approach (or process removals backwards as additions).

## C — Common Pitfalls + Fix

### ❌ Comparing parents instead of leaders

```ts
if (parent[a] === parent[b]) // ❌ parents may differ even in the same group
if (find(a) === find(b))     // ✅ compare leaders
```

### ❌ Linking the items, not their leaders

`parent[a] = b` can cut `a` off from the rest of its group. Always link `find(a)` and `find(b)`.

### ❌ Off-by-one with 1-based labels

If nodes are `1..n`, create `n + 1` slots and ignore slot 0, or subtract 1 everywhere.

### ❌ Forgetting to update the group count

Decrease `groups` only when `union` actually merges two different groups.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Number of Provinces:** `isConnected` is an `n × n` matrix where `isConnected[i][j] = 1` means city `i` and city `j` are directly linked. A province is a group of cities linked directly or through other cities. Return the number of provinces.

`[[1, 1, 0], [1, 1, 0], [0, 0, 1]]` → `2`

<details><summary>Hint</summary>

Start with `n` groups. Union every linked pair. The matrix is symmetric, so only look at `j > i`.

</details>

### Solution

```ts
function findCircleNum(isConnected: readonly number[][]): number {
  const n = isConnected.length;
  const parent = Array.from({ length: n }, (_, index) => index);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]); // path compression
    return parent[x];
  };

  let provinces = n;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {     // upper half only: matrix is symmetric
      if (isConnected[i][j] !== 1) continue;
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootJ] = rootI;
        provinces--;                      // two provinces became one
      }
    }
  }
  return provinces;
}
```

**Time:** `O(n²)` to read the matrix (each find is nearly `O(1)`) · **Space:** `O(n)`. Each successful merge lowers the count by one, so what remains is the number of groups. This short version skips union by size; path compression alone is fast enough here.

**Right now:** Run the walk-through again but call `union(3, 4)` at the end, and write the final `parent` and `size` arrays.
