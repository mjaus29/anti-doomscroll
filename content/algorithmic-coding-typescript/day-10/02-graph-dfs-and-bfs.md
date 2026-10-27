# Graph DFS and BFS

## T — TL;DR

There are two ways to explore a graph. *DFS* (depth-first search) follows one path as far as it can, then backs up. *BFS* (breadth-first search) visits all nodes 1 edge away, then 2 edges away, and so on. Both use a **visited set** so each node is handled once, which makes them `O(V + E)`.

**Reach for it when:**

- "Is there a path from A to B?" or "which nodes can I reach?" → DFS or BFS.
- "Fewest steps / edges / moves" in an unweighted graph → **BFS**.
- "How many separate groups?" → run DFS from every unvisited node.

## K — Key Concepts

### Picture it

DFS is exploring a cave: take the first tunnel, keep going until a dead end, walk back to the last fork, try the next tunnel. BFS is a ripple in a pond: it reaches everything 1 metre away before anything 2 metres away. That ripple order is why BFS finds the shortest number of edges.

### Walk through it

BFS from node `0`. Adjacency: `0: [1, 2]`, `1: [0, 3]`, `2: [0, 3]`, `3: [1, 2, 4]`, `4: [3]`.

| Step | Take from queue | Distance | New neighbours added | Queue after |
| :--- | :-------------- | :------- | :------------------- | :---------- |
| 1 | 0 | 0 | 1, 2 (distance 1) | `[1, 2]` |
| 2 | 1 | 1 | 3 (distance 2); 0 already visited | `[2, 3]` |
| 3 | 2 | 1 | none: 0 and 3 already visited | `[3]` |
| 4 | 3 | 2 | 4 (distance 3) | `[4]` |
| 5 | 4 | 3 | none | `[]` |

Node 3 is marked when it is **added** in step 2, so step 3 does not add it twice.

### The template

```ts
// DFS (recursive): can we reach `target` from `start`?
function hasPath(adjacency: readonly number[][], start: number, target: number): boolean {
  const visited = new Set<number>();
  const dfs = (node: number): boolean => {
    if (node === target) return true;
    visited.add(node);                 // mark before exploring: prevents loops
    for (const next of adjacency[node]) {
      if (!visited.has(next) && dfs(next)) return true;
    }
    return false;
  };
  return dfs(start);
}

// DFS (iterative): same idea with your own stack. Safe for very deep graphs.
function hasPathIterative(
  adjacency: readonly number[][], start: number, target: number,
): boolean {
  const visited = new Set<number>([start]);
  const stack: number[] = [start];
  while (stack.length > 0) {
    const node = stack.pop()!;         // pop from the end: last in, first out
    if (node === target) return true;
    for (const next of adjacency[node]) {
      if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
  }
  return false;
}

// BFS: fewest edges from `start` to every node (-1 = unreachable).
function bfsDistances(adjacency: readonly number[][], start: number): number[] {
  const distance: number[] = new Array(adjacency.length).fill(-1);
  distance[start] = 0;                 // distance doubles as the visited mark
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) { // head index: no O(n) shift()
    const node = queue[head];
    for (const next of adjacency[node]) {
      if (distance[next] === -1) {
        distance[next] = distance[node] + 1;
        queue.push(next);
      }
    }
  }
  return distance;
}
```

**Time:** `O(V + E)` · **Space:** `O(V)` — each node enters the set or queue once, and each edge is looked at once from each end.

### Interview classic: Number of Connected Components in an Undirected Graph

Given `n` nodes and a list of undirected edges, count the *connected components* — groups where every node can reach every other node in the group.
Example: `n = 5`, `edges = [[0, 1], [1, 2], [3, 4]]` → `2` (`{0, 1, 2}` and `{3, 4}`).

- **Brute force:** for every pair of nodes, check if a path exists, then group them — `O(V · (V + E))`.
- **Key insight:** start a DFS from any unvisited node. It marks that node's whole group. Every new start is a new group.

```ts
function countComponents(n: number, edges: readonly [number, number][]): number {
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adjacency[a].push(b); adjacency[b].push(a); }

  const visited: boolean[] = new Array(n).fill(false);
  const dfs = (node: number): void => {
    visited[node] = true;
    for (const next of adjacency[node]) if (!visited[next]) dfs(next);
  };

  let components = 0;
  for (let node = 0; node < n; node++) {
    if (!visited[node]) { components++; dfs(node); } // new group found
  }
  return components;
}
```

It is the DFS template wrapped in a loop over every node. Union-Find (lesson 6) solves the same problem another way.

## W — Why It Matters

- DFS and BFS are the base of islands, course schedules, shortest paths, and most graph questions.
- Real uses: crawling links, finding friends-of-friends, dependency resolution, network reachability.
- Interviewers listen for why you chose BFS ("fewest edges") or DFS ("only reachability"), and for when you mark nodes visited.

## I — Interview Q&A

### Q: When must you use BFS instead of DFS?

When you need the fewest edges in an unweighted graph. DFS may find a long path first. For weighted edges, use Dijkstra (Day 12).

### Q: Recursive or iterative DFS?

Recursive is shorter. Iterative avoids stack overflow when the graph can be a long chain (around 10,000+ nodes deep in Node).

### Q: Why mark visited when adding to the queue, not when removing?

If you wait, the same node can be added many times by different neighbours, which wastes time and memory.

## C — Common Pitfalls + Fix

### ❌ No visited set

On a graph with a cycle, the walk never ends.

### ❌ Using `queue.shift()`

`shift()` moves every element, so BFS becomes `O(V²)`. Use a head index, as in the template.

### ❌ Marking visited too late in BFS

```ts
const node = queue[head]; visited.add(node);      // ❌ duplicates already queued
if (!visited.has(next)) { visited.add(next); queue.push(next); } // ✅ mark on add
```

### ❌ Only starting from node 0

In a disconnected graph, some nodes cannot be reached from node 0. Loop over every node when the question is about the whole graph.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Keys and Rooms:** there are `n` rooms; room `0` is unlocked. `rooms[i]` lists the keys found in room `i` (each key opens the room with that number). Return `true` if you can enter every room.

`[[1], [2], [3], []]` → `true` · `[[1, 3], [3, 0, 1], [2], [0]]` → `false` (room 2's key is only inside room 2)

<details><summary>Hint</summary>

Rooms are nodes and keys are directed edges. Run DFS from room 0 and count the rooms you visit.

</details>

### Solution

```ts
function canVisitAllRooms(rooms: readonly number[][]): boolean {
  const visited = new Set<number>([0]);
  const stack: number[] = [0];

  while (stack.length > 0) {
    const room = stack.pop()!;
    for (const key of rooms[room]) {
      if (!visited.has(key)) { visited.add(key); stack.push(key); } // new room opened
    }
  }
  return visited.size === rooms.length;
}
```

**Time:** `O(n + K)` where `K` is the total number of keys · **Space:** `O(n)`. The `rooms` array is already an adjacency list, so this is iterative DFS with a reachability count at the end.

**Right now:** Run `bfsDistances` on the walk-through graph starting from node `4` and write the distance array.
