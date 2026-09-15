# Full Curriculum Overview - Algorithmic Coding / TypeScript

This 12-day track teaches a repeatable process for solving algorithmic problems in strict TypeScript. Each day moves from a pattern to a proof habit to deliberate practice.

## Outcomes

By the end of the track you should be able to:

- Translate a problem statement into a precise input, output, and constraint contract.
- Choose a data structure and estimate time and space before coding.
- Explain why a solution is correct using invariants, induction, or an exchange argument.
- Implement common array, string, tree, graph, greedy, and dynamic programming patterns in TypeScript.
- Test edge cases and compare an optimized solution with a small brute-force oracle.
- Read a new problem, decompose it, and produce a measured solution under coding-interview time pressure.

## Study rhythm

For each topic, write the invariant or state definition before the implementation. Then solve the practice prompt without looking at a reference, test the smallest cases first, and record the failed assumption that caused each bug.

Use the final topic of each day for a timed implementation. Revisit any pattern that still requires memorizing code instead of recognizing the shape of the problem.

## T-KWICK lesson format

Every subtopic is a focused 5–15 minute learning card:

- **T — TL;DR:** the pattern in one sentence.
- **Beginner Walkthrough:** what problem it solves, how to picture it, and a tiny trace before code.
- **K — Key Concepts:** the minimum mental model and invariant.
- **W — Why it matters:** the interview and engineering payoff.
- **I — Interview Q&A:** concise answers to likely follow-ups.
- **C — Common pitfalls (+ fix):** fast corrections for typical mistakes.
- **K — Coding Challenge (+ solution):** one small implementation followed by one action to do now.

Start with the final **Right now** action. Doing one small thing beats opening a feed.

## Curriculum map

Day 1 - Problem Solving Foundations

- [Constraints First: Turn a Prompt into a Contract](day-01/01-constraints-first-turn-a-prompt-into-a-contract.md)
- [Complexity: Time, Space, and Growth](day-01/02-complexity-time-space-and-growth.md)
- [Correctness: Invariants and Edge Cases](day-01/03-correctness-invariants-and-edge-cases.md)
- [TypeScript for Algorithms: Inputs, Outputs, and Strictness](day-01/04-typescript-for-algorithms-inputs-outputs-and-strictness.md)
- [Testing a Solution with Deterministic Cases](day-01/05-testing-a-solution-with-deterministic-cases.md)

Day 2 - Arrays and Strings

- [Array Traversal and Accumulators](day-02/01-array-traversal-and-accumulators.md)
- [Frequency Tables with Map and Record](day-02/02-frequency-tables-with-map-and-record.md)
- [Prefix Sums and Range Queries](day-02/03-prefix-sums-and-range-queries.md)
- [Difference Arrays and Batch Updates](day-02/04-difference-arrays-and-batch-updates.md)
- [Two Pointers for Ordered Data](day-02/05-two-pointers-for-ordered-data.md)

Day 3 - Windows, Sorting, and Search

- [Sliding Window](day-03/01-sliding-window.md)
- [Sorting with Safe Comparators](day-03/02-sorting-with-safe-comparators.md)
- [Binary Search Basics](day-03/03-binary-search-basics.md)
- [Lower Bound and Upper Bound](day-03/04-lower-bound-and-upper-bound.md)
- [Binary Search on the Answer](day-03/05-binary-search-on-the-answer.md)

Day 4 - Greedy and Intervals

- [Greedy Choices and Exchange Arguments](day-04/01-greedy-choices-and-exchange-arguments.md)
- [Merging Intervals](day-04/02-merging-intervals.md)
- [Sweep Line Events](day-04/03-sweep-line-events.md)
- [Scheduling with Sorted Events](day-04/04-scheduling-with-sorted-events.md)
- [Coordinate Compression](day-04/05-coordinate-compression.md)

Day 5 - Recursion and Backtracking

- [Recursive State and Base Cases](day-05/01-recursive-state-and-base-cases.md)
- [Subsets and Combinations](day-05/02-subsets-and-combinations.md)
- [Permutations and Duplicate Handling](day-05/03-permutations-and-duplicate-handling.md)
- [Backtracking and Pruning](day-05/04-backtracking-and-pruning.md)
- [Memoized Search and State Keys](day-05/05-memoized-search-and-state-keys.md)

Day 6 - Stacks, Queues, and Linked Lists

- [Stack Patterns and Balanced Delimiters](day-06/01-stack-patterns-and-balanced-delimiters.md)
- [Monotonic Stacks](day-06/02-monotonic-stacks.md)
- [Queues and Deques for Frontier Processing](day-06/03-queues-and-deques-for-frontier-processing.md)
- [Linked List Pointer Techniques](day-06/04-linked-list-pointer-techniques.md)
- [Simulations and State Machines](day-06/05-simulations-and-state-machines.md)

Day 7 - Trees and Heaps

- [Tree Traversals](day-07/01-tree-traversals.md)
- [Recursive Tree Dynamic Programming](day-07/02-recursive-tree-dynamic-programming.md)
- [Binary Search Trees](day-07/03-binary-search-trees.md)
- [Heaps and Priority Queues](day-07/04-heaps-and-priority-queues.md)
- [Lowest Common Ancestor and Tree Paths](day-07/05-lowest-common-ancestor-and-tree-paths.md)

Day 8 - Graph Foundations

- [Graph Representations](day-08/01-graph-representations.md)
- [Breadth-First Search and Depth-First Search](day-08/02-breadth-first-search-and-depth-first-search.md)
- [Grid Graphs](day-08/03-grid-graphs.md)
- [Connected Components and Flood Fill](day-08/04-connected-components-and-flood-fill.md)
- [Topological Sorting](day-08/05-topological-sorting.md)

Day 9 - Weighted Graphs and Disjoint Sets

- [Union Find and Disjoint Set Union](day-09/01-union-find-and-disjoint-set-union.md)
- [Dijkstra's Algorithm](day-09/02-dijkstras-algorithm.md)
- [0-1 BFS and Bellman-Ford](day-09/03-0-1-bfs-and-bellman-ford.md)
- [Minimum Spanning Trees](day-09/04-minimum-spanning-trees.md)
- [Choosing a Shortest Path Model](day-09/05-choosing-a-shortest-path-model.md)

Day 10 - Dynamic Programming

- [DP State and Transition](day-10/01-dp-state-and-transition.md)
- [One-Dimensional Dynamic Programming](day-10/02-one-dimensional-dynamic-programming.md)
- [Two-Dimensional and Grid DP](day-10/03-two-dimensional-and-grid-dp.md)
- [Knapsack and Subset Sum](day-10/04-knapsack-and-subset-sum.md)
- [Subsequences and State Compression](day-10/05-subsequences-and-state-compression.md)

Day 11 - Advanced Structures and Strings

- [Bit Manipulation](day-11/01-bit-manipulation.md)
- [Tries for Prefix Queries](day-11/02-tries-for-prefix-queries.md)
- [Fenwick Trees](day-11/03-fenwick-trees.md)
- [Segment Trees](day-11/04-segment-trees.md)
- [String Matching and Rolling Hash](day-11/05-string-matching-and-rolling-hash.md)

Day 12 - Interview Practice and Capstone

- [Decomposing an Unfamiliar Problem](day-12/01-decomposing-an-unfamiliar-problem.md)
- [Test Oracles and Property Thinking](day-12/02-test-oracles-and-property-thinking.md)
- [Performance in TypeScript](day-12/03-performance-in-typescript.md)
- [Mock Interview Workflow](day-12/04-mock-interview-workflow.md)
- [Capstone: Build a Route Planner](day-12/05-capstone-build-a-route-planner.md)

## Mastery rubric

- **Recognize:** name the likely pattern and its invariant from a new prompt.
- **Implement:** write the solution from a blank file with strict TypeScript enabled.
- **Defend:** state correctness and complexity without hand-waving.
- **Adapt:** change the representation or state when the constraints change.
