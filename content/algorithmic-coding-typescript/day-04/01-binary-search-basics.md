# Binary Search Basics

## T — TL;DR

In a sorted array, look at the middle item. If it is too small, the answer must be to its right; if too big, to its left. Each look throws away half of what is left, so you need about `log₂ n` looks (20 for a million items) instead of `n`.

**Reach for it when:**

- The input is **sorted**, or can be treated as sorted.
- You need to find a value or position fast, and `O(n)` is "too slow" for the input size.
- The constraints are huge (`n` up to `10⁹`) or the problem says `O(log n)`.

## K — Key Concepts

### Picture it

Finding a word in a paper dictionary. You open it near the middle, see you are at "M", and you want "R", so you ignore everything before "M" and open the middle of what remains. You never read page by page.

### Walk through it

`sorted = [1, 3, 5, 7, 9, 11, 13]`, `target = 9`. The *search range* is `left..right`, the indexes where the target could still be.

| left | right | mid → value | Action and why |
| :--- | :---- | :---------- | :------------- |
| 0 | 6 | 3 → 7 | `7 < 9`, so index 3 and everything left of it is too small: `left = 4`. |
| 4 | 6 | 5 → 11 | `11 > 9`, so index 5 and everything right of it is too big: `right = 4`. |
| 4 | 4 | 4 → 9 | Found it. Return `4`. |

Now `target = 4` (not present):

| left | right | mid → value | Action and why |
| :--- | :---- | :---------- | :------------- |
| 0 | 6 | 3 → 7 | Too big: `right = 2`. |
| 0 | 2 | 1 → 3 | Too small: `left = 2`. |
| 2 | 2 | 2 → 5 | Too big: `right = 1`. |
| 2 | 1 | — | `left > right`: the range is empty. Return `-1`. |

### The template

```ts
function binarySearch(sorted: readonly number[], target: number): number {
  let left = 0;
  let right = sorted.length - 1; // if present, the target is in left..right (inclusive)

  while (left <= right) { // <= : a range of one item still needs checking
    const mid = left + Math.floor((right - left) / 2);
    if (sorted[mid] === target) return mid;
    if (sorted[mid] < target) left = mid + 1; // too small: drop mid and its left side
    else right = mid - 1;                     // too big: drop mid and its right side
  }
  return -1; // range is empty: not found
}
```

**Time:** `O(log n)` · **Space:** `O(1)` — the range halves every loop.

**What each pointer means:** `left` is the smallest index that could still hold the target, `right` the largest. Every update must keep that true, and must shrink the range by at least one, or the loop never ends.

**Why `left + Math.floor((right - left) / 2)`?** In Java or C++, `left + right` can overflow a 32-bit int. JavaScript numbers are exact up to about `9 × 10¹⁵`, so it is not a real risk here, but interviewers like seeing the safe habit.

### Interview classic: Search a 2D Matrix

Each row is sorted, and each row's first value is bigger than the previous row's last value. Return whether `target` is in the matrix.
Example: `[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]]`, `target = 3` → `true`.

- **Brute force:** scan every cell — `O(rows × cols)`.
- **Key insight:** read row by row, the matrix is one long sorted list. Search indexes `0..rows × cols − 1` and turn each index into a cell: `row = Math.floor(index / cols)`, `col = index % cols`.

```ts
function searchMatrix(matrix: readonly (readonly number[])[], target: number): boolean {
  if (matrix.length === 0 || matrix[0].length === 0) return false;
  const cols = matrix[0].length;
  let left = 0;
  let right = matrix.length * cols - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const value = matrix[Math.floor(mid / cols)][mid % cols]; // flat index → cell
    if (value === target) return true;
    if (value < target) left = mid + 1;
    else right = mid - 1;
  }
  return false;
}
```

**Time:** `O(log(rows × cols))` · **Space:** `O(1)`. The template is unchanged; only "read the value at `mid`" is different.

## W — Why It Matters

- Many medium and hard problems hide a binary search; you must write the basic loop without bugs first.
- It is how databases find rows in sorted indexes, and how `git bisect` finds the commit that broke a build.
- Interviewers listen for what `left` and `right` mean, and why the loop always ends.

## I — Interview Q&A

### Q: Why `left <= right` and not `left < right` here?

`left..right` includes both ends. When `left === right`, one item is still unchecked. With `<` you would skip it and miss a target at the last remaining spot.

### Q: Why `mid + 1` and `mid - 1`, not `mid`?

You already checked `mid`, so it can leave the range. Setting `left = mid` can also loop forever when `left` and `right` are next to each other.

### Q: Can you write it recursively?

Yes, with `left` and `right` as arguments. It uses `O(log n)` stack space instead of `O(1)`, so the loop is usually preferred.

## C — Common Pitfalls + Fix

### ❌ Searching unsorted data

Binary search assumes order. On unsorted input it returns wrong answers without any error. Sort first or use a `Set`.

### ❌ Forgetting `Math.floor`

```ts
const mid = (left + right) / 2;                      // ❌ 2.5 is not an index
const mid = left + Math.floor((right - left) / 2);   // ✅ always a whole number
```

### ❌ Updating to `mid` instead of `mid ± 1`

With `left = 3, right = 4`, `mid` is `3`. `left = mid` keeps `left` at `3` forever. Always drop `mid` once you have checked it.

### ❌ Using `indexOf` "because it's simpler"

`indexOf` is `O(n)`. On sorted input, the interviewer expects `O(log n)`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Guess Number Higher or Lower:** a number was picked from `1..n`. You can call `guess(num)`, which returns `-1` if `num` is too high, `1` if it is too low, and `0` if it is correct. Return the picked number.

`n = 10`, picked `6` → `6`

The judge gives you `guess`. Here is a stand-in so you can run your code:

```ts
const picked = 6;
function guess(num: number): number {
  if (num > picked) return -1; // your guess is too high
  if (num < picked) return 1;  // your guess is too low
  return 0;
}
```

<details><summary>Hint</summary>

The range is `1..n`, not array indexes. Use `guess(mid)` where you used to compare `sorted[mid]` with the target.

</details>

### Solution

```ts
function guessNumber(n: number): number {
  let left = 1;
  let right = n;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2); // n can be near 2³¹
    const answer = guess(mid);
    if (answer === 0) return mid;
    if (answer === 1) left = mid + 1; // too low: the pick is right of mid
    else right = mid - 1;             // too high: the pick is left of mid
  }
  return -1; // only reached if guess is inconsistent
}
```

**Time:** `O(log n)` · **Space:** `O(1)`. It is the template with `guess(mid)` standing in for the comparison.

**Right now:** Trace `binarySearch([2, 4, 6, 8], 8)` and write `left`, `right`, and `mid` for every loop.
