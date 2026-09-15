# Memoized Search and State Keys

## T — TL;DR

Memoization turns repeated search into DP only when the key contains every fact that determines the future answer.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Memoization is for recursive searches that solve the same smaller question many times. Instead of walking that same subtree again, save its answer and reuse it.

### Mental Model

Imagine carrying a notebook through a maze. When you reach a room with the same remaining choices as before, read the answer already written there. The notebook key must identify the whole room, not merely the doorway you used to enter it.

### First Trace

In subset target search, state `(index = 2, remaining = 5)` is different from `(index = 2, remaining = 2)`, because the remaining target changes the answer. Two paths reaching `(2, 5)` can share one cached boolean.

## K — Key Concepts

For subset target search, both `index` and `remaining` belong in the key. Two calls with the same pair have the same future options.

```ts
function canReachTarget(values: readonly number[], target: number): boolean {
  const memo = new Map<string, boolean>();

  function search(index: number, remaining: number): boolean {
    if (remaining === 0) return true;
    if (index === values.length || remaining < 0) return false;
    const key = `${index}:${remaining}`;
    if (memo.has(key)) return memo.get(key) as boolean;
    const answer = search(index + 1, remaining) ||
      search(index + 1, remaining - values[index]);
    memo.set(key, answer);
    return answer;
  }

  return search(0, target);
}
```

Complexity is number of distinct states times transition work, plus memo storage. Use `memo.has` when `false` or `0` is a valid cached answer.

## W — Why It Matters

State design is the central DP interview skill. Memoization also appears in production caches, recursive parsers, and repeated dependency computations, where an incomplete key creates incorrect cache hits.

## I — Interview Q&A

### How do you know two calls can share a memo entry?

Their future choices and answer must be identical. If history can change the future, history belongs in the key.

### Why is `memo.get(key) !== undefined` sometimes unsafe?

`undefined` may be a legitimate cached result. Use `has` or a sentinel that cannot be a result.

### What is the difference from plain backtracking?

Memoization merges repeated states; pruning only skips states proven impossible or inferior.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Omitting one state field. **Fix:** find two calls with the same proposed key and compare their future options.
- **Pitfall:** Caching mutable paths. **Fix:** cache the answer for the state, not the route used to reach it.
- **Pitfall:** Using an ambiguous string key. **Fix:** delimit fields or encode them structurally.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return whether a subset of `values` can sum to `target`, using each value at most once. Memoize by index and remaining target.

### Solution

```ts
function canReachTarget(values: readonly number[], target: number): boolean {
  const memo = new Map<string, boolean>();

  function search(index: number, remaining: number): boolean {
    if (remaining === 0) return true;
    if (index === values.length || remaining < 0) return false;
    const key = `${index}:${remaining}`;
    if (memo.has(key)) return memo.get(key) as boolean;
    const answer = search(index + 1, remaining) ||
      search(index + 1, remaining - values[index]);
    memo.set(key, answer);
    return answer;
  }

  return search(0, target);
}
```

**Right now:** Write the complete state key for your next recursive search before writing its cache.
