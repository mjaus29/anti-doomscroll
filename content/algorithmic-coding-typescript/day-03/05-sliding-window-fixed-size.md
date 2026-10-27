# Sliding Window: Fixed Size

## T — TL;DR

When every window has the same length `k`, build the first window once, then slide it one step at a time: add the item that enters on the right and remove the item that leaves on the left. Each slide costs `O(1)`, so the whole scan is `O(n)` instead of `O(n × k)`.

**Reach for it when:**

- The problem gives a fixed length: "every subarray of size `k`", "substring of length `k`".
- You need a max, min, average, or count over each of those windows.
- You compare each window to a fixed pattern (same letters, same counts).

## K — Key Concepts

### Picture it

A train window `k` seats wide, moving past a row of houses. Each time the train moves one house forward, one new house appears on the right and one disappears on the left. You never need to look at the houses in the middle again.

### Walk through it

Largest sum of any `3` neighbours. `values = [2, 1, 5, 1, 3, 2]`, `k = 3`.

| Window (indexes) | Enters | Leaves | Sum | Best |
| :--------------- | :----- | :----- | :-- | :--- |
| 0..2 | — | — | 2 + 1 + 5 = 8 | 8 |
| 1..3 | 1 | 2 | 8 + 1 − 2 = 7 | 8 |
| 2..4 | 3 | 1 | 7 + 3 − 1 = 9 | 9 |
| 3..5 | 2 | 5 | 9 + 2 − 5 = 6 | 9 |

Answer: `9`. Every row after the first does one add and one subtract, no matter how big `k` is.

### The template

```ts
// Assumes 1 <= k <= values.length.
function maxSumOfSizeK(values: readonly number[], k: number): number {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += values[i]; // build the first window
  let best = sum;

  for (let right = k; right < values.length; right++) {
    // values[right] enters; values[right - k] is the item that just fell out.
    sum += values[right] - values[right - k];
    best = Math.max(best, sum);
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — one pass, one add and one subtract per step.

The window ending at `right` starts at `right - k + 1`. That index is what you report when the problem asks *where* a window is.

### Interview classic: Find All Anagrams in a String

Return every start index in `text` where a substring is an *anagram* of `pattern` (same letters, same counts, any order). Lowercase letters only.
Example: `text = "cbaebabacd", pattern = "abc"` → `[0, 6]` (`"cba"` and `"bac"`).

- **Brute force:** for each start, sort or count the `k` letters and compare — `O(n × k)`.
- **Key insight:** the window length is fixed at `pattern.length`. Keep a 26-slot letter count for the window and update two slots per slide.

```ts
function findAnagrams(text: string, pattern: string): number[] {
  const k = pattern.length;
  if (k > text.length) return [];

  const letter = (char: string): number => char.charCodeAt(0) - 97; // 'a' → 0
  const need = new Array<number>(26).fill(0);
  const have = new Array<number>(26).fill(0);
  for (let i = 0; i < k; i++) {
    need[letter(pattern[i])]++;
    have[letter(text[i])]++; // first window
  }

  const sameCounts = (): boolean => need.every((count, i) => count === have[i]);
  const starts: number[] = sameCounts() ? [0] : [];

  for (let right = k; right < text.length; right++) {
    have[letter(text[right])]++;     // enters
    have[letter(text[right - k])]--; // leaves
    if (sameCounts()) starts.push(right - k + 1);
  }
  return starts;
}
```

Comparing two 26-slot arrays is constant work, so each slide is still `O(1)` and the total is `O(n)`. It is the same template with a count array as the window state.

## W — Why It Matters

- Fixed windows appear as "average of every `k`", "anagram/permutation in string", and "best `k` consecutive days" questions.
- In real code: moving averages on charts, "requests in the last 60 seconds", and checksum scans.
- Interviewers listen for the slide step: "add the new one, remove the old one, no re-summing."

## I — Interview Q&A

### Q: How is this different from the variable-size window?

Here the size never changes, so `left` is always `right - k + 1` and you don't need a `while` loop. Variable windows grow and shrink based on a rule.

### Q: How would you avoid comparing all 26 counts every step?

Track a `matches` number: how many of the 26 letters have equal counts. Update it only for the two letters that changed. It saves a constant factor, not Big-O.

### Q: What if `k` is bigger than the array?

There is no full window. Return an empty result (or `0`, or what the problem says) before the loop, or the first loop reads past the end.

## C — Common Pitfalls + Fix

### ❌ Re-summing every window

```ts
const sum = values.slice(right - k + 1, right + 1).reduce((a, b) => a + b, 0); // ❌ O(k)
sum += values[right] - values[right - k];                                      // ✅ O(1)
```

### ❌ Removing the wrong index

The item that leaves when `right` enters is `values[right - k]`, not `values[right - k + 1]` (that one is still inside).

### ❌ Forgetting to check the first window

The first window is built before the sliding loop. Check or record it before you start sliding, or you miss answers at index `0`.

### ❌ Assuming letters are only lowercase

`charCodeAt(0) - 97` breaks on uppercase, digits, or spaces. If the input may contain them, use a `Map<string, number>` instead.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Maximum Number of Vowels in a Substring of Given Length:** return the largest number of vowels (`a`, `e`, `i`, `o`, `u`) in any substring of `text` with length `k`.

`text = "abciiidef", k = 3` → `3` (`"iii"`) · `text = "leetcode", k = 3` → `2`

<details><summary>Hint</summary>

The window state is a vowel count. When the window slides, add 1 if the new letter is a vowel and subtract 1 if the leaving letter was one.

</details>

### Solution

```ts
function maxVowels(text: string, k: number): number {
  const isVowel = (char: string): boolean => "aeiou".includes(char);
  let count = 0;
  for (let i = 0; i < k; i++) if (isVowel(text[i])) count++; // first window
  let best = count;

  for (let right = k; right < text.length; right++) {
    if (isVowel(text[right])) count++;     // enters
    if (isVowel(text[right - k])) count--; // leaves
    best = Math.max(best, count);
  }
  return best;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. `"aeiou".includes` scans 5 letters, which is constant work, so each slide stays `O(1)`.

**Right now:** Trace `findAnagrams("abab", "ab")` and write the `have` counts for `a` and `b` at each step. You should get `[0, 1, 2]`.
