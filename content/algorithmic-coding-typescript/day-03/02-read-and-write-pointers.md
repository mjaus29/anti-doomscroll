# Read and Write Pointers

## T — TL;DR

Walk the array with a **read** pointer that looks at every item, and a **write** pointer that marks where the next item you keep should go. You filter or compact an array in one pass, in place, with no second array.

**Reach for it when:**

- The task says "in place" or "`O(1)` extra space".
- You must remove, keep, or move some items while keeping the others in order.
- The answer is "the first `k` slots of the array" plus a count `k`.

## K — Key Concepts

### Picture it

You are tidying a bookshelf from left to right. Your right hand (read) picks up each book in turn. Your left hand (write) points at the next free spot for a book you want to keep. Keepers go to the left hand's spot, and the left hand moves one step. Books you throw away never move the left hand.

### Walk through it

**Move Zeroes:** push every `0` to the end and keep the other values in order. `values = [0, 1, 0, 3, 12]`.

| read → value | write | Action and why | Array after |
| :----------- | :---- | :------------- | :---------- |
| 0 → 0 | 0 | Zero, skip. `write` stays on the free slot. | `[0, 1, 0, 3, 12]` |
| 1 → 1 | 0 | Keeper. Swap into slot 0, `write++`. | `[1, 0, 0, 3, 12]` |
| 2 → 0 | 1 | Zero, skip. | `[1, 0, 0, 3, 12]` |
| 3 → 3 | 1 | Keeper. Swap into slot 1, `write++`. | `[1, 3, 0, 0, 12]` |
| 4 → 12 | 2 | Keeper. Swap into slot 2, `write++`. | `[1, 3, 12, 0, 0]` |

The *invariant* (a fact that stays true on every loop) is: everything before `write` is finished, kept, and in the original order.

### The template

```ts
function moveZeroes(values: number[]): void {
  let write = 0; // next slot for a value we keep

  for (let read = 0; read < values.length; read++) {
    if (values[read] !== 0) {
      // Swap (not overwrite) so the zeros slide toward the end.
      [values[write], values[read]] = [values[read], values[write]];
      write++;
    }
  }
}
```

**Time:** `O(n)` · **Space:** `O(1)` — `read` visits each item once and `write` never passes `read`.

Change the `if` condition and you get a different filter: "keep values not equal to `x`", "keep even numbers", and so on.

### Interview classic: Remove Duplicates from Sorted Array

Given a sorted array, keep one copy of each value at the front, in place, and return how many unique values there are (`k`). What sits after index `k - 1` does not matter.
Example: `[0, 0, 1, 1, 1, 2, 2, 3]` → `4`, front becomes `[0, 1, 2, 3]`.

- **Brute force:** build a `Set` or a new array — `O(n)` time but `O(n)` extra space, which breaks the "in place" rule.
- **Key insight:** the array is sorted, so duplicates sit next to each other. A value is new exactly when it differs from the **last value you wrote**.

```ts
function removeDuplicates(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  let write = 1; // sorted[0] is always kept

  for (let read = 1; read < sorted.length; read++) {
    // Compare with the last kept value, not with sorted[read - 1].
    if (sorted[read] !== sorted[write - 1]) {
      sorted[write] = sorted[read];
      write++;
    }
  }
  return write; // write is also the count of kept values
}
```

Same template, new keep rule. Here you overwrite instead of swap, because the leftover slots do not need to hold anything useful.

## W — Why It Matters

- It is the standard answer to "do it in place" for array filtering, and interviewers often ask for in-place after you give the easy version.
- The same idea powers **Remove Element**, **Sort Colors**, and compacting buffers in real code (removing dead entries without allocating).
- Interviewers listen for the invariant: "everything left of `write` is the answer so far."

## I — Interview Q&A

### Q: What if duplicates may appear at most twice?

Compare with `sorted[write - 2]` instead of `sorted[write - 1]` and start `write` at `2`. The template stays the same; only the keep rule changes.

### Q: Why not use `splice` to delete items?

Each `splice` shifts every later item, which is `O(n)`. Calling it inside a loop makes the whole thing `O(n²)`.

### Q: Does Move Zeroes need to swap?

No. You can copy keepers forward, then fill the slots from `write` to the end with `0`. Swapping does it in one loop; both are `O(n)`.

## C — Common Pitfalls + Fix

### ❌ Deleting while looping

`splice` inside a `for` loop skips the item that slides into the deleted slot, and it is slow. Use a write pointer instead.

### ❌ Comparing with the wrong neighbour

```ts
if (sorted[read] !== sorted[read - 1])  // ❌ breaks the "at most twice" variant
if (sorted[read] !== sorted[write - 1]) // ✅ compares with what you actually kept
```

### ❌ Returning the wrong count

`write` already equals the number of kept items. Returning `write + 1` or `write - 1` is the most common off-by-one here.

### ❌ Forgetting the empty array

`removeDuplicates([])` must return `0`. Starting `write` at `1` without the guard would return `1`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Merge Sorted Array:** `first` has length `m + n`. Its first `m` values are sorted and the last `n` slots are `0` placeholders. `second` holds `n` sorted values. Merge `second` into `first` in place so `first` is fully sorted.

`first = [1, 2, 3, 0, 0, 0], m = 3, second = [2, 5, 6], n = 3` → `first` becomes `[1, 2, 2, 3, 5, 6]`

<details><summary>Hint</summary>

The empty slots are at the end. Put a write pointer there and fill from the back with the bigger of the two last values.

</details>

### Solution

```ts
function merge(first: number[], m: number, second: readonly number[], n: number): void {
  let firstIndex = m - 1;  // last real value in first
  let secondIndex = n - 1; // last value in second
  let write = m + n - 1;   // last slot

  while (secondIndex >= 0) { // once second is used up, first is already in place
    if (firstIndex >= 0 && first[firstIndex] > second[secondIndex]) {
      first[write] = first[firstIndex];
      firstIndex--;
    } else {
      first[write] = second[secondIndex];
      secondIndex--;
    }
    write--;
  }
}
```

**Time:** `O(m + n)` · **Space:** `O(1)`. Filling from the back means `write` is always at or right of `firstIndex`, so you never overwrite a value you still need.

**Right now:** Trace `removeDuplicates([1, 1, 2, 2, 2, 3])` on paper. Write `read`, `write`, and the array after every step.
