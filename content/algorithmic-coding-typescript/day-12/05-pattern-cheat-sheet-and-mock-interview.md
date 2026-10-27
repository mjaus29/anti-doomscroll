# Pattern Cheat Sheet and Mock Interview

## T — TL;DR

Most interview problems are one of about 20 patterns in disguise. Read the problem for **signals** (sorted input, "subarray", "minimum cost", "all combinations"), check the input size to guess the target Big-O, then pick the pattern and talk through it before you code.

**Reach for it when:**

- You are stuck choosing an approach and need a list of candidates.
- You have a practice interview in the next few days.
- You want a 10-minute review of the whole track.

## K — Key Concepts

### Signal → pattern → lesson

| Signal in the problem | Pattern | Lesson |
| :-------------------- | :------ | :----- |
| "Have I seen this before?", duplicates, pairs that sum to X | Hash map / set | [Hash Maps and Sets](../day-02/01-hash-maps-and-sets.md) |
| Anagrams, "count each", most common | Frequency counting | [Frequency Counting](../day-02/02-frequency-counting.md) |
| Best subarray sum, best buy/sell day | Running state / Kadane | [Running State and Kadane's Algorithm](../day-02/03-running-state-and-kadanes-algorithm.md) |
| Many range sums, "subarray sums to k" | Prefix sums | [Prefix Sums](../day-02/04-prefix-sums.md) |
| Palindromes, building strings | String techniques | [String Techniques](../day-02/05-string-techniques.md) |
| 2D grid, spiral, rotate | Matrix traversal | [Matrix Traversal](../day-02/06-matrix-traversal.md) |
| Sorted array, find a pair | Two pointers (opposite ends) | [Two Pointers: Opposite Ends](../day-03/01-two-pointers-opposite-ends.md) |
| Remove or move items in place | Read and write pointers | [Read and Write Pointers](../day-03/02-read-and-write-pointers.md) |
| Triplets, sort first | Sorting + two pointers | [Sorting and 3Sum](../day-03/03-sorting-and-3sum.md) |
| Longest / shortest **contiguous** run with a rule | Variable sliding window | [Sliding Window: Variable Size](../day-03/04-sliding-window-variable-size.md) |
| "Every window of size k" | Fixed sliding window | [Sliding Window: Fixed Size](../day-03/05-sliding-window-fixed-size.md) |
| Sorted input, `O(log n)` asked | Binary search | [Binary Search Basics](../day-04/01-binary-search-basics.md) |
| First / last position, insert position | Lower / upper bound | [First and Last Position](../day-04/02-first-and-last-position.md) |
| Sorted then rotated | Binary search on halves | [Rotated Sorted Arrays](../day-04/03-rotated-sorted-arrays.md) |
| "Minimum speed / capacity so that…" | Binary search on the answer | [Binary Search on the Answer](../day-04/04-binary-search-on-the-answer.md) |
| Matching brackets, undo, nested structure | Stack | [Stacks: Valid Parentheses and Min Stack](../day-05/01-stacks-valid-parentheses-and-min-stack.md) |
| "Next greater / warmer / smaller" | Monotonic stack | [Monotonic Stack](../day-05/02-monotonic-stack.md) |
| Max of every window, recent events | Queue / deque | [Queues and Deques](../day-05/03-queues-and-deques.md) |
| "Design a cache", `O(1)` get and put | Map + ordering | [Design: LRU Cache](../day-05/04-design-lru-cache.md) |
| Reverse or rebuild a list | Linked list pointers | [Linked List Basics and Reversal](../day-06/01-linked-list-basics-and-reversal.md) |
| Head might change, merge lists | Dummy node | [Dummy Nodes and Merging Lists](../day-06/02-dummy-nodes-and-merging-lists.md) |
| Cycle, middle, k-th from end | Fast and slow pointers | [Fast and Slow Pointers](../day-06/03-fast-and-slow-pointers.md) |
| Several list steps in one problem | Combine list techniques | [Combining Techniques: Reorder List](../day-06/04-combining-techniques-reorder-list.md) |
| Depth, mirror, compare trees | Tree DFS | [Binary Tree Basics and DFS](../day-07/01-binary-tree-basics-and-dfs.md) |
| "Level by level", right side view | Tree BFS | [Level Order Traversal (BFS)](../day-07/02-level-order-traversal-bfs.md) |
| Height, diameter, balanced | Return info up the tree | [Tree Recursion That Returns Information](../day-07/03-tree-recursion-that-returns-information.md) |
| Sorted tree, k-th smallest | BST rules | [Binary Search Trees](../day-07/04-binary-search-trees.md) |
| Common ancestor, root-to-leaf sums | LCA / path sums | [Lowest Common Ancestor and Path Sums](../day-07/05-lowest-common-ancestor-and-path-sums.md) |
| "k-th largest", repeated min/max | Heap | [Heaps and Priority Queues](../day-08/01-heaps-and-priority-queues.md) |
| "Top k most frequent / closest" | Heap of size k | [Top K Problems](../day-08/02-top-k-problems.md) |
| Merge many sorted inputs | Heap of heads | [Merge K Sorted Lists](../day-08/03-merge-k-sorted-lists.md) |
| Overlapping ranges | Sort by start, merge | [Merge and Insert Intervals](../day-08/04-merge-and-insert-intervals.md) |
| Rooms, arrows, remove fewest intervals | Sweep / greedy by end | [Meeting Rooms and Overlapping Intervals](../day-08/05-meeting-rooms-and-overlapping-intervals.md) |
| Problem defined in terms of a smaller copy | Recursion | [Recursion and the Call Stack](../day-09/01-recursion-and-the-call-stack.md) |
| "All subsets / combinations" | Backtracking | [Subsets and Combination Sum](../day-09/02-subsets-and-combination-sum.md) |
| "All orderings" | Backtracking with `used` | [Permutations](../day-09/03-permutations.md) |
| Search a grid for a path or word | Backtracking + pruning | [Word Search and Pruning](../day-09/04-word-search-and-pruning.md) |
| Edge list, "connections", copy a graph | Adjacency list | [Graph Representations](../day-10/01-graph-representations.md) |
| Reachable? fewest edges? | Graph DFS / BFS | [Graph DFS and BFS](../day-10/02-graph-dfs-and-bfs.md) |
| Islands, regions in a grid | Grid DFS / BFS | [Grid Graphs: Number of Islands](../day-10/03-grid-graphs-number-of-islands.md) |
| Spread from many starts at once | Multi-source BFS | [Multi-Source BFS: Rotting Oranges](../day-10/04-multi-source-bfs-rotting-oranges.md) |
| Prerequisites, build order | Topological sort | [Topological Sort: Course Schedule](../day-10/05-topological-sort-course-schedule.md) |
| Merging groups, "are these connected?" | Union-Find | [Union-Find](../day-10/06-union-find.md) |
| "Number of ways", overlapping subproblems | DP basics | [DP Fundamentals: Climbing Stairs](../day-11/01-dp-fundamentals-climbing-stairs.md) |
| Take it or skip it, no two adjacent | Take-or-skip DP | [Take or Skip: House Robber](../day-11/02-take-or-skip-house-robber.md) |
| Fewest coins, split a string into words | Try-every-choice DP | [Try Every Choice: Coin Change and Word Break](../day-11/03-try-every-choice-coin-change-and-word-break.md) |
| Longest increasing subsequence | LIS DP | [Longest Increasing Subsequence](../day-11/04-longest-increasing-subsequence.md) |
| Paths in a grid moving right/down | Grid DP | [Grid DP: Unique Paths](../day-11/05-grid-dp-unique-paths.md) |
| Compare two strings | Two-string DP | [Two-String DP: LCS and Edit Distance](../day-11/06-two-string-dp-lcs-and-edit-distance.md) |
| Pick items to hit an exact sum | 0/1 knapsack | [0/1 Knapsack: Partition Equal Subset Sum](../day-11/07-0-1-knapsack-partition-equal-subset-sum.md) |
| "Can you reach…", one pass with a best-so-far | Greedy | [Greedy: Jump Game and Gas Station](01-greedy-jump-game-and-gas-station.md) |
| Weighted edges, minimum total cost | Dijkstra | [Dijkstra's Shortest Path](02-dijkstras-shortest-path.md) |
| Prefixes, autocomplete, many words | Trie | [Tries](03-tries.md) |
| Pairs cancel, count 1 bits, no extra space | Bit manipulation | [Bit Manipulation](04-bit-manipulation.md) |

### Input size → target complexity

| Largest `n` | Target | Typical pattern |
| :---------- | :----- | :-------------- |
| ≤ 20 | `O(2ⁿ)` or `O(n!)` | Backtracking over every choice |
| ≤ 500 | `O(n³)` | Triple loop, interval DP |
| ≤ 10³–10⁴ | `O(n²)` | Pair loops, 2D DP |
| ≤ 10⁶ | `O(n log n)` or `O(n)` | Sort, heap, binary search, hash map, window |
| ≥ 10⁹ (a value, not a length) | `O(log n)` | Binary search on the answer, fast power |

### The 45-minute mock interview

| Minutes | What you do | What to say out loud |
| :------ | :---------- | :------------------- |
| 0–5 | Restate the problem, ask about input size, empties, duplicates, negatives. | "So the input is… and I return… Can it be empty?" |
| 5–10 | Work one small example by hand. Name the brute force and its cost. | "Brute force tries every pair, `O(n²)`. With `n` up to 10⁵ that is too slow." |
| 10–15 | Find the repeated work, name the pattern, state the new cost. | "The answer is a contiguous run, so a sliding window gets `O(n)`." |
| 15–35 | Code it. Narrate each block, not each keystroke. | "This loop grows the window; this inner loop shrinks it while it is invalid." |
| 35–42 | Trace your example through the code. Then test edge cases. | "Empty input returns 0 here because the loop never runs." |
| 42–45 | Final complexity and one improvement or trade-off. | "`O(n)` time, `O(1)` space since the count array is fixed at 26." |

If you are stuck for more than two minutes, say what you have tried and ask for a hint. Silence costs more than a hint.

### Interview classic: name that pattern

Read each problem and name the pattern before opening the answers.

1. Find the length of the longest subarray whose sum is at most `k` (all values positive).
2. Given course prerequisites, return a valid order to take all courses.
3. Return every way to place `n` queens so none attack each other.
4. Find the smallest ship capacity that ships all packages within `d` days.
5. For each day, how many days until a warmer temperature?
6. Count the ways to make change for an amount with unlimited coins.
7. Return the `k` points closest to the origin.
8. Find the cheapest route between two cities when each road has a toll.

<details><summary>Answers</summary>

1. Variable sliding window (positive values mean shrinking always lowers the sum).
2. Topological sort (Kahn's algorithm).
3. Backtracking with pruning.
4. Binary search on the answer.
5. Monotonic stack.
6. DP (try every coin, like Coin Change).
7. Heap of size `k` (Top K).
8. Dijkstra (weighted edges, non-negative costs).

</details>

## W — Why It Matters

- Naming the pattern in the first five minutes is what separates a calm interview from a panicked one.
- Interviewers grade communication as much as code: clarifying questions, stated trade-offs, and testing.
- Real work is similar: recognizing "this is a queue problem" saves you from inventing a slow custom solution.

## I — Interview Q&A

### Q: What if two patterns seem to fit?

Say both, compare their time and space, and pick one. "A hash map gives `O(n)` time but `O(n)` space; sorting with two pointers gives `O(1)` space but `O(n log n)`." Interviewers like hearing the comparison.

### Q: Should I code the brute force first?

State it and its cost, but usually do not code it. Code it only if you cannot see a better approach within a few minutes — a working slow answer beats an unfinished fast one.

### Q: How do I recover from a bug found during testing?

Say what the trace shows, fix that line, and re-run the same example. Do not rewrite the whole solution.

## C — Common Pitfalls + Fix

### ❌ Coding before you understand the problem

Five minutes of questions and one hand-worked example prevents twenty minutes of the wrong solution.

### ❌ Ignoring the input size

The constraints are a hint. `n ≤ 20` invites backtracking; `n ≤ 10⁵` rules out `O(n²)`.

### ❌ Going silent

The interviewer can only help with what they hear. Narrate your reasoning, even when unsure.

### ❌ Skipping the test step

Trace at least one normal example and one edge case (empty, one item, all equal) before saying "done".

## K — Coding Challenge with Solution

### Challenge

**Time:** 20 minutes (run it as a timed mock: follow the 45-minute plan, compressed) · **Difficulty:** Medium

**Longest Repeating Character Replacement:** given an uppercase string and a number `k`, you may change up to `k` characters to any letter. Return the length of the longest substring that can be made of one repeated letter.

`text = "AABABBA"`, `k = 1` → `4` (change the `A` in `"BABB"` to get `"BBBB"`)

<details><summary>Hint</summary>

Signal: longest **contiguous** substring with a rule → variable sliding window. A window is valid when `windowLength - countOfMostCommonLetter <= k`.

</details>

### Solution

```ts
function characterReplacement(text: string, k: number): number {
  const counts = new Array<number>(26).fill(0);
  let left = 0;
  let maxCount = 0; // highest single-letter count seen in any window so far
  let best = 0;

  for (let right = 0; right < text.length; right++) {
    const index = text.charCodeAt(right) - 65; // 'A' is 65
    counts[index]++;
    maxCount = Math.max(maxCount, counts[index]);

    // Letters to change = window length - most common letter. Too many → shrink.
    while (right - left + 1 - maxCount > k) {
      counts[text.charCodeAt(left) - 65]--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)` (26 counters). `maxCount` is never lowered when the window shrinks; that is safe because the answer only grows when a window beats the old best `maxCount`.

**Right now:** Pick one row from the signal table you feel weakest on, open that lesson, and write its template from memory.
