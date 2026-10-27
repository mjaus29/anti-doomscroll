# DP Fundamentals: Climbing Stairs

## T — TL;DR

*Dynamic programming* (DP) means solving a problem by solving smaller versions of it **once each**, saving the answers, and building the big answer from them. Plain recursion recomputes the same small answers over and over (`O(2ⁿ)`); saving them makes it `O(n)`.

**Reach for it when:**

- The question asks for a **count of ways**, a **minimum**, or a **maximum** (not the list of all solutions).
- The answer for size `n` can be built from answers for smaller sizes.
- A plain recursive solution is correct but slow because it repeats the same calls.

## K — Key Concepts

### Picture it

You are filling in a workbook where every page says "add up the answers from the two pages before." Re-solving each earlier page from scratch every time would take forever. Instead you write each answer in the margin once and copy it when you need it. That margin is the DP table.

### The four questions

Every DP lesson in this course answers the same four questions. Say them out loud in an interview.

- **State:** what one saved number means, in words. Here: `ways[i]` = number of ways to reach step `i`.
- **Transition:** how a state is built from smaller ones. Your last move was 1 step or 2 steps, so `ways[i] = ways[i - 1] + ways[i - 2]`.
- **Base case:** the smallest states you know without work. `ways[0] = 1` (one way: stand still), `ways[1] = 1`.
- **Answer:** which state holds the result. `ways[n]`.

### Walk through it

**Climbing Stairs:** you climb `n` steps, taking 1 or 2 steps at a time. How many different ways reach the top? For `n = 5`:

| i | 0 | 1 | 2 | 3 | 4 | 5 |
| :- | :- | :- | :- | :- | :- | :- |
| ways[i] | 1 | 1 | 2 | 3 | 5 | **8** |
| from | base | base | 1 + 1 | 2 + 1 | 3 + 2 | 5 + 3 |

Each cell only looks at the two cells to its left, so filling left to right always has what it needs.

### The template: four versions of the same idea

**1. Plain recursion** — correct, but `climbStairs(3)` is computed again inside both `climbStairs(5)` and `climbStairs(4)`. The call tree doubles each level: `O(2ⁿ)` time.

```ts
function climbRecursive(n: number): number {
  if (n <= 1) return 1; // base case
  return climbRecursive(n - 1) + climbRecursive(n - 2);
}
```

**2. Memoization (top-down)** — *memoization* means caching each result the first time you compute it. Same recursion, but every `n` is solved once.

```ts
function climbMemo(n: number, memo: Map<number, number> = new Map()): number {
  if (n <= 1) return 1;
  const cached = memo.get(n);
  if (cached !== undefined) return cached; // already solved: reuse it
  const result = climbMemo(n - 1, memo) + climbMemo(n - 2, memo);
  memo.set(n, result);
  return result;
}
```

**3. Bottom-up table (tabulation)** — fill the table from the base cases upward with a loop. No recursion, so no stack overflow.

```ts
function climbTable(n: number): number {
  const ways: number[] = new Array(n + 1).fill(0);
  ways[0] = 1;
  if (n >= 1) ways[1] = 1;
  for (let i = 2; i <= n; i++) {
    ways[i] = ways[i - 1] + ways[i - 2]; // last move was 1 step or 2 steps
  }
  return ways[n];
}
```

**4. Two variables** — each cell only needs the previous two, so keep just those.

```ts
function climbStairs(n: number): number {
  let twoBack = 1; // ways[i - 2]
  let oneBack = 1; // ways[i - 1]
  for (let i = 2; i <= n; i++) {
    const current = oneBack + twoBack;
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
```

**Time:** `O(n)` · **Space:** `O(1)` for version 4 (`O(n)` for 2 and 3) — each step from 2 to `n` is computed exactly once.

### Interview classic: Climbing Stairs

The walkthrough above *is* the classic. Interviewers expect you to move through the versions in order: write the recursion, point at the repeated calls, add a memo, then turn it into a loop.

- **Brute force:** list every sequence of 1s and 2s — `O(2ⁿ)`.
- **Key insight:** the number of ways to reach step `i` depends only on steps `i - 1` and `i - 2`, and those answers never change, so save them.

Version 4 is the final answer. Notice it is the Fibonacci sequence; many DP problems are "Fibonacci with a twist."

## W — Why It Matters

- Every DP problem in this course follows the same path: recursion → memo → table → (sometimes) fewer variables.
- Writing the four questions (state, transition, base case, answer) first is what separates a calm DP answer from a guess.
- Real code uses the same idea: caching repeated work in compilers, diff tools, spell checkers, and route planners.

## I — Interview Q&A

### Q: Memoization or bottom-up — which should I use?

Both are `O(n)` here. Memoization is often easier to write first because it mirrors the recursion. Bottom-up avoids deep recursion (JS stacks overflow around 10,000 frames) and makes space savings easier to see.

### Q: How do you know a problem is DP?

It asks for a count, min, or max; there is a choice at each step; and the same smaller question gets asked many times. If smaller answers never repeat, plain recursion or a different pattern is enough.

### Q: What if you can take 1, 2, or 3 steps?

Add one more term: `ways[i] = ways[i - 1] + ways[i - 2] + ways[i - 3]`, with care that `i - 3` is not negative. The state and answer stay the same.

## C — Common Pitfalls + Fix

### ❌ Skipping the state definition

If you cannot finish the sentence "`ways[i]` means ...", your transition will be wrong. Write the sentence before any code.

### ❌ Wrong base cases

`ways[0] = 1` feels odd ("zero steps has one way?"), but it is what makes `ways[2] = ways[1] + ways[0] = 2` come out right. Check base cases with the smallest inputs.

### ❌ Table one cell too short

```ts
const ways = new Array(n).fill(0);     // ❌ no ways[n]
const ways = new Array(n + 1).fill(0); // ✅ indexes 0..n
```

### ❌ Default-parameter memo shared by accident

A default like `memo = new Map()` is created fresh on each top-level call, which is fine. A memo declared *outside* the function is shared across calls, which breaks if the inputs change (for example, a different cost array).

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Min Cost Climbing Stairs:** `cost[i]` is what you pay to step on stair `i`. You may start on stair 0 or stair 1, and from any stair you climb 1 or 2 stairs. The top is just past the last stair. Return the cheapest total cost to reach the top.

`[10, 15, 20]` → `15` (start on stair 1, pay 15, jump 2 to the top)

<details><summary>Hint</summary>

State: `best[i]` = cheapest cost to *stand on* stair `i` (top is `i = n`). You arrive from `i - 1` or `i - 2` and pay that stair's cost.

</details>

### Solution

```ts
function minCostClimbingStairs(cost: readonly number[]): number {
  // best[i] = cheapest way to stand on stair i; stairs 0 and 1 are free starts.
  let twoBack = 0; // best[i - 2]
  let oneBack = 0; // best[i - 1]
  for (let i = 2; i <= cost.length; i++) {
    const current = Math.min(oneBack + cost[i - 1], twoBack + cost[i - 2]);
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. State `best[i]`, transition "came from one or two stairs below and paid for that stair", base cases `best[0] = best[1] = 0`, answer `best[n]`.

**Right now:** Fill the `best` table for `[1, 100, 1, 1, 1, 100, 1, 1, 100, 1]` on paper and check you get `6`.
