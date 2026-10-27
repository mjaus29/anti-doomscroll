# String Techniques

## T — TL;DR

Strings in JavaScript are *immutable* (they cannot be changed in place), so build new strings with an array and `join`, and compare characters by index or char code. For palindrome problems, grow outward from each center instead of checking every substring.

**Reach for it when:**

- You build a string piece by piece inside a loop.
- You need to compare, count, or shift characters (`"a"` → `"b"`).
- The problem says "palindrome," "substring," or "prefix."

## K — Key Concepts

### Picture it

A printed page cannot be edited; you can only print a new page. Writing `text += "x"` in a loop may reprint the whole page each time. Collecting pieces in a list and printing once at the end is much cheaper.

### Walk through it

Expand around a center to find the longest palindrome (a string that reads the same both ways) in `"cbabd"`, using the center at index 2 (`"a"`):

| Step | left → char | right → char | Match? | Palindrome so far |
| :--- | :---------- | :----------- | :----- | :---------------- |
| 1 | 2 → `a` | 2 → `a` | yes | `"a"` |
| 2 | 1 → `b` | 3 → `b` | yes | `"bab"` |
| 3 | 0 → `c` | 4 → `d` | no | stop: `"bab"` |

Even-length palindromes like `"abba"` have a center *between* two characters, so you also try `left = i, right = i + 1`.

### The template

```ts
// Build strings with an array, then join once
function repeatWithDashes(word: string, times: number): string {
  const parts: string[] = [];
  for (let i = 0; i < times; i++) parts.push(word);
  return parts.join("-");
}

// Split into characters; [...text] handles emoji safely, text.split("") does not
const chars = [..."hello"]; // ["h", "e", "l", "l", "o"]
const reversed = [...chars].reverse().join(""); // "olleh"

// Char codes: shift a lowercase letter by one ("z" wraps to "a")
function nextLetter(char: string): string {
  const offset = char.charCodeAt(0) - 97; // "a" is 97
  return String.fromCharCode(97 + ((offset + 1) % 26));
}

// Expand around a center: returns [start, end) of the longest palindrome there
function expand(text: string, left: number, right: number): [number, number] {
  while (left >= 0 && right < text.length && text[left] === text[right]) {
    left--;
    right++;
  }
  return [left + 1, right]; // the loop overshoots by one on each side
}
```

**Time:** `join` over `n` total characters is `O(n)`; one `expand` call is `O(n)` · **Space:** `O(n)` for the parts array.

### Interview classic: Longest Palindromic Substring

Return the longest contiguous substring that is a palindrome.
Example: `"babad"` → `"bab"` (or `"aba"`) · `"cbbd"` → `"bb"`.

- **Brute force:** check every substring for being a palindrome — `O(n²)` substrings × `O(n)` check = `O(n³)`.
- **Key insight:** every palindrome has a center. There are only `2n - 1` centers (each character, and each gap between two characters). Expanding from each one costs `O(n)`, so the total is `O(n²)`.

```ts
function longestPalindrome(text: string): string {
  let bestStart = 0;
  let bestEnd = 0; // half-open: text.slice(bestStart, bestEnd)

  for (let i = 0; i < text.length; i++) {
    for (const [start, end] of [expand(text, i, i), expand(text, i, i + 1)]) {
      if (end - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = end;
      }
    }
  }
  return text.slice(bestStart, bestEnd); // slice once at the end, not in the loop
}
```

It reuses `expand` from the template: odd-length centers start at `(i, i)`, even-length centers at `(i, i + 1)`. Tracking indexes and slicing once avoids building throwaway strings.

## W — Why It Matters

- String questions are common phone-screen warm-ups, and they test care with indexes and off-by-one errors.
- Expand-around-center is a short, easy-to-explain `O(n²)` answer that interviewers accept for this problem.
- `array + join` is how real code builds HTML, CSV, and log lines efficiently.
- Interviewers notice whether you know strings are immutable and what that costs.

## I — Interview Q&A

### Q: Is `text += char` in a loop really `O(n²)`?

It can be, since each new string may copy the old one. Modern engines often optimize it, but `push` + `join` is guaranteed linear, so it is the safer answer to give.

### Q: Why `[...text]` instead of `text.split("")`?

`split("")` splits into UTF-16 code units, which breaks emoji into two broken halves. Spreading walks whole characters (code points).

### Q: Is there a faster palindrome algorithm?

Manacher's algorithm runs in `O(n)`, but it is rarely expected in interviews. Mention it by name and stick with expand-around-center.

## C — Common Pitfalls + Fix

### ❌ Forgetting even-length centers

Expanding only from `(i, i)` finds `"aba"` but never `"abba"`. Always try `(i, i + 1)` too.

### ❌ Off-by-one after expanding

```ts
const text = "aba";
let left = -1;
let right = 3; // where the loop stops for "aba"
const wrong = text.slice(left, right);     // ❌ "a": slice(-1) counts from the end
const fixed = text.slice(left + 1, right); // ✅ "aba"
```

### ❌ Trying to change a character in place

`text[0] = "X"` is a TypeScript error and never changes the string. Convert to an array, edit it, then `join("")`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Longest Common Prefix:** return the longest string that every word in the array starts with. Return `""` if there is none.

`["flower", "flow", "flight"]` → `"fl"` · `["dog", "racecar", "car"]` → `""`

<details><summary>Hint</summary>

Check one character position at a time across all words. Stop at the first mismatch or when any word runs out.

</details>

### Solution

```ts
function longestCommonPrefix(words: readonly string[]): string {
  if (words.length === 0) return "";
  const first = words[0];

  for (let i = 0; i < first.length; i++) {
    for (const word of words) {
      if (i >= word.length || word[i] !== first[i]) return first.slice(0, i);
    }
  }
  return first; // every character of the first word matched
}
```

**Time:** `O(S)` where `S` is the total number of characters · **Space:** `O(1)` extra. Scanning column by column stops as soon as one word disagrees, and slicing once avoids building the prefix piece by piece.

**Right now:** Trace `longestPalindrome("cbbd")` and write down the `[start, end)` returned by both `expand` calls at `i = 1`.
