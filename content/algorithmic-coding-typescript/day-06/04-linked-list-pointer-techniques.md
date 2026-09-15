# Linked List Pointer Techniques

## T — TL;DR

Linked-list algorithms are pointer invariants: save the next node before rewiring links, and use slow/fast or dummy pointers when the shape demands it.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Linked-list problems are about changing connections between nodes without losing the rest of the chain. They are useful when items need cheap insertion or removal after a known node, not random indexing.

### Mental Model

Picture train cars connected by `next` links. To reverse `1 -> 2 -> 3`, detach car `1` from `2`, point it backward, then move to the saved remainder. Always save the next car before changing the coupling.

### First Trace

Start with `previous = null` and `current = 1`. Save `next = 2`, set `1.next = null`, then move `previous` to `1` and `current` to `2`. Repeat for `2` and `3`; the new head is `3`.

## K — Key Concepts

```ts
type ListNode = { value: number; next: ListNode | null };
```

- Slow/fast pointers find midpoints and detect cycles.
- A dummy node gives the head a predecessor for deletion or insertion.
- Before changing `current.next`, save the rest of the list.
- Random access is $O(n)$; known-node insertion can be $O(1)$.

## W — Why It Matters

Pointer bugs are common in systems code, caches, queues, and interview exercises. Drawing the links and naming the invariant is more reliable than relying on visual intuition.

## I — Interview Q&A

### Why use a dummy node?

It gives the original head the same predecessor shape as every other node, removing a special case.

### How does slow/fast find a cycle entry?

After a meeting, move one pointer to the head and advance both one step; their next meeting is the cycle entry.

### What is the key mutation rule?

Save the successor before overwriting a `next` pointer, or the remaining list may become unreachable.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Losing the rest of the list. **Fix:** store `next` before rewiring.
- **Pitfall:** Mishandling removal of the head. **Fix:** use a dummy node.
- **Pitfall:** Assuming random access. **Fix:** carry pointers or use an array if indexing is essential.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Reverse a singly linked list iteratively and return the new head.

### Solution

```ts
function reverseList(head: ListNode | null): ListNode | null {
  let previous: ListNode | null = null;
  let current = head;

  while (current !== null) {
    const next = current.next;
    current.next = previous;
    previous = current;
    current = next;
  }
  return previous;
}
```

The invariant is that `previous` is the reversed prefix and `current` is the remaining suffix.

**Right now:** Draw three nodes and mark `previous`, `current`, and `next` before the first reversal.
