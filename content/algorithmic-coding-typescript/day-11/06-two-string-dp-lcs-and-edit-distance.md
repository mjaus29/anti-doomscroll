# Two-String DP: LCS and Edit Distance

## T — TL;DR

When a problem compares two strings, use a 2D table where the cell `(i, j)` answers the question for the **first `i` characters of one string** and the **first `j` characters of the other**. Each cell looks at its top, left, and top-left neighbours, so the table fills like the grid in the last lesson.

**Reach for it when:**

- There are **two** strings (or arrays) and you compare or transform one into the other.
- The words "common subsequence", "edit", "insert/delete/replace", or "interleave" appear.
- Brute force would try every way to line the strings up.

## K — Key Concepts

### Picture it

Lay one word along the top of a sheet of graph paper and the other down the side. Each square answers "how do these two **prefixes** (beginnings) compare?" To fill a square you only peek at three squares already done: above, left, and diagonally up-left.

### The four questions (Longest Common Subsequence)

- **State:** `common[i][j]` = length of the longest common subsequence of `first.slice(0, i)` and `second.slice(0, j)`.
- **Transition:** if `first[i - 1] === second[j - 1]`, the match extends the diagonal: `common[i - 1][j - 1] + 1`. Otherwise drop one character from either string: `max(common[i - 1][j], common[i][j - 1])`.
- **Base case:** row 0 and column 0 are `0` (an empty prefix has nothing in common).
- **Answer:** `common[first.length][second.length]`.

### Walk through it

`first = "abcde"` (down the side), `second = "ace"` (across the top). Bold cells are matches (diagonal + 1).

| | "" | a | c | e |
| :- | :- | :- | :- | :- |
| **""** | 0 | 0 | 0 | 0 |
| **a** | 0 | **1** | 1 | 1 |
| **b** | 0 | 1 | 1 | 1 |
| **c** | 0 | 1 | **2** | 2 |
| **d** | 0 | 1 | 2 | 2 |
| **e** | 0 | 1 | 2 | **3** |

Answer `3` (`"ace"`). The extra row and column for `""` are what make the base case free.

### The template

```ts
function longestCommonSubsequence(first: string, second: string): number {
  const rows = first.length + 1;
  const cols = second.length + 1;
  const common: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (first[i - 1] === second[j - 1]) {
        common[i][j] = common[i - 1][j - 1] + 1; // both characters join the subsequence
      } else {
        common[i][j] = Math.max(common[i - 1][j], common[i][j - 1]); // drop one of them
      }
    }
  }
  return common[rows - 1][cols - 1];
}
```

**Time:** `O(m × n)` · **Space:** `O(m × n)` — one constant-time step per cell (`m`, `n` = string lengths).

### Interview classic: Edit Distance

Return the fewest single-character **inserts, deletes, or replaces** that turn `source` into `target`.
Example: `"horse"` → `"ros"` = `3` (replace h → r, delete r, delete e).

- **Brute force:** try every sequence of edits — exponential.
- **Key insight:** look at the last characters. If they match, no edit is needed for them. If not, the last edit was one of three, each leading to a smaller cell.

- **State:** `edits[i][j]` = fewest edits to turn the first `i` chars of `source` into the first `j` chars of `target`.
- **Transition:** match → `edits[i - 1][j - 1]`; otherwise `1 + min(replace = edits[i - 1][j - 1], delete = edits[i - 1][j], insert = edits[i][j - 1])`.
- **Base case:** `edits[i][0] = i` (delete everything), `edits[0][j] = j` (insert everything). **Answer:** bottom-right.

| | "" | r | o | s |
| :- | :- | :- | :- | :- |
| **""** | 0 | 1 | 2 | 3 |
| **h** | 1 | 1 | 2 | 3 |
| **o** | 2 | 2 | 1 | 2 |
| **r** | 3 | 2 | 2 | 2 |
| **s** | 4 | 3 | 3 | 2 |
| **e** | 5 | 4 | 4 | **3** |

```ts
function minDistance(source: string, target: string): number {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const edits: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i++) edits[i][0] = i;
  for (let j = 0; j < cols; j++) edits[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (source[i - 1] === target[j - 1]) {
        edits[i][j] = edits[i - 1][j - 1]; // last chars match: free
      } else {
        edits[i][j] = 1 + Math.min(
          edits[i - 1][j - 1], // replace source[i - 1] with target[j - 1]
          edits[i - 1][j],     // delete source[i - 1]
          edits[i][j - 1],     // insert target[j - 1]
        );
      }
    }
  }
  return edits[rows - 1][cols - 1];
}
```

Same table, same three neighbours; only the base cases and the "match / no match" rules changed.

## W — Why It Matters

- These two problems are the parents of a whole family: Delete Operation, Shortest Common Supersequence, Distinct Subsequences, Interleaving String.
- Real uses: `git diff` (LCS of lines), spell-check suggestions, DNA alignment.
- Interviewers want you to say what each of the three neighbours **means**, not just the formula.

## I — Interview Q&A

### Q: Can you reduce the space?

Yes. Each row only reads the row above, so keep two rows (`O(n)` space). For the diagonal value in a single-row version, save it in a variable before you overwrite it.

### Q: How would you return the actual LCS string?

Start at the bottom-right cell. If the characters match, record it and move diagonally; otherwise move toward the larger of up and left. Reverse the recorded characters at the end.

### Q: Why do the tables have an extra row and column?

Index `0` means "empty prefix." It gives every cell a valid neighbour and turns the base case into a simple row and column instead of special `if` checks.

## C — Common Pitfalls + Fix

### ❌ Off-by-one between table and string indexes

Cell `(i, j)` talks about characters `first[i - 1]` and `second[j - 1]`. Comparing `first[i]` silently skips the first letter.

### ❌ Treating subsequence like substring

A *substring* is contiguous; a subsequence may skip characters. For longest common **substring**, a mismatch resets the cell to `0` instead of taking the max.

### ❌ Forgetting the base row and column in Edit Distance

```ts
const edits = Array.from({ length: rows }, () => new Array(cols).fill(0)); // ❌ alone
for (let i = 0; i < rows; i++) edits[i][0] = i; // ✅ delete all i characters
for (let j = 0; j < cols; j++) edits[0][j] = j; // ✅ insert all j characters
```

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Delete Operation for Two Strings:** in one step you may delete one character from either string. Return the fewest steps to make the two strings equal.

`"sea"`, `"eat"` → `2` (delete `s` from the first, `t` from the second)

<details><summary>Hint</summary>

The characters you keep form a common subsequence. Keep the **longest** one and delete everything else.

</details>

### Solution

```ts
function minDeleteSteps(first: string, second: string): number {
  const rows = first.length + 1;
  const cols = second.length + 1;
  const common: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      common[i][j] = first[i - 1] === second[j - 1]
        ? common[i - 1][j - 1] + 1
        : Math.max(common[i - 1][j], common[i][j - 1]);
    }
  }
  const keep = common[rows - 1][cols - 1];
  return first.length - keep + (second.length - keep); // delete the rest of each
}
```

**Time:** `O(m × n)` · **Space:** `O(m × n)`. Whatever survives the deletions is a common subsequence, so keeping the longest one means deleting the fewest characters.

**Right now:** Draw the LCS table for `"sea"` and `"eat"` and check the bottom-right cell is `2`.
