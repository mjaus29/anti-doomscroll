# Testing and Edge Cases

## T — TL;DR

Before you say "done," run your code against a short checklist of edge cases and trace one example by hand. For extra confidence, compare your fast solution with a simple brute force on many small random inputs.

**Reach for it when:**

- You finished coding and the interviewer asks "how would you test this?"
- Your solution has a special case (empty input, ties, a carry, a boundary index).
- You optimized a brute force and are not sure the fast version matches it.

## K — Key Concepts

### Picture it

A pilot runs the same pre-flight checklist every time, even after thousands of flights. The checklist exists because experienced people still forget things under pressure. An interview is pressure.

### Walk through it

**Edge-case checklist** — try each one that makes sense for the problem:

| Case | Example input | Why it breaks code |
| :--- | :------------ | :----------------- |
| Empty | `[]`, `""` | loops never run; `arr[0]` is `undefined` |
| One item | `[7]` | no pairs, no "second" anything |
| Duplicates | `[2, 2, 3]` | "distinct" vs "any" answers differ |
| Negatives / zero | `[-3, 0, -1]` | starting a max at `0` fails |
| All equal | `[4, 4, 4]` | no strict "bigger" ever happens |
| Sorted / reverse sorted | `[1, 2, 3]`, `[3, 2, 1]` | worst case for some branches |
| Very large values | `[1e9, 1e9]` | sums can pass `Number.MAX_SAFE_INTEGER` |

**Dry run** — trace code with a table of variable values. For "find the largest" on `[3, -1, 5]` with `best = -Infinity`:

| Step | value | best after | Why |
| :--- | :---- | :--------- | :-- |
| 1 | 3 | 3 | 3 > -Infinity |
| 2 | -1 | 3 | -1 is smaller |
| 3 | 5 | 5 | 5 > 3 |

**Invariant** — a fact that stays true every time the loop runs. Here: "`best` is the largest value seen so far." If you can state the invariant and check it holds after each step, the code is correct.

### The template

A *brute-force oracle* is a slow solution you trust because it is obviously correct. Run it and your fast solution on many small random inputs and compare.

```ts
function randomArray(maxLength: number, maxValue: number): number[] {
  const length = Math.floor(Math.random() * (maxLength + 1)); // includes length 0
  const randomValue = (): number =>
    Math.floor(Math.random() * (2 * maxValue + 1)) - maxValue; // -maxValue..maxValue
  return Array.from({ length }, randomValue);
}

function compareWithOracle<T>(
  fast: (input: number[]) => T,
  oracle: (input: number[]) => T,
  runs = 500,
): void {
  for (let run = 0; run < runs; run++) {
    const input = randomArray(6, 5); // tiny inputs hit edge cases often
    const expected = JSON.stringify(oracle([...input]));
    const actual = JSON.stringify(fast([...input]));
    if (expected !== actual) {
      console.log("Mismatch", { input, expected, actual });
      return;
    }
  }
  console.log("All random tests passed");
}
```

**Time:** `O(runs × cost of oracle)` · **Space:** `O(input size)`. Small lengths and small value ranges make duplicates, negatives, and empty arrays show up often.

### Interview classic: Second Largest Distinct Value

Return the second largest **distinct** value in an array, or `null` if there is none.
Example: `[3, 1, 3, 2]` → `2` · `[5, 5]` → `null` · `[]` → `null`.

- **Brute force:** remove duplicates with a `Set`, sort descending, take index 1 — `O(n log n)`.
- **Key insight:** one pass keeping two values, `largest` and `second`. Skip values equal to `largest`, or duplicates will fill both slots.

```ts
function secondLargestOracle(nums: readonly number[]): number | null {
  const unique = [...new Set(nums)].sort((a, b) => b - a);
  return unique.length >= 2 ? unique[1] : null;
}

function secondLargest(nums: readonly number[]): number | null {
  let largest = -Infinity;
  let second = -Infinity;

  for (const value of nums) {
    if (value > largest) {
      second = largest; // old largest moves down one place
      largest = value;
    } else if (value < largest && value > second) {
      second = value; // strictly below largest: duplicates of largest are skipped
    }
  }
  return second === -Infinity ? null : second;
}

compareWithOracle(secondLargest, secondLargestOracle);
```

The invariant: after each step, `largest` and `second` are the two biggest distinct values seen so far. The oracle check covers empty arrays, all-equal arrays, and negatives without you listing them.

## W — Why It Matters

- "How would you test this?" is asked in almost every interview. A checklist answer sounds prepared.
- Edge cases are where most wrong answers hide: off-by-one, empty input, duplicates.
- Oracle testing (often called *property-based* or *randomized* testing) is how engineers check optimized code at work.
- Stating an invariant is the simplest way to explain *why* your loop is correct.

## I — Interview Q&A

### Q: Which edge cases would you test first?

Empty input, a single item, duplicates, and negatives. Then the case most specific to this problem, such as "all equal" for Second Largest.

### Q: How do you know the brute force is right?

Keep it short and direct, with no clever tricks: sort and pick, or check every pair. Simple code is easy to verify by reading.

### Q: What if the random test finds a mismatch?

Print the input, shrink it to the smallest failing case, and dry-run your fast code on it with a variable table.

## C — Common Pitfalls + Fix

### ❌ Only testing the example from the problem

The given example usually avoids the hard cases. Add at least one empty and one duplicate-heavy input.

### ❌ Treating duplicates of the max as the second max

```ts
const value = 5;
let largest = 5;
let second = 3;
if (value >= largest) { second = largest; largest = value; } // ❌ [5, 5] gives 5
if (value > largest) { second = largest; largest = value; }  // ✅ strict comparison
```

### ❌ Using `0` or `null` as a "not found yet" value that can collide

If `0` is a valid answer, a `0` start value hides it. Use `-Infinity` or a separate boolean flag.

### ❌ Random tests with large inputs

Large random arrays rarely produce edge cases and are hard to debug. Keep length ≤ 6 and values in a small range.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Plus One:** a non-negative integer is stored as an array of digits, most significant first. Return the digits of that number plus one.

`[1, 2, 3]` → `[1, 2, 4]` · `[9, 9, 9]` → `[1, 0, 0, 0]`

<details><summary>Hint</summary>

Walk from the last digit. A `9` becomes `0` and the carry moves left. If every digit was `9`, add a `1` in front.

</details>

### Solution

```ts
function plusOne(digits: readonly number[]): number[] {
  const result = [...digits];
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] < 9) {
      result[i]++;
      return result; // no carry left, done
    }
    result[i] = 0; // 9 + 1 = 10: write 0, carry 1 to the left
  }
  return [1, ...result]; // every digit was 9
}
```

**Time:** `O(n)` · **Space:** `O(n)` for the copy. Edge cases to test: `[0]` → `[1]`, `[9]` → `[1, 0]`, `[1, 9]` → `[2, 0]`.

**Right now:** Dry-run `secondLargest([4, 4, 2, 7])` in a table with columns `value`, `largest`, `second`.
