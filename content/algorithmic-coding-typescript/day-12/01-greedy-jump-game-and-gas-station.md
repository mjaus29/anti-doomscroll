# Greedy: Jump Game and Gas Station

## T — TL;DR

A **greedy** algorithm makes the choice that looks best right now and never goes back to change it. When you can prove that the local best choice never hurts, one pass replaces a search over every possible plan.

**Reach for it when:**

- The problem asks "can you reach…?", "minimum number of steps", or "which start works?" over a single array.
- You can keep one running number (farthest reach, current fuel) that summarizes everything so far.
- A DP solution exists but each state only ever uses the "best so far" value.
- Sorting by one key (end time, deadline, size) makes the choice obvious.

## K — Key Concepts

### Picture it

You are crossing a river on stepping stones. Each stone says how far you can leap from it. You do not plan every route. You just remember the farthest stone you could possibly land on so far. If you ever stand on a stone beyond that mark, you are stuck. If the mark reaches the far bank, you made it.

### When is greedy safe?

Greedy is only correct if you can explain why the local choice never blocks a better answer. The usual way is a **swap argument**: take any best answer that made a different choice, swap in the greedy choice, and show the answer is still at least as good. If the swap never hurts, greedy is safe. If you can find a small input where the swap hurts, use DP instead.

### Walk through it

**Jump Game:** `jumps[i]` is the longest jump allowed from index `i`. Can you reach the last index?
`jumps = [2, 3, 1, 1, 4]`

| i | jumps[i] | farthest before | i > farthest? | farthest after |
| :- | :------- | :-------------- | :------------ | :------------- |
| 0 | 2 | 0 | no | max(0, 0 + 2) = 2 |
| 1 | 3 | 2 | no | max(2, 1 + 3) = 4 |
| 2 | 1 | 4 | no | 4 — already reaches the last index (4) |

Now `[3, 2, 1, 0, 4]`: farthest becomes 3 at `i = 0`, stays 3 through `i = 3` (the `0` adds nothing), then `i = 4 > 3`, so return `false`.

### The template

```ts
function canJump(jumps: readonly number[]): boolean {
  let farthest = 0; // invariant: every index <= farthest is reachable

  for (let i = 0; i < jumps.length; i++) {
    if (i > farthest) return false; // a gap we can never cross
    farthest = Math.max(farthest, i + jumps[i]);
    if (farthest >= jumps.length - 1) return true;
  }
  return true;
}
```

**Time:** `O(n)` · **Space:** `O(1)` — one pass, one number. It is safe because a farther reach can only add options, never remove them.

### Interview classic: Jump Game II

Same input, but you are told the end is reachable. Return the **fewest** jumps.
Example: `[2, 3, 1, 1, 4]` → `2` (index 0 → 1 → 4).

- **Brute force:** try every jump from every index (DP over indices) — `O(n²)`.
- **Key insight:** think in "rounds" like BFS. All indices you can reach with `k` jumps form one block. While walking through that block, track the farthest index the **next** jump could reach. When you hit the block's end, you must jump once more.

```ts
function jump(jumps: readonly number[]): number {
  let count = 0;
  let roundEnd = 0; // last index reachable with `count` jumps
  let farthest = 0; // farthest index reachable with `count + 1` jumps

  for (let i = 0; i < jumps.length - 1; i++) { // stop before the last index
    farthest = Math.max(farthest, i + jumps[i]);
    if (i === roundEnd) { // used up this round: take one more jump
      count++;
      roundEnd = farthest;
    }
  }
  return count;
}
```

It is the template's `farthest` idea plus one counter. The swap argument: any plan that lands short of `farthest` in a round can be swapped for one that lands at `farthest`, and it can still reach everything the shorter landing could.

## W — Why It Matters

- Greedy answers are short and fast, so interviewers use them to check whether you can **justify** a choice, not just code it.
- The same "farthest reach" idea appears in Video Stitching and Minimum Number of Taps to Open to Water a Garden.
- Real systems use greedy rules everywhere: schedulers picking the earliest deadline, caches evicting the oldest item.
- Interviewers listen for "here is why taking the best option now never hurts" — say it before you code.

## I — Interview Q&A

### Q: How do you know greedy works and you do not need DP?

Try the swap argument out loud. Then try two or three tiny inputs by hand, including one designed to trick the greedy rule. Coin Change with coins `[1, 3, 4]` and amount `6` is the classic trap: greedy picks `4 + 1 + 1`, but `3 + 3` is better.

### Q: Why does Jump Game II loop only to `length - 1`?

When `i` reaches the last index you are already there. Processing it could trigger an extra `count++` when `i === roundEnd` on the final index.

### Q: Could you solve Jump Game with DP?

Yes: `reachable[i]` is true if some earlier reachable `j` has `j + jumps[j] >= i`. That is `O(n²)`. Greedy compresses all of it into one number because only the farthest reach matters.

## C — Common Pitfalls + Fix

### ❌ Trusting greedy without a reason

A rule that "feels right" can fail on a small input. Write down the swap argument, or test against a brute force on random small arrays.

### ❌ Checking the gap after updating `farthest`

```ts
farthest = Math.max(farthest, i + jumps[i]); if (i > farthest) ... // ❌ too late
if (i > farthest) return false; farthest = Math.max(...)          // ✅
```

### ❌ Counting a jump at the last index in Jump Game II

Loop `i < jumps.length - 1`, not `i < jumps.length`, or `[0]` returns `1` instead of `0`.

### ❌ Restarting from the next index after every failure in Gas Station

Trying every start from scratch is `O(n²)`. The challenge below shows why you can skip a whole block of starts at once.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Gas Station:** stations sit in a circle. At station `i` you pick up `gas[i]` fuel, and driving to station `i + 1` costs `cost[i]`. You start with an empty tank. Return the index of the station where you can start and drive the full circle, or `-1` if none works. (If an answer exists, it is unique.)

`gas = [1, 2, 3, 4, 5]`, `cost = [3, 4, 5, 1, 2]` → `3`

<details><summary>Hint</summary>

If the total gas is less than the total cost, no start works. Otherwise, whenever the tank goes negative, no station between the current start and here can be the start either — jump the start to the next station.

</details>

### Solution

```ts
function canCompleteCircuit(gas: readonly number[], cost: readonly number[]): number {
  let total = 0; // fuel left after the whole circle, from any start
  let tank = 0;  // fuel left since the current candidate start
  let start = 0;

  for (let i = 0; i < gas.length; i++) {
    const gain = gas[i] - cost[i];
    total += gain;
    tank += gain;
    if (tank < 0) { // cannot reach i + 1 from start, or from anything in between
      start = i + 1;
      tank = 0;
    }
  }
  return total >= 0 ? start : -1;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. Any station between `start` and `i` arrived with a tank of at least zero from `start`, so starting there with an empty tank does even worse. That is the greedy reason to skip them all.

**Right now:** Trace `jump([2, 3, 1, 1, 4])` on paper and write `count`, `roundEnd`, and `farthest` after each `i`.
