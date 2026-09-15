# Sweep Line Events

A sweep line changes a continuous interval problem into an ordered sequence of endpoint events. Sort starts and ends, update active state, and record the statistic at each coordinate.

## Encode event order

For maximum simultaneous meetings, a start adds one active meeting and an end removes one. If an end at time `t` frees a room before a start at `t`, process ends first.

```ts
type Event = readonly [time: number, delta: number];

function maximumOverlap(intervals: readonly (readonly [number, number])[]): number {
	const events: Event[] = [];

	for (const [start, end] of intervals) {
		events.push([start, 1], [end, -1]);
	}

	events.sort((left, right) => left[0] - right[0] || left[1] - right[1]);

	let active = 0;
	let best = 0;
	for (const [, delta] of events) {
		active += delta;
		best = Math.max(best, active);
	}

	return best;
}
```

The tie-breaker puts `-1` before `1`. If touching closed intervals count as overlapping, reverse that tie rule.

## Keep only necessary state

A sweep may track active count, current covered length, or a set of labels. The state should describe the segment immediately after the current event. If the statistic depends on the distance to the next event, calculate before applying the next delta.

## Practice

## Checkpoint

Draw two intervals that share an endpoint and decide which event comes first. Encode that decision in the comparator and in the proof.

# Sweep Line Events

## T — TL;DR

Convert interval starts and ends into sorted events, then maintain the active state as a line sweeps from left to right.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A sweep line answers questions about many intervals being active at the same time. Instead of checking every pair, it notices only the moments when the active count changes: starts and ends.

### Mental Model

Picture an elevator passing through a building timeline. A person enters at a start event and leaves at an end event. Between events, the number inside does not change, so only those doors opening and closing need to be processed.

### First Trace

For half-open intervals `[1, 4)` and `[2, 5)`, start with `0`, add one at `1`, add one at `2`, remove one at `4`, and remove one at `5`. The maximum active count is `2`. At time `4`, the first interval has already ended.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the minimum number of meeting rooms required for a set of meetings. This is **Meeting Rooms II**.

**Best interview-ready solution:**

1. **Convert to events:** every start needs a room; every end releases one.
2. **Sort starts and ends separately:** compare the next start with the next end.
3. **Allocate or release:** an earlier start increases active rooms; an earlier end frees one.
4. **Handle ties:** for half-open meetings, process an end before a start at the same time.
5. **Complexity:** O(n log n) time and O(n) space; a min-heap is an alternative when meetings arrive online.

**Code solution:**

```ts
// Pseudocode: sort starts and ends, allocate before the next end, otherwise release a room.
function minimumRooms(meetings: readonly (readonly [number, number])[]): number {
	const starts = meetings.map(([start]) => start).sort((a, b) => a - b);
	const ends = meetings.map(([, end]) => end).sort((a, b) => a - b);
	let startIndex = 0;
	let endIndex = 0;
	let active = 0;
	let best = 0;
	while (startIndex < starts.length) {
		if (starts[startIndex] < ends[endIndex]) {
			active += 1;
			best = Math.max(best, active);
			startIndex += 1;
		} else {
			active -= 1;
			endIndex += 1;
		}
	}
	return best;
}
```

For maximum overlap, a start contributes `+1` and an end contributes `-1`. Sort by time, then define the tie rule: process ends first for half-open intervals, starts first when touching closed intervals overlap.

```ts
type Event = readonly [time: number, delta: number];
```

The invariant is that `active` equals the number of intervals active at the current event position under the chosen endpoint convention.

## W — Why It Matters

Sweep lines solve meeting rooms, bandwidth peaks, covered length, and event streams in $O(n log n)$ instead of comparing every pair. The tie-breaker is a compact model of real-world simultaneity.

## I — Interview Q&A

### Why can endpoints be represented as deltas?

Only changes in active state matter; between consecutive event coordinates, the state is constant.

### Why does tie order matter?

Events at the same coordinate can either overlap or hand off a resource. The comparator must match the contract.

### What if you need covered length, not overlap count?

Measure the distance from the previous coordinate using the active count before applying the next event.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Wrong same-time order. **Fix:** draw two touching intervals and encode the desired semantics.
- **Pitfall:** Updating the answer before the intended event. **Fix:** define whether the statistic describes before or after the delta.
- **Pitfall:** Forgetting negative deltas. **Fix:** create both endpoints for every interval.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the maximum number of overlapping half-open intervals `[start, end)`. An interval ending at `t` does not overlap one starting at `t`.

### Solution

```ts
function maximumOverlap(intervals: readonly (readonly [number, number])[]): number {
	const events: Array<[number, number]> = [];
	for (const [start, end] of intervals) events.push([start, 1], [end, -1]);
	events.sort((left, right) => left[0] - right[0] || left[1] - right[1]);

	let active = 0;
	let best = 0;
	for (const [, delta] of events) {
		active += delta;
		best = Math.max(best, active);
	}
	return best;
}
```

The sort is $O(n log n)$ and the sweep is $O(n)$.

**Right now:** Mark one interval's start and end on a number line and decide which event is processed first at a tie.
