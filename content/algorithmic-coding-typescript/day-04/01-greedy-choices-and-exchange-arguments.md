# Greedy Choices and Exchange Arguments

## T — TL;DR

A greedy algorithm is interview-ready only when you can exchange its first local choice into an optimal solution without making the remainder worse.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Greedy algorithms are for problems where one safe local decision can reduce the remaining problem. The goal is not to guess quickly; it is to prove that taking the choice now cannot damage the best possible future.

### Mental Model

Imagine choosing meetings for a room. A meeting that finishes earlier leaves more room for whatever comes next. Greedy says, "take the option that leaves the most future space," then repeat.

### First Trace

For intervals `[1, 4]`, `[2, 3]`, and `[3, 5]`, sort by finish time. Choose `[2, 3]` first because it finishes earliest. `[3, 5]` still fits when touching is allowed, so the count is `2`. Choosing `[1, 4]` first would block both later choices.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Determine whether you can reach the last index when each value gives the maximum jump length. This is **Jump Game**.

**Best interview-ready solution:**

1. **Recognize the greedy state:** only the farthest reachable index matters.
2. **Scan left to right:** if the current index is beyond farthest, the goal is unreachable.
3. **Extend reach:** update farthest with current index plus its jump length.
4. **Prove safety:** every index at or before farthest is reachable, so its jump can be considered.
5. **Complexity:** O(n) time and O(1) space.

**Code solution:**

```ts
// Pseudocode: track the farthest reachable index and fail only when the current index is beyond it.
function canJump(values: readonly number[]): boolean {
	let farthest = 0;
	for (let index = 0; index < values.length; index += 1) {
		if (index > farthest) return false;
		farthest = Math.max(farthest, index + values[index]);
	}
	return true;
}
```

For maximum non-overlapping intervals, choose the interval with the earliest finish. In any optimal schedule, replace its first interval with this one; it finishes no later, so every later chosen interval still fits.

```ts
type Interval = readonly [start: number, end: number];
```

Greedy needs a safe local choice, an exchange or cut argument, a smaller remaining problem, and explicit endpoint semantics. If a choice can block a better combination, construct a counterexample and consider DP instead.

## W — Why It Matters

Greedy solutions are often faster and simpler than DP, but interviews use them to test proof quality. Scheduling, resource allocation, compression, and graph algorithms all rely on defensible local choices.

## I — Interview Q&A

### What is an exchange argument?

It transforms an optimal solution that does not use the greedy choice into one that does, while preserving feasibility and objective value.

### Why earliest finish rather than earliest start?

Earliest finish leaves the largest possible remainder for future meetings, while earliest start can consume too much space.

### How do you know greedy fails?

Find a small input where the local choice produces a worse total than another combination, then identify the missing state or tradeoff.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Calling intuition a proof. **Fix:** write the exchange step explicitly.
- **Pitfall:** Using the right rule for the wrong objective. **Fix:** distinguish count, total value, and feasibility.
- **Pitfall:** Ignoring touching endpoints. **Fix:** define whether `start >= finish` is allowed.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return the maximum number of non-overlapping intervals. Intervals that touch at an endpoint are allowed.

### Solution

```ts
function maximumNonOverlapping(intervals: readonly (readonly [number, number])[]): number {
	const ordered = [...intervals].sort((left, right) => left[1] - right[1]);
	let count = 0;
	let finish = -Infinity;

	for (const [start, end] of ordered) {
		if (start >= finish) {
			count += 1;
			finish = end;
		}
	}
	return count;
}
```

Sorting costs $O(n log n); the scan is $O(n)$ and the copied array uses $O(n)$ space.

**Right now:** Explain in one sentence why replacing an optimal first interval with the earliest-finishing interval is safe.
