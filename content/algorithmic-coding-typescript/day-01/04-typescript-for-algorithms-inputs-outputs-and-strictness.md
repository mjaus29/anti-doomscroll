# TypeScript for Algorithms: Inputs, Outputs, and Strictness

## T — TL;DR

Use TypeScript types to make the algorithm's input, mutation rules, and failure cases explicit without adding abstraction the problem does not need.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

TypeScript cannot choose the algorithm for you, but it can make the boundary of the algorithm visible. A good type tells you what enters, what may be returned, and whether the function is allowed to change the input.

### Mental Model

Think of types as labels and guardrails on a toolbox. `readonly number[]` labels the input as a list of numbers that the function should not rearrange. A result such as `{ found: true, index }` or `{ found: false }` labels both possible outcomes instead of hiding failure in a magic number.

### First Trace

1. Input `values` is a readonly list, so sorting it directly would violate the contract.
2. `findValue` returns `{ found: true, index: 2 }` when it finds the target.
3. If no item matches, it returns `{ found: false }`.
4. The caller must handle both branches because the type makes the choice visible.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Given a string containing parentheses and brackets, determine whether the brackets are valid. This is the classic **Valid Parentheses** problem.

**Best interview-ready solution:**

1. **Recognize the model:** the newest unmatched opening bracket must be resolved first, so use a stack.
2. **Store the contract:** map each closing bracket to its expected opener.
3. **Process left to right:** push openers; for a closer, pop and compare or return false.
4. **Finish the proof:** a valid string must leave the stack empty after all characters are processed.
5. **Complexity:** O(n) time and O(n) space; TypeScript types make the result and map values explicit.

**Code solution:**

```ts
// Pseudocode: push opening brackets, match closing brackets with the stack top, then require an empty stack.
function isValidBrackets(text: string): boolean {
	const pairs = new Map([
		[')', '('],
		[']', '['],
		['}', '{'],
	]);
	const stack: string[] = [];
	for (const character of text) {
		if ('([{'.includes(character)) stack.push(character);
		else if (pairs.get(character) !== stack.pop()) return false;
	}
	return stack.length === 0;
}
```

```ts
type Edge = readonly [from: number, to: number, weight: number];

type SearchResult = { found: true; index: number } | { found: false };

function findValue(values: readonly number[], target: number): SearchResult {
	const index = values.indexOf(target);
	return index === -1 ? { found: false } : { found: true, index };
}
```

- `readonly` documents that input is not mutated.
- `Map<K, V>` handles dynamic keys; `Set<T>` handles membership.
- Tuples describe fixed-size records; objects are clearer when fields grow.
- Discriminated unions make success and failure branches narrow safely.
- `number` is not exact above `Number.MAX_SAFE_INTEGER`; `bigint` cannot mix with `number` implicitly.

## W — Why It Matters

Clear types reduce interview bugs around `undefined`, index bounds, and invalid results. The same signatures make production utilities easier to review and reuse.

## I — Interview Q&A

### Why use `readonly` on an algorithm input?

It communicates ownership and lets the compiler catch accidental mutation. Remove it only when in-place mutation is part of the contract.

### When is a tuple better than an object?

Use a tuple for a small fixed record whose positions are obvious, such as an edge. Use an object when named fields improve readability or the record may expand.

### When do you need `bigint`?

When exact integer arithmetic may exceed the safe `number` range. Keep all arithmetic in one numeric type and convert only at a deliberate boundary.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using `as` to silence an unchecked index. **Fix:** narrow the index or handle `undefined`.
- **Pitfall:** Building classes before understanding the state. **Fix:** start with a pure function and small helpers.
- **Pitfall:** Mixing `number` and `bigint`. **Fix:** choose one numeric model at the boundary.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Define a typed `SearchResult` and implement `findValue` so the caller can safely distinguish a found index from no match without a magic `-1` value.

### Solution

```ts
type SearchResult = { found: true; index: number } | { found: false };

function findValue(values: readonly number[], target: number): SearchResult {
	const index = values.indexOf(target);
	return index === -1 ? { found: false } : { found: true, index };
}
```

The `found` discriminant lets TypeScript narrow `index` only in the successful branch.

**Right now:** Add `readonly` to one algorithm input and see whether the compiler finds an accidental mutation.
