# Linked List Basics and Reversal

## T — TL;DR

A **linked list** is a chain of small objects called *nodes*. Each node holds a value and a pointer (a reference) to the next node; the last one points to `null`. You cannot jump to item 5 like in an array — you walk from the start — but you can insert or remove a node in `O(1)` once you are standing next to it.

**Reach for it when:**

- The input is a `ListNode` head (interview problems hand it to you).
- You must reverse, splice, or reorder items without copying them.
- The problem says "in place" or "`O(1)` extra space" on a list.

## K — Key Concepts

### Picture it

A scavenger hunt. Each card has a clue (the value) and tells you where the next card is hidden (the `next` pointer). You only hold the first card (the *head*). To reverse the hunt, you walk card by card and rewrite each "next" arrow to point back where you came from.

### Walk through it

Reverse `1 → 2 → 3 → null`. Three variables: `previous` (the reversed part), `current` (the node we are fixing), and `next` (saved so we don't lose the rest).

| Step | previous | current | Action and why | Reversed so far |
| :--- | :------- | :------ | :------------- | :-------------- |
| 1 | `null` | 1 | Save `next = 2`. Point `1.next` at `null`. Move both forward. | `1 → null` |
| 2 | 1 | 2 | Save `next = 3`. Point `2.next` at 1. Move forward. | `2 → 1 → null` |
| 3 | 2 | 3 | Save `next = null`. Point `3.next` at 2. Move forward. | `3 → 2 → 1 → null` |
| 4 | 3 | `null` | `current` is `null`: done. Return `previous`. | |

### The template

Every lesson today uses this node class, plus two helpers to build and print lists.

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

function fromArray(values: readonly number[]): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) head = new ListNode(values[i], head);
  return head; // built back to front, so each new node points at the previous head
}

function toArray(head: ListNode | null): number[] {
  const values: number[] = [];
  for (let node = head; node !== null; node = node.next) values.push(node.val);
  return values;
}
```

The traversal loop `for (let node = head; node !== null; node = node.next)` is the list version of `for (let i = 0; i < n; i++)`.

**Time:** `O(n)` to build or walk · **Space:** `O(n)` for the nodes themselves, `O(1)` extra to walk.

### Interview classic: Reverse Linked List

Reverse a list and return the new head. Example: `1 → 2 → 3 → 4 → 5` → `5 → 4 → 3 → 2 → 1`.

- **Brute force:** copy values into an array, then build a new list backwards — `O(n)` extra space.
- **Key insight:** flip one arrow at a time. Save `current.next` **before** you overwrite it, or the rest of the list is lost.

```ts
function reverseList(head: ListNode | null): ListNode | null {
  let previous: ListNode | null = null;
  let current = head;

  while (current !== null) {
    const next = current.next; // save the rest of the list
    current.next = previous;   // flip the arrow
    previous = current;        // grow the reversed part
    current = next;            // move into the unreversed part
  }
  return previous; // the old tail is the new head
}
```

Four lines inside the loop, always in this order: save, flip, step, step. Memorise it — later lessons reuse it.

## W — Why It Matters

- Reverse Linked List is one of the most asked warm-up questions, and it is a building block of Reorder List and Palindrome Linked List (this day, topic 4).
- Linked lists test pointer discipline: can you change references without losing data?
- Real uses: undo chains, LRU caches (Day 5), and the queues inside many runtimes.

## I — Interview Q&A

### Q: Can you write it recursively?

Yes. Reverse everything after the head, then hook the head on the end:

```ts
function reverseRecursive(head: ListNode | null): ListNode | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseRecursive(head.next);
  head.next.next = head; // the node after head now points back at head
  head.next = null;
  return newHead;
}
```

It uses `O(n)` call-stack space, so the loop is better for very long lists.

### Q: Array or linked list — when is each better?

Arrays give `O(1)` access by index and are cache-friendly. Linked lists give `O(1)` insert and remove at a known node but `O(n)` access by position.

### Q: How do you test list code quickly?

Build with `fromArray`, run, then compare `toArray(result)`. Always try an empty list, one node, and two nodes.

## C — Common Pitfalls + Fix

### ❌ Overwriting `next` before saving it

```ts
current.next = previous; current = current.next; // ❌ walks backwards forever
const next = current.next; current.next = previous; current = next; // ✅
```

### ❌ Returning `head` after reversing

The old head is now the tail. Return `previous`.

### ❌ Not handling `null`

An empty list is `null`. The `while (current !== null)` loop handles it with no special case — don't read `head.next` before checking.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Remove Duplicates from Sorted List:** the list is sorted. Delete nodes so each value appears once, and return the head.

`1 → 1 → 2 → 3 → 3` → `1 → 2 → 3`

<details><summary>Hint</summary>

Duplicates sit next to each other. If `current.next` has the same value, skip it by pointing `current.next` one further. Only move `current` when the next value is different.

</details>

### Solution

```ts
function deleteDuplicates(head: ListNode | null): ListNode | null {
  let current = head;

  while (current !== null && current.next !== null) {
    if (current.next.val === current.val) {
      current.next = current.next.next; // unlink the duplicate, stay put
    } else {
      current = current.next;
    }
  }
  return head;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. Because the list is sorted, every duplicate is the immediate neighbour of the node we keep.

**Right now:** Draw `1 → 2 → 3` with boxes and arrows, then redraw it after each step of `reverseList`.
