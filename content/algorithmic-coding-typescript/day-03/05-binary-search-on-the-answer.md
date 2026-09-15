# Binary Search on the Answer

## T — TL;DR

If a numeric answer has a monotone feasibility predicate, binary-search the answer range instead of trying every value.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Sometimes the answer is a number such as capacity or speed, not an array index. If you can quickly ask "does this guess work?" and all larger guesses behave the same way, binary search can find the smallest working guess.

### Mental Model

Think of a volume dial with a red zone and a green zone. You do not test every setting. Try the middle: if it works, move toward smaller settings; if it fails, move toward larger ones. The boundary between fail and work is the answer.

### First Trace

For weights `[3, 2, 4]` shipped in two days, capacity `4` fails because the ordered packages need three days. Capacity `5` works: `3 + 2` on day one and `4` on day two. Binary search keeps narrowing until it finds `5`.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the minimum integer eating speed that finishes all banana piles within a deadline. This is **Koko Eating Bananas**.

**Best interview-ready solution:**

1. **Recognize the answer space:** the unknown is a speed, not an array index.
2. **Build the predicate:** calculate total hours at a candidate speed and ask whether it fits the deadline.
3. **Prove monotonicity:** if speed s works, every speed larger than s also works.
4. **Binary-search the boundary:** keep the smallest feasible speed.
5. **Complexity:** O(n log m) time for n piles and maximum pile m, with O(1) extra space.

**Code solution:**

```ts
// Pseudocode: test a candidate speed, keep lower speeds when feasible, otherwise raise the lower bound.
function minEatingSpeed(piles: readonly number[], hours: number): number {
	let low = 1;
	let high = Math.max(...piles);
	while (low < high) {
		const speed = low + Math.floor((high - low) / 2);
		let required = 0;
		for (const pile of piles) required += Math.ceil(pile / speed);
		if (required <= hours) high = speed;
		else low = speed + 1;
	}
	return low;
}
```

For shipping packages, `canShip(capacity)` returns whether all weights fit within `days`. If capacity `c` works, every larger capacity works too. That true/false boundary is what binary search needs.

- Lower bound: the smallest value that could work, often the largest single item.
- Upper bound: a value guaranteed to work, often the total sum.
- Each predicate evaluation must be correct and affordable.

## W — Why It Matters

This pattern appears in throughput, load balancing, resource allocation, and scheduling interviews. It turns an optimization question into a decision question that is easier to prove.

## I — Interview Q&A

### How do you prove the predicate is monotone?

Show that a feasible candidate remains feasible when increased, or that an infeasible candidate remains infeasible when decreased.

### How do you choose bounds?

Use the tightest obvious impossible lower bound and a simple guaranteed-feasible upper bound. Test both against edge cases.

### What is the complexity?

$O(log R)$ predicate calls, where `R` is the answer range, multiplied by the predicate cost.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Binary-searching a non-monotone property. **Fix:** construct a counterexample before coding.
- **Pitfall:** Choosing bounds that exclude the answer. **Fix:** test the smallest and largest valid cases.
- **Pitfall:** Hiding an $O(n)$ predicate inside an excessive search range. **Fix:** state total complexity as a product.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Given package weights in order and a number of days, return the minimum daily capacity that ships them in order.

### Solution

```ts
function minimumCapacity(weights: readonly number[], days: number): number {
	let low = Math.max(...weights);
	let high = weights.reduce((total, weight) => total + weight, 0);

	const canShip = (capacity: number): boolean => {
		let usedDays = 1;
		let load = 0;
		for (const weight of weights) {
			if (load + weight > capacity) {
				usedDays += 1;
				load = 0;
			}
			load += weight;
		}
		return usedDays <= days;
	};

	while (low < high) {
		const middle = low + Math.floor((high - low) / 2);
		if (canShip(middle)) high = middle;
		else low = middle + 1;
	}
	return low;
}
```

The complexity is $O(n log R)$ and the extra space is $O(1)$.

**Right now:** Write the lower and upper bounds for weights `[3, 2, 4]` before evaluating the predicate.
