# String Matching and Rolling Hash

## T — TL;DR

Reuse prefix information with KMP for deterministic linear matching, or use rolling hashes as fast candidate filters with collision awareness.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

String matching finds a pattern inside a larger text without rechecking characters that the pattern has already taught us about. KMP is deterministic; rolling hash is a fast candidate filter.

### Mental Model

Imagine sliding a label across a box of text. When a mismatch happens, do not throw the label back to the beginning if its prefix already matches a suffix of what you saw. The prefix table tells you how far the label can safely jump.

### First Trace

Searching `aba` in `ababa` finds a match at index `0`. After that match, the ending `aba` also contains a suffix `a` that can begin another match, so KMP reuses the prefix information instead of restarting from scratch.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the first occurrence of a pattern in a text without repeatedly rescanning matched characters. This is **Find the Index of the First Occurrence in a String**.

**Best interview-ready solution:**

1. **Recognize repeated prefixes:** a mismatch may still leave a suffix that matches a pattern prefix.
2. **Build the KMP prefix table for the pattern.**
3. **On mismatch, jump the pattern index using the table while the text index never moves backward.**
4. **Return when the matched length equals the pattern length.**
5. **Complexity:** O(text length plus pattern length) time and O(pattern length) space.

**Code solution:**

```ts
// Pseudocode: build the KMP prefix table and jump borders without moving the text index backward.
function firstOccurrence(text: string, pattern: string): number {
	if (pattern.length === 0) return 0;
	const prefix = new Array<number>(pattern.length).fill(0);
	for (let index = 1; index < pattern.length; index += 1) {
		let border = prefix[index - 1];
		while (border > 0 && pattern[index] !== pattern[border]) border = prefix[border - 1];
		if (pattern[index] === pattern[border]) border += 1;
		prefix[index] = border;
	}

	let matched = 0;
	for (let index = 0; index < text.length; index += 1) {
		while (matched > 0 && text[index] !== pattern[matched]) matched = prefix[matched - 1];
		if (text[index] === pattern[matched]) matched += 1;
		if (matched === pattern.length) return index - pattern.length + 1;
	}
	return -1;
}
```

KMP's prefix table stores the longest proper prefix that is also a suffix for each pattern prefix. On a mismatch, jump to that border instead of restarting the text scan. Matching is $O(n + m)$.

Rolling hash lets substring hashes update or be queried quickly, but equal hashes do not prove equal strings unless collisions are handled or verified.

```ts
function prefixTable(pattern: string): number[] {
	const table = new Array<number>(pattern.length).fill(0);
	for (let index = 1; index < pattern.length; index += 1) {
		let border = table[index - 1];
		while (border > 0 && pattern[index] !== pattern[border]) border = table[border - 1];
		if (pattern[index] === pattern[border]) border += 1;
		table[index] = border;
	}
	return table;
}
```

## W — Why It Matters

String matching appears in search, editors, log processing, plagiarism checks, and parsers. KMP teaches deterministic reuse; hashing teaches the tradeoff between speed and probabilistic equality.

## I — Interview Q&A

### What does the prefix table mean?

For each pattern position, it records the longest proper prefix that is also a suffix ending there.

### Why does KMP stay linear?

The text index never moves backward, and the pattern border index falls through previously computed prefix links.

### Is equal rolling hash enough?

Usually it is only a candidate match. Use multiple moduli or direct verification when collisions matter.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Resetting the pattern to zero on every mismatch. **Fix:** jump through the prefix table.
- **Pitfall:** Testing only distinct-character patterns. **Fix:** use repeated prefixes such as `ababaca`.
- **Pitfall:** Ignoring Unicode representation. **Fix:** define code-unit versus code-point behavior.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10–15 minutes.

Return the first index where `pattern` occurs in `text`, or `-1`, using KMP.

### Solution

```ts
function firstMatch(text: string, pattern: string): number {
	if (pattern.length === 0) return 0;
	const table = prefixTable(pattern);
	let matched = 0;

	for (let index = 0; index < text.length; index += 1) {
		while (matched > 0 && text[index] !== pattern[matched]) matched = table[matched - 1];
		if (text[index] === pattern[matched]) matched += 1;
		if (matched === pattern.length) return index - pattern.length + 1;
	}
	return -1;
}
```

**Right now:** Build the prefix table for `ababaca` one position at a time.
