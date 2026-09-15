# Complexity: Time, Space, and Growth

## T — TL;DR

Complexity predicts how an algorithm scales with input size, so count repeated work and extra memory before trusting a solution that works on a tiny example.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Complexity answers the question, "What happens when the input becomes much larger?" It helps you reject a solution that is fine for ten values but unusable for a million.

### Mental Model

Think of each algorithm as a worker processing packages. An $O(n)$ worker touches each package once. An $O(n^2)$ worker compares every package with every other package, so doubling the packages can make the work roughly four times larger.

### First Trace

1. With `n = 4`, a pair scan checks about `4 * 4 = 16` combinations.
2. With `n = 8`, it checks about `8 * 8 = 64`; the input doubled but work quadrupled.
3. A one-pass set solution grows from about `4` to `8` lookups instead.
4. Then count extra memory: the set grows with the input, so space is $O(n)$.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Given an array of numbers, return true if any value appears more than once. This is the classic **Contains Duplicate** problem.

**Best interview-ready solution:**

1. **Recognize the constraint:** a pairwise comparison is O(n^2); membership is the repeated question.
2. **Choose the structure:** keep a Set of values already seen.
3. **Scan once:** if the current value is already in the set, return true; otherwise add it.
4. **Prove it:** after each iteration, the set contains exactly the distinct values in the processed prefix.
5. **State the trade-off:** expected O(n) time and O(n) space; sorting can reduce auxiliary space only if mutation is allowed.

**Code solution:**

```ts
// Pseudocode: remember seen values and return as soon as a value repeats.
function containsDuplicate(values: readonly number[]): boolean {
	const seen = new Set<number>();
	for (const value of values) {
		if (seen.has(value)) return true;
		seen.add(value);
	}
	return false;
}
```

| Growth       | Typical pattern      |
| ------------ | -------------------- |
| $O(1)$       | direct lookup        |
| $O(log n)$   | halve a search range |
| $O(n)$       | one pass             |
| $O(n log n)$ | comparison sort      |
| $O(n^2)$     | every pair           |
| $O(2^n)$     | every subset         |

- Drop constants and lower-order terms.
- Count total pointer movement, not just visible nesting.
- State whether space means auxiliary space or includes the input.
- Sorting, allocations, and recursion depth count too.

In TypeScript, `Map` and `Set` operations are expected $O(1)$ average time, while `shift()` on an array is usually $O(n)$. A head index keeps queue removal constant time.

## W — Why It Matters

Interviewers use constraints to see whether you can reject an approach early. At work, growth determines whether a feature survives production data rather than only a demo dataset.

## I — Interview Q&A

### Are two nested loops always $O(n^2)$?

No. If two pointers each move forward at most `n` times, their total movement is $O(n)$.

### What is the space complexity of recursion?

Include the maximum call-stack depth and any memo or output storage. A depth of `n` is $O(n)$ auxiliary space.

### Is sorting always $O(n log n)$?

Comparison sorting is typically $O(n log n), but the exact guarantee depends on the implementation and input representation. Include its cost when it is part of the algorithm.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Timing one small input. **Fix:** analyze growth across the stated constraint range.
- **Pitfall:** Calling `shift()` constant time. **Fix:** use a head pointer or deque.
- **Pitfall:** Forgetting output or recursion memory. **Fix:** name every growing structure.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Classify the time and auxiliary space of a function that uses a `Set` to find a duplicate, then explain why sorting and scanning changes the answer.

### Solution

```ts
function hasDuplicate(values: readonly number[]): boolean {
	const seen = new Set<number>();
	for (const value of values) {
		if (seen.has(value)) return true;
		seen.add(value);
	}
	return false;
}
```

The set version is expected $O(n)$ time and $O(n)$ auxiliary space. Sorting a copy and scanning is $O(n log n)$ time and $O(n)$ space for the copy; sorting in place may reduce auxiliary space but mutates input.

**Right now:** Look at your last algorithm and write its time and auxiliary space in one line.
