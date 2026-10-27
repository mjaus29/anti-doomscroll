# Prefix Sums

## T — TL;DR

Precompute running totals once, so the sum of any range is one subtraction instead of a loop. Building the totals is `O(n)`; every range sum after that is `O(1)`.

**Reach for it when:**

- You need the sum of many different ranges of the same array.
- The problem asks about subarrays whose sum equals, or is divisible by, some value.
- You need "everything to the left" and "everything to the right" of each index.

## K — Key Concepts

### Picture it

A car's odometer shows total kilometres since it was built. To know how far you drove today, you do not replay the trip; you subtract this morning's reading from tonight's. Prefix sums are odometer readings for an array.

### Walk through it

`values = [3, 1, 4, 1, 5]`. Let `prefix[i]` be the sum of the first `i` values, so `prefix[0] = 0` (nothing summed yet).

| i | `values[i - 1]` added | `prefix[i]` |
| :- | :-------------------- | :---------- |
| 0 | — | 0 |
| 1 | 3 | 3 |
| 2 | 1 | 4 |
| 3 | 4 | 8 |
| 4 | 1 | 9 |
| 5 | 5 | 14 |

Sum of indexes `1..3` (values `1, 4, 1`) = `prefix[4] - prefix[1]` = `9 - 3` = `6`. In general, sum of `left..right` = `prefix[right + 1] - prefix[left]`.

### The template

```ts
function buildPrefix(values: readonly number[]): number[] {
  const prefix = new Array<number>(values.length + 1).fill(0); // slot 0 = empty prefix
  for (let i = 0; i < values.length; i++) prefix[i + 1] = prefix[i] + values[i];
  return prefix;
}

function rangeSum(prefix: readonly number[], left: number, right: number): number {
  return prefix[right + 1] - prefix[left]; // inclusive left..right
}
```

**Time:** `O(n)` to build, `O(1)` per query · **Space:** `O(n)` for the prefix array.

The leading `0` means a range starting at index `0` needs no special case.

### Interview classic: Subarray Sum Equals K

Count the contiguous subarrays whose sum is exactly `k`. Values can be negative.
Example: `[1, 1, 1]`, `k = 2` → `2` · `[1, 2, 3]`, `k = 3` → `2` (`[1, 2]` and `[3]`).

- **Brute force:** try every start and extend to every end — `O(n²)`.
- **Key insight:** a subarray ending here sums to `k` when `runningSum - earlierPrefix = k`, that is when `earlierPrefix = runningSum - k`. Keep a `Map` from each prefix sum to how many times it has appeared, and add that count.

```ts
function subarraySum(nums: readonly number[], k: number): number {
  const seenPrefix = new Map<number, number>([[0, 1]]); // the empty prefix, sum 0
  let runningSum = 0;
  let count = 0;

  for (const value of nums) {
    runningSum += value;
    count += seenPrefix.get(runningSum - k) ?? 0; // earlier starts that make sum k
    seenPrefix.set(runningSum, (seenPrefix.get(runningSum) ?? 0) + 1);
  }
  return count;
}
```

This is the template with the prefix array replaced by a `Map` of counts, so the "find an earlier prefix" step is `O(1)`. **Time:** `O(n)` · **Space:** `O(n)`.

### Variation: Product of Array Except Self

For each index, return the product of every other value, without division.
Example: `[1, 2, 3, 4]` → `[24, 12, 8, 6]`.
Use a prefix product from the left and a suffix product from the right, multiplied together.

```ts
function productExceptSelf(nums: readonly number[]): number[] {
  const result = new Array<number>(nums.length).fill(1);
  let leftProduct = 1;
  for (let i = 0; i < nums.length; i++) {
    result[i] = leftProduct; // product of everything left of i
    leftProduct *= nums[i];
  }
  let rightProduct = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    result[i] *= rightProduct; // times everything right of i
    rightProduct *= nums[i];
  }
  return result;
}
```

## W — Why It Matters

- Subarray Sum Equals K is a top interview question because sliding windows fail on negative numbers, and prefix sums do not.
- "Prefix plus hash map" also solves "subarray sum divisible by k" and "longest subarray with equal 0s and 1s."
- Real systems use prefix totals for fast range reports (sales between two dates) and 2D versions for image regions.
- Interviewers listen for the off-by-one handling: why the array has `n + 1` slots.

## I — Interview Q&A

### Q: Why seed the map with `[0, 1]`?

It stands for the empty prefix before index 0. Without it, a subarray that starts at index 0 and sums to `k` is never counted.

### Q: Why not use a sliding window for Subarray Sum Equals K?

A window assumes growing it raises the sum and shrinking lowers it. Negative numbers break that, so you cannot decide which side to move.

### Q: How would you answer range sums on a 2D grid?

Build `prefix[r + 1][c + 1]` as the sum of the rectangle from `(0, 0)` to `(r, c)`. Any rectangle is then four lookups added and subtracted.

## C — Common Pitfalls + Fix

### ❌ Off-by-one in the range formula

```ts
const prefix = [0, 3, 4, 8, 9, 14];
const wrong = prefix[3] - prefix[1]; // ❌ 5: misses index 3
const right = prefix[4] - prefix[1]; // ✅ 6: indexes 1..3
```

### ❌ Updating the map before counting

If you `set` the current sum first, then `k = 0` counts the empty subarray at the current index. Count first, then record.

### ❌ Forgetting the leading `0`

Without `prefix[0] = 0`, ranges starting at index `0` need a special case, and that is where bugs hide.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Find Pivot Index:** return the leftmost index where the sum of values strictly to its left equals the sum strictly to its right. Return `-1` if none exists.

`[1, 7, 3, 6, 5, 6]` → `3` (left `1 + 7 + 3 = 11`, right `5 + 6 = 11`) · `[1, 2, 3]` → `-1`

<details><summary>Hint</summary>

Compute the total once. Walking left to right, `right sum = total - left sum - current value`.

</details>

### Solution

```ts
function pivotIndex(nums: readonly number[]): number {
  let total = 0;
  for (const value of nums) total += value;

  let leftSum = 0; // running prefix sum, without building an array
  for (let i = 0; i < nums.length; i++) {
    const rightSum = total - leftSum - nums[i];
    if (leftSum === rightSum) return i;
    leftSum += nums[i];
  }
  return -1;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. A single running prefix is enough, because each index only needs the sum to its left and the total.

**Right now:** Trace `subarraySum([1, 2, 3], 3)` and write the map contents after each value.
