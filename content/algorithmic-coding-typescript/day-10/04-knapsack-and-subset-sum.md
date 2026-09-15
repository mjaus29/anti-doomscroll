# Knapsack and Subset Sum

## T — TL;DR

Knapsack DP tracks capacity and item choices; descending capacity means each item is used once, while ascending capacity permits reuse.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Knapsack problems ask you to choose items under a limited budget such as weight, time, or memory. The hard part is remembering which items have already been considered and whether an item may be reused.

### Mental Model

Imagine packing a backpack. For each item, ask: leave it out, or put it in if it fits? The capacity index is the remaining room. In a 0/1 problem, the same item cannot magically appear twice during one pass.

### First Trace

With capacity `5`, item weights `2` and `3`, process the first item and record its value at capacities `2` through `5`. Process the second item from capacity `5` down to `3`; descending order ensures its newly written value is not immediately reused.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Determine whether an array can be split into two subsets with equal sum. This is **Partition Equal Subset Sum**.

**Best interview-ready solution:**

1. **Reject odd total sums:** an equal split needs target equal to total divided by two.
2. **Recognize 0/1 subset sum:** each number may be used once to reach target.
3. **Use a boolean DP over sums.**
4. **Iterate sums downward for each number so one number cannot be reused in the same iteration.**
5. **Complexity:** O(n times target) time and O(target) space.

**Code solution:**

```ts
// Pseudocode: target is half the total; update reachable sums backward so each item is used once.
function canPartition(values: readonly number[]): boolean {
	const total = values.reduce((sum, value) => sum + value, 0);
	if (total % 2 !== 0) return false;
	const target = total / 2;
	const possible = new Array<boolean>(target + 1).fill(false);
	possible[0] = true;
	for (const value of values) {
		for (let sum = target; sum >= value; sum -= 1) {
			possible[sum] ||= possible[sum - value];
		}
	}
	return possible[target];
}
```

For 0/1 knapsack, `dp[capacity]` is the best value using processed items within that capacity.

```ts
function bestValue(
	weights: readonly number[],
	values: readonly number[],
	capacity: number
): number {
	const dp = new Array<number>(capacity + 1).fill(0);
	for (let item = 0; item < weights.length; item += 1) {
		for (let remaining = capacity; remaining >= weights[item]; remaining -= 1) {
			dp[remaining] = Math.max(dp[remaining], dp[remaining - weights[item]] + values[item]);
		}
	}
	return dp[capacity];
}
```

Descending capacity prevents the current item from being reused in the same item iteration. For unbounded reuse, go upward. Feasibility, minimum, maximum, and count variants need different initialization.

## W — Why It Matters

Capacity DP models budgets, packing, pricing, and resource selection. Loop direction is a compact but highly testable statement of the problem's reuse rule.

## I — Interview Q&A

### Why does descending capacity enforce 0/1 use?

Each update reads a lower capacity from the previous item layer before the current item can write it during this iteration.

### What changes for unlimited reuse?

Iterate capacity upward so an updated state can be used again by the same item.

### How do you represent impossible states?

Use a sentinel such as `-Infinity` for maximization or `Infinity` for minimization, and guard arithmetic.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using ascending capacity for 0/1 knapsack. **Fix:** reverse the inner loop.
- **Pitfall:** Confusing value and weight. **Fix:** name variables by their role.
- **Pitfall:** Returning zero for an impossible target when zero is valid. **Fix:** use an explicit sentinel or result type.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return the maximum value of items that fit in capacity, using each item at most once.

### Solution

```ts
function bestValue(
	weights: readonly number[],
	values: readonly number[],
	capacity: number
): number {
	const dp = new Array<number>(capacity + 1).fill(0);
	for (let item = 0; item < weights.length; item += 1) {
		for (let remaining = capacity; remaining >= weights[item]; remaining -= 1) {
			dp[remaining] = Math.max(dp[remaining], dp[remaining - weights[item]] + values[item]);
		}
	}
	return dp[capacity];
}
```

**Right now:** Change the inner loop direction on paper and state whether it allows item reuse.
