# Heaps and Priority Queues

## T — TL;DR

A **priority queue** always hands you the smallest (or largest) item next. A **heap** is the usual way to build one: a tree stored in a plain array, where every parent is smaller than its children. You get the minimum in `O(1)` and add or remove an item in `O(log n)`, instead of re-sorting each time.

**Reach for it when:**

- The problem says "k largest", "k smallest", "k closest", or "top k".
- You repeatedly need the smallest or largest item **while items keep arriving or changing**.
- You are merging many sorted sources, or scheduling "whatever is next" (Dijkstra, Day 12).

## K — Key Concepts

### Picture it

A hospital emergency room. Patients do not wait in arrival order; the most urgent one is always seen next. New patients slot in by urgency. Nobody re-sorts the whole waiting room — the triage nurse only compares the newcomer with a few others.

### Heap as an array

A heap is a **complete** binary tree: every level is full except maybe the last, which fills left to right. That shape means no gaps, so it fits in an array with simple index math:

| Want | Formula | Example for index 1 |
| :--- | :------ | :------------------ |
| Parent of `i` | `Math.floor((i - 1) / 2)` | 0 |
| Left child of `i` | `2 * i + 1` | 3 |
| Right child of `i` | `2 * i + 2` | 4 |

```text
array: [1, 3, 8, 5]        tree:     1
index:  0  1  2  3                  / \
                                   3   8
                                  /
                                 5
```

The heap rule (each parent ≤ its children) only orders parents above children. Siblings can be in any order, so the array is **not** fully sorted.

### Walk through it

Push `5, 3, 8, 1` into an empty min-heap, then pop once.

| Step | Array after | Action and why |
| :--- | :---------- | :------------- |
| push 5 | `[5]` | First item is the root. |
| push 3 | `[3, 5]` | Added at the end; `3 < parent 5`, so swap up (**sift up**). |
| push 8 | `[3, 5, 8]` | `8 > parent 3`: already in place. |
| push 1 | `[1, 3, 8, 5]` | Added at index 3; swap with `5`, then with `3`. |
| pop | `[3, 5, 8]` | Remove root `1`. Move the last item `5` to the root, then swap it down with its smaller child `3` (**sift down**). |

Each push or pop moves along one root-to-leaf path, and a complete tree has about `log n` levels.

### The template

JavaScript has no built-in heap, so you write one. Pass a `compare` function like `sort` uses: negative means `a` comes first.

```ts
class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }

  push(item: T): void {
    this.items.push(item); // add at the end, then fix the order upward
    let child = this.items.length - 1;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (this.compare(this.items[child], this.items[parent]) >= 0) break;
      this.swap(child, parent);
      child = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length === 0) return top;
    this.items[0] = last; // move the last item to the root, then fix the order downward
    const items = this.items;
    let parent = 0;
    while (true) {
      const left = 2 * parent + 1;
      const right = left + 1;
      let smallest = parent;
      if (left < items.length && this.compare(items[left], items[smallest]) < 0) {
        smallest = left; // pick the smaller child
      }
      if (right < items.length && this.compare(items[right], items[smallest]) < 0) {
        smallest = right;
      }
      if (smallest === parent) return top; // both children are bigger: done
      this.swap(parent, smallest);
      parent = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }
}
```

**Time:** `peek` `O(1)` · `push`/`pop` `O(log n)` · **Space:** `O(n)` — each sift walks at most one path of `log n` levels. For a **max**-heap, pass `(a, b) => b - a`.

### Interview classic: Kth Largest Element in an Array

Return the `k`-th largest value (counting duplicates).
Example: `[3, 2, 1, 5, 6, 4]`, `k = 2` → `5`.

- **Brute force:** sort descending and take index `k - 1` — `O(n log n)`.
- **Key insight:** keep a **min**-heap of the `k` largest values seen so far. When it grows past `k`, pop the smallest. At the end, the top of the heap is the `k`-th largest.

```ts
function findKthLargest(values: readonly number[], k: number): number {
  const heap = new MinHeap<number>((a, b) => a - b);
  for (const value of values) {
    heap.push(value);
    if (heap.size > k) heap.pop(); // drop the smallest: it can't be in the top k
  }
  return heap.peek()!;
}
```

**Time:** `O(n log k)` · **Space:** `O(k)`. The heap's top is the "weakest member of the top k club," which is exactly the answer.

## W — Why It Matters

- Heaps are behind every "top k" question, Merge K Sorted Lists, Find Median from Data Stream, and Dijkstra's shortest path.
- Real uses: job schedulers, timers, event queues in games and simulations.
- Interviewers listen for `O(n log k)` instead of `O(n log n)`, and for *why* a min-heap finds the largest values.

## I — Interview Q&A

### Q: Why a min-heap for the k **largest**?

You want to throw away the smallest of your current candidates quickly. A min-heap keeps that value on top, ready to pop.

### Q: Is there something faster than `O(n log k)`?

Quickselect (a partition step from quicksort) finds the `k`-th largest in `O(n)` on average, but `O(n²)` in the worst case. Mention it; the heap is safer to write under pressure.

### Q: How do you build a heap from an existing array?

Pushing one by one is `O(n log n)`. "Heapify" — sifting down every parent from the last one back to index 0 — is `O(n)`.

## C — Common Pitfalls + Fix

### ❌ Wrong index math

```ts
const parent = Math.floor(child / 2);       // ❌ that is for 1-based arrays
const parent = Math.floor((child - 1) / 2); // ✅ 0-based arrays
```

### ❌ Swapping with the wrong child in sift down

Always swap with the **smaller** child. Swapping with the larger one puts a bigger value above a smaller one.

### ❌ Calling `pop()` on an empty heap

Check `size` first or handle `undefined`. In the template, `pop()` returns `undefined` instead of crashing.

### ❌ Sorting the whole array after each insert

That is `O(n log n)` per insert. The heap only fixes one path.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Last Stone Weight:** each turn, take the two heaviest stones and smash them. Equal stones both break; otherwise the lighter one breaks and the heavier one shrinks by the lighter one's weight. Return the weight of the last stone, or `0` if none are left.

`[2, 7, 4, 1, 8, 1]` → `1`

<details><summary>Hint</summary>

Reuse `MinHeap` with `(a, b) => b - a` to get a max-heap.

</details>

### Solution

```ts
function lastStoneWeight(stones: readonly number[]): number {
  const heap = new MinHeap<number>((a, b) => b - a); // reversed compare = max-heap
  for (const stone of stones) heap.push(stone);

  while (heap.size > 1) {
    const heaviest = heap.pop()!;
    const second = heap.pop()!;
    if (heaviest !== second) heap.push(heaviest - second); // leftover goes back in
  }
  return heap.pop() ?? 0;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)`. Each turn needs the two largest current stones, and the heap gives them in `O(log n)` even as new stones are added.

**Right now:** Push `4, 9, 2, 7, 1` into an empty min-heap on paper and write the array after every push.
