# Try Every Choice: Coin Change and Word Break

## T — TL;DR

When each step has **many** possible moves (any coin, any word), the state's answer is the best result over **every** choice, each one pointing back to a smaller saved state. You fill states from small to large, trying all choices at each one.

**Reach for it when:**

- You build a target (an amount, a string) from pieces you may **reuse**.
- The question asks for the fewest pieces, the number of ways, or "is it possible at all?"
- Greedy (largest piece first) fails on a small example.

## K — Key Concepts

### Picture it

You need to pay exactly 6 with coins `1, 3, 4`. For every amount from 1 up to 6, you write on a sticky note "fewest coins for this amount." To fill a note you ask: "If my last coin is 1, 3, or 4, what does the note for the leftover amount say?" You take the best and add one coin.

### The four questions (Coin Change)

- **State:** `fewest[a]` = the fewest coins that add up to exactly `a` (`Infinity` if impossible).
- **Transition:** for every coin `c ≤ a`: `fewest[a] = min(fewest[a], fewest[a - c] + 1)` — "the last coin was `c`."
- **Base case:** `fewest[0] = 0` (zero coins make zero).
- **Answer:** `fewest[amount]`, or `-1` if it is still `Infinity`.

### Walk through it

Coins `[1, 3, 4]`, amount `6`. (`∞` means "not reachable yet.")

| a | last coin 1 | last coin 3 | last coin 4 | fewest[a] |
| :- | :- | :- | :- | :- |
| 0 | — | — | — | 0 |
| 1 | fewest[0]+1 = 1 | — | — | 1 |
| 2 | fewest[1]+1 = 2 | — | — | 2 |
| 3 | fewest[2]+1 = 3 | fewest[0]+1 = 1 | — | 1 |
| 4 | fewest[3]+1 = 2 | fewest[1]+1 = 2 | fewest[0]+1 = 1 | 1 |
| 5 | fewest[4]+1 = 2 | fewest[2]+1 = 3 | fewest[1]+1 = 2 | 2 |
| 6 | fewest[5]+1 = 3 | fewest[3]+1 = **2** | fewest[2]+1 = 3 | **2** |

Answer `2` (3 + 3). Greedy would take 4 + 1 + 1 = 3 coins.

### The template

```ts
function bestOverChoices(target: number, pieces: readonly number[]): number {
  const best: number[] = new Array(target + 1).fill(Infinity);
  best[0] = 0; // base case
  for (let a = 1; a <= target; a++) {
    for (const piece of pieces) { // try every choice for the LAST piece
      if (piece <= a) best[a] = Math.min(best[a], best[a - piece] + 1);
    }
  }
  return best[target];
}
```

**Time:** `O(target × pieces)` · **Space:** `O(target)` — every amount tries every piece once.

### Interview classic: Coin Change

Return the fewest coins that make `amount` (coins can be reused), or `-1` if impossible.
Example: `coins = [1, 2, 5]`, `amount = 11` → `3` (5 + 5 + 1).

- **Brute force:** recursively try every coin at every step — exponential.
- **Key insight:** the fewest coins for `a` depends only on smaller amounts, and there are only `amount + 1` of them.

```ts
function coinChange(coins: readonly number[], amount: number): number {
  const fewest: number[] = new Array(amount + 1).fill(Infinity);
  fewest[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a) fewest[a] = Math.min(fewest[a], fewest[a - coin] + 1);
    }
  }
  return fewest[amount] === Infinity ? -1 : fewest[amount];
}
```

The template plus the "impossible" check. `Infinity + 1` is still `Infinity`, so unreachable amounts never win a `min`.

### Interview classic: Word Break

Can `text` be split into words from a dictionary (words can repeat)?
Example: `"applepenapple"`, `["apple", "pen"]` → `true`.

- **State:** `canBuild[i]` = can the first `i` characters be split into words?
- **Transition:** `canBuild[i]` is true if some word ends exactly at `i` and `canBuild[i - word.length]` is true.
- **Base case:** `canBuild[0] = true` (the empty prefix). **Answer:** `canBuild[n]`.

```ts
function wordBreak(text: string, words: readonly string[]): boolean {
  const canBuild: boolean[] = new Array(text.length + 1).fill(false);
  canBuild[0] = true;
  for (let i = 1; i <= text.length; i++) {
    for (const word of words) { // try every word as the LAST piece
      const start = i - word.length;
      if (start >= 0 && canBuild[start] && text.startsWith(word, start)) {
        canBuild[i] = true;
        break;
      }
    }
  }
  return canBuild[text.length];
}
```

Same shape as Coin Change: "amount" became "prefix length", "min" became "any true".

## W — Why It Matters

- This shape covers Coin Change, Coin Change II (count ways), Perfect Squares, Word Break, and Combination Sum IV.
- Interviewers often start with "why not greedy?" — have a counterexample ready (`[1, 3, 4]`, amount 6).
- Real systems use it for text segmentation (splitting languages without spaces) and making change.

## I — Interview Q&A

### Q: How would you count the *number of ways* to make the amount?

That is Coin Change II. Put the **coin loop outside** and the amount loop inside, and add instead of min: `ways[a] += ways[a - coin]`, with `ways[0] = 1`. Coins outside means each combination is counted once, not once per ordering.

### Q: What is the time complexity of Word Break?

`O(n × w × L)` with `n` = text length, `w` = number of words, `L` = longest word (for the `startsWith` check). With a `Set` of words you can loop over split points instead: `O(n² × L)`.

### Q: Why use `Infinity` as the starting value?

It means "not reachable." Any real count beats it in `Math.min`, and adding 1 keeps it `Infinity`, so impossible amounts never pollute reachable ones.

## C — Common Pitfalls + Fix

### ❌ Using greedy for Coin Change

Largest-coin-first only works for some coin systems (like real currency). `[1, 3, 4]` with amount 6 breaks it.

### ❌ Returning `Infinity` instead of `-1`

The problem asks for `-1` when there is no answer. Convert at the very end, not inside the loop.

### ❌ Building substrings in the inner loop

`text.slice(start, i) === word` allocates a new string every check. `text.startsWith(word, start)` compares in place.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Decode Ways:** letters are encoded as `"1"` → A … `"26"` → Z. Given a string of digits, count how many ways it can be decoded. A piece may not start with `0`.

`"226"` → `3` (`2 2 6`, `22 6`, `2 26`) · `"06"` → `0`

<details><summary>Hint</summary>

State: `ways[i]` = number of ways to decode the first `i` digits. The last piece is either one digit (`1`–`9`) or two digits (`10`–`26`).

</details>

### Solution

```ts
function numDecodings(digits: string): number {
  const ways: number[] = new Array(digits.length + 1).fill(0);
  ways[0] = 1; // empty prefix: one way (decode nothing)
  for (let i = 1; i <= digits.length; i++) {
    const one = digits[i - 1];
    if (one !== "0") ways[i] += ways[i - 1]; // last piece is one digit
    if (i >= 2) {
      const two = Number(digits.slice(i - 2, i));
      if (two >= 10 && two <= 26) ways[i] += ways[i - 2]; // last piece is two digits
    }
  }
  return ways[digits.length];
}
```

**Time:** `O(n)` · **Space:** `O(n)` (two variables would make it `O(1)`). Each prefix tries both possible last pieces and adds the ways, exactly like the template with "count" instead of "min".

**Right now:** Fill the `ways` table for `"2101"` on paper. You should get `1`.
