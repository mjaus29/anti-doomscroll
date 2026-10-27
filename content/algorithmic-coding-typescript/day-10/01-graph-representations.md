# Graph Representations

## T — TL;DR

A *graph* is a set of **nodes** (things) joined by **edges** (connections). Problems usually give you a list of edges; your first job is to turn it into an *adjacency list* — for each node, the list of its neighbours — so you can find any node's neighbours in `O(1)`.

**Reach for it when:**

- The input is pairs like `[a, b]` meaning "a connects to b" or "a depends on b".
- The problem talks about friends, cities, routes, dependencies, or networks.
- A tree problem allows cycles or more than one parent: it is really a graph.

## K — Key Concepts

### Picture it

A graph is a map of cities and roads. A *directed* edge is a one-way street (`a → b`). An *undirected* edge is a two-way street. A *weighted* edge has a number on it, like distance or cost. The adjacency list is each city's signpost listing the cities you can drive to next.

### Walk through it

Undirected graph with `n = 4` nodes and `edges = [[0, 1], [0, 2], [1, 2], [2, 3]]`. Each edge is added in **both** directions.

| Step | Edge | `adjacency` after | Why |
| :--- | :--- | :---------------- | :-- |
| 0 | — | `[[], [], [], []]` | One empty list per node. |
| 1 | `[0, 1]` | `[[1], [0], [], []]` | 0 sees 1 and 1 sees 0. |
| 2 | `[0, 2]` | `[[1, 2], [0], [0], []]` | Same for 0 and 2. |
| 3 | `[1, 2]` | `[[1, 2], [0, 2], [0, 1], []]` | Same for 1 and 2. |
| 4 | `[2, 3]` | `[[1, 2], [0, 2], [0, 1, 3], [2]]` | Neighbours of 2 are now `0, 1, 3`. |

If the edges were directed, step 1 would only add `1` to node 0's list.

### The template

```ts
// Nodes are numbered 0..n-1: use an array of arrays.
function buildAdjacency(n: number, edges: readonly [number, number][]): number[][] {
  const adjacency: number[][] = Array.from({ length: n }, () => []); // fresh arrays
  for (const [from, to] of edges) {
    adjacency[from].push(to);
    adjacency[to].push(from); // undirected: delete this line for directed edges
  }
  return adjacency;
}

// Nodes are names (or numbers you don't know in advance): use a Map.
function buildAdjacencyMap(edges: readonly [string, string][]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  const add = (from: string, to: string): void => {
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  };
  for (const [from, to] of edges) {
    add(from, to);
    add(to, from);
  }
  return adjacency;
}

// Weighted: store the cost next to each neighbour.
type WeightedEdge = [from: number, to: number, weight: number];
function buildWeighted(n: number, edges: readonly WeightedEdge[]): [number, number][][] {
  const adjacency: [number, number][][] = Array.from({ length: n }, () => []);
  for (const [from, to, weight] of edges) adjacency[from].push([to, weight]);
  return adjacency;
}
```

**Time:** `O(V + E)` · **Space:** `O(V + E)` — `V` is the number of nodes (vertices) and `E` the number of edges; each node gets one list and each edge is stored once or twice.

An *adjacency matrix* (`matrix[a][b] = 1` if connected) is the other option. It answers "are a and b connected?" in `O(1)` but always costs `O(V²)` space, so use it only for small, dense graphs.

### Interview classic: Clone Graph

You get one node of a connected undirected graph. Each node has a `val` and a list of `neighbors`. Return a **deep copy**: new node objects with the same shape.
Example: 1–2, 2–3, 3–4, 4–1 (a square) → a new square, with no node shared with the original.

- **Brute force:** copy each node when you see it — but cycles make you copy the same node forever.
- **Key insight:** keep a `Map` from original node to its copy. It doubles as the *visited set* (nodes already handled): if a node is in the map, reuse its copy instead of making another.

```ts
class GraphNode {
  val: number;
  neighbors: GraphNode[];
  constructor(val = 0, neighbors: GraphNode[] = []) {
    this.val = val;
    this.neighbors = neighbors;
  }
}

function cloneGraph(node: GraphNode | null): GraphNode | null {
  if (node === null) return null;
  const copies = new Map<GraphNode, GraphNode>(); // original → copy

  const copy = (original: GraphNode): GraphNode => {
    const existing = copies.get(original);
    if (existing) return existing;            // already copied: stops cycles
    const clone = new GraphNode(original.val);
    copies.set(original, clone);              // register before visiting neighbours
    for (const neighbor of original.neighbors) clone.neighbors.push(copy(neighbor));
    return clone;
  };

  return copy(node);
}
```

Here the graph arrives already as an adjacency list (each node holds its `neighbors`). The map is the same "have I seen this?" check every graph walk needs.

## W — Why It Matters

- Almost every graph problem starts with "build the adjacency list". Doing it fast and correctly frees your attention for the real logic.
- Real systems are graphs: social networks, package dependencies, road maps, service calls.
- Interviewers listen for you to ask: directed or undirected? Weighted? Can there be cycles or disconnected parts?

## I — Interview Q&A

### Q: Adjacency list or matrix?

List for most problems: it uses `O(V + E)` space and lists neighbours quickly. Matrix only when `V` is small and you need instant "is there an edge?" checks.

### Q: In Clone Graph, why add to the map before copying neighbours?

A neighbour may point back to the current node. If the copy is not registered yet, that back-edge creates a second copy and the recursion never ends.

### Q: How do you store a graph whose node labels are strings?

Use a `Map<string, string[]>`, or map each label to an index `0..n-1` first and then use arrays.

## C — Common Pitfalls + Fix

### ❌ `new Array(n).fill([])`

Every slot points to **one** shared array, so every node gets every neighbour.

```ts
new Array(n).fill([]);                 // ❌ one array shared n times
Array.from({ length: n }, () => []);   // ✅ n separate arrays
```

### ❌ Adding undirected edges only one way

Then you can walk from 0 to 1 but not back. Add both directions.

### ❌ Forgetting isolated nodes

A node with no edges never appears in the edge list. Create lists for all `n` nodes up front.

### ❌ No visited check

Graphs can have cycles. Any walk without a visited set (or map) can loop forever.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Find the Town Judge:** people are labelled `1` to `n`. `trust[i] = [a, b]` means person `a` trusts person `b`. The judge trusts nobody and is trusted by everyone else. Return the judge's label, or `-1` if there is none.

`n = 3, trust = [[1, 3], [2, 3]]` → `3`

<details><summary>Hint</summary>

You don't need full neighbour lists. Count, for each person, edges going out (trusts) and edges coming in (trusted by).

</details>

### Solution

```ts
function findJudge(n: number, trust: readonly [number, number][]): number {
  // score = trusted-by count minus trusts count. Only the judge reaches n - 1.
  const score: number[] = new Array(n + 1).fill(0);
  for (const [truster, trusted] of trust) {
    score[truster]--;   // out-edge: a judge has none
    score[trusted]++;   // in-edge: a judge has n - 1
  }
  for (let person = 1; person <= n; person++) {
    if (score[person] === n - 1) return person;
  }
  return -1;
}
```

**Time:** `O(n + E)` · **Space:** `O(n)`. In graph words, the judge has *in-degree* (edges coming in) `n - 1` and *out-degree* (edges going out) `0`; one combined score checks both.

**Right now:** Build the adjacency list for `edges = [[0, 3], [1, 3], [3, 2]]` as directed edges, then as undirected, on paper.
