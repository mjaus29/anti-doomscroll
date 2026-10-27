# Algorithmic Coding / TypeScript Cheat Sheet

The templates worth typing from memory, plus the tables that tell you which one to reach for. Read the signal, check `n`, write the template, then adapt it.

## Big-O and input size

About 10⁸ simple steps run in one second, so the largest `n` tells you the target:

| Largest `n` | Target | Usual pattern / code |
| :---------- | :----- | :------------------- |
| ≤ 20 | `O(2ⁿ)`, `O(n!)` | Backtracking: all subsets / orderings |
| ≤ 500 | `O(n³)` | Triple loop, interval DP |
| ≤ 10³–10⁴ | `O(n²)` | Two nested loops, 2D DP |
| ≤ 10⁵–10⁶ | `O(n log n)` or `O(n)` | `sort`, heap, binary search, hash map, window, BFS/DFS (`V + E`) |
| ≥ 10⁹ (a value, not a length) | `O(log n)` | Binary search on the answer |
| any, per operation | `O(1)` | `arr[i]`, `map.get`, `set.has`, `push`/`pop` |

Loops in a row add, nested loops multiply, constants drop. Space counts new arrays/maps/sets **and** the recursion stack. Hidden `O(n)` calls: `includes`, `indexOf`, `slice`, `[...arr]`, `shift`, `unshift`.

Lessons: [How to Approach a Coding Problem](/group/algorithmic-coding-typescript/day/01/01-how-to-approach-a-coding-problem) · [Big-O](/group/algorithmic-coding-typescript/day/01/02-big-o-time-and-space-complexity)

## Signal in the problem → pattern

| Signal | Pattern |
| :----- | :------ |
| "Seen before?", duplicates, pair sums to X (unsorted), "count each" | Hash map / set / counts |
| Best subarray sum; many range sums; "subarray sums to k" | Kadane; prefix sums (+ map) |
| Sorted array, find a pair; triplets; remove in place | Two pointers (sort first for 3Sum) |
| Longest / shortest **contiguous** run with a rule; "every window of size k" | Sliding window |
| Sorted input, `O(log n)`, first/last position | Binary search / lower bound |
| "Minimum speed / capacity so that…" | Binary search on the answer |
| Matching brackets, undo, nesting | Stack |
| "Next greater / warmer / smaller" | Monotonic stack |
| Max of every window; `O(1)` get + put cache | Deque; `Map` order (LRU) |
| Head might change; cycle, middle, k-th from end | Dummy node; fast and slow pointers |
| Depth, height, diameter, balanced; "level by level" | Tree DFS returning info; tree BFS |
| "k-th largest", top k, merge k sorted | Heap |
| Overlapping ranges, meeting rooms | Sort by start, merge / sweep |
| "All subsets / combinations / orderings" | Backtracking |
| Reachable? fewest edges? islands? many starts at once? | Graph / grid BFS or DFS, multi-source BFS |
| Prerequisites, build order | Topological sort |
| "Are these connected?", merging groups | Union-Find |
| "Number of ways", "fewest", overlapping subproblems | DP |
| "Can you reach…", one pass with a best-so-far | Greedy |
| Weighted edges, cheapest path | Dijkstra |
| Prefixes, autocomplete; pairs cancel, count 1 bits | Trie; bit manipulation |

Lessons: [Pattern Cheat Sheet and Mock Interview](/group/algorithmic-coding-typescript/day/12/05-pattern-cheat-sheet-and-mock-interview)

## Hashing, counting, prefix sums

```ts
function twoSum(nums: readonly number[], target: number): [number, number] | null {
  const seen = new Map<number, number>(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const partnerIndex = seen.get(target - nums[i]);
    if (partnerIndex !== undefined) return [partnerIndex, i];
    seen.set(nums[i], i); // add after checking: never pair i with itself
  }
  return null;
}
```

| Piece | One-liner |
| :---- | :-------- |
| Count with a Map | `counts.set(x, (counts.get(x) ?? 0) + 1)` |
| Lowercase letter counts | `counts[char.charCodeAt(0) - 97]++` on `new Array<number>(26).fill(0)` |
| Prefix array | `prefix[i + 1] = prefix[i] + values[i]`; range sum `prefix[r + 1] - prefix[l]` |
| Subarrays summing to k | Map of prefix sums seeded `[[0, 1]]`; per item `count += seen.get(sum - k) ?? 0` |
| Kadane | `current = Math.max(x, current + x); best = Math.max(best, current)`, start both at `nums[0]` |
| Grid neighbours | `for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]])`, bounds check **before** reading |

Lessons: [Hash Maps and Sets](/group/algorithmic-coding-typescript/day/02/01-hash-maps-and-sets) · [Frequency Counting](/group/algorithmic-coding-typescript/day/02/02-frequency-counting) · [Running State and Kadane](/group/algorithmic-coding-typescript/day/02/03-running-state-and-kadanes-algorithm) · [Prefix Sums](/group/algorithmic-coding-typescript/day/02/04-prefix-sums)

## Two pointers

```ts
function pairWithSum(sorted: readonly number[], target: number): number[] | null {
  let left = 0;
  let right = sorted.length - 1;
  while (left < right) { // never pair an item with itself
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [left, right];
    if (sum < target) left++; // need bigger
    else right--;             // need smaller
  }
  return null;
}
```

**Read / write pointers:** `read` scans every item, `write` marks the next slot to keep; on a keeper, copy or swap into `write` and `write++`. **3Sum:** sort a copy, fix `i`, run the pair search on the rest, skip duplicate values.

Lessons: [Two Pointers: Opposite Ends](/group/algorithmic-coding-typescript/day/03/01-two-pointers-opposite-ends) · [Read and Write Pointers](/group/algorithmic-coding-typescript/day/03/02-read-and-write-pointers) · [Sorting and 3Sum](/group/algorithmic-coding-typescript/day/03/03-sorting-and-3sum)

## Sliding window

```ts
function longestWithSumAtMost(values: readonly number[], limit: number): number {
  let left = 0;
  let sum = 0; // state describing the window
  let best = 0;
  for (let right = 0; right < values.length; right++) {
    sum += values[right];                    // 1. grow
    while (sum > limit) sum -= values[left++]; // 2. shrink while invalid
    best = Math.max(best, right - left + 1); // 3. record a valid window
  }
  return best;
}
```

Swap the state (`sum`, a count map) and the rule; the three steps stay. `O(n)` because `left` only moves forward. Works for sums only when values are non-negative. **Fixed size k:** build the first window, then `sum += values[right] - values[right - k]`.

Lessons: [Sliding Window: Variable Size](/group/algorithmic-coding-typescript/day/03/04-sliding-window-variable-size) · [Sliding Window: Fixed Size](/group/algorithmic-coding-typescript/day/03/05-sliding-window-fixed-size)

## Binary search

```ts
// First index with sorted[index] >= target (sorted.length if none).
function lowerBound(sorted: readonly number[], target: number): number {
  let left = 0;
  let right = sorted.length;
  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (sorted[mid] < target) left = mid + 1;
    else right = mid; // mid could be the answer: keep it
  }
  return left;
}
```

| Variant | Loop | Updates |
| :------ | :--- | :------ |
| Exact match | `left <= right`, `right = n - 1` | `left = mid + 1` / `right = mid - 1`, return `-1` |
| Lower / upper bound | `left < right`, `right = n` | `<` for lower, `<=` for upper; count of x = upper − lower |
| Rotated min | `left < right` | `rotated[mid] > rotated[right]` → `left = mid + 1`, else `right = mid` |
| On the answer | `low < high` over values, not indexes | `canDo(mid)` → `high = mid`, else `low = mid + 1`; `canDo` must go no…no, yes…yes |

Lessons: [Binary Search Basics](/group/algorithmic-coding-typescript/day/04/01-binary-search-basics) · [First and Last Position](/group/algorithmic-coding-typescript/day/04/02-first-and-last-position) · [Rotated Sorted Arrays](/group/algorithmic-coding-typescript/day/04/03-rotated-sorted-arrays) · [Binary Search on the Answer](/group/algorithmic-coding-typescript/day/04/04-binary-search-on-the-answer)

## Stacks and queues

**Valid parentheses:** on an opener push its expected closer; on a closer `if (stack.pop() !== char) return false`; end with `stack.length === 0`.

```ts
function nextGreater(values: readonly number[]): number[] {
  const answer = new Array<number>(values.length).fill(-1);
  const waiting: number[] = []; // indexes; values decrease bottom → top
  for (let i = 0; i < values.length; i++) {
    while (waiting.length > 0 && values[waiting[waiting.length - 1]] < values[i]) {
      answer[waiting.pop()!] = values[i];
    }
    waiting.push(i);
  }
  return answer;
}
```

**Queue without `shift()`:** `for (let head = 0; head < queue.length; head++)` and `push` at the end. **Deque** for window max: store indexes, pop smaller values from the back, drop the front when it leaves the window. **LRU cache:** a `Map` keeps insertion order; on use, `delete` then `set`; evict `map.keys().next().value`.

Lessons: [Stacks](/group/algorithmic-coding-typescript/day/05/01-stacks-valid-parentheses-and-min-stack) · [Monotonic Stack](/group/algorithmic-coding-typescript/day/05/02-monotonic-stack) · [Queues and Deques](/group/algorithmic-coding-typescript/day/05/03-queues-and-deques) · [Design: LRU Cache](/group/algorithmic-coding-typescript/day/05/04-design-lru-cache)

## Linked lists

Uses the lessons' `ListNode` class: `val: number`, `next: ListNode | null`, constructor `(val = 0, next = null)`.

```ts
function reverseList(head: ListNode | null): ListNode | null {
  let previous: ListNode | null = null;
  let current = head;
  while (current !== null) {
    const next = current.next; // save before overwriting
    current.next = previous;
    previous = current;
    current = next;
  }
  return previous;
}
```

| Technique | Core lines |
| :-------- | :--------- |
| Dummy node | `const dummy = new ListNode(0, head)` … `return dummy.next` |
| Middle | `while (fast !== null && fast.next !== null) { slow = slow!.next; fast = fast.next.next; }` |
| Cycle | same loop; `if (slow === fast) return true` |
| Reorder list | find middle → cut → reverse back half → weave the two halves |

Lessons: [Linked List Basics and Reversal](/group/algorithmic-coding-typescript/day/06/01-linked-list-basics-and-reversal) · [Dummy Nodes and Merging](/group/algorithmic-coding-typescript/day/06/02-dummy-nodes-and-merging-lists) · [Fast and Slow Pointers](/group/algorithmic-coding-typescript/day/06/03-fast-and-slow-pointers) · [Reorder List](/group/algorithmic-coding-typescript/day/06/04-combining-techniques-reorder-list)

## Trees

Uses the lessons' `TreeNode` class: `val`, `left`, `right` (children are `TreeNode | null`).

```ts
function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0; // base case: empty tree
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right)); // trust it
}
```

```ts
function levelOrder(root: TreeNode | null): number[][] {
  const levels: number[][] = [];
  let current = root === null ? [] : [root];
  while (current.length > 0) { // one loop = one level
    levels.push(current.map((node) => node.val));
    current = current.flatMap((node) => [node.left, node.right])
      .filter((child): child is TreeNode => child !== null);
  }
  return levels;
}
```

| Need | Shape |
| :--- | :---- |
| Height / balanced / diameter | Helper returns height; update an outer `best`, or return `-1` to fail fast |
| BST search / insert | `node = target < node.val ? node.left : node.right`; `O(h)` |
| Validate BST | Pass `(low, high)` bounds down, or check in-order is strictly increasing |
| LCA (binary tree) | If both sides return a node, this node is the LCA; else return the non-null side |
| Path sum | Pass `target - node.val` down; check `=== 0` only at a leaf |

Lessons: [Binary Tree Basics and DFS](/group/algorithmic-coding-typescript/day/07/01-binary-tree-basics-and-dfs) · [Level Order Traversal](/group/algorithmic-coding-typescript/day/07/02-level-order-traversal-bfs) · [Tree Recursion That Returns Information](/group/algorithmic-coding-typescript/day/07/03-tree-recursion-that-returns-information) · [Binary Search Trees](/group/algorithmic-coding-typescript/day/07/04-binary-search-trees)

## Heaps

JavaScript has no heap: write the `MinHeap<T>` from the lesson (`push` sifts up, `pop` moves the last item to the root and sifts down). Index math: parent `(i - 1) >> 1`, children `2i + 1`, `2i + 2`. Max-heap: pass `(a, b) => b - a`.

```ts
function findKthLargest(values: readonly number[], k: number): number {
  const heap = new MinHeap<number>((a, b) => a - b);
  for (const value of values) {
    heap.push(value);
    if (heap.size > k) heap.pop(); // smallest can't be in the top k
  }
  return heap.peek()!; // weakest member of the top k
}
```

`O(n log k)` time, `O(k)` space. **Top k frequent:** count with a `Map`, heap of `[value, count]` by count. **Merge k lists:** heap of list heads; pop the smallest, push its `next`.

Lessons: [Heaps and Priority Queues](/group/algorithmic-coding-typescript/day/08/01-heaps-and-priority-queues) · [Top K Problems](/group/algorithmic-coding-typescript/day/08/02-top-k-problems) · [Merge K Sorted Lists](/group/algorithmic-coding-typescript/day/08/03-merge-k-sorted-lists)

## Intervals

```ts
type Interval = [start: number, end: number];
function merge(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // by start
  const merged: Interval[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]); // gap: new interval (a copy)
  }
  return merged;
}
```

| Problem | Trick |
| :------ | :---- |
| Overlap test | `a[0] <= b[1] && b[0] <= a[1]` |
| Meeting rooms I | Sort by start; clash if `sorted[i][0] < sorted[i - 1][1]` |
| Meeting rooms II | Sort starts and ends separately and sweep, or a min-heap of end times |
| Remove fewest / min arrows | Sort by **end**, greedily keep the earliest-ending |

Lessons: [Merge and Insert Intervals](/group/algorithmic-coding-typescript/day/08/04-merge-and-insert-intervals) · [Meeting Rooms and Overlapping Intervals](/group/algorithmic-coding-typescript/day/08/05-meeting-rooms-and-overlapping-intervals)

## Backtracking

```ts
function subsets(nums: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const backtrack = (start: number): void => {
    result.push([...path]); // copy: path keeps changing
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]); backtrack(i + 1); path.pop(); // choose, explore, undo
    }
  };
  backtrack(0);
  return result;
}
```

| Variant | Change |
| :------ | :----- |
| Combination sum (reuse allowed) | Recurse with `i`, not `i + 1`; stop when the remaining total `< 0` |
| Permutations | Loop from `0` every time, skip `used[i]`, record when `path.length === n` |
| Duplicates in input | Sort first, skip `nums[i] === nums[i - 1]` when `i > start` |
| Word search | Mark the cell, recurse into 4 neighbours, **restore** the cell |

Prune first in each call. Recursion depth near 10⁴ or more risks `RangeError: Maximum call stack size exceeded`; switch to a loop.

Lessons: [Recursion and the Call Stack](/group/algorithmic-coding-typescript/day/09/01-recursion-and-the-call-stack) · [Subsets and Combination Sum](/group/algorithmic-coding-typescript/day/09/02-subsets-and-combination-sum) · [Permutations](/group/algorithmic-coding-typescript/day/09/03-permutations) · [Word Search and Pruning](/group/algorithmic-coding-typescript/day/09/04-word-search-and-pruning)

## Graphs

Build: `const adjacency: number[][] = Array.from({ length: n }, () => [])`, then push both directions for undirected edges. Weighted: store `[to, cost]`.

```ts
function bfsDistances(adjacency: readonly number[][], start: number): number[] {
  const distance: number[] = adjacency.map((_, node) => (node === start ? 0 : -1));
  const queue = [start];
  for (let head = 0; head < queue.length; head++) { // no O(n) shift()
    for (const next of adjacency[queue[head]]) {
      if (distance[next] !== -1) continue; // -1 = not seen yet
      distance[next] = distance[queue[head]] + 1; // mark on push
      queue.push(next);
    }
  }
  return distance;
}
```

```ts
// Kahn's algorithm: a valid order, or null if there is a cycle.
function topoSort(n: number, edges: readonly [number, number][]): number[] | null {
  const adj: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array<number>(n).fill(0);
  for (const [from, to] of edges) { adj[from].push(to); inDegree[to]++; }
  const order: number[] = [];
  for (let node = 0; node < n; node++) if (inDegree[node] === 0) order.push(node);
  for (let head = 0; head < order.length; head++) { // order doubles as the queue
    for (const next of adj[order[head]]) if (--inDegree[next] === 0) order.push(next);
  }
  return order.length === n ? order : null; // missing nodes = stuck in a cycle
}
```

**Grid = graph:** each cell is a node, 4 neighbours, mark visited by overwriting (`"1"` → `"0"`) or a `visited` grid. Use an explicit stack for big grids. **Multi-source BFS:** push every source at distance 0 first, then run one normal BFS.

Lessons: [Graph Representations](/group/algorithmic-coding-typescript/day/10/01-graph-representations) · [Graph DFS and BFS](/group/algorithmic-coding-typescript/day/10/02-graph-dfs-and-bfs) · [Number of Islands](/group/algorithmic-coding-typescript/day/10/03-grid-graphs-number-of-islands) · [Topological Sort](/group/algorithmic-coding-typescript/day/10/05-topological-sort-course-schedule)

## Union-Find

```ts
function makeUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i); // own leader
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x])); // path compression
  const union = (a: number, b: number): boolean => {
    const [rootA, rootB] = [find(a), find(b)];
    if (rootA === rootB) return false; // already one group (cycle edge)
    parent[rootB] = rootA;
    return true;
  };
  return { find, union };
}
```

The lesson's class also keeps `size[]` and attaches the smaller group under the bigger (union by size). With both tricks each call is nearly `O(1)`. Count components: start at `n`, subtract 1 per successful `union`.

Lessons: [Union-Find](/group/algorithmic-coding-typescript/day/10/06-union-find) · [Multi-Source BFS](/group/algorithmic-coding-typescript/day/10/04-multi-source-bfs-rotting-oranges)

## Dynamic programming

Recipe: define the state in words → write the recurrence → base cases → fill order → shrink space if each row needs only the previous one.

```ts
function coinChange(coins: readonly number[], amount: number): number {
  const best = new Array<number>(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) { // try every choice for the LAST coin
      if (coin <= a) best[a] = Math.min(best[a], best[a - coin] + 1);
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}
```

```ts
function knapsack1D(
  weights: readonly number[], values: readonly number[], capacity: number,
): number {
  const best = new Array<number>(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) { // backwards: each item once
      best[w] = Math.max(best[w], best[w - weights[i]] + values[i]);
    }
  }
  return best[capacity];
}
```

| Problem | State → recurrence |
| :------ | :----------------- |
| Climbing stairs | `ways[i] = ways[i - 1] + ways[i - 2]`; keep two variables for `O(1)` space |
| House robber (take or skip) | `current = Math.max(twoBack + value, oneBack)`, then shift `twoBack = oneBack; oneBack = current` |
| LIS (`O(n²)`) | `len[i] = 1 + max(len[j])` for `j < i` with `nums[j] < nums[i]`; answer is the max of all |
| Unique paths | `paths[r][c] = paths[r - 1][c] + paths[r][c - 1]`, first row/col = 1 |
| LCS | `(m + 1) × (n + 1)` table; chars match → `dp[i-1][j-1] + 1`, else `max(dp[i-1][j], dp[i][j-1])` |
| Edit distance | match: diagonal; else `1 + min(insert, delete, replace)` |
| Word break | `ok[i] = some j < i with ok[j] && dict.has(s.slice(j, i))` |
| Unbounded vs 0/1 | Loop capacity **forward** to reuse items, **backward** to use each once |

Lessons: [DP Fundamentals](/group/algorithmic-coding-typescript/day/11/01-dp-fundamentals-climbing-stairs) · [House Robber](/group/algorithmic-coding-typescript/day/11/02-take-or-skip-house-robber) · [Coin Change and Word Break](/group/algorithmic-coding-typescript/day/11/03-try-every-choice-coin-change-and-word-break) · [0/1 Knapsack](/group/algorithmic-coding-typescript/day/11/07-0-1-knapsack-partition-equal-subset-sum)

## Greedy, Dijkstra, tries, bits

**Greedy (Jump Game):** keep `farthest` reachable; `if (i > farthest) return false`; `farthest = Math.max(farthest, i + jumps[i])`. **Gas station:** if the total gas ≥ total cost an answer exists; reset the start to `i + 1` whenever the tank goes negative.

```ts
function dijkstra(graph: readonly [number, number][][], start: number): number[] {
  const dist = graph.map((_, node) => (node === start ? 0 : Infinity));
  const heap = new MinHeap<[number, number]>((a, b) => a[0] - b[0]);
  heap.push([0, start]); // [distance so far, node]
  while (heap.size > 0) {
    const [d, node] = heap.pop()!;
    if (d > dist[node]) continue; // stale entry: already improved
    for (const [next, cost] of graph[node])
      if (d + cost < dist[next]) heap.push([(dist[next] = d + cost), next]);
  }
  return dist;
}
```

```ts
class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false;
}
function insert(root: TrieNode, word: string): void {
  let node = root;
  for (const char of word) {
    if (!node.children.has(char)) node.children.set(char, new TrieNode());
    node = node.children.get(char)!;
  }
  node.isWord = true;
}
```

Trie search: walk char by char, return `null` when a child is missing; `search` needs `isWord`, `startsWith` only needs the walk to succeed. Dijkstra needs **non-negative** weights; `O((V + E) log V)`.

| Bit trick | Code |
| :-------- | :--- |
| Single number (pairs cancel) | `result ^= value` over all values |
| Drop lowest 1 bit / count bits | `bits = (bits & (bits - 1)) >>> 0; count++` |
| Power of two | `n > 0 && (n & (n - 1)) === 0` |
| Read as unsigned 32-bit | `n >>> 0` |
| Test / set bit `i` | `(n >> i) & 1` · `n \| (1 << i)` |

Lessons: [Greedy: Jump Game and Gas Station](/group/algorithmic-coding-typescript/day/12/01-greedy-jump-game-and-gas-station) · [Dijkstra's Shortest Path](/group/algorithmic-coding-typescript/day/12/02-dijkstras-shortest-path) · [Tries](/group/algorithmic-coding-typescript/day/12/03-tries) · [Bit Manipulation](/group/algorithmic-coding-typescript/day/12/04-bit-manipulation)

## Gotchas

| ❌ Mistake | ✅ Fix |
| :-------- | :---- |
| `[10, 9, 1].sort()` sorts as text → `[1, 10, 9]` | `.sort((a, b) => a - b)` |
| `arr.sort(...)` changes the caller's array | `[...arr].sort(...)` |
| `queue.shift()` in BFS (`O(n)` each) | `head` index: `for (let head = 0; head < q.length; head++)` |
| `new Array(n).fill([])` shares one row | `Array.from({ length: n }, () => [])` |
| `let best = 0` for a maximum | `-Infinity` or the first element |
| `(left + right) / 2` gives `3.5` | `left + Math.floor((right - left) / 2)` |
| `result.push(path)` in backtracking | `result.push([...path])` |
| Marking visited when popping in BFS | Mark when you push, so nothing is queued twice |
| Reading `grid[r][c]` before the bounds check | Check `r`/`c` in range first |
| `text += char` in a loop | `parts.push(char)` then `parts.join("")` |
| Plain object as a map (`"__proto__"`, string keys) | `Map` / `Set` |
| `arr.includes(x)` inside a loop | Build a `Set` once; `has` is `O(1)` |
| `noUncheckedIndexedAccess` makes `arr[i]` `number \| undefined` | Check it, `?? fallback`, or `!` when the index is proven valid |

## Interview process checklist

1. **Clarify** (0–5 min): restate; ask size limits, empty input, duplicates, negatives, what to return when there is no answer.
2. **Example**: work one small case and one edge case by hand.
3. **Brute force**: say it and its Big-O; code it only if nothing better appears in a few minutes.
4. **Optimize** (5–15 min): find the repeated work, name the pattern from the signal table, state the new Big-O.
5. **Code** (15–35 min): clear names, narrate each block, not each keystroke.
6. **Test** (35–42 min): trace your example line by line, then empty / one item / all equal / negatives / huge values.
7. **Wrap up** (42–45 min): final time and space, one trade-off or improvement.

Stuck for more than two minutes? Say what you tried and ask for a hint. Silence costs more than a hint.

Lessons: [Testing and Edge Cases](/group/algorithmic-coding-typescript/day/01/04-testing-and-edge-cases) · [TypeScript Toolkit](/group/algorithmic-coding-typescript/day/01/03-typescript-toolkit-for-algorithms) · [Mock Interview](/group/algorithmic-coding-typescript/day/12/05-pattern-cheat-sheet-and-mock-interview)

## Interview quick answers

**Q:** Why is `Map.get` `O(1)` but `includes` `O(n)`?
A `Map` hashes the key straight to its slot; `includes` checks items one by one.

**Q:** Why can't a sliding window solve "subarray sums to k" with negatives?
Shrinking no longer always lowers the sum, so you can't tell which way to move. Use prefix sums + a map.

**Q:** Why `left <= right` in exact search but `left < right` in lower bound?
Exact search can return early and a one-item range still needs checking; lower bound keeps `mid` as a candidate (`right = mid`) and stops when the pointers meet.

**Q:** BFS or DFS?
BFS for fewest edges in an unweighted graph; DFS for reachability, components, and exhaustive search. Weighted shortest path → Dijkstra.

**Q:** How do you detect a cycle in a directed graph?
Kahn's algorithm: if fewer than `n` nodes come out, the rest are stuck in a cycle.

**Q:** How do you know a problem is DP?
It asks for a count, min, or max over choices, and the same smaller subproblem appears again and again.

**Q:** Memoization or bottom-up?
Memoization is easier to derive from the recursion; bottom-up avoids stack overflow and often allows `O(1)` or one-row space.

**Q:** Why loop backwards in 0/1 knapsack?
So `best[w - weight]` still holds the value from before this item; forward loops let one item be used twice.

**Q:** When is greedy safe?
When a local best choice can never block a better final answer, for example a farther reach only adds options.
