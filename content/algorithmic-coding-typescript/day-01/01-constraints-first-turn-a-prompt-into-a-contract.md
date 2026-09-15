# Constraints First: Turn a Prompt into a Contract

## T — TL;DR

Read the input, output, and constraints as a contract before choosing an algorithm; the constraint on `n` is often the first algorithmic clue.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Before you write code, you need to know what the problem allows. The input size is not decoration: it tells you how much repeated work the program can afford. A two-item example may tolerate checking every pair, while one hundred thousand items may require one pass.

### Mental Model

Treat the prompt like a delivery contract. It tells you what arrives, what package you must return, and how much time and space the delivery service has. If the contract asks for original indices, returning values is the wrong package even if the values look right.

### First Trace

1. Read `values = [2, 7, 11, 15]` and `target = 9`.
2. Ask whether the answer is values or indices; here it is indices.
3. Notice the input could be empty and the answer could be missing.
4. Compare `n <= 10` with `n <= 100000`; the second constraint rules out checking every pair.

## K — Key Concepts

- **Input:** What are the types, limits, duplicates, ordering, and empty cases?
- **Output:** Is the answer an index, value, path, count, all answers, or `null`?
- **Baseline:** Describe the simplest correct solution before optimizing it.
- **Constraint signal:** `n <= 100000` usually rules out an $O(n^2)$ scan; a small value range may favor counting.
- **State:** Decide what information must survive after each processed item.

For a two-sum prompt, the baseline checks every pair. A `Map` can remember values already seen and remove the repeated inner search.

```ts
function firstPairWithSum(values: readonly number[], target: number): [number, number] | null {
	const seen = new Map<number, number>();

	for (let index = 0; index < values.length; index += 1) {
		const matchingIndex = seen.get(target - values[index]);
		if (matchingIndex !== undefined) return [matchingIndex, index];
		seen.set(values[index], index);
	}

	return null;
}
```

## W — Why It Matters

Interviewers are testing problem modeling before syntax. A precise contract prevents solving the wrong variant, exposes the expected complexity, and makes edge cases testable. At work, the same habit turns vague requirements into an implementation that teammates can review.

## I — Interview Q&A

### Why not start with the optimized solution?

Start with a correct baseline so you know the required behavior. Then identify the repeated work that the constraints make too expensive.

### What changes if the prompt asks for values instead of indices?

Change the stored and returned data deliberately. The `Map` can store values, but duplicate handling and the required output order must still be defined.

### What should you clarify for an empty input?

State the no-answer result explicitly, such as `null`, an empty array, or zero. Do not let a sentinel emerge accidentally from the implementation.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Treating examples as the full specification. **Fix:** Write the rule and constraints in your own words.
- **Pitfall:** Returning values when the prompt asks for original indices. **Fix:** Keep indices in the state and test duplicates.
- **Pitfall:** Optimizing before proving behavior. **Fix:** keep a brute-force oracle for small cases.
- **Pitfall:** Ignoring negative values or an absent answer. **Fix:** test both explicitly.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Implement `firstPairWithSum`. Return the first pair of distinct indices whose values add to `target`, or `null`. Preserve scan order: the second index should be the earliest index that completes a pair.

Before reading the solution, write the input/output contract and name the expected time and space complexity.

### Solution

```ts
function firstPairWithSum(values: readonly number[], target: number): [number, number] | null {
	const seen = new Map<number, number>();

	for (let index = 0; index < values.length; index += 1) {
		const previousIndex = seen.get(target - values[index]);
		if (previousIndex !== undefined) return [previousIndex, index];
		seen.set(values[index], index);
	}

	return null;
}
```

This is $O(n)$ expected time and $O(n)$ auxiliary space. The map is updated after the lookup so one array item cannot pair with itself.

**Right now:** Write one contract line for `[2, 7, 11, 15]` with target `9`, then predict the returned indices before running the function.
