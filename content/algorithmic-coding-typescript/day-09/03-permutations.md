# Permutations

## T — TL;DR

A *permutation* is one ordering of all the items. To list them all, fill one position at a time with any item not used yet, recurse, then free that item again. A `used` array tracks which items are already in the current ordering.

**Reach for it when:**

- The problem asks for **all orderings** or arrangements of the input.
- Order matters: `[1, 2]` and `[2, 1]` are different answers.
- `n` is tiny (about 8–10), because there are `n!` answers.

## K — Key Concepts

### Picture it

You seat three friends in three chairs. For chair 1 you can pick anyone. For chair 2, anyone still standing. For chair 3, whoever is left. After writing down a seating, the last person stands up so you can try someone else in that chair.

### Walk through it

Permutations of `[1, 2, 3]`. Unlike Subsets, every level loops over **all** items and skips the used ones.

| Step | `path` | `used` (1, 2, 3) | Action and why |
| :--- | :----- | :--------------- | :------------- |
| 1 | `[1]` | T F F | Chair 1 takes `1`. |
| 2 | `[1, 2]` | T T F | `1` is used, skip it. Chair 2 takes `2`. |
| 3 | `[1, 2, 3]` | T T T | Full: record it. Free `3`, then free `2`. |
| 4 | `[1, 3, 2]` | T T T | Chair 2 takes `3`, chair 3 takes `2`. Record. Free back to `[1]`. |
| 5 | `[2, ...]` | F T F | Free `1`. Chair 1 takes `2`, and the same steps repeat. |

The result has `3! = 6` orderings: `[1,2,3]`, `[1,3,2]`, `[2,1,3]`, `[2,3,1]`, `[3,1,2]`, `[3,2,1]`.

### The template

```ts
function permute(nums: readonly number[]): number[][] {
  const result: number[][] = [];
  const path: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);

  const backtrack = (): void => {
    if (path.length === nums.length) { result.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) { // start at 0: order matters
      if (used[i]) continue;                // already placed in this ordering
      used[i] = true;                       // choose
      path.push(nums[i]);
      backtrack();                          // explore
      path.pop();                           // un-choose
      used[i] = false;
    }
  };

  backtrack();
  return result;
}
```

**Time:** `O(n · n!)` · **Space:** `O(n)` besides the output — there are `n!` orderings, each copied in `n` steps, and `used` plus the stack hold `n` items.

### Interview classic: Permutations

The template above is the full solution to **Permutations** (distinct numbers, return all orderings).
Example: `[0, 1]` → `[[0, 1], [1, 0]]`.

- **Brute force:** generate every length-`n` list of values and keep those with no repeats — `O(nⁿ)`.
- **Key insight:** never place a used item, so every branch of the tree is a valid ordering and nothing is thrown away.

Compare with Subsets: Subsets passes `start` so it never looks back. Permutations loops from `0` every time because `[2, 1]` is a new answer, and uses `used` to stop an item from appearing twice.

### Variation: Permutations II (duplicates)

With `[1, 1, 2]`, the template prints `[1, 1, 2]` twice, because the two `1`s can swap places. Fix: sort, then only let the **first unused copy** of a value go into a given position.

```ts
function permuteUnique(nums: readonly number[]): number[][] {
  const sorted = [...nums].sort((a, b) => a - b); // equal values sit together
  const result: number[][] = [];
  const path: number[] = [];
  const used: boolean[] = new Array(sorted.length).fill(false);

  const backtrack = (): void => {
    if (path.length === sorted.length) { result.push([...path]); return; }
    for (let i = 0; i < sorted.length; i++) {
      if (used[i]) continue;
      // Same value as the previous copy, and that copy is free: this branch
      // would repeat the one the previous copy already explored.
      if (i > 0 && sorted[i] === sorted[i - 1] && !used[i - 1]) continue;
      used[i] = true;
      path.push(sorted[i]);
      backtrack();
      path.pop();
      used[i] = false;
    }
  };

  backtrack();
  return result;
}
```

`[1, 1, 2]` → `[[1, 1, 2], [1, 2, 1], [2, 1, 1]]`.

## W — Why It Matters

- Orderings appear in scheduling, route trials, test ordering, and anagram puzzles.
- Permutations vs Subsets is a classic "do you understand your own template?" question.
- Interviewers listen for the `n!` cost and for a clean rule to skip duplicates.

## I — Interview Q&A

### Q: How is this different from Subsets?

Subsets cares about which items, not order, so it passes `start` and only looks forward. Permutations cares about order, so it loops over every item and uses `used` to avoid repeats.

### Q: Can you do it without the `used` array?

Yes: swap `nums[i]` into position `start`, recurse on `start + 1`, then swap back. It saves the array but mutates the input, so work on a copy.

### Q: How big can `n` be?

`10! = 3,628,800` orderings is already a lot of output. Above about 10, ask whether the problem really needs every ordering or only a count or the next one.

## C — Common Pitfalls + Fix

### ❌ Passing `start` like in Subsets

Then `[2, 1]` is never produced. Permutations loop from `0` every call.

### ❌ Forgetting to reset `used[i]`

The item stays marked after its branch ends, so later branches cannot use it and answers go missing.

### ❌ Skipping duplicates without sorting

```ts
if (i > 0 && nums[i] === nums[i - 1] && !used[i - 1]) continue; // ❌ unsorted input
// ✅ sort a copy first so equal values are neighbours
```

### ❌ Using a `Set` of strings to remove duplicates afterward

It works, but you still build all `n!` orderings and spend extra time joining strings. Skip duplicate branches instead.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Letter Combinations of a Phone Number:** on an old phone keypad, `2` = `abc`, `3` = `def`, `4` = `ghi`, `5` = `jkl`, `6` = `mno`, `7` = `pqrs`, `8` = `tuv`, `9` = `wxyz`. Given a string of digits `2`–`9`, return every string the digits could spell. Empty input → `[]`.

`"23"` → `["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]`

<details><summary>Hint</summary>

Position `i` of the answer comes from digit `i`. Loop over that digit's letters, choose one, recurse on `i + 1`, un-choose.

</details>

### Solution

```ts
function letterCombinations(digits: string): string[] {
  if (digits.length === 0) return [];
  const letters: Record<string, string> = {
    "2": "abc", "3": "def", "4": "ghi", "5": "jkl",
    "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz",
  };
  const result: string[] = [];
  const path: string[] = [];

  const backtrack = (index: number): void => {
    if (index === digits.length) { result.push(path.join("")); return; }
    for (const letter of letters[digits[index]]) {
      path.push(letter);     // choose a letter for this position
      backtrack(index + 1);  // fill the next position
      path.pop();
    }
  };

  backtrack(0);
  return result;
}
```

**Time:** `O(n · 4ⁿ)` · **Space:** `O(n)` besides the output. Each of the `n` positions has at most 4 choices. No `used` array is needed because each position has its own set of letters.

**Right now:** Run `permuteUnique([1, 1, 2])` in your head and write down which branch the duplicate-skip line cuts.
