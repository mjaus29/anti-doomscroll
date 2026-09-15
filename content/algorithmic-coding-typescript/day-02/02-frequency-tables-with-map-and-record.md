# Frequency Tables with Map and Record

## T — TL;DR

Count values once so later membership or balance checks are expected $O(1)$ instead of repeated scans.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Frequency tables solve problems where the important question is not "where is this item?" but "how many times has it appeared?" They replace repeated counting with one update per item.

### Mental Model

Picture a row of labeled buckets. Every time you see a character, place one token in its bucket. When comparing two strings, add tokens for the first string and remove tokens for the second. Empty buckets at the end mean the counts match.

### First Trace

For `left = "abb"`, the buckets become `a: 1, b: 2`. Read `right = "bab"`: remove one `b` (`b: 1`), remove `a` (`a: 0`), remove the final `b` (`b: 0`). No bucket is missing and all counts balance, so the strings are anagrams.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Group a list of words so anagrams appear together. This is the classic **Group Anagrams** problem.

**Best interview-ready solution:**

1. **Recognize the invariant:** anagrams share the same character-count signature.
2. **Build the key:** count the 26 lowercase letters, or sort the word when the alphabet is not bounded.
3. **Use a Map:** map each signature to its output group.
4. **Preserve duplicates:** append every original word; do not store only one representative.
5. **Complexity:** counting gives O(total characters) time for a fixed alphabet and O(total characters) space.

**Code solution:**

```ts
// Pseudocode: build a count signature for each word and append it to the matching map bucket.
function groupAnagrams(words: readonly string[]): string[][] {
	const groups = new Map<string, string[]>();
	for (const word of words) {
		const counts = new Array<number>(26).fill(0);
		for (const character of word) counts[character.charCodeAt(0) - 97] += 1;
		const key = counts.join('#');
		const group = groups.get(key) ?? [];
		group.push(word);
		groups.set(key, group);
	}
	return [...groups.values()];
}
```

- Use `Map` for dynamic keys or non-string keys.
- Use `Record<string, number>` for a known string-keyed table.
- Increment while reading one collection and decrement while reading the other.
- A bounded integer range may be better represented by a counting array.
- Decide whether a missing key means zero, invalid input, or a distinct state.

The anagram invariant is: the map contains the exact count difference between the processed prefixes of the two strings.

## W — Why It Matters

Frequency tables appear in caching, log aggregation, inventory reconciliation, and a large family of interview problems. Choosing a map versus an array also shows whether you read the constraints closely.

## I — Interview Q&A

### Why not sort both strings?

Sorting works but costs $O(n log n) and may allocate or mutate. Counting gives expected $O(n)$ time when keys can be hashed.

### What does `counts.get(key) ?? 0` mean?

It treats an unseen key as count zero while preserving an actual stored zero if one exists.

### When is an array better than a `Map`?

When keys are dense, small integers with a known range. It usually has lower constant overhead and direct indexing.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Comparing only distinct keys. **Fix:** compare counts, not just membership.
- **Pitfall:** Treating a falsy count as missing. **Fix:** distinguish `undefined` from `0`.
- **Pitfall:** Forgetting case or Unicode rules. **Fix:** normalize only when the prompt requires it.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return whether two strings are anagrams. Treat characters exactly as supplied and avoid sorting.

### Solution

```ts
function sameLetters(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	const counts = new Map<string, number>();

	for (const character of left) {
		counts.set(character, (counts.get(character) ?? 0) + 1);
	}
	for (const character of right) {
		const remaining = counts.get(character);
		if (remaining === undefined) return false;
		if (remaining === 1) counts.delete(character);
		else counts.set(character, remaining - 1);
	}
	return counts.size === 0;
}
```

This is expected $O(n)$ time and $O(k)$ space for `k` distinct characters.

**Right now:** Make a three-entry frequency table by hand for the word `level`.
