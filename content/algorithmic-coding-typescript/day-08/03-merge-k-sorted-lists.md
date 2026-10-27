# Merge K Sorted Lists

## T — TL;DR

To merge `k` sorted lists, the next output is always the smallest of the `k` **current front items**. Keep those fronts in a min-heap: pop the smallest, add it to the output, and push the next item from the same list. Every item goes in and out of a heap of size `k` once, so the total is `O(N log k)` for `N` items.

**Reach for it when:**

- You have **many** sorted inputs (lists, arrays, files, streams) and need one sorted output.
- You need "the smallest across k sources" again and again.
- Merging two at a time feels slow, and `k` is large.

## K — Key Concepts

### Picture it

Several checkout lines, each already ordered by ticket number. A manager calls the lowest ticket number among the people at the **front** of each line. When that person leaves, the next person in that same line steps up. The manager only ever compares `k` people.

### Walk through it

Lists: `A = 1 → 4 → 5`, `B = 1 → 3 → 4`, `C = 2 → 6`. The heap holds one front node per list.

| Step | Heap (fronts) | Pop | Push next from same list | Output so far |
| :--- | :------------ | :-- | :----------------------- | :------------ |
| 1 | `A1, B1, C2` | `A1` | `A4` | `1` |
| 2 | `B1, C2, A4` | `B1` | `B3` | `1 1` |
| 3 | `C2, B3, A4` | `C2` | `C6` | `1 1 2` |
| 4 | `B3, A4, C6` | `B3` | `B4` | `1 1 2 3` |
| 5 | `A4, B4, C6` | `A4` | `A5` | `1 1 2 3 4` |
| 6 | `B4, A5, C6` | `B4` | (B is done) | `1 1 2 3 4 4` |
| 7 | `A5, C6` | `A5` | (A is done) | `... 4 5` |
| 8 | `C6` | `C6` | (C is done) | `1 1 2 3 4 4 5 6` |

### The template

`ListNode` from Day 6 and the compact `MinHeap` from Day 8, topic 2, so the code runs on its own:

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;
  constructor(compare: (a: T, b: T) => number) { this.compare = compare; }
  get size(): number { return this.items.length; }

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

### Interview classic: Merge K Sorted Lists

Given an array of `k` sorted linked lists, merge them into one sorted list.
Example: `[1→4→5, 1→3→4, 2→6]` → `1→1→2→3→4→4→5→6`.

- **Brute force:** copy every value into an array, sort, rebuild — `O(N log N)`. Or merge lists one by one into a growing result — `O(N·k)`.
- **Key insight:** only the `k` front nodes can be the next smallest. A min-heap of fronts gives it in `O(log k)`.

```ts
function mergeKLists(lists: readonly (ListNode | null)[]): ListNode | null {
  const heap = new MinHeap<ListNode>((a, b) => a.val - b.val);
  for (const head of lists) {
    if (head !== null) heap.push(head); // one front node per non-empty list
  }

  const dummy = new ListNode(); // dummy node trick from Day 6, topic 2
  let tail = dummy;
  while (heap.size > 0) {
    const smallest = heap.pop()!;
    tail.next = smallest;
    tail = smallest;
    if (smallest.next !== null) heap.push(smallest.next); // that list's next item steps up
  }
  return dummy.next;
}
```

**Time:** `O(N log k)` · **Space:** `O(k)` — each of the `N` nodes is pushed and popped once, and the heap never holds more than `k` nodes. The nodes are re-linked, not copied.

### Variation: divide and conquer

Without a heap: merge lists in pairs (`0+1`, `2+3`, ...) using Merge Two Sorted Lists (Day 6, topic 2), then merge the results in pairs again. There are `log k` rounds and each round touches all `N` nodes, so it is also `O(N log k)`.

## W — Why It Matters

- A popular Hard problem that tests heaps, linked lists, and complexity reasoning in one go.
- Real uses: external sorting (merging sorted chunks of a file too big for memory), merging log files or search results from many servers.
- Interviewers listen for `O(N log k)` and for why it beats `O(N·k)` when `k` is large.

## I — Interview Q&A

### Q: Why is merging one list at a time slower?

The growing result gets re-walked for every new list. With `k` lists of size `n`, that is `n + 2n + ... + kn`, which is about `O(n·k²) = O(N·k)`.

### Q: Heap or divide and conquer — which would you pick?

Both are `O(N log k)`. The heap is easy to explain and works on streams; divide and conquer needs no extra data structure. Pick one and state the trade-off.

### Q: A related one — how do you find the median of a stream of numbers?

**Find Median from Data Stream** uses two heaps: a max-heap for the smaller half and a min-heap for the larger half, kept within one item of each other in size. The median is the top of one heap, or the average of both tops. Each insert is `O(log n)`.

## C — Common Pitfalls + Fix

### ❌ Pushing `null` lists into the heap

Empty lists appear in tests. Skip them: `if (head !== null) heap.push(head)`.

### ❌ Forgetting to push the next node

After popping a node, push `node.next`. Otherwise each list contributes only its first item.

### ❌ Pushing every node at the start

That makes a heap of size `N` and costs `O(N log N)`. Only the fronts go in at first.

### ❌ Comparing nodes instead of values

```ts
new MinHeap<ListNode>((a, b) => a - b);         // ❌ objects are not numbers
new MinHeap<ListNode>((a, b) => a.val - b.val); // ✅
```

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Merge K Sorted Arrays:** given `k` sorted arrays of numbers, return one sorted array with all their values. Do not modify the inputs.

`[[1, 4, 7], [2, 5], [0, 3, 6, 9]]` → `[0, 1, 2, 3, 4, 5, 6, 7, 9]`

<details><summary>Hint</summary>

Arrays have no `next` pointer. Store `[value, arrayIndex, itemIndex]` in the heap so you know where the next item comes from.

</details>

### Solution

```ts
function mergeKSortedArrays(arrays: readonly (readonly number[])[]): number[] {
  // Each entry: [value, which array, position in that array].
  const heap = new MinHeap<[number, number, number]>((a, b) => a[0] - b[0]);
  arrays.forEach((array, arrayIndex) => {
    if (array.length > 0) heap.push([array[0], arrayIndex, 0]);
  });

  const result: number[] = [];
  while (heap.size > 0) {
    const [value, arrayIndex, itemIndex] = heap.pop()!;
    result.push(value);
    const nextIndex = itemIndex + 1;
    const array = arrays[arrayIndex];
    if (nextIndex < array.length) {
      heap.push([array[nextIndex], arrayIndex, nextIndex]); // same array steps up
    }
  }
  return result;
}
```

**Time:** `O(N log k)` · **Space:** `O(k)` for the heap plus `O(N)` for the output. The positions in the tuple play the role of `next` pointers.

**Right now:** Redo the walkthrough table for `[[2, 8], [1, 9], [5]]` and check that the output is `[1, 2, 5, 8, 9]`.
