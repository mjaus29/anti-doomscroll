# Mock Contest Workflow

## T — TL;DR

A useful timed session trains model selection, implementation, testing, and review in that order rather than rewarding frantic typing.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A mock contest is practice for the whole decision loop: understand, choose, implement, test, and review. It is not meant to be a long heroic study session.

### Mental Model

Think of a gym circuit with small stations. Each station trains one behavior, and a short review tells you which muscle needs the next repetition. Leaving a problem briefly is part of the method, not failure.

### First Trace

In a 10-minute session, spend two minutes writing the contract and pattern, five minutes implementing, two minutes testing an edge case, and one minute recording the first uncertainty. The timer protects the learning action from expanding into an overwhelming task.

## K — Key Concepts

Use one fixed loop:

1. Scan prompts and choose one clear starting problem.
2. Write contract, constraints, and baseline.
3. State the invariant or recurrence.
4. Implement the smallest correct version.
5. Test tiny and boundary cases.
6. Recheck complexity, overflow, endpoints, and output.
7. Record the first failed assumption.

In TypeScript, also check input parsing, `number` safety, queue operations, and unchecked indexed values.

## W — Why It Matters

Short, repeatable sessions interrupt passive scrolling with measurable practice. The review log tells you which pattern to revisit instead of sending you randomly into another topic.

## I — Interview Q&A

### What do you do when blocked?

Write the exact unknown, spend a bounded minute testing it, then move to the next problem rather than patching blindly.

### What should a post-session review contain?

Pattern, wrong assumption, missing test, complexity mistake, and one next exercise.

### Why solve missed problems again later?

Recognition from reading is weaker than retrieval. Re-solving from a blank file tests whether the pattern was absorbed.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Spending the whole session on one stuck prompt. **Fix:** use a time boundary and record the unknown.
- **Pitfall:** Skipping tests to save time. **Fix:** reserve a small fixed verification block.
- **Pitfall:** Reviewing only the final answer. **Fix:** classify the first wrong assumption.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5 minutes.

Create a one-line checklist for your next 15-minute algorithm session.

### Solution

`contract -> pattern/state -> invariant -> code -> edge test -> complexity -> error log`

This sequence keeps the session action-oriented and produces a reusable review artifact.

**Right now:** Set a 10-minute timer and complete only the contract plus one edge case for the next problem.
