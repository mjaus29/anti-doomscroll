# TypeScript Toolkit for Algorithms

## T — TL;DR

A handful of JavaScript built-ins do most of the work in interview code: arrays as stacks, `Map`, `Set`, sorting with a comparator, and character codes. Knowing their real cost and their traps keeps a correct idea from turning into slow or buggy code.

**Reach for it when:**

- You are about to write `shift()`, `sort()`, or `new Array(n).fill([])`.
- You need to count letters, build a string, or make a grid.
- You need a "smallest so far" or "largest so far" starting value.

## K — Key Concepts

### Picture it

A carpenter does not need every tool in the shop, but they know exactly which saw cuts fast and which one splinters. These are your few saws: learn what each costs and where it splinters.

### Walk through it

Counting letters in `"abca"` with a 26-slot array. `charCodeAt(0)` gives a character's number code (`"a"` is 97), so `code - 97` maps `"a"→0`, `"b"→1`, …, `"z"→25`.

| Step | Char | `charCodeAt(0) - 97` | `counts` (first 3 slots) |
| :--- | :--- | :------------------- | :----------------------- |
| 1 | `a` | 0 | `[1, 0, 0]` |
| 2 | `b` | 1 | `[1, 1, 0]` |
| 3 | `c` | 2 | `[1, 1, 1]` |
| 4 | `a` | 0 | `[2, 1, 1]` |

An array of 26 numbers is faster and smaller than a `Map` when the input is only lowercase English letters.

### The template

The snippets you will type over and over:

```ts
// Stack: push/pop at the end are O(1)
const stack: number[] = [];
stack.push(1);
const top = stack.pop(); // number | undefined

// 2D grid: Array.from builds a NEW inner array per row
const rows = 3;
const cols = 4;
const grid: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

// Counting with a Map
const counts = new Map<string, number>();
for (const word of ["a", "b", "a"]) counts.set(word, (counts.get(word) ?? 0) + 1);

// Letter counts with a 26-slot array
const letters = new Array<number>(26).fill(0);
for (const char of "abca") letters[char.charCodeAt(0) - 97]++;

// Sort numbers: ALWAYS pass a comparator; copy first to keep the input unchanged
const sorted = [...[10, 9, 1]].sort((a, b) => a - b); // [1, 9, 10]

// Build strings with an array + join (strings are immutable)
const parts: string[] = [];
for (let i = 0; i < 3; i++) parts.push(String(i));
const joined = parts.join(""); // "012"

// Start values for min/max, and integer division
let best = -Infinity;
let smallest = Infinity;
const middle = Math.floor((0 + 9) / 2); // 4, not 4.5
```

**Time:** `push`/`pop`/`Map`/`Set`/array index are `O(1)`; `sort` is `O(n log n)` · **Space:** each collection grows with what you put in it.

### Gotchas cheat table

| Gotcha | What goes wrong | Do this instead |
| :----- | :-------------- | :-------------- |
| `shift()` / `unshift()` | `O(n)`: every item is re-indexed | keep a `head` index, or reverse and `pop` |
| `new Array(3).fill([])` | all rows are the **same** array | `Array.from({ length: 3 }, () => [])` |
| `[10, 9, 1].sort()` | sorts as text → `[1, 10, 9]` | `.sort((a, b) => a - b)` |
| `arr.sort(...)` | mutates the caller's array | `[...arr].sort(...)` |
| `text += char` in a loop | may copy the string each time | `parts.push(char)` then `parts.join("")` |
| plain object as a map | keys become strings; `"__proto__"`, `"constructor"` are risky | `Map` for lookups, `Set` for "have I seen it" |
| `let best = 0` for a max | wrong when every value is negative | `-Infinity` (or the first element) |
| `7 / 2` | gives `3.5` | `Math.floor(7 / 2)` → `3` |
| `noUncheckedIndexedAccess` | `arr[i]` has type `number \| undefined` | check it, use `?? fallback`, or `!` when you have proven the index is valid |
| no heap, queue, or deque | JS does not ship them | later lessons build each one |

On `!` versus `??`: `arr[i]!` tells the compiler "trust me," which is fine inside a loop bounded by `arr.length`. `arr[i] ?? 0` is safer when the index might be out of range. Pick one per situation and say why.

## W — Why It Matters

- Interviewers notice `shift()` in a BFS or `sort()` without a comparator. These are easy points to lose.
- The `fill([])` grid bug produces wrong answers that are very hard to see during a live interview.
- Clean built-in use makes your code shorter, so you finish with time to test.
- The same traps cause real production bugs (number sorting is a famous one).

## I — Interview Q&A

### Q: When would you pick a plain object over a `Map`?

For a fixed set of known string keys, an object is fine. For counting or lookups with arbitrary keys, a `Map` has no inherited keys, keeps number keys as numbers, and has `.size`.

### Q: Why is `shift()` slow if it is a built-in?

Removing the first item means every remaining item moves down one index. That is `n` moves, so a loop of `shift()` calls is `O(n²)`.

### Q: Is `Array.prototype.sort` stable?

Yes, since ES2019. Items that compare equal keep their original order, which matters when you sort by one field after another.

## C — Common Pitfalls + Fix

### ❌ Sorting numbers without a comparator

```ts
const bad = [10, 9, 1].sort();                 // ❌ [1, 10, 9] (text order)
const good = [10, 9, 1].sort((a, b) => a - b); // ✅ [1, 9, 10]
```

### ❌ Sharing one inner array across rows

```ts
const shared: number[][] = new Array(2).fill([]); // ❌ shared[0] === shared[1]
const separate: number[][] = Array.from({ length: 2 }, () => []); // ✅ two arrays
```

### ❌ Starting a maximum at `0`

For `[-5, -2]` the answer is `-2`, but `best = 0` returns `0`. Start at `-Infinity`.

### ❌ Forgetting `Math.floor` on a middle index

`(left + right) / 2` can be `3.5`, and `arr[3.5]` is `undefined`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Sort People:** given an array of `{ name, age }`, return a **new** array sorted by age (youngest first). People with the same age are ordered by name A→Z. Do not change the input.

`[{ name: "Zoe", age: 30 }, { name: "Ann", age: 25 }, { name: "Bob", age: 30 }]` → Ann 25, Bob 30, Zoe 30

<details><summary>Hint</summary>

Copy with `[...people]`. In the comparator, return the age difference when ages differ; otherwise compare names with `localeCompare`.

</details>

### Solution

```ts
type Person = { name: string; age: number };

function sortPeople(people: readonly Person[]): Person[] {
  return [...people].sort((a, b) => {
    if (a.age !== b.age) return a.age - b.age; // negative → a first
    return a.name.localeCompare(b.name);       // tie-break by name
  });
}
```

**Time:** `O(n log n)` · **Space:** `O(n)` for the copy. A comparator returns a negative number to put `a` first, a positive number to put `b` first, and `0` to keep their order.

**Right now:** Run `[5, 25, 100].sort()` in your browser console, predict the output first, and explain the result.
