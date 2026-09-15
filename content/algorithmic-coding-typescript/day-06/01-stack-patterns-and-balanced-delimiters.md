# Stack Patterns and Balanced Delimiters

## T — TL;DR

Use a stack whenever the newest unresolved item must be matched, undone, or processed before older items.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Stacks solve problems where the newest unfinished thing must be handled first. Nested brackets, undo actions, and nested expressions all have this last-in, first-out shape.

### Mental Model

Think of a stack of plates. You can place a plate on top and remove only the top plate. When a closing bracket appears, it must match the most recent opening bracket still waiting on the stack.

### First Trace

For `([{}])`, push `(`, then `[`, then `{`. Read `}` and pop `{`; read `]` and pop `[`; read `)` and pop `(`. The stack is empty at the end, so the nesting is valid. For `([)]`, `)` meets `[` and fails immediately.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Design a stack that supports push, pop, top, and retrieving the minimum value in constant time. This is **Min Stack**.

**Best interview-ready solution:**

1. **Recognize the extra query:** the stack needs its normal top plus the minimum of everything below it.
2. **Choose the state:** store each value with the minimum seen through that entry, or keep a second minimum stack.
3. **Update together:** push the new minimum with each value; pop both structures together.
4. **Preserve LIFO:** the auxiliary minimum history must follow the same pushes and pops.
5. **Complexity:** O(1) time per operation and O(n) space.

**Code solution:**

```ts
// Pseudocode: push each value with the minimum so far; pop both stacks and read the top minimum.
class MinStack {
	private readonly values: number[] = [];
	private readonly minimums: number[] = [];

	push(value: number): void {
		this.values.push(value);
		const previous = this.minimums[this.minimums.length - 1] ?? value;
		this.minimums.push(Math.min(value, previous));
	}

	pop(): number | undefined {
		this.minimums.pop();
		return this.values.pop();
	}

	getMin(): number | undefined {
		return this.minimums[this.minimums.length - 1];
	}
}
```

For delimiters, the stack contains exactly the unmatched opening symbols in order. A closing symbol is valid only if it matches the most recent opening symbol.

```ts
function isBalanced(text: string): boolean {
	const expected = new Map([
		[')', '('],
		[']', '['],
		['}', '{'],
	]);
	const stack: string[] = [];
	for (const character of text) {
		if ('([{'.includes(character)) stack.push(character);
		else if (expected.has(character) && stack.pop() !== expected.get(character)) return false;
	}
	return stack.length === 0;
}
```

Stacks also model undo, expression evaluation, DFS, and nested decoding. Push and pop are amortized $O(1)$.

## W — Why It Matters

The stack pattern is a compact way to preserve unresolved context. It appears in compilers, browser history, editors, parsers, and common interview prompts.

## I — Interview Q&A

### Why is a counter insufficient for brackets?

A counter tracks depth but not the type of the most recent opening bracket, so `([)]` would look balanced incorrectly.

### What should happen when a closing bracket arrives with an empty stack?

Return false immediately; there is no matching opener.

### What is the space complexity?

$O(n)$ in the worst case when every input character opens an unresolved pair.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Checking only counts. **Fix:** compare the top symbol.
- **Pitfall:** Returning true before the stack is empty. **Fix:** unmatched openers invalidate the result.
- **Pitfall:** Using `shift()` for stack behavior. **Fix:** use array `push` and `pop` at the same end.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return whether a string containing `()[]{}` is balanced. Ignore no characters; any other character is invalid.

### Solution

```ts
function isBalanced(text: string): boolean {
	const pairs = new Map([
		[')', '('],
		[']', '['],
		['}', '{'],
	]);
	const stack: string[] = [];

	for (const character of text) {
		if ('([{'.includes(character)) stack.push(character);
		else if (pairs.get(character) !== stack.pop()) return false;
	}
	return stack.length === 0;
}
```

**Right now:** Test the stack trace for `([{}])` and `([)]` by hand.
