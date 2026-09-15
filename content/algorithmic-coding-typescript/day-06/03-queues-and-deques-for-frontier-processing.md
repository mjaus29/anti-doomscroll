# Queues and Deques for Frontier Processing

## T — TL;DR

Use FIFO order for ordinary breadth-first work, but implement a large TypeScript queue with a head index rather than repeated `shift()` calls.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Queues preserve arrival order: the oldest waiting item is processed first. This is exactly the behavior needed for BFS layers and fair work processing.

### Mental Model

Picture a checkout line. New customers join at the back, and the next customer leaves from the front. In an array, a head index acts like a movable front marker so you do not physically shift every remaining customer.

### First Trace

For queue `[A, B, C]`, `head = 0` reads `A`, then becomes `1`; it reads `B`, then `C`. The array still contains the old values, but the head tells you which part is active. A deque adds the ability to insert or remove from both ends.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return the maximum value in every window of size k. This is **Sliding Window Maximum**.

**Best interview-ready solution:**

1. **Recognize the window:** each outgoing and incoming value changes the maximum.
2. **Use a decreasing deque of indices:** the front is always the largest candidate.
3. **Remove expired indices:** discard indices outside the current window.
4. **Remove dominated values:** from the back, discard values smaller than the incoming value because they can never become maximum before it expires.
5. **Complexity:** O(n) time and O(k) space; each index enters and leaves once.

**Code solution:**

```ts
// Pseudocode: keep decreasing candidate indices, remove expired ones, and read the front maximum.
function maxSlidingWindow(values: readonly number[], size: number): number[] {
	if (size <= 0 || size > values.length) return [];
	const deque: number[] = [];
	const result: number[] = [];
	for (let index = 0; index < values.length; index += 1) {
		while (deque.length > 0 && deque[0] <= index - size) deque.shift();
		while (deque.length > 0 && values[deque[deque.length - 1]] <= values[index]) deque.pop();
		deque.push(index);
		if (index >= size - 1) result.push(values[deque[0]]);
	}
	return result;
}
```

```ts
function drain(values: readonly number[]): number[] {
	const queue = [...values];
	const output: number[] = [];
	let head = 0;
	while (head < queue.length) output.push(queue[head++]);
	return output;
}
```

- A queue processes the oldest frontier item first.
- A deque supports both ends and powers 0-1 BFS and window maxima.
- Capture `queue.length` before a level loop when processing BFS layers.
- Use a heap when the next item is priority-based rather than FIFO.

## W — Why It Matters

Queue mechanics can turn a correct BFS into a slow solution. The same frontier idea powers task pipelines, graph layers, streaming work, and shortest paths in unweighted graphs.

## I — Interview Q&A

### Why is `shift()` risky?

Removing the first array item can move every remaining item, making repeated removal quadratic.

### How do you process one BFS level?

Save the current queue length and process exactly that many items before the next level.

### When do you need a deque?

When items can be added or removed from both ends, such as 0-1 BFS or maintaining a monotone window.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Marking graph nodes only when dequeued. **Fix:** mark when enqueued to avoid duplicates.
- **Pitfall:** Using `shift()` at scale. **Fix:** use a head index or a real deque.
- **Pitfall:** Mixing level and distance conventions. **Fix:** choose one and keep it in the queue invariant.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Process values FIFO and return them in order without using `shift()`.

### Solution

```ts
function processQueue(values: readonly number[]): number[] {
	const queue = [...values];
	const output: number[] = [];
	let head = 0;
	while (head < queue.length) {
		output.push(queue[head]);
		head += 1;
	}
	return output;
}
```

**Right now:** Replace one `shift()` in a BFS you know with a head index.
