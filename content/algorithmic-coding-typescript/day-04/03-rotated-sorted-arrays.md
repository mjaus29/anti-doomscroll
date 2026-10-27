# Rotated Sorted Arrays

## T — TL;DR

A *rotated* sorted array is a sorted array cut in two and swapped, like `[4, 5, 6, 7, 0, 1, 2]`. It is not fully sorted, but if you cut it at any `mid`, **at least one half is still sorted**. Compare `mid` with an end to learn which half, and you can still throw away half the array each step: `O(log n)`.

**Reach for it when:**

- The problem says "sorted, then rotated" or "shifted by an unknown amount".
- You need the smallest value, the rotation point, or a target, in `O(log n)`.
- More generally: the array is not sorted, but comparing `mid` with a neighbour or an end tells you which side holds the answer.

## K — Key Concepts

### Picture it

A clock face numbered in order, but someone turned it so 12 is no longer at the top. The numbers still go up as you walk around, with exactly one "drop" (where 11 goes to 12, then back to 1). Find which side of you the drop is on, and you know where the smallest number is.

### Walk through it

**Find the minimum** of `rotated = [4, 5, 6, 7, 0, 1, 2]`. Compare `rotated[mid]` with `rotated[right]`.

| left | right | mid → value | vs `rotated[right]` | Action and why |
| :--- | :---- | :---------- | :------------------ | :------------- |
| 0 | 6 | 3 → 7 | `7 > 2` | The drop is right of `mid`, and `mid` is not the min: `left = 4`. |
| 4 | 6 | 5 → 1 | `1 < 2` | `mid..right` is sorted, so min is `mid` or left of it: `right = 5`. |
| 4 | 5 | 4 → 0 | `0 < 1` | Same reason: `right = 4`. |
| 4 | 4 | — | — | Meet. Min is `rotated[4] = 0`. |

### The template

```ts
// Find Minimum in Rotated Sorted Array (all values distinct, length >= 1).
function findMin(rotated: readonly number[]): number {
  let left = 0;
  let right = rotated.length - 1; // the min is always somewhere in left..right

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (rotated[mid] > rotated[right]) {
      left = mid + 1; // the drop is after mid, so the min is too
    } else {
      right = mid;    // mid..right is sorted: mid is the smallest there, keep it
    }
  }
  return rotated[left];
}
```

**Time:** `O(log n)` · **Space:** `O(1)`. It is the boundary search from the previous lesson: the question "is `rotated[i] <= rotated[last]`?" is "no" before the min and "yes" from the min on.

The index `left` is also the *rotation count*: how many places the sorted array was shifted.

### Interview classic: Search in Rotated Sorted Array

Return the index of `target` in a rotated sorted array of distinct values, or `-1`. Must be `O(log n)`.
Example: `[4, 5, 6, 7, 0, 1, 2]`, `target = 0` → `4`.

- **Brute force:** `indexOf` — `O(n)`.
- **Key insight:** at each `mid`, one half is sorted. If `rotated[left] <= rotated[mid]`, the left half is sorted. Check if the target fits in that sorted half's range; if yes, go there, otherwise go to the other half.

```ts
function search(rotated: readonly number[], target: number): number {
  let left = 0;
  let right = rotated.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (rotated[mid] === target) return mid;

    if (rotated[left] <= rotated[mid]) {
      // Left half left..mid is sorted. Is the target inside its range?
      if (rotated[left] <= target && target < rotated[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      // Right half mid..right is sorted.
      if (rotated[mid] < target && target <= rotated[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}
```

This uses the basic `left <= right` template from Binary Search Basics. Only the "which half?" decision is new, and you only ever trust the **sorted** half's range.

## W — Why It Matters

- Both problems are very common, and they test whether you understand *why* binary search works, not only the sorted case.
- The general idea, "find a test that tells you which half to keep", unlocks Find Peak Element and many harder problems.
- Interviewers listen for "one half is always sorted" and for a clear rule about when the target is in it.

## I — Interview Q&A

### Q: Why compare with `rotated[right]` and not `rotated[left]` in findMin?

If you used "`rotated[mid] > rotated[left]` means the drop is to the right", an array that is not rotated would send you right, away from the min at index `0`. Comparing with `right` is correct in both cases.

### Q: What changes if values can repeat?

When `rotated[mid] === rotated[right]` you can't tell which side has the drop. Drop one item with `right--`. The worst case becomes `O(n)`, for example `[1, 1, 1, 0, 1]`.

### Q: Why `rotated[left] <= rotated[mid]` with `<=`?

When `left === mid` (two items left), the "left half" is one item, which is sorted. With `<` you would wrongly treat it as unsorted.

## C — Common Pitfalls + Fix

### ❌ Checking the target against the unsorted half

Only a sorted half has a real range from its first to its last value. Always test the sorted half; if the target is not there, go to the other half.

### ❌ Off-by-one in the range checks

```ts
if (rotated[left] < target && target < rotated[mid]) // ❌ misses rotated[left]
if (rotated[left] <= target && target < rotated[mid]) // ✅
```

### ❌ Mixing `left <= right` with `right = mid`

`findMin` uses `left < right` with `right = mid`. `search` uses `left <= right` with `mid ± 1`. Mixing them can loop forever.

### ❌ Forgetting the not-rotated case

Test `[1, 2, 3, 4, 5]` every time. A rotation of `0` is still a valid input.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Find Peak Element:** a *peak* is a value strictly bigger than its neighbours. Treat the spots outside the array as `-Infinity`, and neighbours are never equal. Return the index of **any** peak in `O(log n)`.

`[1, 2, 3, 1]` → `2` · `[1, 2, 1, 3, 5, 6, 4]` → `1` or `5`

<details><summary>Hint</summary>

Compare `values[mid]` with `values[mid + 1]`. If the next one is bigger, you are walking uphill, and a peak must exist to the right.

</details>

### Solution

```ts
function findPeakElement(values: readonly number[]): number {
  let left = 0;
  let right = values.length - 1;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (values[mid] < values[mid + 1]) {
      left = mid + 1; // uphill to the right: a peak is right of mid
    } else {
      right = mid;    // downhill: mid itself may be the peak, keep it
    }
  }
  return left;
}
```

**Time:** `O(log n)` · **Space:** `O(1)`. Going uphill must end somewhere, because the edge counts as `-Infinity`. That is why the side you keep always holds a peak. `mid + 1` is safe because `mid < right`.

**Right now:** Trace `search([4, 5, 6, 7, 0, 1, 2], 3)`. Write which half is sorted at each step and confirm it returns `-1`.
