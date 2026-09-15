# Backtracking and Pruning

## T — TL;DR

Backtracking makes one choice, explores the resulting state, undoes it, and prunes only branches proven unable to produce a valid or better answer.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Backtracking is a disciplined way to try choices for a constraint problem. It is appropriate when the answer may require exploring several paths, but early rules can prove that some paths are impossible.

### Mental Model

Imagine walking a maze with a pencil. Choose a corridor, mark it, walk forward, and erase the mark when you return. If the remaining distance or capacity already makes success impossible, turn around before exploring that corridor.

### First Trace

For candidates `[2, 3]` and target `5`, choose `2` and the remaining target becomes `3`; choose `3` and reach `0`, so copy `[2, 3]`. After returning, remove `3`, then remove `2`, leaving the path ready for the next branch.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Determine whether a word exists in a character grid by moving up, down, left, or right without reusing a cell. This is **Word Search**.

**Best interview-ready solution:**

1. **Recognize the search state:** current cell, next character index, and visited cells.
2. **Try matching neighbors:** recurse only when the next cell contains the needed character.
3. **Mark and undo:** mark a cell before recursion and restore it after returning.
4. **Prune safely:** stop immediately on a mismatch, boundary, or already visited cell.
5. **Complexity:** O(rows times columns times 4^wordLength) worst case and O(wordLength) recursion space.

**Code solution:**

```ts
// Pseudocode: match the cell, mark it, explore four neighbors, and restore it on return.
function wordExists(board: string[][], word: string): boolean {
	const directions = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
	] as const;
	const search = (row: number, column: number, index: number): boolean => {
		if (index === word.length) return true;
		if (board[row]?.[column] !== word[index]) return false;
		const saved = board[row][column];
		board[row][column] = '#';
		for (const [rowDelta, columnDelta] of directions) {
			if (search(row + rowDelta, column + columnDelta, index + 1)) {
				board[row][column] = saved;
				return true;
			}
		}
		board[row][column] = saved;
		return false;
	};
	for (let row = 0; row < board.length; row += 1) {
		for (let column = 0; column < board[row].length; column += 1) {
			if (search(row, column, 0)) return true;
		}
	}
	return false;
}
```

The loop is usually:

1. reject an impossible state,
2. choose an item,
3. recurse,
4. undo the choice.

Sorting can make a prune valid: when positive candidates are sorted and `value > remaining`, every later value is also too large. Passing `index` permits reuse; passing `index + 1` makes choices single-use.

## W — Why It Matters

Backtracking solves small constraint problems such as word search, combinations, and board placement. Interviewers look for safe pruning, because an unproved shortcut can silently remove the answer.

## I — Interview Q&A

### What makes a prune safe?

You can prove the skipped subtree cannot contain a valid result or beat the current best result.

### Why sort candidates?

Order can turn one failed candidate into a proof that all later candidates fail too.

### How do you control reuse?

Pass the next allowed index. Recurse with `index` for reuse and `index + 1` for single-use choices.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Pruning from a performance guess. **Fix:** write the bound that proves impossibility.
- **Pitfall:** Missing `pop()`. **Fix:** make mutation and undo adjacent.
- **Pitfall:** Skipping duplicate values inconsistently. **Fix:** sort and skip equal values only at the same depth.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return combinations of positive candidates that sum to `target`; a candidate may be reused. Return each combination once.

### Solution

```ts
function combinationSum(candidates: readonly number[], target: number): number[][] {
	const ordered = [...candidates].sort((a, b) => a - b);
	const result: number[][] = [];
	const path: number[] = [];

	function visit(start: number, remaining: number): void {
		if (remaining === 0) {
			result.push([...path]);
			return;
		}
		for (let index = start; index < ordered.length; index += 1) {
			const value = ordered[index];
			if (value > remaining) break;
			if (index > start && value === ordered[index - 1]) continue;
			path.push(value);
			visit(index, remaining - value);
			path.pop();
		}
	}
	visit(0, target);
	return result;
}
```

**Right now:** Name the exact fact that makes one prune in your current backtracking problem safe.
