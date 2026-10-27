# Dummy Nodes and Merging Lists

## T — TL;DR

A **dummy node** is a fake node you place before the real head. Because every real node now has a node before it, deleting or adding at the head works exactly like anywhere else — no special case. At the end you return `dummy.next`.

**Reach for it when:**

- The head itself might be removed or replaced.
- You build a new list node by node (merging, adding, partitioning).
- Your code has an `if (head is special)` branch you would like to delete.

## K — Key Concepts

### Picture it

A train where cars are being uncoupled. If the first car must go, you have nothing in front of it to re-hook. So you park a spare locomotive in front (the dummy). Now every car, even the first, has something in front of it to re-hook to. When you are done, you drive off without the spare.

### Walk through it

Remove every `6` from `6 → 1 → 6 → 2`. `previous` starts at the dummy.

| Step | previous | previous.next | Action and why | List after dummy |
| :--- | :------- | :------------ | :------------- | :--------------- |
| 1 | dummy | 6 | Matches. Skip it: `previous.next = 1`. Stay put. | `1 → 6 → 2` |
| 2 | dummy | 1 | Keep it. Move `previous` to 1. | same |
| 3 | 1 | 6 | Matches. Skip it: `1.next = 2`. Stay put. | `1 → 2` |
| 4 | 1 | 2 | Keep it. Move `previous` to 2. | same |
| 5 | 2 | `null` | End. Return `dummy.next` (node 1). | `1 → 2` |

Step 1 removed the head with the same line that removed the middle node in step 3.

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

function removeElements(head: ListNode | null, target: number): ListNode | null {
  const dummy = new ListNode(0, head); // a node in front of the real head
  let previous = dummy;

  while (previous.next !== null) {
    if (previous.next.val === target) {
      previous.next = previous.next.next; // unlink; don't move, the new next may match too
    } else {
      previous = previous.next;
    }
  }
  return dummy.next; // the real head, which may have changed
}
```

**Time:** `O(n)` · **Space:** `O(1)` — one pass, one extra node.

### Interview classic: Merge Two Sorted Lists

Merge two sorted lists into one sorted list by relinking their nodes.
Example: `1 → 2 → 4` and `1 → 3 → 4` → `1 → 1 → 2 → 3 → 4 → 4`.

- **Brute force:** copy all values to an array, sort, rebuild — `O(n log n)` and extra space.
- **Key insight:** the smallest remaining node is always one of the two heads. Keep a `tail` pointer starting at a dummy, attach the smaller head, and step. When one list runs out, attach the rest of the other in one move.

```ts
function mergeTwoLists(first: ListNode | null, second: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy; // last node of the merged list so far

  while (first !== null && second !== null) {
    if (first.val <= second.val) {
      tail.next = first;
      first = first.next;
    } else {
      tail.next = second;
      second = second.next;
    }
    tail = tail.next;
  }
  tail.next = first ?? second; // the leftover part is already sorted
  return dummy.next;
}
```

The dummy means we never ask "is the merged list still empty?" before attaching the first node.

## W — Why It Matters

- Merge Two Sorted Lists is a top-asked easy problem and the core step of merge sort and Merge K Sorted Lists (Day 8).
- The dummy-node habit makes almost every "build or edit a list" problem shorter and less buggy.
- Interviewers notice when your code has no head special case — it reads as experience.

## I — Interview Q&A

### Q: Why use `<=` instead of `<` when merging?

With `<=`, equal values from the first list come first, so the merge is *stable* (equal items keep their original order). It matters when nodes carry more than a number.

### Q: Can you merge recursively?

Yes: return the smaller head after setting its `next` to the merge of the rest. It is shorter but uses `O(n)` call-stack space.

### Q: Does the dummy node cost memory?

One node — `O(1)`. It is never part of the answer because you return `dummy.next`.

## C — Common Pitfalls + Fix

### ❌ Returning `dummy` instead of `dummy.next`

The dummy's value (often `0`) would show up as a fake first item.

### ❌ Moving `previous` after a deletion

```ts
previous.next = previous.next.next; previous = previous.next; // ❌ misses back-to-back 6s
previous.next = previous.next.next;                           // ✅ re-check the new next
```

### ❌ Looping over the leftover list

When one list is empty, `tail.next = first ?? second` attaches the whole rest in `O(1)`. No loop needed.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Add Two Numbers:** two non-negative numbers are stored as lists with digits in **reverse** order (ones digit first). Return their sum as a list in the same format.

`2 → 4 → 3` (342) + `5 → 6 → 4` (465) → `7 → 0 → 8` (807)

<details><summary>Hint</summary>

Add digit by digit like on paper, keeping a `carry`. Build the answer after a dummy node. Keep going while either list has nodes **or** carry is not 0.

</details>

### Solution

```ts
function addTwoNumbers(first: ListNode | null, second: ListNode | null): ListNode | null {
  const dummy = new ListNode();
  let tail = dummy;
  let carry = 0;

  while (first !== null || second !== null || carry !== 0) {
    const sum = (first?.val ?? 0) + (second?.val ?? 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = new ListNode(sum % 10); // keep the ones digit
    tail = tail.next;
    first = first?.next ?? null;
    second = second?.next ?? null;
  }
  return dummy.next;
}
```

**Time:** `O(max(m, n))` · **Space:** `O(max(m, n))` for the answer. Reverse order means the ones digits come first, exactly the order you add by hand.

**Right now:** Trace `mergeTwoLists` on `1 → 5` and `2 → 3 → 4`, and write which node `tail` points to after each step.
