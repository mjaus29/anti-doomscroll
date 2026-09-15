# Subsets and Combinations

## T — TL;DR

Generate subsets by making a choose-or-skip decision at each index, and use a start index when order should not create duplicate combinations.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Subset and combination problems ask you to explore choices rather than follow one known path. The algorithm must visit each allowed choice exactly once and collect the answers that satisfy the rules.

### Mental Model

At every item, stand at a fork: take it or skip it. For combinations, also remember where the next choice may start so that choosing `A` then `B` is not repeated as `B` then `A`.

### First Trace

For `[A, B]`, the decision tree has four leaves: skip/skip `[]`, skip/take `[B]`, take/skip `[A]`, and take/take `[A, B]`. The working `path` is changed as you walk down and restored as you walk back.

## K — Key Concepts

The state is `(index, path)`. At each index, skip or include the value; at the leaf, copy `path` because the working path is later mutated.

```ts
function subsets(values: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function visit(index: number): void {
    if (index === values.length) {
      result.push([...path]);
      return;
    }
    visit(index + 1);
    path.push(values[index]);
    visit(index + 1);
    path.pop();
  }

  visit(0);
  return result;
}
```

There are $2^n$ subsets, so output size itself is exponential.

## W — Why It Matters

Choose-or-skip is the base pattern for combinations, subset sum, feature selection, and many backtracking interview questions. Seeing the decision tree makes later pruning and DP easier.

## I — Interview Q&A

### Why copy the path at a leaf?

All branches share one mutable path. Copying freezes the completed answer before backtracking changes it.

### How do combinations avoid reordered duplicates?

Pass a `start` index and only choose later positions, so `[a, b]` is not generated again as `[b, a]`.

### Can subset generation be polynomial?

Not when every subset must be returned; there are $2^n$ outputs. A counting or decision variant may be cheaper.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Forgetting `path.pop()`. **Fix:** every push has exactly one matching undo.
- **Pitfall:** Storing `path` directly. **Fix:** store `[...path]`.
- **Pitfall:** Claiming $O(2^n)$ without output-copy cost. **Fix:** include the total output size.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return every subset of a readonly array. The empty subset must be included.

### Solution

```ts
function subsets(values: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  function visit(index: number): void {
    if (index === values.length) {
      result.push([...path]);
      return;
    }
    visit(index + 1);
    path.push(values[index]);
    visit(index + 1);
    path.pop();
  }

  visit(0);
  return result;
}
```

**Right now:** Draw the two branches for the first value in a two-item input.
