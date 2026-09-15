# Testing a Solution with Deterministic Cases

## T — TL;DR

Use a small named set of edge, normal, and branch-covering cases to catch algorithm mistakes before performance tuning.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Tests are small experiments that challenge the assumptions inside your algorithm. You do not need hundreds of examples to start; you need examples that force initialization, normal flow, every branch, and the boundary.

### Mental Model

Think of a test as a lock and your algorithm as a key. A happy-path test is one easy lock. Empty input, duplicates, a missing answer, and maximum values are different locks that reveal whether the key only works by accident.

### First Trace

For `firstPairWithSum`, use three questions: does `[2, 7]` find `[0, 1]`? Does `[3, 3]` allow two distinct positions? Does `[1, 2]` return `null` for target `9`? Each case checks a different contract decision.

## K — Key Concepts

Test in this order:

1. The smallest valid input.
2. The prompt's normal example.
3. Empty or singleton input.
4. Duplicates, ties, and reverse order.
5. Boundary values and no-answer cases.
6. A case for every conditional branch.

For small random inputs, compare the optimized function with an obviously correct brute-force oracle. Normalize only when the output is genuinely set-like; preserve order when order is part of the contract.

```ts
function assertEqual<T>(actual: T, expected: T, label: string): void {
	if (!Object.is(actual, expected)) {
		throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
	}
}
```

## W — Why It Matters

Interviewers often ask how you would test the solution because tests reveal whether you understand its boundaries. At work, focused cases become a fast regression net when an algorithm is optimized or generalized.

## I — Interview Q&A

### What is the first test you write?

The smallest valid input, because it exposes initialization and termination assumptions immediately.

### When should you use a brute-force oracle?

For small inputs where the reference is simple enough to trust. It can validate a faster implementation without sharing its logic.

### How do you test a set-like result?

Normalize both outputs only if order is not specified, then compare values and multiplicities.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Testing only the sample. **Fix:** add empty, boundary, duplicate, and no-answer cases.
- **Pitfall:** Comparing unordered output as an ordered array. **Fix:** normalize based on the contract.
- **Pitfall:** Reusing the same bug in the oracle. **Fix:** make the reference slower and structurally different.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Write three deterministic cases for `firstPairWithSum`: a normal pair, duplicate values, and no solution. Use a tiny assertion helper and explain what each case protects.

### Solution

```ts
const cases: Array<[readonly number[], number, [number, number] | null]> = [
	[[2, 7, 11, 15], 9, [0, 1]],
	[[3, 3], 6, [0, 1]],
	[[1, 2, 4], 8, null],
];

for (const [values, target, expected] of cases) {
	const actual = firstPairWithSum(values, target);
	assertEqual(actual?.toString() ?? null, expected?.toString() ?? null, `target ${target}`);
}
```

The cases cover ordinary success, using two distinct equal values, and explicit failure.

**Right now:** Add one edge case to the algorithm you are currently studying and name the bug it would catch.
