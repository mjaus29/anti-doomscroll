# Simulations and State Machines

## T — TL;DR

For rule-driven problems, make the state explicit, implement one deterministic transition, and process events in the required order.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

State machines are for problems whose behavior is a sequence of rules: a command changes a mode, an event changes a workflow, or a robot changes position. The challenge is faithful execution, not a hidden clever shortcut.

### Mental Model

Think of a traffic light. The current color plus the incoming event determines the next color. A transition table prevents you from inventing a behavior that the rules never allowed.

### First Trace

Start `idle`. Event `start` moves to `running`; event `finish` moves to `done`; event `reset` returns to `idle`. A `finish` event while `idle` does nothing under the lesson's contract, so invalid transitions are explicit rather than accidental.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Design a browser history with visit, back, and forward operations. This is **Design Browser History**.

**Best interview-ready solution:**

1. **Recognize two directions:** history before the current page and history after it are separate states.
2. **Choose the structure:** use a list plus current index, or two stacks for back and forward history.
3. **Visit resets forward history:** a new page makes previously forward pages unreachable.
4. **Clamp movement:** back and forward cannot pass the available boundaries.
5. **Complexity:** list plus index gives O(1) movement and O(n) space; two stacks gives O(1) amortized operations.

**Code solution:**

```ts
// Pseudocode: visit pushes the page and clears forward history; back and forward move between stacks.
class BrowserHistory {
	private readonly backStack: string[];
	private readonly forwardStack: string[] = [];

	constructor(homepage: string) {
		this.backStack = [homepage];
	}

	visit(url: string): void {
		this.backStack.push(url);
		this.forwardStack.length = 0;
	}

	back(steps: number): string {
		while (steps > 0 && this.backStack.length > 1) {
			this.forwardStack.push(this.backStack.pop() as string);
			steps -= 1;
		}
		return this.backStack[this.backStack.length - 1];
	}

	forward(steps: number): string {
		while (steps > 0 && this.forwardStack.length > 0) {
			this.backStack.push(this.forwardStack.pop() as string);
			steps -= 1;
		}
		return this.backStack[this.backStack.length - 1];
	}
}
```

```ts
type State = 'idle' | 'running' | 'done';
type Event = 'start' | 'finish' | 'reset';

function nextState(state: State, event: Event): State {
	if (event === 'reset') return 'idle';
	if (state === 'idle' && event === 'start') return 'running';
	if (state === 'running' && event === 'finish') return 'done';
	return state;
}
```

List every state variable and event that changes it. Sort timestamped events when needed, define simultaneous-event order, and reset all per-case state.

## W — Why It Matters

Simulations model workflow engines, editors, queues, robots, and protocol parsers. They reward careful specification more than cleverness, which is exactly what production stateful code needs.

## I — Interview Q&A

### What belongs in the state?

Every fact needed to determine the next transition and the final answer; hidden mutable context does not count as a reliable state model.

### What should invalid transitions do?

Follow the prompt: ignore, reject, or report them. Never silently invent a new rule.

### How do you test a state machine?

Test each valid transition, invalid transition, reset path, and a sequence that reaches every state.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Leaking state between test cases. **Fix:** construct or reset state per case.
- **Pitfall:** Processing simultaneous events in arbitrary order. **Fix:** define a tie rule.
- **Pitfall:** Mixing transition logic with input plumbing. **Fix:** isolate a pure `nextState` function.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Implement the three-state machine above and process a sequence of events, returning the final state.

### Solution

```ts
type State = 'idle' | 'running' | 'done';
type Event = 'start' | 'finish' | 'reset';

function finalState(events: readonly Event[]): State {
	let state: State = 'idle';
	for (const event of events) {
		if (event === 'reset') state = 'idle';
		else if (state === 'idle' && event === 'start') state = 'running';
		else if (state === 'running' && event === 'finish') state = 'done';
	}
	return state;
}
```

**Right now:** Write one invalid transition for this machine and decide how the contract should handle it.
