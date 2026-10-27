# Meeting Rooms and Overlapping Intervals

## T — TL;DR

Most scheduling questions become easy after sorting. Sort by **start** to check whether anything clashes or to count how many things happen at once. Sort by **end** to pick the most non-overlapping intervals: always keep the one that finishes first.

**Reach for it when:**

- The problem talks about meetings, rooms, bookings, or tasks with start and end times.
- It asks "can all of these fit?", "how many at the same time?", or "remove the fewest so none overlap".
- The intervals do not need merging — you need a **yes/no**, a **count**, or a **choice**.

## K — Key Concepts

### Picture it

One meeting room, a stack of booking requests. Sort them by start time and read them in order. If a booking starts before the previous one has finished, two groups would be in the room at once — clash. If you have many rooms, the question becomes: at the busiest moment, how many groups are in a room?

### Walk through it

**Meeting Rooms:** can one person attend all of `[[0, 30], [5, 10], [15, 20]]`? Here a meeting ending at `10` and one starting at `10` do **not** clash.

| Step | Meeting (sorted by start) | Previous end | Action and why |
| :--- | :------------------------ | :----------- | :------------- |
| 1 | `[0, 30]` | — | First meeting: fine. |
| 2 | `[5, 10]` | 30 | `5 < 30`: starts before the last one ends. Clash → `false`. |

After sorting, only neighbours can clash: if a meeting does not clash with the one right before it, it cannot clash with any earlier one, because those end no later.

### The template

```ts
type Interval = [start: number, end: number];

function canAttendMeetings(meetings: readonly Interval[]): boolean {
  const sorted = [...meetings].sort((a, b) => a[0] - b[0]); // by start, on a copy
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return false; // starts before the previous ends
  }
  return true;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)` — the sort dominates (the copy costs `O(n)`); the check is one pass.

### Interview classic: Meeting Rooms II

Return the minimum number of rooms needed so every meeting gets one.
Example: `[[0, 30], [5, 10], [15, 20]]` → `2`.

- **Brute force:** for every meeting, count how many others overlap its start time — `O(n²)`.
- **Key insight:** you only care about **events**: a start needs a room, an end frees one. Sort starts and ends **separately**. Walk the starts; if the earliest unused end has already passed, reuse that room, otherwise open a new one.

Starts `[0, 5, 15]`, ends `[10, 20, 30]`:

| Start | Earliest end not yet used | Action and why | Rooms |
| :---- | :------------------------ | :------------- | :---- |
| 0 | 10 | `0 < 10`: nobody has left. Open a room. | 1 |
| 5 | 10 | `5 < 10`: still nobody has left. Open a room. | 2 |
| 15 | 10 | `15 >= 10`: a meeting ended. Reuse its room; move to the next end. | 2 |

```ts
function minMeetingRooms(meetings: readonly Interval[]): number {
  const starts = meetings.map((meeting) => meeting[0]).sort((a, b) => a - b);
  const ends = meetings.map((meeting) => meeting[1]).sort((a, b) => a - b);
  let rooms = 0;
  let endIndex = 0;

  for (const start of starts) {
    if (start < ends[endIndex]) rooms++; // nobody has left yet: need a new room
    else endIndex++;                     // a meeting has ended: reuse its room
  }
  return rooms;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)`. You never need to know **which** meeting ended, only **that** one did. A min-heap of end times (Day 8, topic 1) gives the same answer and is the other standard approach.

### Variation: Non-overlapping Intervals

Return the fewest intervals to remove so the rest do not overlap (touching is fine).
Example: `[[1, 2], [2, 3], [3, 4], [1, 3]]` → `1` (remove `[1, 3]`).

**Greedy idea:** sort by **end**. Keep each interval that starts at or after the last kept end. Picking the one that ends first always leaves the most room for the rest — swapping it for any other choice can never fit more.

```ts
function eraseOverlapIntervals(intervals: readonly Interval[]): number {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]); // by END
  let kept = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) { kept++; lastEnd = end; } // fits after the last kept one
  }
  return intervals.length - kept;
}
```

## W — Why It Matters

- Meeting Rooms II is a top scheduling question, and the "separate starts and ends" trick reappears in "max people in a room at once" problems.
- Greedy-by-end-time is the classic **activity selection** idea, and the first greedy proof many interviewers expect (Day 12, topic 1).
- Interviewers listen for which key you sort by and why.

## I — Interview Q&A

### Q: Why sort by end, not start, for Non-overlapping Intervals?

Sorting by start can keep a long interval like `[1, 100]` that blocks many short ones. Ending first frees the timeline soonest.

### Q: How would the heap version of Meeting Rooms II work?

Sort meetings by start. Keep a min-heap of end times of rooms in use. For each meeting, if the smallest end is `<=` its start, pop it (room freed). Push its end. The answer is the largest heap size.

### Q: What changes if touching meetings clash?

Use `<=` instead of `<` wherever a start is compared with an end, so a meeting starting exactly when another ends counts as a clash. Always ask which rule applies.

## C — Common Pitfalls + Fix

### ❌ Checking only unsorted neighbours

Comparing `meetings[i]` with `meetings[i - 1]` without sorting misses clashes between far-apart items.

### ❌ Sorting starts and ends together as pairs in Meeting Rooms II

The trick needs two **independent** sorted lists. Once split, an end no longer belongs to a specific start — and that is fine.

### ❌ Wrong tie rule

```ts
if (start <= ends[endIndex]) rooms++; // ❌ treats [1, 5] and [5, 8] as needing two rooms
if (start < ends[endIndex]) rooms++;  // ✅ a room freed at 5 can be reused at 5
```

### ❌ Mutating the input with `.sort()`

Sort a copy (`[...meetings]`) or a mapped array. Callers do not expect their data reordered.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Minimum Number of Arrows to Burst Balloons:** each balloon spans `[start, end]` on a line. An arrow shot at position `x` bursts every balloon with `start <= x <= end`. Return the fewest arrows to burst them all.

`[[10, 16], [2, 8], [1, 6], [7, 12]]` → `2` (shoot at `6` and at `12`)

<details><summary>Hint</summary>

Sort by end. Shoot at the end of the first balloon. Only shoot again when a balloon starts after the last arrow.

</details>

### Solution

```ts
function findMinArrowShots(balloons: readonly Interval[]): number {
  if (balloons.length === 0) return 0;
  const sorted = [...balloons].sort((a, b) => a[1] - b[1]); // by end
  let arrows = 1;
  let arrowAt = sorted[0][1]; // shoot as far right as the first balloon allows

  for (const [start, end] of sorted) {
    if (start > arrowAt) { // this balloon is past the last arrow
      arrows++;
      arrowAt = end;
    }
  }
  return arrows;
}
```

**Time:** `O(n log n)` · **Space:** `O(n)`. Shooting at the earliest end bursts that balloon and every balloon that overlaps it, which is the same greedy idea as Non-overlapping Intervals.

**Right now:** Run `minMeetingRooms` by hand on `[[1, 5], [2, 6], [5, 8], [7, 9]]` and predict the answer before checking (it is `2`).
