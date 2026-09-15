# Monotonic Stacks

## T — TL;DR

Keep unresolved candidates in sorted stack order and pop every candidate that a new value permanently resolves.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A monotonic stack solves "next greater" or "next smaller" questions by remembering items that are still waiting for a decisive value to appear later.

### Mental Model

Imagine people waiting in a line to see a taller person. A new tall person walks in from the right and immediately answers every shorter person at the back of the line. People already answered leave forever; that is why the total work stays linear.

### First Trace

For `[2, 1, 3]`, push indices `0` and `1`. When `3` arrives, it is greater than the value at index `1`, so answer `3` for `1`; it is also greater than index `0`, so answer `3` for `2`. Then push index `2`.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** For each day, return how many days must pass before a warmer temperature. This is **Daily Temperatures**.

**Best interview-ready solution:**

1. **Recognize unresolved candidates:** each earlier day waits for the first greater temperature.
2. **Store indices:** keep a decreasing stack of temperatures whose answer is unknown.
3. **Resolve from the top:** while the current temperature is warmer, pop an index and record the distance.
4. **Prove amortization:** each index is pushed once and popped once.
5. **Complexity:** O(n) time and O(n) space.

**Code solution:**

```ts
// Pseudocode: keep unresolved cooler days and pop them when a warmer day arrives.
function dailyTemperatures(temperatures: readonly number[]): number[] {
	const result = new Array<number>(temperatures.length).fill(0);
	const stack: number[] = [];
	for (let index = 0; index < temperatures.length; index += 1) {
		while (stack.length > 0 && temperatures[stack[stack.length - 1]] < temperatures[index]) {
			const previous = stack.pop() as number;
			result[previous] = index - previous;
		}
		stack.push(index);
	}
	return result;
}
```

For next greater values, store indices whose answer is unknown. Values at those indices are decreasing from bottom to top; a new larger value resolves the smaller top entries.

```ts
function nextGreater(values: readonly number[]): number[] {
	const result = new Array<number>(values.length).fill(-1);
	const stack: number[] = [];
	for (let index = 0; index < values.length; index += 1) {
		while (stack.length > 0 && values[stack[stack.length - 1]] < values[index]) {
			result[stack.pop() as number] = values[index];
		}
		stack.push(index);
	}
	return result;
}
```

Each index is pushed and popped at most once, so the total work is $O(n)$ even though a loop contains a `while` loop.

## W — Why It Matters

Monotonic stacks solve next greater/smaller, histogram area, temperatures, and visibility problems. They show how amortized analysis removes repeated work from nested-looking code.

## I — Interview Q&A

### Why store indices instead of values?

Indices let you write answers at the correct position and calculate distances or widths.

### Why is the total linear?

Every item enters once and can leave only once; pops cannot repeat for the same index.

### How do equal values change the stack?

Choose `<` versus `<=` according to whether equal values should resolve or remain separate candidates.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Choosing stack direction from memory. **Fix:** write what each entry is waiting for.
- **Pitfall:** Returning values instead of positions. **Fix:** store indices when output or distance depends on location.
- **Pitfall:** Claiming nested loops are quadratic. **Fix:** count pushes and pops amortized.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

For each value, return the next greater value to its right, or `-1` if none exists.

### Solution

```ts
function nextGreater(values: readonly number[]): number[] {
	const result = new Array<number>(values.length).fill(-1);
	const stack: number[] = [];
	for (let index = 0; index < values.length; index += 1) {
		while (stack.length > 0 && values[stack[stack.length - 1]] < values[index]) {
			result[stack.pop() as number] = values[index];
		}
		stack.push(index);
	}
	return result;
}
```

**Right now:** For `[2, 1, 3]`, identify which index is popped when `3` arrives.
