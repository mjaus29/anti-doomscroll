# Fast and Slow Pointers

## T — TL;DR

Walk two pointers through the same list at different speeds: `slow` moves one node per step, `fast` moves two. When `fast` reaches the end, `slow` is in the middle. If the list loops, `fast` eventually laps `slow` and they meet. Both answers come in one pass with `O(1)` extra space.

**Reach for it when:**

- You need the middle of a linked list without knowing its length.
- You must detect a cycle (a loop) without a `Set` of visited nodes.
- You need the "k-th from the end" (use a fixed gap instead of different speeds).
- A sequence of numbers might repeat forever (Happy Number).

## K — Key Concepts

### Picture it

Two runners on a track. One runs twice as fast. On a straight road, when the fast one finishes, the slow one is exactly halfway. On a circular track, the fast one keeps coming around and must eventually pass the slow one.

### Walk through it

Middle of `1 → 2 → 3 → 4 → 5`.

| Step | slow | fast | Action and why |
| :--- | :--- | :--- | :------------- |
| 0 | 1 | 1 | Both start at the head. |
| 1 | 2 | 3 | slow +1, fast +2. |
| 2 | 3 | 5 | slow +1, fast +2. Now `fast.next` is `null`: stop. slow is the middle → `3`. |

For an even list `1 → 2 → 3 → 4`, fast lands on `null` after two steps and slow is on `3` — the **second** of the two middles.

### The template

```ts
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

function middleNode(head: ListNode | null): ListNode | null {
  let slow = head;
  let fast = head;

  // fast moves 2, so it needs both fast and fast.next to exist.
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow; // fast covered twice the distance, so slow is halfway
}
```

**Time:** `O(n)` · **Space:** `O(1)` — `fast` reaches the end after about `n / 2` steps.

### Interview classic: Linked List Cycle

Return `true` if some node's `next` points back to an earlier node, so walking the list never ends.
Example: `3 → 2 → 0 → -4 → (back to 2)` → `true`.

- **Brute force:** store every node in a `Set`; if you see one twice, there is a cycle — `O(n)` space.
- **Key insight:** inside a loop, `fast` gains one node on `slow` every step, so the gap shrinks by one until they meet. Without a loop, `fast` hits `null`. This is called *Floyd's cycle detection*.

```ts
function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;

  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true; // compare nodes (references), not values
  }
  return false;
}
```

**Finding where the cycle starts:** after they meet, move one pointer back to the head and step both **one** node at a time. The node where they meet again is the start of the cycle (LeetCode: Linked List Cycle II).

### Variation: Remove Nth Node From End

Remove the `n`-th node from the end. Example: `1 → 2 → 3 → 4 → 5`, `n = 2` → `1 → 2 → 3 → 5`.
Same speed, fixed **gap**: move `fast` `n` nodes ahead first. When `fast` hits the last node, `slow` is just before the target.

```ts
function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  const dummy = new ListNode(0, head); // handles removing the head
  let slow: ListNode = dummy;
  let fast: ListNode = dummy;

  for (let i = 0; i < n; i++) fast = fast.next!; // open a gap of n nodes
  while (fast.next !== null) {
    slow = slow.next!;
    fast = fast.next;
  }
  slow.next = slow.next!.next; // slow is right before the node to remove
  return dummy.next;
}
```

## W — Why It Matters

- Middle-finding is step one of Reorder List, Palindrome Linked List (next lesson), and merge sort on lists.
- Cycle detection shows up beyond lists: repeating number sequences, duplicate finding (Find the Duplicate Number), and state machines.
- Interviewers often ask "can you do it in `O(1)` space?" right after you offer a `Set` — this is that answer.

## I — Interview Q&A

### Q: Why must `fast` and `slow` meet in a cycle — couldn't `fast` jump over `slow`?

Each step, `fast` gets exactly one node closer to `slow` (it moves 2, slow moves 1). A gap that shrinks by 1 must hit 0; it cannot skip past it.

### Q: How would you get the **first** middle in an even list?

Change the loop to `while (fast.next !== null && fast.next.next !== null)`. Then `1 → 2 → 3 → 4` returns `2`.

### Q: Why does the cycle-start trick work?

The math shows the distance from the head to the cycle start equals the distance from the meeting point to the cycle start (going around the loop). So two pointers at one node per step arrive together.

## C — Common Pitfalls + Fix

### ❌ Checking only `fast !== null`

```ts
while (fast !== null)                       // ❌ fast.next.next crashes on the last node
while (fast !== null && fast.next !== null) // ✅
```

### ❌ Comparing values instead of nodes

Two different nodes can hold the same value. Compare references: `slow === fast`.

### ❌ Checking for a meeting before moving

Both pointers start at the head, so `slow === fast` is true at step 0. Move first, then compare.

### ❌ Off-by-one gap in Remove Nth

Start both pointers at a dummy and move `fast` exactly `n` times. Then `slow` stops on the node **before** the target.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Happy Number:** replace a number by the sum of the squares of its digits, and repeat. It is *happy* if this reaches `1`. If it loops forever without reaching 1, it is not happy. Return `true` for happy numbers.

`19` → `true` (1 + 81 = 82 → 68 → 100 → 1) · `2` → `false`

<details><summary>Hint</summary>

The numbers form a hidden linked list: `next(x)` = sum of squared digits. Either it reaches 1, or it enters a cycle. Run slow and fast on it.

</details>

### Solution

```ts
function isHappy(start: number): boolean {
  const next = (value: number): number => {
    let sum = 0;
    while (value > 0) {
      const digit = value % 10;
      sum += digit * digit;
      value = Math.floor(value / 10);
    }
    return sum;
  };

  let slow = start;
  let fast = next(start);
  while (fast !== 1 && slow !== fast) {
    slow = next(slow);
    fast = next(next(fast)); // two steps at a time
  }
  return fast === 1;
}
```

**Time:** `O(log n)` per step, and the values drop quickly to a small range · **Space:** `O(1)`. Same idea as Linked List Cycle, but "next node" is a function instead of a pointer.

**Right now:** Draw `1 → 2 → 3 → 4 → 5 → 6` and trace `middleNode`. Then change the loop as in the Q&A and see which middle you get.
