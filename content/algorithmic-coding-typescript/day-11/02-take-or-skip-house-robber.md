# Take or Skip: House Robber

## T — TL;DR

At each item you make one of two choices: **take** it (and accept a rule, like "then you cannot take the neighbour") or **skip** it. The best answer up to item `i` is the better of those two choices, built from answers you already saved.

**Reach for it when:**

- You walk a line of items and choose a subset to maximize (or minimize) a total.
- Choosing one item **blocks** nearby items ("no two adjacent", "cooldown after selling").
- Greedy (always grab the biggest) gives wrong answers on small examples.

## K — Key Concepts

### Picture it

You walk down a street of houses with cash inside. Robbing two houses next door sets off the alarm. At each door you ask one question: "Is robbing this house plus my best haul from two doors back worth more than my best haul from the previous door?"

### The four questions

- **State:** `best[i]` = the most money you can get from the first `i` houses (houses `0..i-1`).
- **Transition:** skip house `i - 1` → `best[i - 1]`; take it → `best[i - 2] + houses[i - 1]`. Keep the larger.
- **Base case:** `best[0] = 0` (no houses), `best[1] = houses[0]`.
- **Answer:** `best[n]`.

### Walk through it

`houses = [2, 7, 9, 3, 1]`.

| i | house added | skip = best[i-1] | take = best[i-2] + house | best[i] |
| :- | :- | :- | :- | :- |
| 0 | — | — | — | 0 |
| 1 | 2 | 0 | 0 + 2 = 2 | 2 |
| 2 | 7 | 2 | 0 + 7 = 7 | 7 |
| 3 | 9 | 7 | 2 + 9 = 11 | 11 |
| 4 | 3 | 11 | 7 + 3 = 10 | 11 |
| 5 | 1 | 11 | 11 + 1 = 12 | **12** |

Answer `12` (houses 2, 9, 1). Greedy "take the biggest first" happens to work here, but on `[5, 9, 5]` it takes 9, which blocks both 5s, and gets 9 instead of 5 + 5 = 10.

### The template

```ts
function takeOrSkip(values: readonly number[]): number {
  let twoBack = 0; // best[i - 2]
  let oneBack = 0; // best[i - 1]
  for (const value of values) {
    const take = twoBack + value; // taking blocks the neighbour, so use two back
    const skip = oneBack;
    const current = Math.max(take, skip);
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — one pass, and each state only needs the previous two.

### Interview classic: House Robber

Given non-negative amounts in a row of houses, return the most you can rob without robbing two adjacent houses.
Example: `[1, 2, 3, 1]` → `4` (houses 0 and 2).

- **Brute force:** try every subset with no two neighbours — `O(2ⁿ)`.
- **Key insight:** the best plan for the first `i` houses either uses house `i - 1` or it doesn't. Both cases reduce to a smaller saved answer.

```ts
function rob(houses: readonly number[]): number {
  let twoBack = 0;
  let oneBack = 0;
  for (const cash of houses) {
    const current = Math.max(oneBack, twoBack + cash); // skip vs take
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
```

This is the template with the problem's names. The table version is the same loop with an array `best` of length `n + 1`; write that first if the two variables feel confusing.

## W — Why It Matters

- "Take or skip" is the most common DP choice. It returns in knapsack (lesson 7), stock problems with cooldowns, and Delete and Earn.
- It is the clearest example of why greedy fails and DP works: the best local pick can block a better pair.
- Interviewers listen for the state sentence ("best from the first `i` houses") and the two cases.

## I — Interview Q&A

### Q: Why does `take` use `twoBack` and not `oneBack`?

`oneBack` might already include the neighbouring house. `twoBack` is the best answer that ends at least two houses earlier, so adding the current house is always legal.

### Q: How would you return *which* houses to rob?

Keep the full `best` table. Walk backwards from `i = n`: if `best[i] === best[i - 1]`, house `i - 1` was skipped; otherwise it was taken, so jump to `i - 2`.

### Q: What is Delete and Earn?

Taking value `x` deletes every `x - 1` and `x + 1`. Sum the points for each value into a bucket array, then run House Robber on the buckets — adjacent buckets are the blocked neighbours.

## C — Common Pitfalls + Fix

### ❌ Using greedy (biggest first, or every other house)

Every-other-house fails on `[2, 1, 1, 2]`: it gives 3, but houses 0 and 3 give 4. Let DP compare both choices.

### ❌ Updating the two variables in the wrong order

```ts
// ❌ twoBack receives the NEW oneBack, so the old value is lost
oneBack = Math.max(oneBack, twoBack + cash);
twoBack = oneBack;

// ✅ compute into a temporary, then shift both
const current = Math.max(oneBack, twoBack + cash);
twoBack = oneBack;
oneBack = current;
```

### ❌ Forgetting the empty and one-house inputs

`rob([])` should be `0` and `rob([5])` should be `5`. Starting both variables at `0` handles both without special cases.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**House Robber II:** the houses now stand in a **circle**, so the first and last houses are neighbours. Return the most you can rob without robbing two adjacent houses.

`[2, 3, 2]` → `3` · `[1, 2, 3, 1]` → `4`

<details><summary>Hint</summary>

You can never take both the first and the last house. Solve the straight-line problem twice: once without the last house, once without the first, and keep the larger.

</details>

### Solution

```ts
function robLine(houses: readonly number[], start: number, end: number): number {
  let twoBack = 0;
  let oneBack = 0;
  for (let i = start; i < end; i++) {
    const current = Math.max(oneBack, twoBack + houses[i]);
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}

function robCircle(houses: readonly number[]): number {
  if (houses.length === 1) return houses[0]; // the only house has no neighbour
  return Math.max(
    robLine(houses, 0, houses.length - 1), // skip the last house
    robLine(houses, 1, houses.length),     // skip the first house
  );
}
```

**Time:** `O(n)` · **Space:** `O(1)`. Every valid plan leaves out the first house or the last house (or both), so one of the two straight-line runs covers it.

**Right now:** Run `robCircle([2, 3, 2])` by hand: write the two straight-line tables and see why the answer is `3`, not `4`.
