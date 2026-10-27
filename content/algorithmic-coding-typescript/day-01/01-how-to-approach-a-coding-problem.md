# How to Approach a Coding Problem

## T — TL;DR

Use the same six steps on every problem: understand it, write examples, state a brute force, find the repeated work, code the faster idea, then test. A fixed routine stops you from freezing and shows the interviewer how you think.

**Reach for it when:**

- You read a problem and your first instinct is to start typing.
- You feel stuck and do not know what to try next.
- The interviewer says "talk me through your approach."

## K — Key Concepts

### Picture it

A mechanic does not start unscrewing parts the moment a car rolls in. They ask what the noise sounds like, reproduce it, try the obvious fix, and only then go deeper. Coding interviews reward the same order: questions first, tools second.

### Walk through it

The six steps applied to a small problem: "Given an array of numbers and a target, return the indexes of two numbers that add up to the target."

| Step | What you do | For this problem |
| :--- | :---------- | :--------------- |
| 1. Understand and clarify | Restate the task. Ask about input size, duplicates, negatives, empty input, what to return if there is no answer. | "Exactly one answer exists? Can I use the same index twice? No." |
| 2. Examples | Write 1–2 small inputs and their outputs by hand, including an edge case. | `[2, 7, 11, 15], 9` → `[0, 1]`; `[3, 3], 6` → `[0, 1]` |
| 3. Brute force | Say the slowest correct idea and its cost. It proves you understand the task. | "Try every pair: `O(n²)`." |
| 4. Find repeated work | Ask: what am I computing again and again? Can a data structure remember it? | "For each number I scan for its partner. A map can remember numbers I have seen." |
| 5. Code | Write clean code with clear names. Talk while you type. | See the classic below. |
| 6. Test | Trace your examples through the code line by line. Then try edge cases. | `[3, 3]` checks the "same value, different index" case. |

The key move is step 4. Most speed-ups come from noticing a scan you repeat inside a loop and replacing it with a lookup.

### The template

Keep this skeleton in your head (or literally type the comments) at the start of every interview.

```ts
// 1. Clarify: inputs, outputs, size limits, edge cases (empty? duplicates? negatives?)
// 2. Examples: normal case + edge case, written as input → output
// 3. Brute force: describe it and its Big-O before writing anything faster
// 4. Optimize: what work repeats? Can a Map/Set, sorting, or two pointers remove it?
function solve(input: readonly number[]): number {
  // 5. Code the chosen idea with readable names
  let result = 0;
  for (const value of input) result += value;
  return result;
}
// 6. Test: trace each example by hand, then run quick checks
console.log(solve([1, 2, 3]) === 6, solve([]) === 0);
```

**Time and space:** the routine itself costs about 5 minutes, and it saves far more by catching wrong assumptions before you write code.

### Interview classic: Two Sum

Given `nums` and `target`, return the indexes of the two numbers that add up to `target`. Exactly one answer exists.
Example: `[2, 7, 11, 15]`, `9` → `[0, 1]`.

- **Brute force:** check every pair with two nested loops — `O(n²)` time, `O(1)` space.
- **Key insight:** for each number, the partner you need is `target - num`. Store numbers you have already passed in a `Map` (value → index), and the inner scan becomes one lookup.

```ts
function twoSumBrute(nums: readonly number[], target: number): [number, number] | null {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return null;
}

function twoSum(nums: readonly number[], target: number): [number, number] | null {
  const seen = new Map<number, number>(); // value → index where we saw it

  for (let i = 0; i < nums.length; i++) {
    const partner = target - nums[i];
    const partnerIndex = seen.get(partner);
    if (partnerIndex !== undefined) return [partnerIndex, i];
    seen.set(nums[i], i); // add after checking, so we never pair i with itself
  }
  return null;
}
```

The fast version is step 4 in action: the brute force repeats "scan for a partner," and the map replaces that scan with an `O(1)` lookup. **Time:** `O(n)` · **Space:** `O(n)`.

## W — Why It Matters

- Interviewers grade communication and process, not only the final code. A visible routine scores well even if you run out of time.
- Clarifying questions catch traps early: "Is the input sorted?" can change the whole solution.
- Stating the brute force first gives you a working fallback and a baseline to improve on.
- Real bugs at work are fixed with the same loop: reproduce, simplify, find the slow or wrong part, fix, test.

## I — Interview Q&A

### Q: Should I code the brute force first?

Usually say it, give its Big-O, and ask if the interviewer wants it coded. If you cannot find a faster idea in a few minutes, code the brute force so you have something that works.

### Q: What if I do not know the optimal solution?

Say what you know: "Brute force is `O(n²)`. The repeated work is the inner scan. I am looking for a way to remember what I have seen." Interviewers often give hints when you show your reasoning.

### Q: How many clarifying questions should I ask?

Two to four focused ones: input size, edge cases (empty, duplicates, negatives), and the exact output format. Do not stall with questions the problem already answers.

## C — Common Pitfalls + Fix

### ❌ Coding before understanding

You solve the wrong problem and lose ten minutes. Restate the task in your own words and get a "yes" before you type.

### ❌ Skipping the examples

Without a worked example you cannot test your code later. Write one normal case and one edge case first.

### ❌ Adding to the map before checking it

```ts
seen.set(nums[i], i); const found = seen.get(target - nums[i]); // ❌ finds i itself
const partnerIndex = seen.get(target - nums[i]); seen.set(nums[i], i); // ✅
```

### ❌ Testing by "looks right"

Trace the code with your example, writing down variable values. Most interview bugs are found this way, not by rereading.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Missing Number:** an array holds `n` distinct numbers taken from the range `0` to `n`. Exactly one number in that range is missing. Return it.

`[3, 0, 1]` → `2` · `[0, 1]` → `2`

<details><summary>Hint</summary>

The numbers `0..n` add up to `n × (n + 1) / 2`. Compare that with the actual sum.

</details>

### Solution

```ts
function missingNumber(nums: readonly number[]): number {
  const n = nums.length;
  const expected = (n * (n + 1)) / 2; // sum of 0..n
  let actual = 0;
  for (const value of nums) actual += value;
  return expected - actual;
}
```

**Time:** `O(n)` · **Space:** `O(1)`. The brute force checks each candidate with `includes` (`O(n²)`); the repeated work is "search the array," and a single sum replaces it.

**Right now:** Apply all six steps to Missing Number on paper, including one edge case (try `[0]`), before you look at the solution again.
