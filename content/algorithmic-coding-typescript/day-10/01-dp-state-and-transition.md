# DP State and Transition

## T — TL;DR

Dynamic programming works when different paths reach the same complete state, so define `dp[state]`, its dependencies, base cases, and evaluation order before coding.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Dynamic programming is for problems where many different choices lead to the same smaller question. Solve that question once, save the answer, and reuse it instead of recomputing the same work.

### Mental Model

Imagine planning stairs. To reach step `5`, you only need the answers for steps `4` and `3`; you do not care which exact route created those answers. The DP state is the label on the step, and the transition explains how smaller steps reach it.

### First Trace

For one-or-two-step climbing, `dp[0] = 1`, `dp[1] = 1`, and `dp[2] = dp[1] + dp[0] = 2`. Then `dp[3] = dp[2] + dp[1] = 3`. The table is a record of solved smaller questions.

## K — Key Concepts

Ask four questions:

1. What does `dp[state]` mean in one sentence?
2. Which smaller states produce it?
3. What are the base cases and impossible states?
4. In what order are dependencies available?

For stairs, `dp[i]` can mean the number of ways to reach step `i`, with `dp[i] = dp[i - 1] + dp[i - 2]`. Top-down memoization follows reachable states; bottom-up avoids recursion depth and often compresses memory.

## W — Why It Matters

State design is the central DP interview skill and appears in caching, planning, scheduling, and resource allocation. A wrong state can produce elegant code with the wrong answer.

## I — Interview Q&A

### When can two paths share a DP value?

When they reach the same state and therefore have identical future choices and outcomes.

### What is a transition?

The rule that combines one or more smaller state answers into the current state answer.

### Top-down or bottom-up?

Use top-down for sparse reachable states and direct recursive reasoning; use bottom-up for predictable order, deep inputs, or memory compression.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Defining state as the whole path. **Fix:** retain only information that changes future choices.
- **Pitfall:** Missing impossible-state initialization. **Fix:** choose a sentinel that cannot win accidentally.
- **Pitfall:** Computing before dependencies exist. **Fix:** draw arrows between states and follow their order.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the number of ways to climb `n` stairs when each move is one or two steps.

### Solution

```ts
function climbWays(n: number): number {
	if (n <= 1) return 1;
	let twoBack = 1;
	let oneBack = 1;
	for (let step = 2; step <= n; step += 1) {
		const current = oneBack + twoBack;
		twoBack = oneBack;
		oneBack = current;
	}
	return oneBack;
}
```

Here `dp[step]` means ways to reach `step`, and only the previous two states are needed.

**Right now:** Write `dp[state] = ...` in one sentence for one problem you know.
