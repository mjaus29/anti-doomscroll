# Recursion and the Call Stack

## T — TL;DR

*Recursion* means a function solves a problem by calling itself on a smaller piece of the same problem. Every recursive function needs a **base case** (a tiny input it answers directly) and a **recursive step** (shrink the input, call yourself, combine the result).

**Reach for it when:**

- The problem is defined in terms of smaller versions of itself ("the answer for `n` uses the answer for `n - 1` or `n / 2`").
- The data is nested: trees, folders, nested arrays, JSON.
- You need to try choices one after another and undo them (backtracking, later today).

## K — Key Concepts

### Picture it

You stand at the back of a long queue and want to know your position. You ask the person in front, who asks the person in front of them, and so on. The first person says "I'm 1" (the base case). Each answer travels back, and everyone adds 1 on the way.

### Walk through it

The *call stack* is the list of function calls that have started but not finished. Each call waits on the stack until the call it made returns. Trace `sumTo(3)`, where `sumTo(n) = n + sumTo(n - 1)` and `sumTo(0) = 0`:

| Step | Call stack (top on the right) | What happens |
| :--- | :---------------------------- | :----------- |
| 1 | `sumTo(3)` | Not the base case. Needs `sumTo(2)` first. |
| 2 | `sumTo(3)`, `sumTo(2)` | Needs `sumTo(1)`. |
| 3 | `sumTo(3)`, `sumTo(2)`, `sumTo(1)` | Needs `sumTo(0)`. |
| 4 | ..., `sumTo(1)`, `sumTo(0)` | Base case. Returns `0`. |
| 5 | `sumTo(3)`, `sumTo(2)`, `sumTo(1)` | Returns `1 + 0 = 1`. |
| 6 | `sumTo(3)`, `sumTo(2)` | Returns `2 + 1 = 3`. |
| 7 | `sumTo(3)` | Returns `3 + 3 = 6`. Stack is empty. |

The stack grew to depth 4. Each waiting call uses memory, so recursion depth counts as space.

### The template

```ts
function sumTo(n: number): number {
  if (n <= 0) return 0;      // base case: answer directly, no further calls
  return n + sumTo(n - 1);   // recursive step: smaller input, then combine
}
```

**Time:** `O(n)` · **Space:** `O(n)` — there are `n` calls, and up to `n` of them wait on the stack at once.

If the input never reaches the base case, calls pile up until JavaScript throws `RangeError: Maximum call stack size exceeded`. That is a *stack overflow*. Node usually allows around 10,000 frames, so depth near `10⁵` needs a loop instead.

### Why naive Fibonacci is slow

```ts
function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2); // two calls per call
}
```

`fib(5)` calls `fib(3)` twice, `fib(2)` three times, and so on. The calls form a tree that doubles each level, so this is about `O(2ⁿ)`. The fix is to remember answers you already computed. That is *memoization*, and it is the start of dynamic programming on Day 11.

### Interview classic: Pow(x, n)

Compute `x` raised to the integer power `n` (which may be negative) without `Math.pow` or `**`.
Example: `myPow(2, 10)` → `1024`, `myPow(2, -2)` → `0.25`.

- **Brute force:** multiply `x` by itself `n` times — `O(n)`, and too slow for `n` near `2³¹`.
- **Key insight:** `x¹⁰ = (x⁵)²`. Compute half the power once, then square it. Odd powers need one extra `x`. The input halves each call.

```ts
function myPow(x: number, n: number): number {
  if (n < 0) return 1 / myPow(x, -n);
  if (n === 0) return 1;                  // base case

  const half = myPow(x, Math.floor(n / 2)); // compute once, reuse
  return n % 2 === 0 ? half * half : half * half * x;
}
```

This is the template with a bigger shrink: `n` goes to `n / 2` instead of `n - 1`, so there are only `O(log n)` calls and `O(log n)` stack depth.

## W — Why It Matters

- Trees, graphs, backtracking, and top-down DP are all written as recursion. If the call stack is clear, those lessons are easier.
- Real code walks nested data the same way: file trees, comment threads, JSON, the DOM.
- Interviewers listen for you to state the base case first and to name the stack depth as space cost.

## I — Interview Q&A

### Q: What is the space complexity of a recursive function?

At least the maximum depth of the call stack, because every waiting call keeps its own variables. `sumTo` uses `O(n)`; `myPow` uses `O(log n)`.

### Q: Can every recursive function be written as a loop?

Yes. You can always manage your own stack with an array. People do this when the depth could overflow the real call stack.

### Q: Why compute `half` once in `myPow`?

Writing `myPow(x, n / 2) * myPow(x, n / 2)` makes two calls each time, which turns `O(log n)` back into `O(n)`. Store the result and reuse it.

## C — Common Pitfalls + Fix

### ❌ Missing or unreachable base case

If `n` can skip past the base case (for example, a negative `n` with `if (n === 0)`), recursion never stops. Use `n <= 0` or handle negatives first.

### ❌ Not shrinking the input

```ts
return n + sumTo(n);     // ❌ same input forever → stack overflow
return n + sumTo(n - 1); // ✅ closer to the base case every call
```

### ❌ Forgetting to return the recursive result

Calling `sumTo(n - 1)` without `return` throws the answer away, and the function returns `undefined`.

### ❌ Recomputing the same calls

Naive Fibonacci makes an exponential number of calls. If the same arguments repeat, cache them in a `Map`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Flatten a Nested Array:** given an array whose items are numbers or more arrays (nested to any depth), return one flat array of all the numbers in order. Do not use `.flat()`.

`[1, [2, [3, 4]], 5]` → `[1, 2, 3, 4, 5]`

<details><summary>Hint</summary>

For each item: if it is a number, push it. If it is an array, flatten it with the same function and push those results.

</details>

### Solution

```ts
type Nested = number | Nested[];

function flatten(items: readonly Nested[]): number[] {
  const result: number[] = [];

  const walk = (list: readonly Nested[]): void => {
    for (const item of list) {
      if (Array.isArray(item)) walk(item); // nested: same problem, smaller piece
      else result.push(item);              // base case: a plain number
    }
  };

  walk(items);
  return result;
}
```

**Time:** `O(n)` · **Space:** `O(n + d)`, where `n` is the count of numbers and arrays and `d` is the deepest nesting. Each item is visited once, and the shared `result` array avoids copying with spread at every level.

**Right now:** Draw the call stack for `myPow(2, 5)` on paper and write what each call returns.
