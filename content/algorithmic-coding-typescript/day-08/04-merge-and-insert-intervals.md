# Merge and Insert Intervals

## T — TL;DR

An **interval** is a range `[start, end]`, like a meeting from 9 to 11. Sort intervals by start, then sweep left to right: each new interval either overlaps the last one you kept (stretch it) or starts after it (keep it as a new one). One sort plus one pass is `O(n log n)`.

**Reach for it when:**

- The input is a list of `[start, end]` pairs: meetings, bookings, time ranges, number ranges.
- The problem says "merge", "overlap", "combine", "free time", or "insert".
- Comparing every pair (`O(n²)`) feels like the only option.

## K — Key Concepts

### Picture it

You lay out paper strips on a table, one per booking, each strip's length showing its time range. Sort them by where they start. Walk along: if the next strip starts before the current one ends, tape them together. If there is a gap, start a new taped piece.

### The overlap rule

Two intervals `a` and `b` overlap when **each one starts before the other one ends**:

```text
a.start <= b.end && b.start <= a.end
```

| a | b | Overlap? | Why |
| :- | :- | :------- | :-- |
| `[1, 3]` | `[2, 6]` | Yes | `1 <= 6` and `2 <= 3`. |
| `[1, 3]` | `[3, 5]` | Yes | They touch at `3`. (Some problems say touching does **not** count — check.) |
| `[1, 3]` | `[4, 6]` | No | `4 <= 3` is false: `b` starts after `a` ends. |
| `[1, 10]` | `[2, 3]` | Yes | `b` sits inside `a`. |

Once the list is **sorted by start**, `a.start <= b.start` is already true, so you only need `b.start <= a.end`.

### Walk through it

Merge `[[1, 3], [8, 10], [2, 6], [15, 18]]`. Sorted by start: `[[1, 3], [2, 6], [8, 10], [15, 18]]`.

| Step | Next interval | Last kept | Action and why | Result |
| :--- | :------------ | :-------- | :------------- | :----- |
| 1 | `[1, 3]` | — | Nothing kept yet: keep it. | `[1, 3]` |
| 2 | `[2, 6]` | `[1, 3]` | `2 <= 3` overlaps: stretch end to `max(3, 6) = 6`. | `[1, 6]` |
| 3 | `[8, 10]` | `[1, 6]` | `8 > 6` gap: keep as new. | `[1, 6] [8, 10]` |
| 4 | `[15, 18]` | `[8, 10]` | `15 > 10` gap: keep as new. | `[1, 6] [8, 10] [15, 18]` |

### The template

```ts
type Interval = [start: number, end: number];

function overlaps(a: Interval, b: Interval): boolean {
  return a[0] <= b[1] && b[0] <= a[1]; // each starts before the other ends
}

function combine(a: Interval, b: Interval): Interval {
  return [Math.min(a[0], b[0]), Math.max(a[1], b[1])]; // earliest start, latest end
}
```

**Time:** `O(1)` · **Space:** `O(1)` per check. These two helpers are the building blocks; the sweep below decides **which** pairs to check.

### Interview classic: Merge Intervals

Merge all overlapping intervals and return the result.
Example: `[[1, 3], [8, 10], [2, 6], [15, 18]]` → `[[1, 6], [8, 10], [15, 18]]`.

- **Brute force:** keep merging any overlapping pair until nothing changes — `O(n²)` or worse.
- **Key insight:** after sorting by start, an interval can only overlap the **last** one you kept. Everything earlier ends even sooner.

```ts
function merge(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]); // sort a copy by start
  const merged: Interval[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]); // overlap: stretch the last one
    } else {
      merged.push([current[0], current[1]]); // gap: start a new merged interval
    }
  }
  return merged;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)` — the sort dominates; the sweep is one pass. Pushing a fresh `[start, end]` copy means stretching `last` never changes the caller's arrays.

## W — Why It Matters

- Interval questions are a very common family: Merge Intervals, Insert Interval, Meeting Rooms, Non-overlapping Intervals, Employee Free Time.
- Real uses: calendar apps, booking systems, merging IP or date ranges, "busy" bars in scheduling UIs.
- Interviewers listen for "sort by start first" and for whether you asked if touching intervals count as overlapping.

## I — Interview Q&A

### Q: Why use `Math.max` when stretching?

The next interval may sit entirely inside the last one, like `[1, 10]` then `[2, 3]`. Setting the end to `3` would shrink it. `Math.max` keeps the later end.

### Q: Can you merge without sorting?

Not in general with one pass. If the values are small whole numbers, you can mark a timeline array instead, but sorting is the standard answer.

### Q: What if intervals arrive one at a time?

Keep them in a sorted structure and insert each new one with the Insert Interval approach below, or use a balanced tree in a real system.

## C — Common Pitfalls + Fix

### ❌ Forgetting to sort

The sweep assumes sorted starts. Unsorted, `[8, 10]` followed by `[1, 3]` looks like a gap that is not there.

### ❌ Sorting without a comparator

```ts
intervals.sort();                           // ❌ sorts as strings, and mutates the input
[...intervals].sort((a, b) => a[0] - b[0]); // ✅ numeric, on a copy
```

### ❌ Overwriting the end instead of extending it

`last[1] = current[1]` breaks on nested intervals. Use `Math.max`.

### ❌ Getting "touching" wrong

`<=` merges `[1, 3]` and `[3, 5]`; `<` keeps them apart. Read the problem; ask if unsure.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Insert Interval:** you get a list of non-overlapping intervals **already sorted by start**, plus one new interval. Insert it, merging where needed, and return the new sorted list.

`intervals = [[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]]`, `newInterval = [4, 8]` → `[[1, 2], [3, 10], [12, 16]]`

<details><summary>Hint</summary>

Three phases: copy intervals that end before the new one starts, merge everything that overlaps it, then copy the rest.

</details>

### Solution

```ts
function insert(intervals: readonly Interval[], newInterval: Interval): Interval[] {
  const result: Interval[] = [];
  let [start, end] = newInterval;
  let index = 0;

  // 1. Entirely before the new interval: copy as is.
  while (index < intervals.length && intervals[index][1] < start) {
    result.push(intervals[index]);
    index++;
  }
  // 2. Overlapping the new interval: absorb into it.
  while (index < intervals.length && intervals[index][0] <= end) {
    start = Math.min(start, intervals[index][0]);
    end = Math.max(end, intervals[index][1]);
    index++;
  }
  result.push([start, end]);
  // 3. Entirely after: copy the rest.
  while (index < intervals.length) {
    result.push(intervals[index]);
    index++;
  }
  return result;
}
```

**Time:** `O(n)` · **Space:** `O(n)` for the output. The input is already sorted, so no sort is needed — phase 2 is the overlap rule applied to one interval against a sorted run.

**Right now:** Trace `insert([[1, 3], [6, 9]], [2, 5])` through the three phases and write what `result` holds after each one.
