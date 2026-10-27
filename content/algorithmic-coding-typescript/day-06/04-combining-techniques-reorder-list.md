# Combining Techniques: Reorder List

## T — TL;DR

Many medium linked-list problems are three easy ones glued together: **find the middle** (fast and slow), **reverse** the second half, then **walk both halves** side by side. Each step is `O(n)` time and `O(1)` space, so the whole thing is too.

**Reach for it when:**

- You need to compare or pair the start of a list with its end.
- The problem says "in place" and an array copy is not allowed.
- You catch yourself wishing you could walk a singly linked list backwards.

## K — Key Concepts

### Picture it

A deck of cards you want to interleave front and back: first, last, second, second-to-last... Cut the deck in half, flip the bottom half over so its last card is on top, then deal one card from each pile in turn.

### Walk through it

Reorder `1 → 2 → 3 → 4 → 5` into `1 → 5 → 2 → 4 → 3`.

| Step | Technique | Result | Why |
| :--- | :-------- | :----- | :-- |
| 1 | Fast and slow (first middle) | slow on `3` | The first half keeps the extra node when the length is odd. |
| 2 | Cut after slow | `1 → 2 → 3` and `4 → 5` | Two separate lists, so no loops form later. |
| 3 | Reverse the second half | `5 → 4` | Now the "end" of the list is at the front of a list. |
| 4 | Weave: take one from each | `1 → 5 → 2 → 4 → 3` | Alternate first-half and second-half nodes. |

### The template

The reusable part is "split at the middle and reverse the back half". Both problems in this lesson start with it.

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

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

// Cuts the list after its first middle; returns the reversed second half.
function splitAndReverseBack(head: ListNode): ListNode | null {
  let slow = head;
  let fast = head;
  while (fast.next !== null && fast.next.next !== null) { // stop at the FIRST middle
    slow = slow.next!;
    fast = fast.next.next;
  }
  const back = slow.next;
  slow.next = null; // cut: the front half now ends at slow
  return reverseList(back);
}
```

**Time:** `O(n)` · **Space:** `O(1)` — two linear passes, a few pointers.

### Interview classic: Reorder List

Reorder `L0 → L1 → ... → Ln` into `L0 → Ln → L1 → Ln-1 → ...` in place.
Example: `1 → 2 → 3 → 4` → `1 → 4 → 2 → 3`.

- **Brute force:** copy nodes into an array, then relink using two indexes from both ends — `O(n)` extra space.
- **Key insight:** a singly linked list can't walk backwards, but a **reversed** second half can walk forwards. Then weave the two halves.

```ts
function reorderList(head: ListNode | null): void {
  if (head === null) return;
  let front: ListNode | null = head;
  let back = splitAndReverseBack(head);

  while (back !== null) {
    const frontNext: ListNode | null = front!.next; // save both "rest of list" pointers
    const backNext: ListNode | null = back.next;
    front!.next = back;     // front node → back node
    back.next = frontNext;  // back node → next front node
    front = frontNext;
    back = backNext;
  }
}
```

The back half is never longer than the front half, so the loop only needs to check `back`.

## W — Why It Matters

- Reorder List is a common medium question precisely because it checks three skills at once.
- The habit to practise: break a hard problem into steps you already know, and say them out loud first — "middle, reverse, merge".
- The same split-and-reverse start solves Palindrome Linked List and Maximum Twin Sum of a Linked List.

## I — Interview Q&A

### Q: Why cut the list in the middle?

Without `slow.next = null`, the last front node still points into the back half. After reversing, that creates a loop and the weave never ends.

### Q: Why stop at the first middle instead of the second?

So the front half is equal or one longer. Then the weave always ends with a front node and the loop needs only one check.

### Q: Is it OK to change the input list?

Ask. Reorder List requires it. For a read-only check like Palindrome, you can reverse the back half again at the end to restore the list.

## C — Common Pitfalls + Fix

### ❌ Forgetting to cut the list

```ts
const back = slow.next;                    // ❌ front half still points into back
const back = slow.next; slow.next = null;  // ✅ two independent lists
```

### ❌ Losing the rest of a half while weaving

Save `front.next` and `back.next` **before** you change either pointer.

### ❌ Returning a new head

Reorder List returns `void` and the head never changes. Don't build a new list.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Easy

**Palindrome Linked List:** return `true` if the list's values read the same forwards and backwards. Aim for `O(1)` extra space.

`1 → 2 → 2 → 1` → `true` · `1 → 2` → `false`

<details><summary>Hint</summary>

Use the template to get the reversed back half, then walk it alongside the front half and compare values.

</details>

### Solution

```ts
function isPalindromeList(head: ListNode | null): boolean {
  if (head === null) return true;
  let front: ListNode | null = head;
  let back = splitAndReverseBack(head);

  while (back !== null) { // the back half is the shorter one (or equal)
    if (front!.val !== back.val) return false;
    front = front!.next;
    back = back.next;
  }
  return true;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. Reversing the back half lets you compare "first with last, second with second-to-last" while only ever walking forwards. For odd lengths, the middle node stays in the front half and is never compared, which is correct.

**Right now:** Run the walk-through table on `1 → 2 → 3 → 4 → 5 → 6`. Write down both halves after step 3 before you weave.
