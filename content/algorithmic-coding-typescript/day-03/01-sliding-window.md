# Sliding Window

## T — TL;DR

Maintain a contiguous range by adding the right item and removing the left item instead of recomputing every range from scratch.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Sliding windows solve problems about a contiguous part of an array or string. The slow approach rebuilds every candidate range; the window reuses almost all of the previous range when it moves one step.

### Mental Model

Picture a physical frame sliding across a row of values. When the frame moves right, one value leaves through the left edge and one value enters through the right edge. Keep only the information about what is currently inside the frame.

### First Trace

For `[2, 1, 5, 1]` with window size `2`, start with `2 + 1 = 3`. Move the frame: remove `2`, add `5`, giving `4`. Move again: remove `1`, add `1`, giving `6`. The largest window sum is found with one add and one remove per shift.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the length of the longest substring without repeating characters. This is **Longest Substring Without Repeating Characters**.

**Best interview-ready solution:**

1. **Recognize the window:** the answer is a contiguous range whose characters must stay unique.
2. **Choose the state:** keep a left boundary and the most recent index of each character.
3. **Repair duplicates:** when a character repeats, move left to one position after its previous index, never backward.
4. **Measure after repair:** every window considered is valid, so update the maximum length.
5. **Complexity:** O(n) expected time and O(k) space for distinct characters.

**Code solution:**

```ts
// Pseudocode: expand right, and when a duplicate is inside the window, move left past its last index.
function longestUniqueSubstring(text: string): number {
	const lastSeen = new Map<string, number>();
	let left = 0;
	let best = 0;
	for (let right = 0; right < text.length; right += 1) {
		const previous = lastSeen.get(text[right]);
		if (previous !== undefined && previous >= left) left = previous + 1;
		best = Math.max(best, right - left + 1);
		lastSeen.set(text[right], right);
	}
	return best;
}
```

- **Fixed window:** add the incoming value and subtract the value leaving.
- **Variable window:** expand right, then shrink left while a monotone condition is invalid.
- Keep counts or a running sum as the window state.
- A positive-only sum condition is monotone; arbitrary negative values can break that assumption.

The window invariant is that the stored state describes exactly the current `[left, right]` range.

## W — Why It Matters

Sliding windows appear in rate limiting, telemetry, string search, and the longest/shortest contiguous-subarray family of interviews. It is often the difference between $O(nk)$ and $O(n)$.

## I — Interview Q&A

### When can you shrink greedily from the left?

When removing left items can only improve the invalid condition and the window's validity is monotone.

### Why does a fixed window subtract one value?

Every shift removes exactly the item at `index - size`, so the aggregate can be updated in constant time.

### What if values can be negative?

A running sum may move in either direction, so use prefix sums, a deque, or another method instead of assuming variable-window monotonicity.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Recording an invalid variable window. **Fix:** shrink until the invariant is restored.
- **Pitfall:** Forgetting that `size` may be zero or too large. **Fix:** define and test invalid sizes.
- **Pitfall:** Using a positive-only proof with negative input. **Fix:** inspect the constraints first.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the maximum sum of any window of exactly `size` values, or `null` for an invalid size.

### Solution

```ts
function maxWindowSum(values: readonly number[], size: number): number | null {
	if (size <= 0 || size > values.length) return null;
	let window = 0;
	for (let index = 0; index < size; index += 1) window += values[index];

	let best = window;
	for (let index = size; index < values.length; index += 1) {
		window += values[index] - values[index - size];
		best = Math.max(best, window);
	}
	return best;
}
```

The algorithm is $O(n)$ time and $O(1)$ space.

**Right now:** Trace one window shift by writing the value added and the value removed.
