# Subsequences and State Compression

## T — TL;DR

Subsequence DP compares positions while preserving order, and compressed tables work only when every overwritten dependency is saved explicitly.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Subsequence problems let you skip items but never reorder the items you keep. The algorithm compares positions and decides whether the current pair contributes to the best answer.

### Mental Model

Imagine highlighting matching letters in two sentences. You may leave letters unhighlighted, but the highlights must appear from left to right in both sentences. A table of prefix pairs remembers the best matching history so far.

### First Trace

For `left = "abc"` and `right = "ac"`, match `a`, skip `b`, then match `c`. The LCS length is `2`. At a mismatch, the table asks whether skipping the current left character or the current right character gives the better prefix answer.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Return the length of the longest common subsequence of two strings. This is **Longest Common Subsequence**.

**Best interview-ready solution:**

1. **Define the state:** dp[i][j] is the best subsequence length for the first i and j characters.
2. **Match case:** equal current characters contribute one plus the diagonal state.
3. **Mismatch case:** skip one current character and take the maximum of above and left.
4. **Compress carefully:** save the old diagonal before overwriting the current row value.
5. **Complexity:** O(nm) time and O(m) space for length only.

**Code solution:**

```ts
// Pseudocode: matching characters use diagonal plus one; mismatches use max of above and left.
function lcsLength(left: string, right: string): number {
	const dp = new Array<number>(right.length + 1).fill(0);
	for (let row = 1; row <= left.length; row += 1) {
		let diagonal = 0;
		for (let column = 1; column <= right.length; column += 1) {
			const above = dp[column];
			dp[column] =
				left[row - 1] === right[column - 1] ? diagonal + 1 : Math.max(dp[column], dp[column - 1]);
			diagonal = above;
		}
	}
	return dp[right.length];
}
```

For LCS, `dp[row][column]` means the longest common subsequence of the two prefixes. Matching characters use the diagonal plus one; otherwise take the best of above and left.

```ts
function lcsLength(left: string, right: string): number {
	const dp = new Array<number>(right.length + 1).fill(0);
	for (let row = 1; row <= left.length; row += 1) {
		let diagonal = 0;
		for (let column = 1; column <= right.length; column += 1) {
			const above = dp[column];
			dp[column] =
				left[row - 1] === right[column - 1] ? diagonal + 1 : Math.max(dp[column], dp[column - 1]);
			diagonal = above;
		}
	}
	return dp[right.length];
}
```

`diagonal` is the previous-row previous-column value overwritten by the current update. Similar compression appears in edit distance and increasing-subsequence boundaries.

## W — Why It Matters

Subsequence problems test whether you can model order with gaps, a common pattern in diff tools, version comparison, text analysis, and interviews. Compression turns $O(nm)$ memory into $O(m)$ when the dependency shape allows it.

## I — Interview Q&A

### Why does a character match use the diagonal?

Both current characters are consumed, so the result comes from the two prefixes before them.

### Why is the compressed `dp` array not enough by itself?

Updating it destroys the old diagonal; a separate variable preserves that dependency.

### How do you reconstruct an actual subsequence?

Keep the full table or store parent decisions, then walk backward from the final state.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using the current row's left value for a match. **Fix:** save and use the old diagonal.
- **Pitfall:** Claiming the tails array is the actual LIS. **Fix:** treat it as minimum-ending-value boundaries unless storing parents.
- **Pitfall:** Compressing before identifying dependencies. **Fix:** label `above`, `left`, and `diagonal` first.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return the length of the longest common subsequence of two strings using only $O(m)$ extra space, where `m` is the second string length.

### Solution

```ts
function lcsLength(left: string, right: string): number {
	const dp = new Array<number>(right.length + 1).fill(0);
	for (let row = 1; row <= left.length; row += 1) {
		let diagonal = 0;
		for (let column = 1; column <= right.length; column += 1) {
			const above = dp[column];
			dp[column] =
				left[row - 1] === right[column - 1] ? diagonal + 1 : Math.max(dp[column], dp[column - 1]);
			diagonal = above;
		}
	}
	return dp[right.length];
}
```

**Right now:** Label which variable in your next compressed DP stores the old diagonal.
