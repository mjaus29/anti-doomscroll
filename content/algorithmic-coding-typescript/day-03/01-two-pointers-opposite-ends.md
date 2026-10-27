# Two Pointers: Opposite Ends

## T — TL;DR

Put one pointer at the start and one at the end of a **sorted** array, then move them toward each other. Each move rules out a whole group of pairs, so you check `n` positions instead of `n²` pairs.

**Reach for it when:**

- The input is sorted (or you are allowed to sort it).
- You need a **pair** that meets a condition (sum, difference, area).
- You are comparing the two ends of something (palindromes, reversing in place).

## K — Key Concepts

### Picture it

Two friends stand at opposite ends of a bookshelf sorted by price, looking for two books that cost exactly 9 dollars together. If the total is too high, the friend holding the expensive book steps left to a cheaper one. If it is too low, the friend holding the cheap book steps right. Nobody ever needs to step back.

### Walk through it

Sorted `values = [1, 3, 4, 6, 8]`, `target = 9`.

| Step | left → value | right → value | Sum | Action and why |
| :--- | :----------- | :------------ | :-- | :------------- |
| 1 | 0 → 1 | 4 → 8 | 9 | Found it. Return `[0, 4]`. |

Now try `target = 7`:

| Step | left → value | right → value | Sum | Action and why |
| :--- | :----------- | :------------ | :-- | :------------- |
| 1 | 0 → 1 | 4 → 8 | 9 | Too big. `8` is too big even with the smallest value, so drop it: `right--`. |
| 2 | 0 → 1 | 3 → 6 | 7 | Found it. Return `[0, 3]`. |

The rule that makes this safe: when the sum is too big, the right value is too big with **every** value still in range, so it can never be part of the answer.

### The template

```ts
function pairWithSum(sorted: readonly number[], target: number): [number, number] | null {
  let left = 0;
  let right = sorted.length - 1;

  while (left < right) { // left < right: never pair an item with itself
    const sum = sorted[left] + sorted[right];
    if (sum === target) return [left, right];
    if (sum < target) left++; // need a bigger sum → bigger left value
    else right--;             // need a smaller sum → smaller right value
  }
  return null;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — each step moves one pointer inward, so there are at most `n` steps.

### Interview classic: Container With Most Water

Given bar heights, pick two bars that hold the most water. Water held = `width × shorter bar`.
Example: `[1, 8, 6, 2, 5, 4, 8, 3, 7]` → `49` (bars at index 1 and 8: width 7 × height 7).

- **Brute force:** try every pair — `O(n²)`.
- **Key insight:** start with the widest pair. The shorter bar limits the water. Moving the **taller** bar inward can only shrink the width without raising the limit, so always move the **shorter** one.

```ts
function maxArea(heights: readonly number[]): number {
  let left = 0;
  let right = heights.length - 1;
  let best = 0;

  while (left < right) {
    const width = right - left;
    const height = Math.min(heights[left], heights[right]);
    best = Math.max(best, width * height);

    // The shorter bar is the bottleneck; only replacing it can help.
    if (heights[left] < heights[right]) left++;
    else right--;
  }
  return best;
}
```

The array is not sorted here, but the same idea applies: each move throws away options that provably cannot beat the current best.

## W — Why It Matters

- Turns many "find a pair" problems from `O(n²)` into `O(n)` with zero extra memory.
- It is the inner loop of **3Sum** (Day 3, topic 3) and shows up in palindrome and in-place reverse problems.
- Interviewers listen for the *reason* a pointer may move: "this value can't be in any remaining answer."

## I — Interview Q&A

### Q: Why is it safe to move `left` when the sum is too small?

The array is sorted, so `sorted[left]` plus any remaining right value is at most the current sum. None of those pairs can reach the target, so the left value can be dropped.

### Q: The input is not sorted. What now?

Either sort a copy first (`O(n log n)`, but you lose original indices unless you store them), or use a hash map like Two Sum (`O(n)` time, `O(n)` space). Say the trade-off out loud.

### Q: When does this pattern fail?

When moving a pointer could skip a pair that might still work — that is, when there is no ordering rule that proves the dropped value is useless.

## C — Common Pitfalls + Fix

### ❌ Using it on unsorted data

The "too big → move right" rule only works because of order. Sort first, or pick a different pattern.

### ❌ `left <= right` instead of `left < right`

```ts
while (left <= right) // ❌ can pair an element with itself
while (left < right)  // ✅ two distinct elements
```

### ❌ Moving the wrong pointer

Before each move, say which values you are throwing away and why they cannot be in the answer. If you can't say it, the move is probably wrong.

### ❌ Sorting the input array in place

`values.sort()` mutates the caller's array. Use `[...values].sort((a, b) => a - b)` — and always pass a comparator for numbers.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Valid Palindrome:** return `true` if a string reads the same forwards and backwards after ignoring case and every character that is not a letter or digit.

`"A man, a plan, a canal: Panama"` → `true` · `"race a car"` → `false`

<details><summary>Hint</summary>

Compare the two ends and move inward. Skip characters that are not letters or digits before comparing.

</details>

### Solution

```ts
function isPalindrome(text: string): boolean {
  const isAlphanumeric = (char: string): boolean => /[a-z0-9]/i.test(char);
  let left = 0;
  let right = text.length - 1;

  while (left < right) {
    if (!isAlphanumeric(text[left])) { left++; continue; }
    if (!isAlphanumeric(text[right])) { right--; continue; }
    if (text[left].toLowerCase() !== text[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. Every character is visited at most once, and no cleaned copy of the string is built.

**Right now:** Trace `maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7])` for the first three steps on paper and write down which pointer moves each time.
