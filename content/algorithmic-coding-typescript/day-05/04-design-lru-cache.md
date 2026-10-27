# Design: LRU Cache

## T — TL;DR

An **LRU cache** (*least recently used*) holds at most `capacity` items. When it is full and a new item arrives, it throws out the item nobody has touched for the longest time. Both `get` and `put` must be `O(1)`, which means combining a hash map (fast lookup) with something that remembers order.

**Reach for it when:**

- The problem says "design", "cache", "capacity", or "evict".
- You need fast lookup **and** to know which item is oldest or newest.
- Every operation must be `O(1)`.

## K — Key Concepts

### Picture it

A small desk that fits three books. Every time you read a book, you put it on the right end. When you need room for a new book, you take the one on the far left — the one you have ignored the longest — and put it back on the shelf.

### Walk through it

Capacity `2`. The order line shows oldest → newest.

| Step | Call | Order after | Returns | Why |
| :--- | :--- | :---------- | :------ | :-- |
| 1 | `put(1, "a")` | `1` | — | Room left. |
| 2 | `put(2, "b")` | `1, 2` | — | Room left. |
| 3 | `get(1)` | `2, 1` | `"a"` | Reading 1 makes it newest. |
| 4 | `put(3, "c")` | `1, 3` | — | Full. Evict oldest: `2`. |
| 5 | `get(2)` | `1, 3` | `-1` | 2 was evicted. |

### The template

A JavaScript `Map` remembers **insertion order**, and `map.keys().next()` gives the oldest key in `O(1)`. To mark a key as "just used", delete it and set it again so it moves to the end.

```ts
class LRUCache {
  private capacity: number;
  private entries = new Map<number, number>(); // oldest first, newest last

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: number): number {
    const value = this.entries.get(key);
    if (value === undefined) return -1;
    this.entries.delete(key); // re-insert to move it to the newest end
    this.entries.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value!;
      this.entries.delete(oldest);
    }
  }
}
```

**Time:** `O(1)` per call · **Space:** `O(capacity)` — every step is a constant number of map operations.

### Interview classic: LRU Cache without Map ordering

Many interviewers say "don't rely on `Map` order — show me the real structure." The classic answer is a **hash map + doubly linked list**. A *doubly linked list* is a chain of nodes where each node points to both the node before it and the node after it, so you can unlink any node in `O(1)`.

- **Brute force:** keep an array in use order — moving an item to the end is `O(n)`.
- **Key insight:** the map gives you the node in `O(1)`; the list lets you cut it out and reattach it at the newest end in `O(1)`. Two fake "sentinel" nodes at the ends mean you never handle `null` neighbours.

```ts
class CacheNode {
  key: number;
  value: number;
  prev: CacheNode | null = null;
  next: CacheNode | null = null;
  constructor(key: number, value: number) {
    this.key = key;
    this.value = value;
  }
}

class LinkedLRUCache {
  private capacity: number;
  private nodes = new Map<number, CacheNode>();
  private oldest = new CacheNode(0, 0); // sentinel: oldest.next is the real oldest
  private newest = new CacheNode(0, 0); // sentinel: newest.prev is the real newest

  constructor(capacity: number) {
    this.capacity = capacity;
    this.oldest.next = this.newest;
    this.newest.prev = this.oldest;
  }

  private unlink(node: CacheNode): void {
    node.prev!.next = node.next;
    node.next!.prev = node.prev;
  }

  private addNewest(node: CacheNode): void {
    node.prev = this.newest.prev;
    node.next = this.newest;
    this.newest.prev!.next = node;
    this.newest.prev = node;
  }

  get(key: number): number {
    const node = this.nodes.get(key);
    if (!node) return -1;
    this.unlink(node);
    this.addNewest(node);
    return node.value;
  }

  put(key: number, value: number): void {
    const existing = this.nodes.get(key);
    if (existing) this.unlink(existing);
    const node = new CacheNode(key, value);
    this.nodes.set(key, node);
    this.addNewest(node);
    if (this.nodes.size > this.capacity) {
      const victim = this.oldest.next!;
      this.unlink(victim);
      this.nodes.delete(victim.key); // the node stores its key for exactly this
    }
  }
}
```

Same behaviour as the `Map` version. The list does by hand what `Map` order did for free.

## W — Why It Matters

- LRU Cache is one of the most asked design questions at large companies.
- Browsers, CDNs, databases, and React Query-style libraries all use LRU or close cousins.
- Interviewers listen for *why* each structure is there: "the map is for lookup, the list is for order."

## I — Interview Q&A

### Q: Why does each list node store its key?

When you evict the oldest node, you must also delete it from the map, and the map is keyed by key. Without it you would have to search.

### Q: Why use sentinel nodes?

They remove special cases. The list is never truly empty, so `unlink` and `addNewest` never check for `null` at the ends.

### Q: Is `Map` order guaranteed in JavaScript?

Yes. The language spec says a `Map` iterates in insertion order. Mention it, then offer the linked-list version.

## C — Common Pitfalls + Fix

### ❌ Forgetting that `get` counts as a use

A read must move the key to the newest end, or you will evict an item that was just used.

### ❌ Evicting before updating an existing key

If `put` overwrites a key that is already there, the size does not grow. Delete the old entry first, then check the size.

### ❌ Checking `if (!value)` on a lookup

```ts
if (!this.entries.get(key)) return -1;       // ❌ treats a stored 0 as missing
if (value === undefined) return -1;           // ✅ only missing keys
```

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Time Based Key-Value Store:** build `TimeMap` with `set(key, value, timestamp)` and `get(key, timestamp)`. `get` returns the value set for `key` at the largest timestamp `<=` the given one, or `""` if none. Timestamps for `set` always increase.

`set("foo", "bar", 1)`, `get("foo", 3)` → `"bar"`, `set("foo", "bar2", 4)`, `get("foo", 4)` → `"bar2"`, `get("foo", 0)` → `""`

<details><summary>Hint</summary>

Store a sorted list of `[timestamp, value]` per key. Binary search for the last timestamp `<=` the query (Day 4).

</details>

### Solution

```ts
class TimeMap {
  private history = new Map<string, Array<[number, string]>>();

  set(key: string, value: string, timestamp: number): void {
    const list = this.history.get(key) ?? [];
    list.push([timestamp, value]); // timestamps arrive in order → list stays sorted
    this.history.set(key, list);
  }

  get(key: string, timestamp: number): string {
    const list = this.history.get(key) ?? [];
    let left = 0;
    let right = list.length - 1;
    let answer = "";
    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2);
      if (list[mid][0] <= timestamp) {
        answer = list[mid][1]; // valid; try to find a later one
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return answer;
  }
}
```

**Time:** `set` `O(1)`, `get` `O(log n)` · **Space:** `O(n)`. The map finds the key's history; binary search finds the latest entry that is not in the future.

**Right now:** Redo the walk-through table with capacity `1` and the same calls. Predict every return value before checking with the code.
