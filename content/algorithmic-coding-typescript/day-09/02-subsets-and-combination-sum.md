# Subsets and Combination Sum

## T — TL;DR

*Backtracking* builds answers one choice at a time: **choose** an option, **explore** everything that follows from it, then **un-choose** it and try the next option. It lists every valid answer without building the same one twice.

**Reach for it when:**

- The problem says "return **all**" subsets, combinations, or arrangements.
- Inputs are small (`n` up to about 20), so exponential output is expected.
- Each answer is a list of choices built step by step.

## K — Key Concepts

### Picture it

You pack a lunch box from three snacks. For each snack you decide "in" or "out". Write those decisions as a tree: the root is an empty box, each level is one snack, each branch is a decision. Every leaf is one possible box. Backtracking walks this *decision tree* one path at a time, using a single box and taking snacks back out when it returns.

### Walk through it

All subsets of `[1, 2, 3]`. `path` is the current box. At each call we record `path`, then try adding each number after `start`.

| Step | `path` | Recorded | Action and why |
| :--- | :----- | :------- | :------------- |
| 1 | `[]` | `[]` | Choose `1`. |
| 2 | `[1]` | `[1]` | Choose `2`. |
| 3 | `[1, 2]` | `[1, 2]` | Choose `3`. |
| 4 | `[1, 2, 3]` | `[1, 2, 3]` | Nothing after `3`. Un-choose `3`, then un-choose `2`. |
| 5 | `[1, 3]` | `[1, 3]` | Back at `[1]`, chose `3`. Un-choose `3`, then `1`. |
| 6 | `[2]` → `[2, 3]` | `[2]`, `[2, 3]` | Back at `[]`, chose `2`, then `3`. Un-choose both. |
| 7 | `[3]` | `[3]` | Back at `[]`, chose `3`. Done: 8 subsets. |

`start` only moves forward, so `[2, 1]` is never built after `[1, 2]`. That is how duplicates are avoided.

### The template

```ts
function subsets(nums: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  const backtrack = (start: number): void => {
    result.push([...path]); // copy: path keeps changing after this
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);   // choose
      backtrack(i + 1);     // explore: only later items, so no repeats
      path.pop();           // un-choose: restore path for the next option
    }
  };

  backtrack(0);
  return result;
}
```

**Time:** `O(n · 2ⁿ)` · **Space:** `O(n)` extra besides the output — there are `2ⁿ` subsets, each copied in up to `n` steps, and the stack is at most `n` deep.

### Interview classic: Combination Sum

Given distinct positive `candidates` and a `target`, return every combination that sums to `target`. Each number may be used any number of times.
Example: `candidates = [2, 3, 6, 7]`, `target = 7` → `[[2, 2, 3], [7]]`.

- **Brute force:** generate every multiset of candidates and keep the ones that hit `target` — no clear limit on size.
- **Key insight:** same template, with two changes. Recurse with `i` (not `i + 1`) so a number can be reused. Stop a branch as soon as the remaining amount drops below zero.

```ts
function combinationSum(candidates: readonly number[], target: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  const backtrack = (start: number, remaining: number): void => {
    if (remaining === 0) { result.push([...path]); return; } // found one
    if (remaining < 0) return;                               // overshot: dead branch

    for (let i = start; i < candidates.length; i++) {
      path.push(candidates[i]);
      backtrack(i, remaining - candidates[i]); // i, not i + 1: reuse allowed
      path.pop();
    }
  };

  backtrack(0, target);
  return result;
}
```

Subsets records every node of the tree. Combination Sum records only nodes where `remaining` is exactly `0`. The choose → explore → un-choose loop is identical.

## W — Why It Matters

- Subsets, combinations, and permutations cover a large share of "return all ..." interview questions.
- Real uses: generating test cases, feature-flag combinations, puzzle solvers, and config search.
- Interviewers listen for the three steps out loud and for why you copy `path` before saving it.

## I — Interview Q&A

### Q: Why `result.push([...path])` and not `result.push(path)`?

`path` is one array that keeps changing. Pushing it stores a reference, so every saved answer ends up as the same final (empty) array. A copy freezes the current state.

### Q: How would you handle duplicate numbers in Subsets II?

Sort first, then inside the loop skip `nums[i]` when `i > start` and `nums[i] === nums[i - 1]`. That stops two equal values from starting the same branch.

### Q: Can you make Combination Sum faster?

Sort `candidates` ascending and `break` the loop when `candidates[i] > remaining`. Every later candidate is bigger, so the rest of the loop is useless.

## C — Common Pitfalls + Fix

### ❌ Forgetting to un-choose

Without `path.pop()`, values from one branch leak into the next, and answers come out too long.

### ❌ Saving a reference to `path`

```ts
result.push(path);      // ❌ all entries point at the same array
result.push([...path]); // ✅ snapshot of this moment
```

### ❌ Restarting the loop at 0

`for (let i = 0; ...)` builds `[1, 2]` and `[2, 1]` as separate answers. Pass `start` so each combination is built in one order only.

### ❌ Mixing up `i` and `i + 1`

`i + 1` means "each item at most once" (Subsets). `i` means "reuse allowed" (Combination Sum). Decide which one the problem wants before coding.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Combinations:** given `n` and `k`, return every way to choose `k` different numbers from `1` to `n`. Order inside a combination does not matter.

`n = 4, k = 2` → `[[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]`

<details><summary>Hint</summary>

Use the Subsets template, but only save `path` when its length is `k`, and stop going deeper at that point.

</details>

### Solution

```ts
function combine(n: number, k: number): number[][] {
  const result: number[][] = [];
  const path: number[] = [];

  const backtrack = (start: number): void => {
    if (path.length === k) { result.push([...path]); return; }
    for (let value = start; value <= n; value++) {
      path.push(value);
      backtrack(value + 1); // each number at most once
      path.pop();
    }
  };

  backtrack(1);
  return result;
}
```

**Time:** `O(k · C(n, k))` · **Space:** `O(k)` besides the output. `C(n, k)` means "n choose k", the number of answers; each takes `k` steps to copy. It is Subsets with the answers filtered to size `k`.

**Right now:** Draw the decision tree for `combinationSum([2, 3], 6)` and circle the leaves that reach `0`.
