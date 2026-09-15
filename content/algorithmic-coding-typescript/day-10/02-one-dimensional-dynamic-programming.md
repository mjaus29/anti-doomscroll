# One-Dimensional Dynamic Programming

## T — TL;DR

Build a one-dimensional DP from a prefix or amount, then compress it only after identifying every prior state the transition reads.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

One-dimensional DP handles a sequence where the answer at one position depends on a few earlier positions. It is useful when each new item creates a small choice such as take/skip, pay/wait, or use/not use.

### Mental Model

Imagine two calculators standing behind you: one remembers the answer two positions back and one remembers the previous answer. When the next item arrives, combine those answers, then shift the calculators forward.

### First Trace

For maximum non-adjacent sum `[2, 7, 9]`, after `2` the best states are skip `0`, take `2`. After `7`, choose `7`. After `9`, taking it adds the old skip value `2`, giving `11`; skipping it keeps `9`, so the answer is `11`.

## K — Key Concepts

For climbing costs, `dp[i]` is the minimum cost to reach position `i`. If the transition reads only `i - 1` and `i - 2`, retain two variables and update them in dependency order.

```ts
function minCostToClimb(cost: readonly number[]): number {
  if (cost.length === 0) return 0;
  let twoBack = 0;
  let oneBack = 0;
  for (const value of cost) {
    const current = value + Math.min(oneBack, twoBack);
    twoBack = oneBack;
    oneBack = current;
  }
  return Math.min(oneBack, twoBack);
}
```

Counting uses addition, minimization uses `Math.min`, and maximization uses `Math.max`; impossible sentinels must fit the objective.

## W — Why It Matters

1D DP appears in pricing, resource budgets, decoding, and sequence optimization. Memory compression is a practical optimization that interviewers expect you to justify, not guess.

## I — Interview Q&A

### How do you know compression is safe?

Draw the dependency arrows and keep every previous value read by the current transition.

### Why does update order matter?

Overwriting a previous state before using it changes the recurrence and may reuse the current item incorrectly.

### What should an impossible state contain?

A sentinel that cannot be selected as a valid minimum, maximum, or count; guard arithmetic when necessary.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Compressing before defining full `dp`. **Fix:** write the table recurrence first.
- **Pitfall:** Updating variables in place blindly. **Fix:** save the current value and shift states afterward.
- **Pitfall:** Returning a sentinel for an impossible input. **Fix:** translate it to the contract's result.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the maximum sum of values with no adjacent values selected.

### Solution

```ts
function maxNonAdjacent(values: readonly number[]): number {
  let skip = 0;
  let take = 0;
  for (const value of values) {
    const nextSkip = Math.max(skip, take);
    const nextTake = skip + value;
    skip = nextSkip;
    take = nextTake;
  }
  return Math.max(skip, take);
}
```

`skip` and `take` are the two states for the processed prefix; time is $O(n)$ and space is $O(1)$.

**Right now:** Circle the exact prior states your next DP transition reads.
