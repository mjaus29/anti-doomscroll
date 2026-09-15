# Heaps and Priority Queues

## T — TL;DR

A heap preserves complete-tree shape and parent priority, giving $O(log n)$ insertion/removal and $O(1)$ access to the best priority.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Heaps are for repeatedly asking, "What is the smallest or largest item available right now?" They keep that one best item easy to access without fully sorting everything.

### Mental Model

Imagine an emergency room queue: the most urgent patient moves to the front, but adding a new patient should not require sorting every patient. Sifting moves one item through a parent-child path until the priority rule is restored.

### First Trace

Start with heap `[5]`. Push `2`, place it at the end, then swap it with `5` to get `[2, 5]`. Push `4`, giving `[2, 5, 4]`; the root `2` is already smaller than both children. The array is not fully sorted, but the best item is at the root.

## K — Key Concepts

For a zero-based array heap, children are `2 * i + 1` and `2 * i + 2`; the parent is `Math.floor((i - 1) / 2)`. After insertion, sift up; after removing the root, move the last item to the root and sift down.

```ts
class MinHeap {
  private readonly values: number[] = [];
  push(value: number): void { this.values.push(value); this.up(this.values.length - 1); }
  pop(): number | undefined {
    if (this.values.length === 0) return undefined;
    const result = this.values[0];
    const last = this.values.pop() as number;
    if (this.values.length > 0) { this.values[0] = last; this.down(0); }
    return result;
  }
  private up(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent] <= this.values[index]) break;
      [this.values[parent], this.values[index]] = [this.values[index], this.values[parent]];
      index = parent;
    }
  }
  private down(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.values.length && this.values[left] < this.values[smallest]) smallest = left;
      if (right < this.values.length && this.values[right] < this.values[smallest]) smallest = right;
      if (smallest === index) break;
      [this.values[index], this.values[smallest]] = [this.values[smallest], this.values[index]];
      index = smallest;
    }
  }
}
```

## W — Why It Matters

Priority queues power schedulers, top-k queries, event simulation, and Dijkstra. Understanding the two heap invariants lets you debug custom implementations instead of treating them as library magic.

## I — Interview Q&A

### What are the two heap invariants?

The array represents a complete tree, and every parent has priority no worse than its children.

### Why is pop $O(log n)$?

Only one root-to-leaf path may need repair after replacing the root.

### When is a heap better than sorting everything?

When you repeatedly need only the best next item or a small top-`k` set; it avoids sorting irrelevant items.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Repairing only parent order. **Fix:** check both children during sift down.
- **Pitfall:** Comparing objects by identity. **Fix:** compare an explicit priority field.
- **Pitfall:** Calling a heap fully sorted. **Fix:** it guarantees only the root priority, not array order.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Write a function that verifies the min-heap order of a number array. Ignore whether the array was produced by a heap; check every parent-child pair.

### Solution

```ts
function isMinHeap(values: readonly number[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    const parent = Math.floor((index - 1) / 2);
    if (values[parent] > values[index]) return false;
  }
  return true;
}
```

**Right now:** Label the parent and children indices for heap position `3`.
