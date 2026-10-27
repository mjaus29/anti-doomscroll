# Queues and Deques

## T — TL;DR

A **queue** is first in, first out (*FIFO*): you add at the back and remove from the front, like a line at a shop. A **deque** (say "deck", short for *double-ended queue*) lets you add and remove at both ends. JavaScript has neither built in, and `array.shift()` is `O(n)`, so you build a fast one with a moving head index.

**Reach for it when:**

- Items must be handled in the order they arrived (tasks, requests, BFS levels).
- You keep a moving window of recent items and drop the oldest.
- You need the max or min of a sliding window (monotonic deque).

## K — Key Concepts

### Picture it

A ticket line. Instead of making every person step forward when the first one leaves (that is what `shift()` does to an array), the clerk moves a "now serving" sign one place back. People stay put; only the sign moves.

### Walk through it

Why `shift()` is slow: arrays store items in numbered slots. Removing slot 0 means moving every other item down one slot.

| Operation on `[a, b, c, d]` | What the engine does | Cost |
| :-------------------------- | :------------------- | :--- |
| `push("e")` | Write into slot 4. | `O(1)` |
| `pop()` | Clear slot 3. | `O(1)` |
| `shift()` | Move b→0, c→1, d→2, then shrink. | `O(n)` |
| `head++` (our queue) | Change one number. | `O(1)` |

Call `shift()` `n` times and the total is `O(n²)`. With a head index it stays `O(n)`.

### The template

```ts
class Queue<T> {
  private items: T[] = [];
  private head = 0; // index of the front item

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head === this.items.length) return undefined;
    const item = this.items[this.head];
    this.head++; // move the "now serving" sign instead of shifting
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head); // drop the used part now and then
      this.head = 0;
    }
    return item;
  }

  get size(): number {
    return this.items.length - this.head;
  }
}
```

**Time:** `O(1)` per operation (amortized — the occasional `slice` is paid for by the many cheap calls before it) · **Space:** `O(n)`.

A **deque** adds "remove from the back". With the same array, that is `items.pop()` as long as `size > 0`. That is all Sliding Window Maximum needs.

### Interview classic: Sliding Window Maximum

Return the maximum of every window of size `k`.
Example: `values = [1, 3, -1, -3, 5, 3, 6, 7]`, `k = 3` → `[3, 3, 5, 5, 6, 7]`.

- **Brute force:** take the max of each window — `O(n·k)`.
- **Key insight:** keep a deque of indexes whose values **decrease** from front to back. A smaller value behind a bigger, newer one can never be a window max again, so pop it from the back. The front is always the current max; drop it when it slides out of the window.

```ts
function maxSlidingWindow(values: readonly number[], k: number): number[] {
  const deque: number[] = []; // indexes; values decrease front → back
  let front = 0;              // head index, so removing from the front is O(1)
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    // Newer and bigger beats older and smaller: they can never be the max.
    while (deque.length > front && values[deque[deque.length - 1]] <= values[i]) {
      deque.pop();
    }
    deque.push(i);
    if (deque[front] <= i - k) front++; // front index left the window
    if (i >= k - 1) result.push(values[deque[front]]);
  }
  return result;
}
```

The back of the deque works like the monotonic stack from the last lesson; the front works like a queue.

## W — Why It Matters

- Every breadth-first search (BFS) on trees and graphs (Days 7 and 10) runs on a queue. Using `shift()` there can turn a fast solution into a timeout.
- Sliding Window Maximum is a common hard-ish question; the monotonic deque is the expected answer.
- Real code: job queues, rate limiters, and message buffers are all queues.

## I — Interview Q&A

### Q: Is `shift()` ever fine?

For tiny inputs, yes, and some engines optimise small arrays. In an interview, say "shift is `O(n)`, so I'll use a head index" — it shows you know the cost.

### Q: Why store indexes in the deque, not values?

You need the index to know when an item has slid out of the window (`index <= i - k`). Values alone cannot tell you that.

### Q: How else could you build a deque?

A *circular buffer*: a fixed-size array where the head and tail wrap around with `% capacity`. Or a doubly linked list. Both give `O(1)` at both ends.

## C — Common Pitfalls + Fix

### ❌ Using `shift()` inside a loop

```ts
while (queue.length) { const item = queue.shift(); } // ❌ O(n²) total
while (head < queue.length) { const item = queue[head++]; } // ✅ O(n) total
```

### ❌ Checking `deque.length` instead of the real size

With a head index, the deque is empty when `front === deque.length`, not when `deque.length === 0`.

### ❌ Removing the front at the wrong time

Expire the old front **before** you read the window max. Otherwise the answer can come from outside the window.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Number of Recent Calls:** build a `RecentCounter` class. `ping(t)` records a request at time `t` milliseconds and returns how many requests happened in the range `[t - 3000, t]`. Each `t` is larger than the one before.

`ping(1)` → `1`, `ping(100)` → `2`, `ping(3001)` → `3`, `ping(3002)` → `3`

<details><summary>Hint</summary>

Keep the times in a queue. Before answering, remove from the front every time older than `t - 3000`.

</details>

### Solution

```ts
class RecentCounter {
  private times: number[] = [];
  private head = 0;

  ping(t: number): number {
    this.times.push(t);
    while (this.times[this.head] < t - 3000) this.head++; // drop expired calls
    return this.times.length - this.head;
  }
}
```

**Time:** `O(1)` amortized per call · **Space:** `O(n)`. Times arrive in order, so expired ones are always at the front, and each time is removed once.

**Right now:** Trace `maxSlidingWindow([4, 2, 12, 3], 2)` and write the deque's contents after each step.
