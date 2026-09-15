# Bit Manipulation

## T — TL;DR

Use bits as a compact set of boolean flags, but remember that JavaScript bitwise operators coerce values to signed 32-bit integers.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Bit manipulation is useful when many yes/no settings must fit into one compact value, or when a problem's cancellation and subset structure can be expressed with bits.

### Mental Model

Imagine a row of light switches. A `1` means a feature is on and a `0` means it is off. AND asks which switches are on in both rows; OR turns on switches from either row; XOR asks where the rows differ.

### First Trace

For values `[4, 1, 4]`, XOR starts at `0`: `0 ^ 4 = 4`, then `4 ^ 1 = 5`, then `5 ^ 4 = 1`. The two `4`s cancel because XORing the same switch pattern twice turns it off.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the single number when every other number appears exactly twice. This is **Single Number**.

**Best interview-ready solution:**

1. **Recognize cancellation:** pairs should disappear while the unpaired value remains.
2. **Use XOR:** x XOR x is zero and x XOR zero is x.
3. **Fold every value into one accumulator.**
4. **Do not use a Set when the problem guarantees exactly pairs; XOR uses constant extra space.**
5. **Complexity:** O(n) time and O(1) extra space, with the JavaScript 32-bit bitwise caveat.

**Code solution:**

```ts
// Pseudocode: XOR every value; equal pairs cancel and the single value remains.
function singleNumber(values: readonly number[]): number {
	let answer = 0;
	for (const value of values) answer ^= value;
	return answer;
}
```

For mask `value` and bit `bit`:

- test: `(value & (1 << bit)) !== 0`
- set: `value | (1 << bit)`
- clear: `value & ~(1 << bit)`
- toggle: `value ^ (1 << bit)`

`value & (value - 1)` removes the lowest set bit. XOR cancels pairs, so a value appearing once among pairs is the XOR of all values.

## W — Why It Matters

Bitmasks make small subset state compact in permission systems, feature flags, and bitmask DP. Interviewers also use them to test whether you know JavaScript's 32-bit coercion caveat.

## I — Interview Q&A

### Why does XOR find a unique value among pairs?

XOR is associative, commutative, and satisfies `x ^ x = 0` and `x ^ 0 = x`, so paired values cancel.

### How many subsets fit in a 32-bit mask?

Only use `1 << n` safely within the signed 32-bit model; for larger exact integer masks, consider `bigint`.

### What does `value & (value - 1)` do?

It clears the lowest set bit, so counting loops once per set bit.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Assuming bitwise operators are arbitrary precision. **Fix:** state the 32-bit limit or use `bigint`.
- **Pitfall:** Confusing `^` with exponentiation. **Fix:** exponentiation is `**`.
- **Pitfall:** Shifting into the sign bit unexpectedly. **Fix:** document width and signedness.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Return the value that appears once when every other value appears exactly twice.

### Solution

```ts
function singleValue(values: readonly number[]): number {
	let answer = 0;
	for (const value of values) answer ^= value;
	return answer;
}
```

**Right now:** Write the bitmask for a three-feature set where features zero and two are enabled.
