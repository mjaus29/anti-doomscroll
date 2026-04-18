# setInterval

## TL;DR
setInterval is part of JavaScript's async execution model. Start with the mental model of when work gets queued and resumed, then map the API or concept onto that model. Once the model is clear, the syntax becomes much easier to trust.

## Key Concepts
- setInterval only makes sense when you place it on the event-loop timeline.
- JavaScript runs your current call stack to completion before picking more queued work.
- Microtasks run before the engine moves to the next macrotask turn.
- Most async bugs are ordering bugs, cancellation bugs, or unhandled rejection bugs.

## Why It Matters
Async behavior is where many otherwise solid codebases become unpredictable. Knowing setInterval helps you debug ordering issues, choose the right API, and explain why code that 'looks sequential' still resumes later.

## Syntax / Example
```js
const id = setInterval(() => console.log("tick"), 1000)
clearInterval(id)
```

## Common Pitfalls
- Assuming async code runs immediately in source order; always think about queueing.
- Forgetting to handle rejections or cancellation paths.
- Using the wrong promise combinator for your failure policy.

## Interview Angle
- **Q:** How would you explain setInterval without code?  
  **A:** Start with the event-loop mental model, then map the API or keyword onto that timeline.
- **Q:** What bug does misunderstanding setInterval usually create?  
  **A:** Ordering bugs, missed error handling, or cancellation bugs are the common ones.

## Mini Challenge
Create a tiny example that shows the ordering behavior behind setInterval.

## Mini Challenge Solution
A correct solution prints or returns values in an order that matches the event-loop rule behind setInterval, then briefly explains why.

## Related Topics
- Previous: [setTimeout](04-set-timeout.md)
- Next: [queueMicrotask](06-queue-microtask.md)
