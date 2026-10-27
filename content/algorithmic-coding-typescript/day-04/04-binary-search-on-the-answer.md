# Binary Search on the Answer

## T — TL;DR

Sometimes there is no sorted array, but the **answer** is a number in a known range, and you can quickly check "does `x` work?". If every value above a working `x` also works, binary search the range for the smallest `x` that works. That costs `O(log range)` checks instead of trying every value.

**Reach for it when:**

- The problem asks for the **minimum** (or maximum) value that makes something possible: speed, capacity, days, size.
- Checking one candidate is easy, but finding the best directly is hard.
- Bigger candidates always make the task easier (or always harder).

## K — Key Concepts

### Picture it

Choosing the smallest suitcase that fits your clothes. If a size-40 case fits, every bigger case fits too. So you test the middle size, and each test tells you to look smaller or bigger. You never try every size in the shop.

### Walk through it

A yes/no test is *monotonic* when its answers never switch back: `no, no, no, yes, yes, yes`. You want the first `yes`.
Example: smallest `x` in `1..20` with `x × x >= 20`.

| low | high | mid | `mid × mid >= 20`? | Action and why |
| :-- | :--- | :-- | :----------------- | :------------- |
| 1 | 20 | 10 | 100 → yes | `10` works; the first yes is `10` or smaller: `high = 10`. |
| 1 | 10 | 5 | 25 → yes | `high = 5`. |
| 1 | 5 | 3 | 9 → no | `3` and everything below fail: `low = 4`. |
| 4 | 5 | 4 | 16 → no | `low = 5`. |
| 5 | 5 | — | — | Meet. Answer `5`. |

### The template

```ts
// Smallest x in low..high with canDo(x) true.
// Needs: canDo is monotonic (no...no, yes...yes) and canDo(high) is true.
function smallestThatWorks(
  low: number,
  high: number,
  canDo: (candidate: number) => boolean,
): number {
  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (canDo(mid)) high = mid; // mid works: answer is mid or smaller
    else low = mid + 1;         // mid fails: so does everything below it
  }
  return low;
}
```

**Time:** `O(log(high − low) × cost of canDo)` · **Space:** `O(1)`. This is the lower bound from First and Last Position, run over numbers instead of array items.

The hard part is not this loop. It is (1) writing `canDo`, and (2) choosing `low` and `high` so the answer is surely inside.

### Interview classic: Koko Eating Bananas

Koko has `piles` of bananas and `hours` hours. Each hour she picks one pile and eats up to `speed` bananas from it. Return the smallest whole-number `speed` that finishes every pile in time. (`hours >= piles.length`.)
Example: `piles = [3, 6, 7, 11], hours = 8` → `4`.

- **Brute force:** try speeds `1, 2, 3, ...` until one works — `O(max pile × n)`.
- **Key insight:** a faster speed never takes longer, so "can she finish at this speed?" is monotonic. Search speeds `1..max pile`; the max always works because each pile then takes one hour.

```ts
function minEatingSpeed(piles: readonly number[], hours: number): number {
  // A pile of p bananas takes ceil(p / speed) hours.
  const canFinish = (speed: number): boolean => {
    let needed = 0;
    for (const pile of piles) needed += Math.ceil(pile / speed);
    return needed <= hours;
  };
  return smallestThatWorks(1, Math.max(...piles), canFinish);
}
```

**Time:** `O(n log m)` where `m` is the largest pile · **Space:** `O(1)`. Everything problem-specific lives in `canFinish`; the search is the template.

## W — Why It Matters

- It turns "find the best value" problems that look like DP or greedy into an easy check plus a template you already know.
- Common interview names: Koko Eating Bananas, Ship Packages, Split Array Largest Sum, Minimum Days to Make Bouquets.
- Interviewers listen for two sentences: "the check is monotonic because ..." and "the answer must be between `low` and `high` because ...".

## I — Interview Q&A

### Q: How do you choose `low` and `high`?

`low` is a value that might work and nothing smaller could: often `1`, or the biggest single item. `high` is a value that surely works: the max, or the total. Say both out loud with a reason.

### Q: What if the problem asks for the largest `x` that works?

Then the test looks like `yes...yes, no...no`. Search for the first `no` and subtract one, or flip the update rules and round `mid` up so the loop still ends.

### Q: What is the total cost?

Number of checks × cost of one check. Here that is `log(max pile)` checks of `O(n)` each.

## C — Common Pitfalls + Fix

### ❌ A check that is not monotonic

If a bigger value can fail after a smaller one worked, binary search can jump past the answer. Prove "bigger is never worse" before you search.

### ❌ `high` too small

If `canDo(high)` is false, the template returns `high` anyway, which is wrong. Pick a `high` that is guaranteed to work.

### ❌ Integer division in the check

```ts
needed += Math.floor(pile / speed); // ❌ 7 bananas at speed 4 is 2 hours, not 1
needed += Math.ceil(pile / speed);  // ✅
```

### ❌ `Math.max(...hugeArray)`

Spreading a very large array (hundreds of thousands of items) into `Math.max` can throw a "too many arguments" error. Use a loop or `reduce` for big inputs.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Capacity To Ship Packages Within D Days:** packages must ship **in the given order**. Each day you load packages onto the ship until the next one would go over its capacity. Return the smallest capacity that ships everything within `days` days.

`weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], days = 5` → `15`

<details><summary>Hint</summary>

The capacity is at least the heaviest package and at most the total weight. Write `canShip(capacity)` by filling each day greedily.

</details>

### Solution

```ts
function shipWithinDays(weights: readonly number[], days: number): number {
  let low = 0;  // the ship must carry the heaviest package
  let high = 0; // carrying everything at once surely works
  for (const weight of weights) {
    low = Math.max(low, weight);
    high += weight;
  }

  const canShip = (capacity: number): boolean => {
    let daysUsed = 1;
    let load = 0;
    for (const weight of weights) {
      if (load + weight > capacity) { // full: this package starts a new day
        daysUsed++;
        load = 0;
      }
      load += weight;
    }
    return daysUsed <= days;
  };

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (canShip(mid)) high = mid;
    else low = mid + 1;
  }
  return low;
}
```

**Time:** `O(n log(sum))` · **Space:** `O(1)`. A bigger ship never needs more days, so the check is monotonic. Filling each day as full as possible uses the fewest days for a given capacity.

**Right now:** Trace `minEatingSpeed([30, 11, 23, 4, 20], 6)` and write `low`, `high`, `mid`, and the hours needed for each step. The answer is `23`.
