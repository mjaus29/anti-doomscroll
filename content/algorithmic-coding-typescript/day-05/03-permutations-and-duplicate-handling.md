# Permutations and Duplicate Handling

## T — TL;DR

Permutations choose one unused item per depth, while duplicate pruning must distinguish “used in the path” from “chosen at this depth.”

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Permutations are for problems where the order of every item matters: seating, task order, or trying every arrangement. Each level of the search chooses one item that has not been used in the current arrangement.

### Mental Model

Imagine filling seats from left to right. At the first seat any unused person can sit; at the next seat only the remaining people can sit. Equal people create identical arrangements, so duplicate choices at the same seat should be skipped.

### First Trace

For `[1, 1, 2]`, sort first. At the first seat, choose the first `1`, but skip the second `1` because it would create the same branch. After the first `1` is used, choosing the second `1` at a later seat is still allowed.

## K — Key Concepts

Sort equal values together, track used positions, and skip a duplicate when its equal predecessor is available at the same depth.

```ts
function uniquePermutations(values: readonly number[]): number[][] {
  const ordered = [...values].sort((a, b) => a - b);
  const result: number[][] = [];
  const path: number[] = [];
  const used = new Array<boolean>(ordered.length).fill(false);

  function visit(): void {
    if (path.length === ordered.length) {
      result.push([...path]);
      return;
    }
    for (let index = 0; index < ordered.length; index += 1) {
      if (used[index]) continue;
      if (index > 0 && ordered[index] === ordered[index - 1] && !used[index - 1]) continue;
      used[index] = true;
      path.push(ordered[index]);
      visit();
      path.pop();
      used[index] = false;
    }
  }
  visit();
  return result;
}
```

## W — Why It Matters

Permutation search appears in ordering, scheduling, test generation, and constraint puzzles. Duplicate handling is a common interview separator because a superficially correct tree can return repeated answers.

## I — Interview Q&A

### Why sort before pruning duplicates?

Sorting makes equal values adjacent, so one local comparison can identify duplicate choices.

### Why allow an equal value after the earlier one is used?

That represents a distinct position in a different path. The skip applies only to choices at the same depth.

### What is the output size?

With all unique values it is `n!`; repeated values reduce the number of distinct outputs.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Skipping every equal value. **Fix:** skip only when the previous equal position is unused at this depth.
- **Pitfall:** Forgetting to undo `used` and `path`. **Fix:** pair every mutation with cleanup.
- **Pitfall:** Storing the shared path. **Fix:** copy at the leaf.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return all unique permutations of a number array that may contain duplicates.

### Solution

```ts
function uniquePermutations(values: readonly number[]): number[][] {
  const ordered = [...values].sort((a, b) => a - b);
  const result: number[][] = [];
  const path: number[] = [];
  const used = new Array<boolean>(ordered.length).fill(false);

  function visit(): void {
    if (path.length === ordered.length) {
      result.push([...path]);
      return;
    }
    for (let index = 0; index < ordered.length; index += 1) {
      if (used[index]) continue;
      if (index > 0 && ordered[index] === ordered[index - 1] && !used[index - 1]) continue;
      used[index] = true;
      path.push(ordered[index]);
      visit();
      path.pop();
      used[index] = false;
    }
  }
  visit();
  return result;
}
```

**Right now:** For `[1, 1, 2]`, identify which duplicate choice is skipped at the first depth.
