# Sorting and 3Sum

## T — TL;DR

Sorting costs `O(n log n)` once, but it puts equal values next to each other and lets you use two pointers. That trade turns many `O(n³)` or `O(n²)` brute-force searches into `O(n²)` or `O(n)` scans.

**Reach for it when:**

- Order of the input does not matter for the answer (you return values, not original indices).
- You need pairs or triplets that meet a sum condition.
- You must avoid **duplicate** answers.
- Pairing "smallest with largest" sounds useful.

## K — Key Concepts

### Picture it

Sorting a messy hand of cards before you play. It takes a moment, but afterwards every pair of 7s sits together and you can find "a card that adds up to 10" by looking at the two ends of your hand.

### Walk through it

**3Sum:** find every unique triplet that sums to `0`. Input `[-1, 0, 1, 2, -1, -4]`, sorted → `[-4, -1, -1, 0, 1, 2]`.
Fix one value `sorted[i]`, then run two pointers on the rest to find a pair that sums to `-sorted[i]`.

| i → value | left, right → values | Sum | Action and why |
| :-------- | :------------------- | :-- | :------------- |
| 0 → -4 | 1, 5 → -1, 2 | -3 | Too small, `left++`. It stays too small until the pointers meet: no triplet. |
| 1 → -1 | 2, 5 → -1, 2 | 0 | Found `[-1, -1, 2]`. Move both pointers. |
| 1 → -1 | 3, 4 → 0, 1 | 0 | Found `[-1, 0, 1]`. Pointers meet, stop. |
| 2 → -1 | — | — | Same value as `i = 1`. Skip, or you repeat both triplets. |
| 3 → 0 | 4, 5 → 1, 2 | 3 | Too big, `right--`. Pointers meet, stop. |

Result: `[[-1, -1, 2], [-1, 0, 1]]`.

### The template

The sort itself is where most JavaScript bugs hide. Four rules:

1. A *comparator* `(a, b) => number` returns negative to put `a` first, positive to put `b` first, `0` for a tie.
2. Without a comparator, `sort` compares values as **strings**: `[10, 9, 1].sort()` gives `[1, 10, 9]`.
3. `sort` changes the array in place. Sort a copy unless you own the array.
4. `sort` is *stable* (equal items keep their original order), so you can sort by several keys with `||`.

```ts
type Task = { title: string; priority: number };

function sortNumbers(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b); // copy first, numeric comparator
}

function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(
    // Highest priority first; on a tie (0), fall through to title A→Z.
    (a, b) => b.priority - a.priority || a.title.localeCompare(b.title),
  );
}
```

**Time:** `O(n log n)` · **Space:** `O(n)` for the copy. Every pattern below pays this once up front.

### Interview classic: 3Sum

Return all unique triplets `[a, b, c]` from the array with `a + b + c === 0`.
Example: `[-1, 0, 1, 2, -1, -4]` → `[[-1, -1, 2], [-1, 0, 1]]`.

- **Brute force:** three nested loops plus a set of seen triplets — `O(n³)`.
- **Key insight:** after sorting, fixing `sorted[i]` leaves a **Two Sum II** on the rest, solved with opposite-end pointers in `O(n)`. Skipping equal neighbours removes duplicates without a set.

```ts
function threeSum(values: readonly number[]): number[][] {
  const sorted = [...values].sort((a, b) => a - b);
  const result: number[][] = [];

  for (let i = 0; i < sorted.length - 2; i++) {
    if (sorted[i] > 0) break; // smallest of the three is positive → sum can't be 0
    if (i > 0 && sorted[i] === sorted[i - 1]) continue; // same first value, same triplets

    let left = i + 1;
    let right = sorted.length - 1;
    while (left < right) {
      const sum = sorted[i] + sorted[left] + sorted[right];
      if (sum < 0) left++;
      else if (sum > 0) right--;
      else {
        result.push([sorted[i], sorted[left], sorted[right]]);
        left++;
        right--;
        // Skip repeats of the value just used so the same triplet isn't added twice.
        while (left < right && sorted[left] === sorted[left - 1]) left++;
      }
    }
  }
  return result;
}
```

**Time:** `O(n²)` (`n` choices of `i` × `O(n)` scan) · **Space:** `O(n)` for the sorted copy. The sort is cheaper than the scan, so it does not change the total.

## W — Why It Matters

- "Sort first" is often the first optimisation an interviewer hopes you suggest. Say the cost out loud: `O(n log n)`.
- 3Sum is one of the most asked medium problems; **3Sum Closest** and **4Sum** reuse the same loop.
- In real code, comparator bugs (string sort on numbers, mutating shared arrays) are common production bugs.

## I — Interview Q&A

### Q: Why skip duplicates only for `left`, not also for `right`?

After `left` moves past a repeated value, the sum changes, so `right` will move on its own. Skipping on one side is enough; skipping both is also correct.

### Q: Could you solve 3Sum with a hash set instead?

Yes: fix `i`, then do the Two Sum hash-set scan on the rest. It is still `O(n²)`, but removing duplicate triplets is harder. Sorting gives you dedupe for free.

### Q: What does stable sort buy you?

If you sort by name, then sort by age, people with the same age stay in name order. In one pass, `a.age - b.age || a.name.localeCompare(b.name)` does the same thing.

## C — Common Pitfalls + Fix

### ❌ Sorting numbers without a comparator

```ts
[10, 9, 1].sort();                // ❌ [1, 10, 9] — compared as strings
[10, 9, 1].sort((a, b) => a - b); // ✅ [1, 9, 10]
```

### ❌ Returning a boolean from the comparator

`(a, b) => a > b` returns `true`/`false`, which become `1`/`0`. It never says "a goes first", so the order is wrong. Return a number.

### ❌ Skipping duplicates of `i` in the wrong place

Skip with `sorted[i] === sorted[i - 1]` (look back). Looking forward (`sorted[i + 1]`) skips the first copy and loses answers like `[-1, -1, 2]`.

### ❌ Mutating the caller's array

`values.sort(...)` reorders the input everywhere it is used. Use `[...values].sort(...)`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Boats to Save People:** each boat holds at most two people and at most `limit` total weight. Every person weighs at most `limit`. Return the fewest boats needed to carry everyone.

`weights = [3, 5, 3, 4], limit = 5` → `4` · `weights = [3, 2, 2, 1], limit = 3` → `3`

<details><summary>Hint</summary>

Sort. The heaviest person needs a boat no matter what. Pair them with the lightest person if the two fit.

</details>

### Solution

```ts
function numRescueBoats(weights: readonly number[], limit: number): number {
  const sorted = [...weights].sort((a, b) => a - b);
  let light = 0;
  let heavy = sorted.length - 1;
  let boats = 0;

  while (light <= heavy) { // <= : one person may be left alone in the middle
    if (sorted[light] + sorted[heavy] <= limit) light++; // lightest rides along
    heavy--; // heaviest always leaves on this boat
    boats++;
  }
  return boats;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)`. If the lightest person can't ride with the heaviest, nobody can, so the heaviest goes alone.

**Right now:** Run `threeSum([0, 0, 0, 0])` on paper. Check that the duplicate skips return exactly one triplet.
