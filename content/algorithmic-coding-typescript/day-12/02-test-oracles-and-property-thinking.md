# Test Oracles and Property Thinking

## T — TL;DR

Use a simple reference implementation or a structural property to tell whether an optimized algorithm is correct.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

An oracle gives you an independent way to decide whether an optimized algorithm is right. This matters when the optimized code is too complicated to inspect line by line.

### Mental Model

Think of a referee checking a fast runner. The runner uses the optimized route; the referee uses a slower but obvious route on a small track. If their results differ, the fast route made a wrong turn.

### First Trace

For a small array, compare a brute-force maximum-subarray scan with Kadane's algorithm. On `[-2, 3, -1]`, both should return `3`. If they disagree on a generated case, keep that exact case and shrink it until the mistaken assumption is obvious.

## K — Key Concepts

- A brute-force oracle can be slow but obvious on small inputs.
- Differential testing compares optimized and reference outputs.
- A property checks something every valid output must satisfy.
- Keep a random seed and shrink failures to the smallest counterexample.

Examples: a sorted result preserves multiplicities, a topological order puts every edge forward, and a shortest-path distance satisfies every edge relaxation inequality.

## W — Why It Matters

Algorithm bugs often survive normal examples because the implementation and tests share the same assumption. Independent oracles catch those bugs quickly in interviews and production regression suites.

## I — Interview Q&A

### Why use a slow reference?

Small generated inputs make simplicity more valuable than speed; an independent implementation gives the optimized version something trustworthy to compare against.

### What makes a good property?

It follows from the problem contract and does not merely repeat the implementation's steps.

### What do you do after a random failure?

Save the seed, shrink the input, then identify which invariant or boundary was violated.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Generating only happy-path data. **Fix:** include empty, duplicate, boundary, and degenerate inputs.
- **Pitfall:** Sharing helper logic between oracle and solution. **Fix:** keep the oracle structurally independent.
- **Pitfall:** Losing the failing random case. **Fix:** record the seed and exact input.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Write a brute-force oracle for maximum subarray sum and use it to check an optimized function on a small input.

### Solution

```ts
function bruteMaxSubarray(values: readonly number[]): number {
	let best = -Infinity;
	for (let start = 0; start < values.length; start += 1) {
		let total = 0;
		for (let end = start; end < values.length; end += 1) {
			total += values[end];
			best = Math.max(best, total);
		}
	}
	return best;
}
```

The oracle is $O(n^2)$ and intentionally simple; compare it with Kadane's $O(n)$ solution on small arrays.

**Right now:** Add one property to a test for the algorithm you studied today.
