# Monotonic Stack

## T — TL;DR

A **monotonic stack** is a stack whose values stay in one order (always decreasing, or always increasing) from bottom to top. It answers "what is the next bigger (or smaller) item to my right?" for every item in one pass, `O(n)` instead of `O(n²)`.

**Reach for it when:**

- The problem says "next greater", "next smaller", "previous warmer", or "how many days until".
- Each item waits for the first later item that beats it.
- A brute force would scan right from every index.

## K — Key Concepts

### Picture it

People in a queue for a concert, each holding a sign with their height. A new person arrives. Everyone shorter than them who is still waiting for "someone taller to come along" now has their answer — they leave the waiting line. The waiting line is always tallest at the back, shortest at the front.

### Walk through it

Next greater element for `values = [2, 1, 5, 3]`. The stack holds **indexes** still waiting for an answer.

| Step | i → value | Stack before (values) | Action and why | answer |
| :--- | :-------- | :-------------------- | :------------- | :----- |
| 1 | 0 → 2 | empty | Nothing to resolve. Push 0. | `[-1, -1, -1, -1]` |
| 2 | 1 → 1 | `[2]` | 1 is not bigger than 2. Push 1. | same |
| 3 | 2 → 5 | `[2, 1]` | 5 > 1: index 1's answer is 5. 5 > 2: index 0's answer is 5. Push 2. | `[5, 5, -1, -1]` |
| 4 | 3 → 3 | `[5]` | 3 is not bigger than 5. Push 3. | same |

Indexes 2 and 3 never find a bigger value, so they keep `-1`. The stack values were always decreasing from bottom to top — that is the *monotonic* part.

### The template

```ts
function nextGreater(values: readonly number[]): number[] {
  const answer = new Array<number>(values.length).fill(-1);
  const waiting: number[] = []; // indexes; their values decrease bottom → top

  for (let i = 0; i < values.length; i++) {
    // The current value is the "next greater" for every smaller value on top.
    while (waiting.length > 0 && values[waiting[waiting.length - 1]] < values[i]) {
      answer[waiting.pop()!] = values[i];
    }
    waiting.push(i);
  }
  return answer;
}
```

**Time:** `O(n)` · **Space:** `O(n)` — the inner `while` looks nested, but each index is pushed once and popped at most once, so the total work is at most `2n`.

### Interview classic: Daily Temperatures

For each day, return how many days you must wait for a warmer temperature (0 if never).
Example: `[73, 74, 75, 71, 69, 72, 76, 73]` → `[1, 1, 4, 2, 1, 1, 0, 0]`.

- **Brute force:** for each day, scan forward until a warmer one — `O(n²)`.
- **Key insight:** it is "next greater element", but the answer is the **distance** between indexes, not the value. Store indexes so you can subtract.

```ts
function dailyTemperatures(temps: readonly number[]): number[] {
  const waitDays = new Array<number>(temps.length).fill(0);
  const waiting: number[] = [];

  for (let day = 0; day < temps.length; day++) {
    while (waiting.length > 0 && temps[waiting[waiting.length - 1]] < temps[day]) {
      const colderDay = waiting.pop()!;
      waitDays[colderDay] = day - colderDay; // distance, not temperature
    }
    waiting.push(day);
  }
  return waitDays;
}
```

Only one line changed from the template: what we write into the answer when an index is popped.

## W — Why It Matters

- Daily Temperatures, Next Greater Element, Stock Span, and Largest Rectangle in Histogram are all this pattern.
- The "each item is pushed and popped once" argument is how you prove a nested loop is still `O(n)` — interviewers love hearing it.
- Real uses: finding the next price drop in a chart, or matching skyline heights in layout code.

## I — Interview Q&A

### Q: Why store indexes instead of values?

An index gives you both: the value (`values[i]`) and the position (for distances or writing the answer). A value alone loses where it came from.

### Q: How do you find the previous greater element instead?

Run the same loop, but read the answer at push time: after popping smaller values, the item left on top (if any) is the previous greater one. Or loop from right to left.

### Q: Have you seen Largest Rectangle in Histogram?

Yes — it uses an **increasing** stack. When a bar is popped, the current index is its first shorter bar on the right and the new top is its first shorter bar on the left, so you know how wide that bar's rectangle can stretch.

## C — Common Pitfalls + Fix

### ❌ Calling it `O(n²)` because of the nested loop

Count pushes and pops, not loop levels. Each index enters and leaves the stack once.

### ❌ `<` vs `<=` in the pop condition

```ts
values[top] < values[i]  // pop only strictly smaller: "next greater"
values[top] <= values[i] // pop equal too: "next greater or equal"
```

Read the problem's wording and choose on purpose.

### ❌ Forgetting the default answer

Items still on the stack at the end never found an answer. Fill the result with `-1` or `0` up front.

### ❌ Peeking an empty stack

Always check `waiting.length > 0` **before** reading `waiting[waiting.length - 1]`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Final Prices With a Special Discount in a Shop:** for each item, you get a discount equal to the price of the first item **to its right** whose price is less than or equal to it. Return the final prices.

`[8, 4, 6, 2, 3]` → `[4, 2, 4, 2, 3]`

<details><summary>Hint</summary>

This is "next smaller or equal". Keep a stack whose prices increase from bottom to top, and pop while the current price is `<=` the top.

</details>

### Solution

```ts
function finalPrices(prices: readonly number[]): number[] {
  const result = [...prices]; // items with no discount keep their price
  const waiting: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    while (waiting.length > 0 && prices[waiting[waiting.length - 1]] >= prices[i]) {
      const item = waiting.pop()!;
      result[item] = prices[item] - prices[i];
    }
    waiting.push(i);
  }
  return result;
}
```

**Time:** `O(n)` · **Space:** `O(n)`. It is the template with the comparison flipped: the current price is the discount for every waiting item that costs at least as much.

**Right now:** Run `dailyTemperatures([30, 40, 50, 60])` and `dailyTemperatures([60, 50, 40, 30])` in your head. Which one keeps the stack big, and which keeps it tiny?
