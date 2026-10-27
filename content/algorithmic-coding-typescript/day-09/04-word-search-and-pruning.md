# Word Search and Pruning

## T — TL;DR

*Pruning* means stopping a backtracking branch as soon as you can prove it will never lead to an answer. The search is still exponential in the worst case, but cutting dead branches early often makes it fast enough.

**Reach for it when:**

- You are backtracking and can check "is this partial answer already broken?" cheaply.
- The search walks a grid or path and must not reuse a cell.
- There is a running count or limit (open brackets, remaining sum) that can rule a branch out.

## K — Key Concepts

### Picture it

You search a hedge maze for a path that spells a word on the floor tiles. The moment a tile has the wrong letter, you turn back. You do not walk the rest of that corridor. You also chalk each tile you stand on so you never loop, and wipe the chalk when you back out.

### Walk through it

Board below, word `"SEE"`. Each step checks one cell against one letter of the word.

```text
A B C E
S F C S
A D E E
```

| Step | Cell (row, col) | Letter needed | Result and why |
| :--- | :-------------- | :------------ | :------------- |
| 1 | (1, 0) `S` | `S` | Match. Mark it, try its 4 neighbours for `E`. |
| 2 | (0, 0), (2, 0), (1, 1) | `E` | `A`, `A`, `F`: wrong letters, each pruned at once. Unmark (1, 0). |
| 3 | (1, 3) `S` | `S` | Match. Mark it. |
| 4 | (2, 3) `E` | `E` | Down is tried first, and it matches. Mark it. |
| 5 | (2, 2) `E` | `E` | Down is off the board, up is marked `#`, right is off. Left matches: word found. |

Step 2 is the pruning: three branches die after one comparison each.

### The template

A small example: pick exactly `length` values (repeats allowed) from positive `options` so they sum to `target`, and return the first such list.

```ts
function findSequence(
  options: readonly number[], target: number, length: number,
): number[] | null {
  const path: number[] = [];

  const backtrack = (total: number): boolean => {
    if (total > target) return false;         // prune: positive values only grow it
    if (path.length === length) return total === target; // complete: check it
    for (const option of options) {
      path.push(option);                      // choose
      if (backtrack(total + option)) return true; // explore; stop on success
      path.pop();                             // un-choose
    }
    return false;
  };

  return backtrack(0) ? [...path] : null;
}
```

The **prune check comes first** in each call, before any more work. **Time:** exponential in the worst case, less in practice · **Space:** `O(length)` for the stack and `path`.

### Interview classic: Word Search

Given a grid of letters and a word, return `true` if the word can be traced through cells that touch up, down, left, or right, using each cell at most once.
Example: the board above with `"ABCCED"` → `true`, with `"ABCB"` → `false` (would reuse `B`).

- **Brute force:** list every path in the grid and compare — far too many paths.
- **Key insight:** start a DFS from each cell, and prune the moment a cell is out of bounds, already used, or has the wrong letter. Mark a cell while it is on the path, unmark it when you back out.

```ts
function exist(board: string[][], word: string): boolean {
  const rows = board.length;
  const cols = board[0].length;

  const search = (row: number, col: number, index: number): boolean => {
    if (index === word.length) return true;                 // every letter matched
    if (row < 0 || col < 0 || row >= rows || col >= cols) return false;
    if (board[row][col] !== word[index]) return false;      // prune: wrong or used

    const saved = board[row][col];
    board[row][col] = "#";                                  // mark: on the path
    const found =
      search(row + 1, col, index + 1) || search(row - 1, col, index + 1) ||
      search(row, col + 1, index + 1) || search(row, col - 1, index + 1);
    board[row][col] = saved;                                // unmark: restore
    return found;
  };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (search(row, col, 0)) return true;
    }
  }
  return false;
}
```

**Time:** `O(rows · cols · 3ᴸ)` where `L` is the word length — after the first step each cell has at most 3 new neighbours. **Space:** `O(L)` for the stack. Writing `#` into the cell is the "choose" step; putting the letter back is "un-choose".

## W — Why It Matters

- Word Search is the standard test of grid backtracking with mark and unmark.
- Pruning is what makes puzzle solvers (Sudoku, N-Queens, schedulers) finish in time.
- Interviewers listen for you to name the prune checks and to restore the board afterward.

## I — Interview Q&A

### Q: Why restore the cell after searching?

The same cell may be needed by a different path that starts somewhere else. If it stays `#`, later searches miss valid answers.

### Q: What extra pruning could speed it up?

Count letters first: if the board has fewer `E`s than the word needs, return `false` before searching. Also, if the last letter of the word is rarer than the first, search the reversed word.

### Q: Have you seen N-Queens?

Place one queen per row. Before placing, prune any column or diagonal already under attack, tracked with three sets (columns, `row - col`, `row + col`). It is the same choose → explore → un-choose loop.

## C — Common Pitfalls + Fix

### ❌ Not marking visited cells

Without the mark, `"ABA"` could be traced by stepping from `A` to `B` and back to the same `A`.

### ❌ Forgetting to unmark on the way back

```ts
board[row][col] = "#";
return search(row + 1, col, index + 1) || ...; // ❌ returns before restoring
// ✅ store the result in `found`, restore the cell, then return found
```

### ❌ Checking bounds after reading the cell

`board[row][col]` with `row = -1` reads `undefined[col]` and throws. Check bounds first.

### ❌ Pruning too late

Checking the letter only after recursing into neighbours does the expensive work first. Put cheap "is this already wrong?" checks at the top of the function.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Generate Parentheses:** given `n`, return every string of `n` pairs of brackets that is balanced (every `(` is closed by a later `)`).

`n = 3` → `["((()))", "(()())", "(())()", "()(())", "()()()"]`

<details><summary>Hint</summary>

Track how many `(` and `)` you have placed. You may add `(` while `open < n`. You may add `)` only while `close < open`. Every other branch is pruned.

</details>

### Solution

```ts
function generateParenthesis(n: number): string[] {
  const result: string[] = [];
  const path: string[] = [];

  const backtrack = (open: number, close: number): void => {
    if (path.length === 2 * n) { result.push(path.join("")); return; }
    if (open < n) {            // room for another opener
      path.push("(");
      backtrack(open + 1, close);
      path.pop();
    }
    if (close < open) {        // only close what is open: prunes invalid strings
      path.push(")");
      backtrack(open, close + 1);
      path.pop();
    }
  };

  backtrack(0, 0);
  return result;
}
```

**Time:** about `O(4ⁿ / √n)` (the count of valid answers, times `n` to build each) · **Space:** `O(n)` besides the output. Because the two rules never allow a broken prefix, every branch that reaches length `2n` is a valid answer.

**Right now:** Trace `exist` on the board above with `"SEE"` and write which cells get marked `#` and in what order.
