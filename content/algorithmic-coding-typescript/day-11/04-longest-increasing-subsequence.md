# Longest Increasing Subsequence

## T — TL;DR

A *subsequence* keeps some items in their original order but may skip others (`[2, 5, 7]` is a subsequence of `[2, 9, 5, 7]`). For "longest increasing subsequence" problems, let each state mean "the best answer that **ends at** item `i`," and build it by looking back at every earlier item that is smaller.

**Reach for it when:**

- The problem says **subsequence** (items may be skipped, order kept).
- Each chosen item must be bigger, later, or "compatible" with the previous one.
- `n` is up to a few thousand (`O(n²)` is fine), or you need the `O(n log n)` level-up below.

## K — Key Concepts

### Picture it

People stand in a line holding numbers. Each person asks everyone in front of them who holds a smaller number: "How long is your increasing chain?" They join the longest such chain, so their own chain is that length plus one.

### The four questions

- **State:** `length[i]` = length of the longest increasing subsequence that **ends at** index `i`.
- **Transition:** `length[i] = 1 + max(length[j])` over every `j < i` with `nums[j] < nums[i]`.
- **Base case:** every `length[i]` starts at `1` (the item alone).
- **Answer:** the **largest** value anywhere in `length`, because the best chain can end at any index.

### Walk through it

`nums = [10, 9, 2, 5, 3, 7, 101, 18]`.

| i | nums[i] | smaller earlier items (their length) | length[i] |
| :- | :- | :- | :- |
| 0 | 10 | none | 1 |
| 1 | 9 | none | 1 |
| 2 | 2 | none | 1 |
| 3 | 5 | 2 (1) | 2 |
| 4 | 3 | 2 (1) | 2 |
| 5 | 7 | 2 (1), 5 (2), 3 (2) | 3 |
| 6 | 101 | 10, 9, 2, 5, 3 (≤ 2), 7 (3) | 4 |
| 7 | 18 | 10, 9, 2, 5, 3 (≤ 2), 7 (3) | 4 |

Answer `4` (for example `2, 3, 7, 101`).

### The template

```ts
function lengthOfLIS(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const length: number[] = new Array(nums.length).fill(1); // each item alone
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      // nums[i] can extend any chain that ends on a smaller value
      if (nums[j] < nums[i]) length[i] = Math.max(length[i], length[j] + 1);
    }
  }
  return Math.max(...length); // the best chain may end anywhere
}
```

**Time:** `O(n²)` · **Space:** `O(n)` — every pair `(j, i)` is checked once.

### Interview classic: Longest Increasing Subsequence

Return the length of the longest **strictly** increasing subsequence.
Example: `[0, 1, 0, 3, 2, 3]` → `4` (`0, 1, 2, 3`).

- **Brute force:** try every subsequence — `O(2ⁿ)`.
- **Key insight:** "ends at `i`" makes each state depend only on earlier states, so a double loop fills them all.

The template above is the full solution. Interviewers then usually ask: "Can you do better than `n²`?"

### Level up: `O(n log n)` with tails

Keep `tails[k]` = the **smallest possible last value** of any increasing subsequence of length `k + 1` seen so far. `tails` is always sorted, so you can binary search it. For each number, find the first tail `>= num` and replace it (a smaller tail leaves more room to grow); if none exists, append.

```ts
function lengthOfLISFast(nums: readonly number[]): number {
  const tails: number[] = [];
  for (const num of nums) {
    let left = 0;
    let right = tails.length; // search in [left, right)
    while (left < right) {
      const mid = left + Math.floor((right - left) / 2);
      if (tails[mid] < num) left = mid + 1;
      else right = mid;
    }
    tails[left] = num; // replace, or append when left === tails.length
  }
  return tails.length;
}
```

For `[10, 9, 2, 5, 3, 7, 101, 18]`, `tails` goes `[10]` → `[9]` → `[2]` → `[2,5]` → `[2,3]` → `[2,3,7]` → `[2,3,7,101]` → `[2,3,7,18]`. Its length is the answer, but `tails` itself is **not** always a real subsequence.

## W — Why It Matters

- "Ends at `i`" is the state for many subsequence problems: Number of LIS, Russian Doll Envelopes, Longest String Chain.
- The tails trick is a well-known follow-up; knowing it shows you can combine DP with binary search (Day 4).
- Real uses: patience sorting, version diffs, and finding the longest stable order in a sequence.

## I — Interview Q&A

### Q: Why is the answer the max of the table, not the last cell?

`length[n - 1]` only counts chains that end at the last item. In `[3, 4, 1]` the last cell is `1`, but the best chain `3, 4` ends at index 1 with length `2`.

### Q: How do you print the actual subsequence?

Store `previous[i]` = the `j` that gave `length[i]` its value. Start at the index with the max length and follow `previous` back, then reverse.

### Q: What changes for "non-decreasing" (equal values allowed)?

Use `nums[j] <= nums[i]` in the `O(n²)` version. In the tails version, search for the first tail **greater than** `num` instead of `>=`.

## C — Common Pitfalls + Fix

### ❌ Defining the state as "best LIS in the first `i` items"

With that state you do not know the last value, so you cannot tell if `nums[i]` may extend it. "Ends at `i`" pins down the last value.

### ❌ Returning `length[n - 1]`

```ts
return length[length.length - 1]; // ❌ only chains ending at the last item
return Math.max(...length);       // ✅ chains ending anywhere
```

(`Math.max(...arr)` can overflow the call stack for ~100,000+ items; use a loop or `reduce` for huge inputs.)

### ❌ Treating `tails` as the answer subsequence

`tails` only has the right **length**. To rebuild the sequence, use the `O(n²)` version with a `previous` array.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Maximum Sum Increasing Subsequence:** return the largest **sum** of a strictly increasing subsequence (all numbers are positive).

`[1, 101, 2, 3, 100]` → `106` (`1, 2, 3, 100`)

<details><summary>Hint</summary>

Same template. State: `sum[i]` = largest sum of an increasing subsequence ending at `i`. Start each `sum[i]` at `nums[i]`, not `1`.

</details>

### Solution

```ts
function maxSumIncreasing(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const sum: number[] = [...nums]; // each item alone
  let best = sum[0];
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) sum[i] = Math.max(sum[i], sum[j] + nums[i]);
    }
    best = Math.max(best, sum[i]);
  }
  return best;
}
```

**Time:** `O(n²)` · **Space:** `O(n)`. Only the base case (`nums[i]` instead of `1`) and the step (`+ nums[i]` instead of `+ 1`) changed; the state is still "ends at `i`."

**Right now:** Trace `lengthOfLISFast([0, 1, 0, 3, 2, 3])` and write `tails` after each number.
