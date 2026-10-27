# Hash Maps and Sets

## T — TL;DR

A `Set` answers "have I seen this?" and a `Map` answers "what do I know about this?" in `O(1)` average time. Swapping a repeated array scan for one of these lookups turns many `O(n²)` solutions into `O(n)`.

**Reach for it when:**

- You search the array for something inside a loop (`includes`, `indexOf`, a nested loop).
- The problem says "duplicate," "seen before," "pair," or "unique."
- You need to remember an index, a count, or a group for each value.

## K — Key Concepts

### Picture it

A coat check gives you a ticket number. Later, the attendant does not search every coat; they go straight to hook 42. A *hash table* (the structure behind `Map` and `Set`) turns each key into a hook number, so finding it takes about the same time no matter how many coats there are.

### Walk through it

"Return the first value that appears twice" on `[4, 1, 3, 1, 4]`:

| Step | value | `seen` before | Action and why |
| :--- | :---- | :------------ | :------------- |
| 1 | 4 | `{}` | Not seen. Add it. |
| 2 | 1 | `{4}` | Not seen. Add it. |
| 3 | 3 | `{4, 1}` | Not seen. Add it. |
| 4 | 1 | `{4, 1, 3}` | Seen. Return `1`. |

Each step is one `has` and maybe one `add`, so the whole scan is one pass.

**Which one?**

| Need | Use | Key operations (all `O(1)` average) |
| :--- | :-- | :---------------------------------- |
| "Is it there?" | `Set<T>` | `add`, `has`, `delete`, `size` |
| "What goes with it?" (index, count, list) | `Map<K, V>` | `set`, `get`, `has`, `delete`, `size` |

### The template

```ts
function firstRepeated(values: readonly number[]): number | null {
  const seen = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) return value; // the lookup replaces an inner loop
    seen.add(value);
  }
  return null;
}

function lastIndexOfEach(values: readonly string[]): Map<string, number> {
  const lastIndex = new Map<string, number>(); // value → info about it
  values.forEach((value, index) => lastIndex.set(value, index));
  return lastIndex;
}
```

**Time:** `O(n)` · **Space:** `O(n)` — one pass, and the set or map can hold every value in the worst case.

### Interview classic: Longest Consecutive Sequence

Given unsorted numbers, return the length of the longest run of consecutive integers (like `4, 5, 6`). The run can use values from anywhere in the array.
Example: `[100, 4, 200, 1, 3, 2]` → `4` (the run `1, 2, 3, 4`).

- **Brute force:** sort and count runs — `O(n log n)`. Or, for each value, keep checking `value + 1` with `includes` — `O(n²)` or worse.
- **Key insight:** put every value in a `Set`. Only start counting from a value whose `value - 1` is **not** in the set, because that value is the start of a run. Each value is then counted in exactly one run.

```ts
function longestConsecutive(nums: readonly number[]): number {
  const values = new Set(nums);
  let best = 0;

  for (const start of values) {
    if (values.has(start - 1)) continue; // not a run start; another start will count it

    let length = 1;
    while (values.has(start + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}
```

The `while` loop looks like it makes this `O(n²)`, but each value is walked over only once in total (only from its run's start), so the whole thing is `O(n)`. Looping over the `Set` also skips duplicate values for free.

## W — Why It Matters

- "Use a hash map" is the most common optimization in interviews. Two Sum, anagrams, and duplicates all start here.
- Interviewers listen for the trade-off: "`O(n)` extra memory buys `O(n)` time."
- Real code uses the same idea for caches, de-duplication, and indexing records by id.
- Longest Consecutive is a favourite because it tests whether you can explain *why* a nested loop is still linear.

## I — Interview Q&A

### Q: Why is a `Map` lookup `O(1)` while `includes` is `O(n)`?

`includes` checks items one by one. A hash table computes where the key should live and jumps there, so the cost does not grow with the number of items (on average).

### Q: Why use `Map` instead of a plain object `{}`?

A `Map` keeps number keys as numbers, has no inherited keys like `"constructor"`, has `.size`, and is built for frequent adds and deletes.

### Q: Can you solve Longest Consecutive with `O(1)` extra space?

Sort the array (in place, if allowed) and count runs, skipping equal neighbours. That is `O(n log n)` time. Mention it as the trade-off.

## C — Common Pitfalls + Fix

### ❌ Using objects or arrays as keys and expecting value equality

```ts
const pairs = new Set<string>();
pairs.add([1, 2].join(","));     // ✅ "1,2" is compared by value
console.log(pairs.has("1,2"));   // true
const byReference = new Set<number[]>([[1, 2]]);
console.log(byReference.has([1, 2])); // ❌ false: a different array object
```

### ❌ Counting a run from every value

Without the `has(start - 1)` check, a run of length `n` is re-counted from each of its members: `O(n²)`.

### ❌ Treating `get` as always defined

`map.get(key)` returns `undefined` when the key is missing. Check with `!== undefined` or use `?? fallback`, especially when `0` is a valid value.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Contains Duplicate II:** return `true` if two **different** indexes `i` and `j` hold the same value and are at most `k` apart (`|i - j| ≤ k`).

`[1, 2, 3, 1]`, `k = 3` → `true` · `[1, 2, 3, 1, 2, 3]`, `k = 2` → `false`

<details><summary>Hint</summary>

Store each value's most recent index in a `Map`. When you see the value again, compare the distance.

</details>

### Solution

```ts
function containsNearbyDuplicate(nums: readonly number[], k: number): boolean {
  const lastIndex = new Map<number, number>(); // value → most recent index

  for (let i = 0; i < nums.length; i++) {
    const previous = lastIndex.get(nums[i]);
    if (previous !== undefined && i - previous <= k) return true;
    lastIndex.set(nums[i], i); // the newest index is always the closest one
  }
  return false;
}
```

**Time:** `O(n)` · **Space:** `O(n)`. Keeping only the latest index is enough, because any later match is closest to the most recent copy.

**Right now:** Trace `longestConsecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1])` and write down which values are treated as run starts.
