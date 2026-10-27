# Big-O: Time and Space Complexity

## T — TL;DR

Big-O describes how the work (time) or memory (space) of your code grows as the input grows. It ignores constants and small terms, so you can compare ideas before writing them and guess the expected solution from the input size.

**Reach for it when:**

- The interviewer asks "what is the complexity?" (they always do).
- You must choose between two ideas.
- The problem states limits like `n ≤ 10⁵` — that number tells you how fast you must be.

## K — Key Concepts

### Picture it

Finding a friend's name in a phone book: reading every page is `O(n)`; opening the middle and halving each time is `O(log n)`. Comparing every guest at a party with every other guest is `O(n²)`. Big-O names the *shape* of the growth, not the exact seconds.

### Walk through it

Common classes, fastest to slowest:

| Big-O | Name | Everyday example | Code example |
| :---- | :--- | :--------------- | :----------- |
| `O(1)` | constant | grab the top plate | `arr[i]`, `map.get(k)` |
| `O(log n)` | logarithmic | phone-book halving | binary search |
| `O(n)` | linear | read every page | one loop |
| `O(n log n)` | linearithmic | sort a deck of cards well | `arr.sort(...)` |
| `O(n²)` | quadratic | everyone shakes hands with everyone | two nested loops |
| `O(2ⁿ)` | exponential | try every subset of toppings | all subsets |

Use the input size to guess what the interviewer expects (about 10⁸ simple steps run in ~1 second):

| Input size `n` | Usually OK |
| :------------- | :--------- |
| `n ≤ 20` | `O(2ⁿ)` — try every subset |
| `n ≤ 10³` | `O(n²)` — nested loops |
| `n ≤ 10⁵`–`10⁶` | `O(n log n)` or `O(n)` |
| larger, or many queries | `O(log n)` or `O(1)` per query |

**Counting loops.** Loops one after another add (`O(n + n) = O(n)`). Loops inside each other multiply (`O(n × n) = O(n²)`). Drop constants: `O(3n)` is `O(n)`.

**Space** counts the extra memory you create: new arrays, maps, sets, and the *recursion stack* (each recursive call waiting to return keeps a frame in memory, so recursion depth `n` costs `O(n)` space).

### The template

```ts
function countPairs(values: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {       // runs n times
    for (let j = i + 1; j < values.length; j++) { // up to n times each → O(n²)
      total++;
    }
  }
  return total;
}

function sumAll(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value; // one pass → O(n) time, O(1) space
  return total;
}
```

**Time:** count how many times the innermost line runs as a function of `n` · **Space:** count the extra memory, including the recursion stack.

**Hidden `O(n)` calls in JavaScript.** These look like one step but scan or copy the array:

| Call | Cost | Inside a loop becomes |
| :--- | :--- | :-------------------- |
| `arr.includes(x)`, `arr.indexOf(x)` | `O(n)` scan | `O(n²)` — use a `Set` |
| `arr.slice()`, `[...arr]`, `arr.concat(x)` | `O(n)` copy | `O(n²)` — use `push` |
| `arr.shift()`, `arr.unshift(x)` | `O(n)` re-index | `O(n²)` — use an index pointer |
| `text += char` | can copy the string | build an array, then `join("")` |

### Interview classic: Contains Duplicate

Return `true` if any value appears at least twice. Example: `[1, 2, 3, 1]` → `true`, `[1, 2, 3]` → `false`.
Three answers show three complexity trade-offs.

- **Brute force:** compare every pair — `O(n²)` time, `O(1)` space.
- **Key insight:** sorting puts duplicates next to each other (`O(n log n)`), and a `Set` remembers what you have seen (`O(n)` time, `O(n)` space).

```ts
function containsDuplicateBrute(nums: readonly number[]): boolean {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
  return false; // O(n²) time, O(1) space
}

function containsDuplicateSort(nums: readonly number[]): boolean {
  const sorted = [...nums].sort((a, b) => a - b); // copy so we do not mutate input
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) return true; // duplicates are neighbours
  }
  return false; // O(n log n) time, O(n) space for the copy
}

function containsDuplicate(nums: readonly number[]): boolean {
  const seen = new Set<number>();
  for (const value of nums) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false; // O(n) time, O(n) space
}
```

The `Set` version trades memory for speed. If the interviewer says memory is tight, the sort version is the middle ground.

## W — Why It Matters

- Every interview answer ends with "time is X, space is Y." Saying it unprompted is a strong signal.
- The input-size table lets you rule out ideas before coding: `n = 10⁵` means nested loops are too slow.
- Hidden `O(n)` calls are the most common reason a "linear" solution is really quadratic.
- In real apps, an `includes` inside a render loop over 10,000 items is a classic slowdown.

## I — Interview Q&A

### Q: Why do we drop constants?

Big-O compares growth for large inputs. `2n` and `n` both double when the input doubles, so they share the same shape. Constants still matter in practice, and you can mention that.

### Q: What is the space complexity of a recursive function with depth `n`?

At least `O(n)`, because each pending call keeps a stack frame. This is why deep recursion can crash with "Maximum call stack size exceeded."

### Q: Is `map.get` always `O(1)`?

On average, yes. In rare worst cases a hash table can degrade, but interviews treat `Map` and `Set` operations as `O(1)` average.

## C — Common Pitfalls + Fix

### ❌ Calling `includes` inside a loop

```ts
const seenList: number[] = [];
if (seenList.includes(7)) { /* ❌ O(n) scan every time */ }
const seenSet = new Set<number>();
if (seenSet.has(7)) { /* ✅ O(1) average */ }
```

### ❌ Forgetting the sort cost

Sorting is `O(n log n)`, not free. A "one loop after sorting" solution is `O(n log n)` overall.

### ❌ Ignoring extra memory

A copy (`[...nums]`), a `Set`, or a recursion stack all count as space. Say them out loud.

### ❌ Treating two separate loops as `O(n²)`

Loops in sequence add up to `O(n)`. Only nesting multiplies.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Intersection of Two Arrays:** return the values that appear in both arrays, each value only once, in any order.

`[1, 2, 2, 1]` and `[2, 2]` → `[2]` · `[4, 9, 5]` and `[9, 4, 9, 8, 4]` → `[9, 4]`

<details><summary>Hint</summary>

Put one array in a `Set`. Walk the other and collect matches into a second `Set` so each value appears once.

</details>

### Solution

```ts
function intersection(first: readonly number[], second: readonly number[]): number[] {
  const inFirst = new Set(first);
  const result = new Set<number>(); // a Set drops repeated matches for us
  for (const value of second) {
    if (inFirst.has(value)) result.add(value);
  }
  return [...result];
}
```

**Time:** `O(n + m)` · **Space:** `O(n)`. Using `first.includes(value)` instead of a `Set` would make it `O(n × m)`.

**Right now:** Write the Big-O of each Contains Duplicate version on a sticky note, then say out loud why the sort version needs `O(n)` space.
