# Topological Sort: Course Schedule

## T — TL;DR

A *topological order* lists the nodes of a directed graph so every edge points forward: if `a → b`, then `a` comes before `b`. **Kahn's algorithm** builds it by repeatedly taking a node with no unmet prerequisites. If some nodes are never taken, the graph has a *cycle* (a loop of edges), and no valid order exists.

**Reach for it when:**

- Tasks have prerequisites or dependencies ("a must happen before b").
- You must find a valid order, or decide if one exists.
- The question hints at a cycle: "is it possible to finish all ...?"

## K — Key Concepts

### Picture it

Getting dressed: socks before shoes, shirt before jacket, trousers before shoes. Anything with nothing left to wait for can go on now. Each time you put something on, items waiting on it get one step closer to ready. If two items each wait for the other, you are stuck forever: that is a cycle.

### Walk through it

The *in-degree* of a node is the number of edges coming into it: how many prerequisites it still waits on. Courses `0..3`, edges `0 → 1`, `0 → 2`, `1 → 3`, `2 → 3`.

| Step | Take | In-degree after (0, 1, 2, 3) | Queue after | Order |
| :--- | :--- | :--------------------------- | :---------- | :---- |
| 0 | — | 0, 1, 1, 2 | `[0]` | `[]` |
| 1 | 0 | 0, 0, 0, 2 | `[1, 2]` | `[0]` |
| 2 | 1 | 0, 0, 0, 1 | `[2]` | `[0, 1]` |
| 3 | 2 | 0, 0, 0, 0 | `[3]` | `[0, 1, 2]` |
| 4 | 3 | 0, 0, 0, 0 | `[]` | `[0, 1, 2, 3]` |

All 4 nodes were taken, so there is no cycle. With an extra edge `3 → 0`, node 0 starts with in-degree 1, the queue starts empty, and 0 nodes get taken.

### The template

```ts
// Kahn's algorithm. Returns a valid order, or null if there is a cycle.
function topologicalSort(n: number, edges: readonly [number, number][]): number[] | null {
  const adjacency: number[][] = Array.from({ length: n }, () => []);
  const inDegree: number[] = new Array(n).fill(0);
  for (const [from, to] of edges) {
    adjacency[from].push(to);
    inDegree[to]++;
  }

  const queue: number[] = [];
  for (let node = 0; node < n; node++) if (inDegree[node] === 0) queue.push(node);

  const order: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    order.push(node);                        // nothing left to wait for
    for (const next of adjacency[node]) {
      inDegree[next]--;                      // one prerequisite done
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return order.length === n ? order : null;  // missing nodes = stuck in a cycle
}
```

**Time:** `O(V + E)` · **Space:** `O(V + E)` — each node is queued once and each edge lowers one in-degree once.

Nodes inside a cycle always wait on each other, so their in-degree never reaches `0`. Counting how many nodes were taken is the whole cycle check.

### Interview classic: Course Schedule

There are `numCourses` courses. `prerequisites[i] = [course, before]` means you must take `before` first. Can you finish every course?
Example: `2, [[1, 0]]` → `true`. `2, [[1, 0], [0, 1]]` → `false` (each needs the other).

- **Brute force:** try orderings until one works — `O(n!)`.
- **Key insight:** "can I finish everything?" is "does the graph have no cycle?". Run Kahn's and check that every course was taken.

```ts
function canFinish(
  numCourses: number, prerequisites: readonly [number, number][],
): boolean {
  const adjacency: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree: number[] = new Array(numCourses).fill(0);
  for (const [course, before] of prerequisites) {
    adjacency[before].push(course);         // edge points before → course
    inDegree[course]++;
  }

  const queue: number[] = [];
  for (let course = 0; course < numCourses; course++) {
    if (inDegree[course] === 0) queue.push(course);
  }
  let taken = 0;
  for (let head = 0; head < queue.length; head++) {
    taken++;
    for (const next of adjacency[queue[head]]) {
      if (--inDegree[next] === 0) queue.push(next);
    }
  }
  return taken === numCourses;
}
```

The only twist is the edge direction: the pair is `[course, before]`, but the edge goes from `before` to `course`.

## W — Why It Matters

- Course Schedule I and II are among the most asked graph questions.
- Real uses: build systems, package managers (`npm` install order), spreadsheet recalculation, task pipelines.
- Interviewers listen for the cycle check and for the correct edge direction.

## I — Interview Q&A

### Q: Can you detect the cycle with DFS instead?

Yes. Give each node three states: unvisited, in progress, done. Reaching an "in progress" node again means you found a cycle. Adding nodes when they finish, then reversing, gives a topological order.

### Q: Is the topological order unique?

Usually not. Any node with in-degree 0 can go next. In the walk-through, `[0, 2, 1, 3]` is also valid.

### Q: Does this work on undirected graphs?

No. Every undirected edge is a two-way link, so "before" has no meaning. Topological sort needs a *DAG* (directed acyclic graph: directed edges, no cycles).

## C — Common Pitfalls + Fix

### ❌ Reversing the edge direction

```ts
adjacency[course].push(before); // ❌ says "course unlocks its prerequisite"
adjacency[before].push(course); // ✅ finishing `before` unlocks `course`
```

### ❌ Forgetting courses with no edges

A course with no prerequisites must still enter the queue. Loop over all `n` nodes to seed it, not only the nodes in the edge list.

### ❌ Returning a partial order

If `order.length < n`, there is a cycle. Return `null` (or `[]`), not the partial list.

### ❌ Using `queue.shift()`

It makes the loop `O(V²)` on large inputs. Use a head index.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Course Schedule II:** same input as Course Schedule. Return one valid order to take all the courses, or `[]` if it is impossible.

`4, [[1, 0], [2, 0], [3, 1], [3, 2]]` → `[0, 1, 2, 3]` (or `[0, 2, 1, 3]`)

<details><summary>Hint</summary>

Run Kahn's and record each course as you take it from the queue. Check the length at the end.

</details>

### Solution

```ts
function findOrder(
  numCourses: number, prerequisites: readonly [number, number][],
): number[] {
  const adjacency: number[][] = Array.from({ length: numCourses }, () => []);
  const inDegree: number[] = new Array(numCourses).fill(0);
  for (const [course, before] of prerequisites) {
    adjacency[before].push(course);
    inDegree[course]++;
  }

  const order: number[] = [];
  for (let course = 0; course < numCourses; course++) {
    if (inDegree[course] === 0) order.push(course);
  }
  // `order` is also the queue: the head index walks it while new courses are added.
  for (let head = 0; head < order.length; head++) {
    for (const next of adjacency[order[head]]) {
      if (--inDegree[next] === 0) order.push(next);
    }
  }
  return order.length === numCourses ? order : [];
}
```

**Time:** `O(V + E)` · **Space:** `O(V + E)`. A course is only added when all its prerequisites are already in the list, so the list is a valid order.

**Right now:** Add the edge `[0, 3]` to the challenge example and redo the in-degree table by hand. Is it still possible?
