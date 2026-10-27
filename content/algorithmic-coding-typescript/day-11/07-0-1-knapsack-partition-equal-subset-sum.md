# 0/1 Knapsack: Partition Equal Subset Sum

## T — TL;DR

In a *0/1 knapsack* problem each item is either taken **once** (1) or not at all (0), and the items must fit a limit such as a weight or a target sum. The state is "using the first `i` items, with budget `w`", and each item is a take-or-skip choice. A 1D table works too, if you loop the budget **backwards**.

**Reach for it when:**

- You pick a **subset** of items, each used at most once.
- There is a budget or exact target: capacity, sum, count.
- `n × target` is small enough (roughly ≤ 10⁷ cells).

## K — Key Concepts

### Picture it

You pack a bag that holds 4 kg. For each item you ask: "Is my best bag **without** this item better, or my best bag with 'this item's weight less room' **plus** this item?" You write the answer for every bag size from 0 to 4, one item at a time.

### The four questions (classic knapsack)

- **State:** `best[i][w]` = the most value using only the first `i` items with total weight at most `w`.
- **Transition:** skip item `i - 1` → `best[i - 1][w]`; take it (if it fits) → `best[i - 1][w - weight] + value`. Keep the max.
- **Base case:** `best[0][w] = 0` (no items, no value).
- **Answer:** `best[n][capacity]`.

### Walk through it

Weights `[1, 3, 4]`, values `[15, 20, 30]`, capacity `4`.

| items used | w=0 | w=1 | w=2 | w=3 | w=4 |
| :- | :- | :- | :- | :- | :- |
| none | 0 | 0 | 0 | 0 | 0 |
| + (1 kg, 15) | 0 | 15 | 15 | 15 | 15 |
| + (3 kg, 20) | 0 | 15 | 15 | 20 | **35** = 15 + 20 |
| + (4 kg, 30) | 0 | 15 | 15 | 20 | **35** (take: 0 + 30 = 30, skip wins) |

Answer `35` (the 1 kg and 3 kg items). Every take reads from the row **above**, which is what stops an item being used twice.

### The template

2D version, a direct copy of the four questions:

```ts
function knapsack(
  weights: readonly number[],
  values: readonly number[],
  capacity: number,
): number {
  const n = weights.length;
  const best: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(capacity + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    const weight = weights[i - 1];
    const value = values[i - 1];
    for (let w = 0; w <= capacity; w++) {
      const skip = best[i - 1][w];
      // take reads the row ABOVE, so this item is never counted twice
      const take = weight <= w ? best[i - 1][w - weight] + value : -Infinity;
      best[i][w] = Math.max(skip, take);
    }
  }
  return best[n][capacity];
}
```

1D version: keep one row and overwrite it. Loop `w` **from high to low**, so `best[w - weight]` still holds the value from the row above (before this item).

```ts
function knapsack1D(
  weights: readonly number[],
  values: readonly number[],
  capacity: number,
): number {
  const best: number[] = new Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) { // backwards: each item used once
      best[w] = Math.max(best[w], best[w - weights[i]] + values[i]);
    }
  }
  return best[capacity];
}
```

**Time:** `O(n × capacity)` · **Space:** `O(capacity)` for 1D — each item updates each budget once.

**Why backwards?** With weight `1` and a forward loop, `best[1]` takes the item, then `best[2]` reads the *new* `best[1]` and takes it again, and so on. Forward loops let an item repeat (that is the "unbounded" knapsack, like Coin Change). Backward loops read only old values.

### Interview classic: Partition Equal Subset Sum

Can the array be split into two groups with equal sums?
Example: `[1, 5, 11, 5]` → `true` (`[1, 5, 5]` and `[11]`). `[1, 2, 3, 5]` → `false`.

- **Brute force:** try every subset — `O(2ⁿ)`.
- **Key insight:** if the total is `T`, you need one group summing to `T / 2`; the rest is the other group. That is a knapsack with "can I hit exactly this sum?"

- **State:** `reachable[s]` = can some subset of the items seen so far sum to exactly `s`?
- **Transition:** `reachable[s] = reachable[s] || reachable[s - num]`, looping `s` backwards.
- **Base case:** `reachable[0] = true` (the empty subset). **Answer:** `reachable[T / 2]`.

```ts
function canPartition(nums: readonly number[]): boolean {
  const total = nums.reduce((sum, num) => sum + num, 0);
  if (total % 2 !== 0) return false; // odd total can never split evenly
  const half = total / 2;
  const reachable: boolean[] = new Array(half + 1).fill(false);
  reachable[0] = true;
  for (const num of nums) {
    for (let s = half; s >= num; s--) { // backwards: each number used once
      if (reachable[s - num]) reachable[s] = true;
    }
  }
  return reachable[half];
}
```

The 1D template with "value" replaced by "true/false" and capacity replaced by `half`.

## W — Why It Matters

- Knapsack is the model behind Partition, Target Sum, Last Stone Weight II, and Ones and Zeroes.
- "Why does the loop go backwards?" is one of the most common DP follow-up questions.
- Real uses: budget allocation, picking ads or cargo under a limit, and load balancing two machines.

## I — Interview Q&A

### Q: What is the difference between 0/1 and unbounded knapsack?

0/1 uses each item at most once (loop the budget backwards). Unbounded lets you reuse items (loop forwards). Coin Change is unbounded.

### Q: Is `O(n × capacity)` polynomial?

It depends on the **value** of the capacity, not just the input length, so it is called *pseudo-polynomial*. With a capacity of 10⁹ the table is too large and you need a different approach.

### Q: Can you exit early in Partition?

Yes. Return `true` as soon as `reachable[half]` becomes true, and return `false` right away if any number is larger than `half`.

## C — Common Pitfalls + Fix

### ❌ Looping forwards in the 1D version

```ts
for (let s = num; s <= half; s++)  // ❌ reuses num: [2] reaches 4
for (let s = half; s >= num; s--)  // ✅ each num counted once
```

### ❌ Skipping the odd-total check

`7 / 2 = 3.5`, and `new Array(4.5)` throws. Check `total % 2` first.

### ❌ Forgetting `reachable[0] = true`

Without it, no sum is ever reachable because every `true` grows from the empty subset.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Target Sum:** put a `+` or `-` in front of every number in `nums` (all non-negative). Count how many sign choices make the expression equal `target`.

`nums = [1, 1, 1, 1, 1]`, `target = 3` → `5`

<details><summary>Hint</summary>

Let `plus` be the sum of the `+` numbers. Then `plus - (total - plus) = target`, so `plus = (total + target) / 2`. Count the subsets with that sum.

</details>

### Solution

```ts
function findTargetSumWays(nums: readonly number[], target: number): number {
  const total = nums.reduce((sum, num) => sum + num, 0);
  if (Math.abs(target) > total || (total + target) % 2 !== 0) return 0;
  const goal = (total + target) / 2;
  const ways: number[] = new Array(goal + 1).fill(0); // ways[s] = subsets summing to s
  ways[0] = 1;
  for (const num of nums) {
    for (let s = goal; s >= num; s--) { // backwards: each number used once
      ways[s] += ways[s - num];
    }
  }
  return ways[goal];
}
```

**Time:** `O(n × goal)` · **Space:** `O(goal)`. Choosing signs is the same as choosing which numbers are `+`, so counting subsets with sum `goal` counts every valid expression.

**Right now:** Change the inner loop of `canPartition` to run forwards, then trace `[2]` with `half` forced to `4` and see `reachable[4]` turn `true`.
