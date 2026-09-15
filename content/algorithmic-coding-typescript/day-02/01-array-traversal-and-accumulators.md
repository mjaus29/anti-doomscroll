# Array Traversal and Accumulators

## T — TL;DR

Scan once while keeping only the summary of the processed prefix that the future still needs.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Many array problems ask for one answer about everything seen so far: the largest value, a total, a count, or the best decision up to this point. A traversal lets you process each item once instead of repeatedly rescanning the prefix.

### Mental Model

Imagine walking past a row of numbers with one clipboard. You do not carry the entire row in your hands; you carry only the summary the next number needs. For a running maximum, the clipboard says, "largest value seen so far." For stock profit, it carries the cheapest earlier price and the best profit.

### First Trace

For prices `[7, 1, 5]`, start with cheapest `7` and profit `0`. Read `1`: cheapest becomes `1`. Read `5`: selling now would earn `4`, so best becomes `4`. The current price becomes a possible future purchase only after its selling decision is considered.

## K — Key Concepts

- An accumulator can be a sum, maximum, count, index, set, or small tuple.
- State the invariant: what is true after processing each item?
- Update order matters when the current value could play two roles.
- Use `map` for independent transformation; use a loop for running state or early exit.

For one buy and one later sell, keep the cheapest earlier price and the best profit. The current price is allowed to sell but must not become the earlier purchase in the same step.

## W — Why It Matters

Single-pass scans are the baseline pattern behind dashboards, streaming metrics, parsers, and many interview solutions. Recognizing the needed summary keeps code fast without making it abstract.

## I — Interview Q&A

### How do you find the state for a one-pass solution?

Ask what facts about the processed prefix can affect the answer for future items. Keep only those facts.

### Why not sort first?

Sorting may destroy original order and costs $O(n log n) when a prefix invariant can solve the problem in $O(n)$.

### What is the usual complexity?

One pass is $O(n)$ time; auxiliary space is $O(1)$ unless the accumulator stores a growing set or output.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Updating related state in the wrong order. **Fix:** state which values must be strictly earlier.
- **Pitfall:** Using `reduce` without a readable invariant. **Fix:** prefer a named loop when state has several fields.
- **Pitfall:** Forgetting empty input. **Fix:** define a nullable result or explicit default.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the maximum profit from one buy followed by one later sell. Return `0` when no profitable trade exists.

### Solution

```ts
function maxProfit(prices: readonly number[]): number {
  let cheapest = Infinity;
  let best = 0;

  for (const price of prices) {
    best = Math.max(best, price - cheapest);
    cheapest = Math.min(cheapest, price);
  }

  return best;
}
```

The invariant is that `cheapest` is the minimum price seen so far and `best` is the best valid profit in the processed prefix. Time is $O(n)$ and space is $O(1)$.

**Right now:** Write the two pieces of state an unfinished one-pass problem would need before opening another tab.
