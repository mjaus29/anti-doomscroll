# Sliding Window: Variable Size

## T — TL;DR

A *window* is a stretch of neighbouring items between two indexes, `left` and `right`. Grow it by moving `right`; when it breaks the rule, shrink it by moving `left` until it is valid again. Each item enters and leaves once, so you check `O(n)` windows instead of all `O(n²)` subarrays.

**Reach for it when:**

- The problem asks for the **longest** or **shortest** contiguous subarray or substring.
- There is a rule the window must follow ("no repeats", "sum at most k", "at most k zeros").
- Breaking the rule can only be fixed by removing items from the left.

## K — Key Concepts

### Picture it

A caterpillar crawling along a branch. Its head (`right`) always moves forward. When its body gets too long or too heavy, its tail (`left`) catches up. It never crawls backwards.

### Walk through it

Longest window with sum at most `5`. `values = [2, 1, 3, 1, 1, 2]` (no negatives).

| right → value | Sum after adding | Shrink? | Window | Best |
| :------------ | :--------------- | :------ | :----- | :--- |
| 0 → 2 | 2 | No | `[2]` | 1 |
| 1 → 1 | 3 | No | `[2, 1]` | 2 |
| 2 → 3 | 6 | Yes: drop `2` → sum 4 | `[1, 3]` | 2 |
| 3 → 1 | 5 | No | `[1, 3, 1]` | 3 |
| 4 → 1 | 6 | Yes: drop `1` → sum 5 | `[3, 1, 1]` | 3 |
| 5 → 2 | 7 | Yes: drop `3` → sum 4 | `[1, 1, 2]` | 3 |

Answer: `3`. Shrinking is safe because, with no negatives, a window that is too heavy stays too heavy when it grows.

### The template

```ts
function longestWithSumAtMost(values: readonly number[], limit: number): number {
  let left = 0;
  let sum = 0;  // state that describes the current window
  let best = 0;

  for (let right = 0; right < values.length; right++) {
    sum += values[right];   // 1. grow: take the new item in

    while (sum > limit) {   // 2. shrink while the window breaks the rule
      sum -= values[left];
      left++;
    }

    best = Math.max(best, right - left + 1); // 3. window is valid: record it
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — the inner `while` looks nested, but `left` only moves forward, so it runs at most `n` times in total.

Swap the state (`sum`) and the rule (`sum > limit`) to fit the problem. The three steps stay the same.

### Interview classic: Longest Substring Without Repeating Characters

Return the length of the longest substring with no repeated character.
Example: `"abcabcbb"` → `3` (`"abc"`) · `"pwwkew"` → `3` (`"wke"`).

- **Brute force:** check every substring for repeats — `O(n²)` substrings, `O(n³)` with the check.
- **Key insight:** keep the window's characters in a `Set`. When the new character is already in it, drop characters from the left until it is not.

```ts
function lengthOfLongestSubstring(text: string): number {
  const inWindow = new Set<string>();
  let left = 0;
  let best = 0;

  for (let right = 0; right < text.length; right++) {
    const char = text[right];
    while (inWindow.has(char)) { // rule broken: char would repeat
      inWindow.delete(text[left]);
      left++;
    }
    inWindow.add(char);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

Same three steps; the state is a `Set` and the rule is "no repeats".

### Variation: Minimum Size Subarray Sum

Shortest window with sum **at least** `target` (positive numbers); return `0` if none.
`target = 7, values = [2, 3, 1, 2, 4, 3]` → `2` (`[4, 3]`). For "shortest", record the answer **inside** the loop, while the window is valid, then shrink to try a smaller one.

```ts
function minSubArrayLen(target: number, values: readonly number[]): number {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < values.length; right++) {
    sum += values[right];
    while (sum >= target) { // valid: record, then try to shrink
      best = Math.min(best, right - left + 1);
      sum -= values[left];
      left++;
    }
  }
  return best === Infinity ? 0 : best;
}
```

## W — Why It Matters

- "Longest/shortest substring or subarray with a rule" is one of the most common interview question shapes.
- It shows up in real code as rate limiters, rolling metrics, and log scanning.
- Interviewers listen for why it is `O(n)` despite the nested loop: "each index enters once and leaves once."

## I — Interview Q&A

### Q: Why does this fail with negative numbers in a sum problem?

Removing a negative number from the left makes the sum **bigger**, so shrinking no longer fixes the window. Use prefix sums with a hash map instead (Day 2, Prefix Sums).

### Q: Longest vs shortest — what changes?

Longest: shrink while **invalid**, record after the loop. Shortest: shrink while **valid**, record inside the loop.

### Q: Can you make the Set version jump `left` instead of stepping?

Yes: store each character's last index in a `Map` and set `left = Math.max(left, lastIndex + 1)`. Same `O(n)`, fewer steps.

## C — Common Pitfalls + Fix

### ❌ Using `if` instead of `while` to shrink

One step left may not be enough. In `"abba"`, the second `b` needs `left` to move past both `a` and the first `b`. Keep shrinking until valid.

### ❌ Off-by-one on the length

The window `left..right` includes both ends, so its length is `right - left + 1`, not `right - left`.

### ❌ Forgetting to undo state when shrinking

Whatever you added for `values[right]`, you must remove for `values[left]` before `left++`.

### ❌ Returning `Infinity`

For "shortest", start `best` at `Infinity` and convert to `0` (or what the problem asks) if nothing was found.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Max Consecutive Ones III:** `bits` holds only `0`s and `1`s. You may flip at most `k` zeros to ones. Return the length of the longest run of ones you can make.

`bits = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], k = 2` → `6`

<details><summary>Hint</summary>

Rephrase it: find the longest window that contains at most `k` zeros. Track the zero count.

</details>

### Solution

```ts
function longestOnes(bits: readonly number[], k: number): number {
  let left = 0;
  let zeros = 0; // zeros inside the window = flips we would need
  let best = 0;

  for (let right = 0; right < bits.length; right++) {
    if (bits[right] === 0) zeros++;
    while (zeros > k) {
      if (bits[left] === 0) zeros--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. You never flip anything; a window with at most `k` zeros is exactly a run you could make by flipping them.

**Right now:** Trace `lengthOfLongestSubstring("abba")` and write `left`, `right`, and the set after each step.
