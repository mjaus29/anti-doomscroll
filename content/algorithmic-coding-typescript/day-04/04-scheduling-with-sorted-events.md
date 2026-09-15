# Scheduling with Sorted Events

## T — TL;DR

Name the scheduling objective first, then sort or prioritize by the quantity that preserves that objective's invariant.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Scheduling questions look similar but can ask for different things: the most jobs, the highest value, the earliest finish, or the fewest rooms. The objective decides the pattern.

### Mental Model

Think of a calendar manager. If the goal is to fit the most meetings, finish early. If the goal is to earn the most value, a short meeting may be worth less than a long one. If the goal is rooms, count how many meetings are active at once.

### First Trace

For meetings `[1, 4)`, `[2, 3)`, and `[3, 5)`, the minimum-room question peaks at `2` active meetings. The maximum-count question can choose `[2, 3)` and `[3, 5)` for `2` meetings. Same input, different objective, different reasoning.

## K — Key Concepts

- Maximum number of unweighted meetings: sort by earliest finish.
- Minimum simultaneous rooms: process starts and ends as events or track the earliest active finish in a min-heap.
- Maximum value: earliest finish alone is not enough; use weighted interval DP and predecessor search.
- Deadline scheduling may require replacing the longest selected job with a heap.

The same intervals can require different algorithms because the objective changed from count to value or resource usage.

## W — Why It Matters

Scheduling is a direct interview and production problem: calendars, batch jobs, servers, and delivery systems all optimize different objectives. Stating the objective prevents a plausible but wrong greedy solution.

## I — Interview Q&A

### Why does earliest finish maximize meeting count?

It leaves the largest remaining time for compatible meetings, and an exchange argument proves the first choice is safe.

### Why is earliest finish insufficient for weighted meetings?

A short low-value meeting can block a long high-value combination; the state must compare taking and skipping jobs.

### When is a heap useful?

When the next event depends on the smallest or largest active endpoint and that priority changes as jobs arrive.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Optimizing count when the prompt asks for value. **Fix:** underline the objective before coding.
- **Pitfall:** Assuming sorted input. **Fix:** include sorting cost or verify the contract.
- **Pitfall:** Allocating one resource per interval. **Fix:** track reusable resources with a heap or endpoint sweep.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return the minimum number of rooms needed for half-open meeting intervals `[start, end)`.

### Solution

```ts
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

The two sorted event streams give $O(n log n)$ time and $O(n)$ space.

**Right now:** State whether your next scheduling problem optimizes count, value, time, or resource usage.
