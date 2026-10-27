# First and Last Position

## T — TL;DR

Instead of stopping when you hit the target, keep narrowing until `left` and `right` meet on a **boundary**: the first index where a yes/no question flips from "no" to "yes". Two such searches find where a run of equal values starts and ends in `O(log n)`.

**Reach for it when:**

- The sorted array has **duplicates** and you need the first or last copy.
- You need "how many values are less than `x`" or "where would `x` go".
- The question is "the first index where something becomes true".

## K — Key Concepts

### Picture it

A row of houses sorted by number, where some numbers repeat. You don't want *a* house with number 2; you want the fence where the 2s begin. You keep halving until you are standing exactly on that fence.

### Walk through it

Two boundary searches:

- *Lower bound*: the first index whose value is `>= target`.
- *Upper bound*: the first index whose value is `> target`.

Both use a *half-open* range `[left, right)`: `left` is included, `right` is not. `right` starts at `n`, meaning "past the end" is a possible answer.

`sorted = [1, 2, 2, 2, 3, 5]`, `target = 2`. **Lower bound:**

| left | right | mid → value | `value < 2`? | Action |
| :--- | :---- | :---------- | :----------- | :----- |
| 0 | 6 | 3 → 2 | No | `mid` might be the answer: `right = 3`. |
| 0 | 3 | 1 → 2 | No | `right = 1`. |
| 0 | 1 | 0 → 1 | Yes | `mid` is too small: `left = 1`. |
| 1 | 1 | — | — | Meet. Answer `1`. |

**Upper bound** (test `value <= 2`): `mid 3 → left 4`, `mid 5 → right 5`, `mid 4 → right 4`. Answer `4`.
So the 2s live at indexes `1` to `4 − 1 = 3`.

### The template

```ts
// First index with sorted[index] >= target (sorted.length if none).
function lowerBound(sorted: readonly number[], target: number): number {
  let left = 0;
  let right = sorted.length; // answer is in left..right; right = n means "past the end"

  while (left < right) { // stop when they meet: that spot is the answer
    const mid = left + Math.floor((right - left) / 2);
    if (sorted[mid] < target) left = mid + 1; // mid is too small, so drop it
    else right = mid;                         // mid could be the first, so keep it
  }
  return left;
}

// First index with sorted[index] > target. Only the comparison changes.
function upperBound(sorted: readonly number[], target: number): number {
  let left = 0;
  let right = sorted.length;

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (sorted[mid] <= target) left = mid + 1;
    else right = mid;
  }
  return left;
}
```

**Time:** `O(log n)` · **Space:** `O(1)`. `mid` is always less than `right`, so `right = mid` shrinks the range every time and the loop ends.

Bonus: `upperBound(sorted, x) - lowerBound(sorted, x)` counts how many times `x` appears.

### Interview classic: Find First and Last Position of Element in Sorted Array

Return `[first, last]` indexes of `target` in a sorted array, or `[-1, -1]` if it is missing. Must be `O(log n)`.
Example: `[5, 7, 7, 8, 8, 10]`, `target = 8` → `[3, 4]`.

- **Brute force:** scan for the first and last match — `O(n)`. Or binary search for any match and walk outwards, which is `O(n)` when every value is the target.
- **Key insight:** the first copy is the lower bound; the last copy sits just before the upper bound.

```ts
function searchRange(sorted: readonly number[], target: number): [number, number] {
  const first = lowerBound(sorted, target);
  // Lower bound may point past the end or at a bigger value: target is missing.
  if (first === sorted.length || sorted[first] !== target) return [-1, -1];
  return [first, upperBound(sorted, target) - 1];
}
```

Two template calls, then one check. Both searches are `O(log n)`, so the total is `O(log n)`.

## W — Why It Matters

- Boundary search is the version you will use most: duplicates, insert positions, counts, and "binary search on the answer" (next lesson) are all lower bounds.
- In real code it is `bisect_left`/`bisect_right` in Python and `lower_bound`/`upper_bound` in C++. JavaScript has no built-in, so you write it.
- Interviewers listen for whether you can explain why the loop ends and what `left` means when it does.

## I — Interview Q&A

### Q: Why `left < right` here but `left <= right` in the basic version?

Here `right` is outside the range (half-open), so `left === right` means the range is empty and `left` is the answer. In the basic version both ends are inside the range.

### Q: Why is `right = mid` safe, but `left = mid` is not?

`mid` rounds down, so `mid < right` always and `right = mid` makes progress. `left = mid` can leave `left` unchanged when the range has two items, which loops forever.

### Q: What does `lowerBound` return if every value is smaller than the target?

`sorted.length`. That is a valid insert position (the end), which is why `right` starts at `n` and not `n - 1`.

## C — Common Pitfalls + Fix

### ❌ Starting `right` at `n - 1`

Then "the target goes after everything" can never be returned. Half-open ranges start at `right = sorted.length`.

### ❌ Mixing the two styles

```ts
while (left <= right) { ... right = mid; } // ❌ can loop forever when left === right
while (left < right)  { ... right = mid; } // ✅ half-open style, consistent
```

### ❌ Reading `sorted[first]` without a bounds check

If `first === sorted.length`, `sorted[first]` is `undefined`. Check the index before comparing.

### ❌ Using `< target` for the upper bound

The upper bound moves right past values **equal** to the target, so its test is `<=`. With `<` you get the lower bound twice.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Search Insert Position:** given a sorted array of distinct numbers and a target, return the target's index if it is present, or the index where it would be inserted to keep the array sorted. Must be `O(log n)`.

`[1, 3, 5, 6]`, `target = 5` → `2` · `target = 2` → `1` · `target = 7` → `4`

<details><summary>Hint</summary>

"Where would it go" is the first index whose value is at least the target. Write the lower bound from memory.

</details>

### Solution

```ts
function searchInsert(sorted: readonly number[], target: number): number {
  let left = 0;
  let right = sorted.length; // inserting at the very end is allowed

  while (left < right) {
    const mid = left + Math.floor((right - left) / 2);
    if (sorted[mid] < target) left = mid + 1;
    else right = mid;
  }
  return left;
}
```

**Time:** `O(log n)` · **Space:** `O(1)`. Whether or not the target is present, the first index with a value `>= target` is both "where it is" and "where it would go".

**Right now:** Run `lowerBound` and `upperBound` on `[2, 2, 2]` with `target = 2` on paper. Predict both answers before you trace.
