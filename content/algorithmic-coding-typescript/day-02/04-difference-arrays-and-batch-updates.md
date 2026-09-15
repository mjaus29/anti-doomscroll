# Difference Arrays and Batch Updates

## T — TL;DR

Record only the start and stop of each inclusive range update, then take one prefix sum to materialize all final values.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Difference arrays are for the opposite of prefix sums: instead of answering many reads after fixed data, they apply many known range updates without touching every position each time.

### Mental Model

Imagine a light switch on a timeline. A range update turns a light on at `left` and off just after `right`; the running total tells you how many lights are active at each position. You record only switch changes, not every illuminated position.

### First Trace

For length `5` and update `[1, 3, +2]`, place `+2` at index `1` and `-2` at index `4`. Running totals are `[0, 2, 2, 2, 0]`. The update affects indices 1 through 3 and stops before index 4.

## K — Key Concepts

For adding `delta` to `[left, right]`, do `difference[left] += delta` and `difference[right + 1] -= delta`. The extra slot receives the stop marker even when `right` is the last real index.

```ts
function applyRangeAdds(
  length: number,
  updates: readonly (readonly [number, number, number])[]
): number[] {
  const difference = new Array<number>(length + 1).fill(0);
  for (const [left, right, delta] of updates) {
    difference[left] += delta;
    difference[right + 1] -= delta;
  }

  const result: number[] = [];
  let current = 0;
  for (let index = 0; index < length; index += 1) {
    current += difference[index];
    result.push(current);
  }
  return result;
}
```

## W — Why It Matters

Batch updates turn many repeated writes into boundary bookkeeping. This pattern models bookings, active intervals, and timeline events efficiently when all updates arrive before the final read.

## I — Interview Q&A

### Why subtract at `right + 1`?

The added amount should remain active through `right` and stop at the first index after it.

### When does this pattern not apply?

When updates and queries are interleaved or the update operation is not recoverable with a prefix accumulation. Use a Fenwick or segment tree then.

### What is the complexity?

$O(n + u)$ time and $O(n)$ space for `u` updates and an output of length `n`.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Placing the stop marker at `right`. **Fix:** use `right + 1` for inclusive ranges.
- **Pitfall:** Forgetting the extra slot. **Fix:** allocate `length + 1`.
- **Pitfall:** Mixing interval conventions. **Fix:** write whether endpoints are inclusive in the function contract.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Apply updates `[left, right, delta]` to an initially zero array and return the final values without touching every index for every update.

### Solution

```ts
function applyRangeAdds(
  length: number,
  updates: readonly (readonly [number, number, number])[]
): number[] {
  const difference = new Array<number>(length + 1).fill(0);
  for (const [left, right, delta] of updates) {
    difference[left] += delta;
    difference[right + 1] -= delta;
  }

  const result = new Array<number>(length);
  let current = 0;
  for (let index = 0; index < length; index += 1) {
    current += difference[index];
    result[index] = current;
  }
  return result;
}
```

**Right now:** Draw the difference markers for one update on five positions before running it.
