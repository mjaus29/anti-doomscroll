# Frequency Counting

## T — TL;DR

Count how many times each item appears, then answer the question from the counts. Building the counts is one `O(n)` pass, and it replaces comparing items against each other.

**Reach for it when:**

- The problem says "anagram," "same letters," "most common," or "appears once."
- Order does not matter, only how many of each item there are.
- You would otherwise sort just to group equal items together.

## K — Key Concepts

### Picture it

To check if two bags of Scrabble tiles hold the same letters, you do not line them up in pairs. You tally each bag on paper: three `A`s, one `B`… If the tallies match, the bags match.

### Walk through it

Are `"rat"` and `"tar"` anagrams (same letters, same counts, any order)? Add 1 for each letter of the first word and subtract 1 for each letter of the second. If every count ends at 0, they match.

| Step | Char | Change | `counts` |
| :--- | :--- | :----- | :------- |
| 1 | `r` (first) | +1 | `r:1` |
| 2 | `a` (first) | +1 | `r:1 a:1` |
| 3 | `t` (first) | +1 | `r:1 a:1 t:1` |
| 4 | `t` (second) | −1 | `r:1 a:1 t:0` |
| 5 | `a` (second) | −1 | `r:1 a:0 t:0` |
| 6 | `r` (second) | −1 | `r:0 a:0 t:0` → anagram |

### The template

**Valid Anagram**, two ways. A `Map` works for any characters; a 26-slot array is faster when the input is only lowercase `a`–`z`.

```ts
function isAnagram(first: string, second: string): boolean {
  if (first.length !== second.length) return false; // quick reject
  const counts = new Map<string, number>();

  for (const char of first) counts.set(char, (counts.get(char) ?? 0) + 1);
  for (const char of second) {
    const remaining = (counts.get(char) ?? 0) - 1;
    if (remaining < 0) return false; // second has more of this char than first
    counts.set(char, remaining);
  }
  return true; // same length and never negative → all counts are 0
}

function isAnagramLowercase(first: string, second: string): boolean {
  if (first.length !== second.length) return false;
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < first.length; i++) {
    counts[first.charCodeAt(i) - 97]++; // "a" is char code 97
    counts[second.charCodeAt(i) - 97]--;
  }
  return counts.every((count) => count === 0);
}
```

**Time:** `O(n)` · **Space:** `O(k)` where `k` is the number of distinct characters (`O(1)` for the fixed 26-slot array).

### Interview classic: Group Anagrams

Group words that are anagrams of each other. Example: `["eat", "tea", "tan", "ate", "nat", "bat"]` → `[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]` (any order).

- **Brute force:** compare every pair of words with `isAnagram` — `O(n² × L)` for `n` words of length `L`.
- **Key insight:** give each word a *signature* that is equal for all its anagrams, and use it as a `Map` key. The 26 letter counts joined into a string work as a signature.

```ts
function groupAnagrams(words: readonly string[]): string[][] {
  const groups = new Map<string, string[]>(); // signature → words with it

  for (const word of words) {
    const counts = new Array<number>(26).fill(0);
    for (let i = 0; i < word.length; i++) counts[word.charCodeAt(i) - 97]++;
    const signature = counts.join(","); // "1,0,0,...": same for every anagram

    const group = groups.get(signature);
    if (group) group.push(word);
    else groups.set(signature, [word]);
  }
  return [...groups.values()];
}
```

This is the template's count array, reused as a key. Sorting each word (`[...word].sort().join("")`) also works as a signature but costs `O(L log L)` per word instead of `O(L)`.

## W — Why It Matters

- Anagram, permutation, and "most frequent" questions are among the most common screening problems.
- Counting is the inner engine of fixed sliding windows (Day 3) and Top K problems (Day 8).
- Interviewers like to hear "the counts are the signature" because it shows you see past the surface wording.
- Real code counts things constantly: word frequencies, log error codes, votes.

## I — Interview Q&A

### Q: Map or 26-slot array?

Use the array when the problem guarantees lowercase English letters: it is faster and uses fixed memory. Use a `Map` for Unicode, mixed case, or arbitrary items.

### Q: Why join counts with a comma?

Without a separator, counts `[1, 11]` and `[11, 1]` would both become `"111"`. The comma keeps signatures unique.

### Q: What if the input is Unicode, like emoji?

Iterate with `for...of` (it walks whole characters, not code units) and count in a `Map`. `charCodeAt` and a 26-slot array no longer apply.

## C — Common Pitfalls + Fix

### ❌ Forgetting the length check

Without it, `"ab"` and `"a"` can pass the "never negative" check. Compare lengths first.

### ❌ `counts.get(char) + 1` on a missing key

```ts
const counts = new Map<string, number>();
// counts.set("a", counts.get("a") + 1);      // ❌ NaN, and a TS error
counts.set("a", (counts.get("a") ?? 0) + 1); // ✅
```

### ❌ Default sort for signatures with numbers

`[10, 9].sort()` puts `10` first because it compares as text. For letter signatures this is fine; for numbers, pass a comparator.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**First Unique Character in a String:** return the index of the first character that appears exactly once, or `-1` if there is none. The string has only lowercase letters.

`"leetcode"` → `0` · `"loveleetcode"` → `2` · `"aabb"` → `-1`

<details><summary>Hint</summary>

Two passes: first count every character, then find the first index whose count is 1.

</details>

### Solution

```ts
function firstUniqChar(text: string): number {
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < text.length; i++) counts[text.charCodeAt(i) - 97]++;

  for (let i = 0; i < text.length; i++) {
    if (counts[text.charCodeAt(i) - 97] === 1) return i; // second pass keeps the order
  }
  return -1;
}
```

**Time:** `O(n)` · **Space:** `O(1)` (26 slots). The first pass gathers counts; the second pass walks in the original order, so the first match is the earliest unique character.

**Right now:** Write the count-array signature for `"tea"` and `"ate"` by hand and check they are the same string.
