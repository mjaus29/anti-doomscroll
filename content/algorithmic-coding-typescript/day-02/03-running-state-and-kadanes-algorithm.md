# Running State and Kadane's Algorithm

## T — TL;DR

Walk the array once and carry a small summary of everything seen so far, such as "lowest price so far" or "best sum ending here." Each new item updates the summary in `O(1)`, so you never look back at earlier items.

**Reach for it when:**

- The answer depends on the best choice **before** the current position (buy before you sell).
- You need the best **contiguous** subarray (a run of neighbouring items) by sum or product.
- A brute force would try every start and end pair.

## K — Key Concepts

### Picture it

On a road trip you do not remember every gas price you passed. You remember just one number: the cheapest station so far. At each new station you ask, "Is this cheaper?" and "How much would I save versus the cheapest one?"

### Walk through it

Best profit from one buy and one later sell, `prices = [7, 1, 5, 3, 6, 4]`:

| Day | price | `minPrice` so far | profit if sold today | `best` |
| :-- | :---- | :---------------- | :------------------- | :----- |
| 0 | 7 | 7 | 0 | 0 |
| 1 | 1 | 1 | 0 | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | 5 |
| 5 | 4 | 1 | 3 | 5 |

The running state is two numbers: `minPrice` and `best`. The invariant (a fact that stays true every loop): `minPrice` is the lowest price on any day up to today.

### The template

**Best Time to Buy and Sell Stock:**

```ts
function maxProfit(prices: readonly number[]): number {
  let minPrice = Infinity;
  let best = 0; // not trading is allowed, so profit is never below 0

  for (const price of prices) {
    minPrice = Math.min(minPrice, price);     // best day to have bought, up to today
    best = Math.max(best, price - minPrice);  // sell today against that day
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — one pass with two variables.

### Interview classic: Maximum Subarray

Return the largest sum of any non-empty contiguous subarray.
Example: `[-2, 1, -3, 4, -1, 2, 1, -5, 4]` → `6` (the subarray `[4, -1, 2, 1]`).

- **Brute force:** try every start and end, summing as you go — `O(n²)`.
- **Key insight (Kadane's algorithm):** keep `current`, the best sum of a subarray that **ends at this index**. At each value, either extend the previous run or start fresh here. If the previous run's sum is negative, it only drags you down, so start fresh.

```ts
function maxSubArray(nums: readonly number[]): number {
  let current = nums[0]; // best sum ending at the current index
  let best = nums[0];    // best sum anywhere so far

  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]); // start fresh or extend
    best = Math.max(best, current);
  }
  return best;
}
```

Same template shape: one pass, a small running state (`current`, `best`), and an `O(1)` update per item. Starting from `nums[0]` (not `0`) keeps the answer correct when every number is negative.

## W — Why It Matters

- Stock and Maximum Subarray are two of the most-asked array questions at every level.
- "What do I need to remember about the past?" is the question behind most dynamic programming (Day 11). Kadane is the simplest DP.
- Interviewers listen for the meaning of `current`: "best sum **ending here**," not "best sum so far."
- Real dashboards use the same idea for running minimums, maximums, and streaks.

## I — Interview Q&A

### Q: How do you return the subarray itself, not just the sum?

Track a `start` index that resets when you "start fresh," and save `start` and `i` whenever `best` improves.

### Q: Why is it safe to throw away a negative running sum?

Any subarray that continues from it would be larger without that negative prefix. So the best subarray ending at the next index never includes it.

### Q: What if you may buy and sell many times?

Add every positive day-to-day rise: `sum of max(0, prices[i] - prices[i - 1])`. That is Best Time to Buy and Sell Stock II.

## C — Common Pitfalls + Fix

### ❌ Starting Kadane at `0`

```ts
const nums = [-3, -1];
const wrongStart = 0;       // ❌ answer becomes 0, but no subarray sums to 0
const rightStart = nums[0]; // ✅ start at the first value; the answer is -1
```

### ❌ Using the overall min and max for the stock problem

`max(prices) - min(prices)` ignores order. For `[7, 1, 5, 3, 6, 4]` it gives `6`, but the real answer is `5`: the `7` comes before the `1`, and you cannot sell before you buy. The running minimum only looks backwards, which enforces "buy first."

### ❌ Treating "subarray" like "subsequence"

A *subarray* is contiguous (neighbours only). A *subsequence* may skip items. Kadane solves only the contiguous version.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Maximum Product Subarray:** return the largest product of any non-empty contiguous subarray.

`[2, 3, -2, 4]` → `6` · `[-2, 3, -4]` → `24`

<details><summary>Hint</summary>

A negative number turns the smallest product into the largest. Track both the max and the min product ending at each index.

</details>

### Solution

```ts
function maxProduct(nums: readonly number[]): number {
  let maxEnding = nums[0];
  let minEnding = nums[0];
  let best = nums[0];

  for (let i = 1; i < nums.length; i++) {
    const value = nums[i];
    const candidates = [value, maxEnding * value, minEnding * value];
    maxEnding = Math.max(...candidates); // a negative × the min can become the max
    minEnding = Math.min(...candidates);
    best = Math.max(best, maxEnding);
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. It is Kadane with two running values instead of one, because multiplying by a negative swaps which one is biggest.

**Right now:** Trace `maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])` in a table with columns `value`, `current`, `best`.
