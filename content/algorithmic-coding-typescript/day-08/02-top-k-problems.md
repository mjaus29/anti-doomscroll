# Top K Problems

## T — TL;DR

To find the `k` best items out of `n`, keep a heap that holds only `k` items. Its top is the **worst** of your current best, so each new item either beats it (swap in) or is thrown away. That costs `O(n log k)` instead of sorting everything in `O(n log n)`.

**Reach for it when:**

- The problem says "top k", "k most frequent", "k closest", "k largest/smallest".
- `k` is much smaller than `n`, or items arrive as a stream.
- The order inside the answer does not matter (or is easy to fix at the end).

## K — Key Concepts

### Picture it

A talent show keeps only 3 chairs on stage. Each new act is compared with the weakest person sitting down. If the new act is better, the weakest leaves and the new act sits. At the end, the 3 chairs hold the top 3 — and the judges only ever had to watch the weakest chair.

### The flip rule

| You want the k... | Use a... | Because the top of the heap is... |
| :---------------- | :------- | :-------------------------------- |
| largest / most frequent | **min**-heap | the smallest of the keepers — first to be kicked out |
| smallest / closest | **max**-heap | the largest of the keepers — first to be kicked out |

### Walk through it

**Top K Frequent Elements:** `values = [1, 1, 1, 2, 2, 3]`, `k = 2`. Counts: `1 → 3`, `2 → 2`, `3 → 1`. Min-heap ordered by count:

| Step | Push | Heap (value:count) | Action and why |
| :--- | :--- | :----------------- | :------------- |
| 1 | `1:3` | `[1:3]` | Size 1 ≤ k. Keep. |
| 2 | `2:2` | `[2:2, 1:3]` | Size 2 ≤ k. Keep. Top is the least frequent. |
| 3 | `3:1` | `[3:1, 1:3, 2:2]` → pop `3:1` | Size 3 > k. The least frequent leaves. |

Heap holds values `1` and `2`. Answer: `[1, 2]` (any order).

### The template

The `MinHeap` from Day 8, topic 1, in compact form (needed so this code runs on its own):

```ts
class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;
  constructor(compare: (a: T, b: T) => number) { this.compare = compare; }
  get size(): number { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }

  push(item: T): void {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.compare(items[index], items[parent]) >= 0) break;
      [items[index], items[parent]] = [items[parent], items[index]];
      index = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length === 0) return top;
    items[0] = last!;
    let index = 0;
    while (true) {
      let smallest = index;
      for (const child of [2 * index + 1, 2 * index + 2]) {
        if (child < items.length && this.compare(items[child], items[smallest]) < 0) {
          smallest = child;
        }
      }
      if (smallest === index) return top;
      [items[index], items[smallest]] = [items[smallest], items[index]];
      index = smallest;
    }
  }
}
```

### Interview classic: Top K Frequent Elements

Return the `k` values that appear most often. Example: `[1, 1, 1, 2, 2, 3]`, `k = 2` → `[1, 2]`.

- **Brute force:** count, then sort all distinct values by count — `O(n log n)`.
- **Key insight:** count with a `Map`, then keep only `k` entries in a min-heap ordered by count.

```ts
function topKFrequent(values: readonly number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  // Each entry is [value, count]; the least frequent keeper sits on top.
  const heap = new MinHeap<[number, number]>((a, b) => a[1] - b[1]);
  for (const entry of counts) {
    heap.push(entry);
    if (heap.size > k) heap.pop(); // too many keepers: drop the least frequent
  }

  const result: number[] = [];
  while (heap.size > 0) result.push(heap.pop()![0]);
  return result;
}
```

**Time:** `O(n log k)` · **Space:** `O(n)` for the counts — the heap never holds more than `k + 1` entries.

### Variation: bucket sort in `O(n)`

A count can only be between `1` and `n`. Make an array of `n + 1` buckets where `buckets[c]` lists values seen `c` times, then walk from the highest bucket down.

```ts
function topKFrequentBuckets(values: readonly number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  const buckets: number[][] = Array.from({ length: values.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count].push(value);

  const result: number[] = [];
  for (let count = values.length; count >= 1 && result.length < k; count--) {
    for (const value of buckets[count]) {
      if (result.length < k) result.push(value);
    }
  }
  return result;
}
```

**Time:** `O(n)` · **Space:** `O(n)`. This works because counts are small whole numbers; the heap version works for any score, such as distances.

## W — Why It Matters

- "Top k" is one of the most common interview families: frequent words, closest points, largest values, busiest users.
- Real systems use it for leaderboards, trending lists, and monitoring dashboards over streams of events.
- Interviewers listen for the flip rule (min-heap for largest) and for `O(n log k)`.

## I — Interview Q&A

### Q: Why not just sort?

Sorting is `O(n log n)` and fine for small inputs — say so. The heap wins when `k` is small or data streams in, because it only stores `k` items.

### Q: How do you break ties, for example in Top K Frequent Words?

Put the tie-break in the compare function. For "higher count first, then A→Z", the kick-out order in the min-heap is "lower count first, then Z→A".

### Q: What if the data does not fit in memory?

Stream it through a size-`k` heap. You only ever hold `k` items, so memory is `O(k)`.

## C — Common Pitfalls + Fix

### ❌ Using the wrong kind of heap

A max-heap for the k largest makes you pop the **best** item. Use the flip rule table.

### ❌ Letting the heap grow to `n`

Pop as soon as `size > k`. Otherwise you are back to `O(n log n)` time and `O(n)` space.

### ❌ Comparing whole tuples

```ts
new MinHeap<[number, number]>((a, b) => a - b);       // ❌ type error: not numbers
new MinHeap<[number, number]>((a, b) => a[1] - b[1]); // ✅ compare by count
```

### ❌ Expecting the heap to return sorted output

Popping gives the kept items from worst to best. Reverse the result if the order matters.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**K Closest Points to Origin:** given points `[x, y]`, return the `k` points closest to `(0, 0)`. Any order is fine.

`points = [[1, 3], [-2, 2]]`, `k = 1` → `[[-2, 2]]` (distances² are `10` and `8`)

<details><summary>Hint</summary>

You want the k **smallest** distances, so use a **max**-heap of size k. Compare squared distances; no `Math.sqrt` needed.

</details>

### Solution

```ts
function kClosest(points: readonly [number, number][], k: number): [number, number][] {
  const distance = ([x, y]: [number, number]): number => x * x + y * y;
  // Max-heap: the farthest keeper sits on top, ready to be kicked out.
  const heap = new MinHeap<[number, number]>((a, b) => distance(b) - distance(a));

  for (const point of points) {
    heap.push(point);
    if (heap.size > k) heap.pop();
  }

  const result: [number, number][] = [];
  while (heap.size > 0) result.push(heap.pop()!);
  return result;
}
```

**Time:** `O(n log k)` · **Space:** `O(k)`. The heap always holds the `k` closest points seen so far, because any point farther than all of them gets popped.

**Right now:** Run the walkthrough again with `k = 1` and write the heap after each push. Which value survives?
