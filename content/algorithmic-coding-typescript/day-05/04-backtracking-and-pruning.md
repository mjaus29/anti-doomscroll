# Backtracking and Pruning

## T — TL;DR

Backtracking makes one choice, explores the resulting state, undoes it, and prunes only branches proven unable to produce a valid or better answer.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Backtracking is a disciplined way to try choices for a constraint problem. It is appropriate when the answer may require exploring several paths, but early rules can prove that some paths are impossible.

### Mental Model

Imagine walking a maze with a pencil. Choose a corridor, mark it, walk forward, and erase the mark when you return. If the remaining distance or capacity already makes success impossible, turn around before exploring that corridor.

### First Trace

For candidates `[2, 3]` and target `5`, choose `2` and the remaining target becomes `3`; choose `3` and reach `0`, so copy `[2, 3]`. After returning, remove `3`, then remove `2`, leaving the path ready for the next branch.

## K — Key Concepts

The loop is usually:

1. reject an impossible state,
2. choose an item,
3. recurse,
4. undo the choice.

Sorting can make a prune valid: when positive candidates are sorted and `value > remaining`, every later value is also too large. Passing `index` permits reuse; passing `index + 1` makes choices single-use.

## W — Why It Matters

Backtracking solves small constraint problems such as word search, combinations, and board placement. Interviewers look for safe pruning, because an unproved shortcut can silently remove the answer.

## I — Interview Q&A

### What makes a prune safe?

You can prove the skipped subtree cannot contain a valid result or beat the current best result.

### Why sort candidates?

Order can turn one failed candidate into a proof that all later candidates fail too.

### How do you control reuse?

Pass the next allowed index. Recurse with `index` for reuse and `index + 1` for single-use choices.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Pruning from a performance guess. **Fix:** write the bound that proves impossibility.
- **Pitfall:** Missing `pop()`. **Fix:** make mutation and undo adjacent.
- **Pitfall:** Skipping duplicate values inconsistently. **Fix:** sort and skip equal values only at the same depth.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return combinations of positive candidates that sum to `target`; a candidate may be reused. Return each combination once.

### Solution

```ts
function combinationSum(
  candidates: readonly number[],
  target: number
): number[][] {
  const ordered = [...candidates].sort((a, b) => a - b);
  const result: number[][] = [];
  const path: number[] = [];

  function visit(start: number, remaining: number): void {
    if (remaining === 0) {
      result.push([...path]);
      return;
    }
    for (let index = start; index < ordered.length; index += 1) {
      const value = ordered[index];
      if (value > remaining) break;
      if (index > start && value === ordered[index - 1]) continue;
      path.push(value);
      visit(index, remaining - value);
      path.pop();
    }
  }
  visit(0, target);
  return result;
}
```

**Right now:** Name the exact fact that makes one prune in your current backtracking problem safe.
