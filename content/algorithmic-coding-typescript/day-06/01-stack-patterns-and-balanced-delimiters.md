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

For delimiters, the stack contains exactly the unmatched opening symbols in order. A closing symbol is valid only if it matches the most recent opening symbol.

```ts
function isBalanced(text: string): boolean {
  const expected = new Map([[')', '('], [']', '['], ['}', '{']]);
  const stack: string[] = [];
  for (const character of text) {
    if ("([{".includes(character)) stack.push(character);
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
  const pairs = new Map([[')', '('], [']', '['], ['}', '{']]);
  const stack: string[] = [];

  for (const character of text) {
    if ("([{".includes(character)) stack.push(character);
    else if (pairs.get(character) !== stack.pop()) return false;
  }
  return stack.length === 0;
}
```

**Right now:** Test the stack trace for `([{}])` and `([)]` by hand.
