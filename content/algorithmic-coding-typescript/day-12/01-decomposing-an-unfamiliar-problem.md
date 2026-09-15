# Decomposing an Unfamiliar Problem

## T — TL;DR

Turn an unfamiliar prompt into a contract, a model, a baseline, and one proven optimization before writing polished code.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Decomposition is the skill that lets you solve a problem you have never seen. Instead of hunting for a remembered title, break the prompt into input, output, constraints, repeated work, and a model you can reason about.

### Mental Model

Think like a detective. First identify the people and rules, then reconstruct what must be true, then choose the tool that answers the important question. The algorithm name comes after the evidence.

### First Trace

For a route with a transfer limit, write the state as `(location, transfersUsed)`. A route arriving at `A` with one transfer left is not the same state as arriving at `A` with three transfers left. That one observation prevents a tempting but incorrect location-only solution.

## K — Key Concepts

Use this seven-step pass:

1. Restate input, output, and constraints.
2. Work one normal and one edge case by hand.
3. Classify the shape: ordered, connected, nested, or repeatedly queried.
4. Write the simplest correct baseline.
5. Identify repeated work and choose the structure that removes it.
6. State the invariant, recurrence, or exchange argument.
7. Estimate time and space before polishing.

One prompt can combine patterns, such as sorting plus binary search plus DP. Name the model before naming the algorithm.

## W — Why It Matters

Interviews rarely reward memorizing problem titles because real work presents new variants. This decomposition habit turns ambiguity into an executable next step and keeps low-attention study sessions bounded.

## I — Interview Q&A

### What do you do when no pattern is obvious?

Build a brute-force solution and inspect what work repeats. The baseline gives you a correctness oracle.

### How do you choose a representation?

Start from the dominant operation: neighbor traversal, range query, membership, minimum priority, or state transition.

### When do you stop analyzing?

Once the contract, invariant, complexity, and edge cases are clear enough to implement and test.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Searching for a title match. **Fix:** model the prompt from its constraints.
- **Pitfall:** Coding before defining output failure. **Fix:** write the return contract first.
- **Pitfall:** Naming a pattern without a proof. **Fix:** state the invariant or exchange step.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

For a prompt asking for the cheapest route with a maximum number of transfers, write the vertex state, edge transition, and likely algorithm family. Do not implement yet.

### Solution

Use state `(location, transfersUsed)`, because the same location with different remaining transfers has different future options. Each flight creates a transition to another location and increments transfers. A layered BFS works for equal costs; with weighted costs and a transfer limit, use DP or a state-expanded shortest-path search.

The key is not to model the vertex as only `location`.

**Right now:** Write the input, output, and constraint contract for one unfamiliar problem in three lines.
