# Stacks: Valid Parentheses and Min Stack

## T — TL;DR

A **stack** is a list where you only add and remove at one end: the last thing you put in is the first thing you take out (*LIFO* — last in, first out). In TypeScript a plain array with `push` and `pop` is a stack, and both operations are `O(1)`.

**Reach for it when:**

- Things open and close in nested pairs (brackets, tags, function calls).
- The most recent unfinished item is the one you need next.
- You process tokens and an operator needs the last few values you saw.
- You need "undo" or "go back" behaviour.

## K — Key Concepts

### Picture it

A stack of plates. You put a clean plate on top and you take the top plate off. You never pull one from the middle. For brackets, every opening bracket is a plate; a closing bracket must match the plate on top, or the dishes fall.

### Walk through it

Check `"{[()]}"` with a stack of expected closers.

| Step | char | Stack after (top on right) | Action and why |
| :--- | :--- | :------------------------- | :------------- |
| 1 | `{` | `}` | Opener: remember we now owe a `}`. |
| 2 | `[` | `} ]` | Opener: owe a `]`. |
| 3 | `(` | `} ] )` | Opener: owe a `)`. |
| 4 | `)` | `} ]` | Closer matches the top. Pop. |
| 5 | `]` | `}` | Matches the top. Pop. |
| 6 | `}` | (empty) | Matches. Pop. Stack empty at the end → valid. |

For `"(]"`: after `(` the top is `)`, but we read `]`. Mismatch → invalid.

### The template

```ts
function isValid(text: string): boolean {
  const closerFor: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];

  for (const char of text) {
    if (char in closerFor) {
      stack.push(closerFor[char]); // push what we expect to see later
    } else if (stack.pop() !== char) {
      return false; // wrong closer, or nothing open
    }
  }
  return stack.length === 0; // anything left open is an error
}
```

**Time:** `O(n)` · **Space:** `O(n)` — each character is pushed and popped at most once, and the stack can hold up to `n` openers.

### Interview classic: Min Stack

Design a stack with `push`, `pop`, `top`, and `getMin`, where **every** operation is `O(1)`.
Example: push 5, push 2, push 7 → `getMin()` is `2`; pop twice → `getMin()` is `5`.

- **Brute force:** scan the whole stack in `getMin` — `O(n)` per call.
- **Key insight:** store the minimum **alongside** each value. When you push, record "the smallest value at or below this point". Popping then restores the old minimum automatically.

```ts
class MinStack {
  private values: number[] = [];
  private mins: number[] = []; // mins[i] = smallest of values[0..i]

  push(value: number): void {
    const currentMin = this.mins.length === 0 ? value : this.mins[this.mins.length - 1];
    this.values.push(value);
    this.mins.push(Math.min(value, currentMin));
  }

  pop(): void {
    this.values.pop();
    this.mins.pop(); // the min for the level below is now on top again
  }

  top(): number {
    return this.values[this.values.length - 1];
  }

  getMin(): number {
    return this.mins[this.mins.length - 1];
  }
}
```

Two stacks that grow and shrink together. Each level of the stack "remembers" its own answer, so nothing has to be recomputed when the top goes away.

## W — Why It Matters

- Bracket matching is a warm-up question in many screens and the base idea for parsers, HTML validators, and code editors.
- Min Stack tests whether you can trade a little memory for constant-time queries — a theme in every "design" question.
- Browsers' back button, undo history, and the JavaScript call stack all work this way.
- Interviewers listen for the end-of-input check: "anything still open means invalid."

## I — Interview Q&A

### Q: Why push the expected closer instead of the opener?

Then the check is one comparison: `stack.pop() !== char`. Pushing openers works too, but you need a second lookup to find the matching closer.

### Q: Can Min Stack use less memory?

Yes. Push onto `mins` only when the new value is `<=` the current min, and pop from `mins` only when the popped value equals it. The worst case is still `O(n)`, but it is often smaller.

### Q: What if there is only one type of bracket?

You do not need a stack — a counter works. Add 1 for `(`, subtract 1 for `)`, and fail if it ever goes below 0 or ends above 0.

## C — Common Pitfalls + Fix

### ❌ Forgetting the final empty check

`"(("` never hits a mismatch. Return `stack.length === 0`, not `true`.

### ❌ Popping an empty stack without noticing

`[].pop()` returns `undefined`. Comparing it with the closer handles `")"` correctly — but only if you compare. Never assume the stack has items.

### ❌ Using `shift`/`unshift` for the stack

```ts
stack.unshift(char); // ❌ O(n): moves every element
stack.push(char);    // ✅ O(1): work at the end of the array
```

### ❌ Min Stack that only tracks one number

A single `min` variable breaks when you pop the minimum — you no longer know the previous one. Keep one min per level.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Evaluate Reverse Polish Notation:** you get tokens in *postfix* order (the operator comes after its two numbers), for example `["2", "1", "+", "3", "*"]` means `(2 + 1) * 3`. Return the result. Operators are `+ - * /`, and division truncates toward zero.

`["4", "13", "5", "/", "+"]` → `6` (13 / 5 = 2, then 4 + 2)

<details><summary>Hint</summary>

Push numbers. When you see an operator, pop two numbers — the first pop is the **right** operand — and push the result.

</details>

### Solution

```ts
function evalRPN(tokens: readonly string[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token !== "+" && token !== "-" && token !== "*" && token !== "/") {
      stack.push(Number(token));
      continue;
    }
    const right = stack.pop()!; // popped first, so it was pushed last
    const left = stack.pop()!;
    if (token === "+") stack.push(left + right);
    else if (token === "-") stack.push(left - right);
    else if (token === "*") stack.push(left * right);
    else stack.push(Math.trunc(left / right)); // truncate toward zero
  }
  return stack[0];
}
```

**Time:** `O(n)` · **Space:** `O(n)`. The stack always holds the values that are waiting for an operator, and the most recent two are exactly the operands each operator needs.

**Right now:** Trace `isValid("([)]")` in a table like the one above and find the exact step where it fails.
