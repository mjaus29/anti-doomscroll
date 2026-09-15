# Tries for Prefix Queries

## T — TL;DR

A trie shares common prefixes so insertion, exact lookup, and prefix lookup depend on string length rather than dictionary size.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Tries are for dictionaries where the beginning of a word matters: autocomplete, prefix counts, or word lookup. They avoid scanning every stored word when the prefix is short.

### Mental Model

Picture a branching hallway. The first letter chooses a corridor, the second letter chooses a branch inside it, and shared prefixes reuse the same beginning hallway. A node can be a prefix without being a complete word.

### First Trace

Insert `app`: create or follow `a`, `p`, `p`, then mark the final node as a word. Insert `apple`: reuse the existing `app` path, add `l` and `e`, and mark only the `apple` endpoint too. Searching prefix `app` succeeds before checking whether it is a complete word.

## K — Key Concepts

Each node represents a prefix; `isWord` separately marks whether that prefix is a complete word.

```ts
class TrieNode {
	readonly children = new Map<string, TrieNode>();
	isWord = false;
}

class Trie {
	private readonly root = new TrieNode();
	insert(word: string): void {
		let node = this.root;
		for (const character of word) {
			let next = node.children.get(character);
			if (next === undefined) {
				next = new TrieNode();
				node.children.set(character, next);
			}
			node = next;
		}
		node.isWord = true;
	}
	hasPrefix(prefix: string): boolean {
		let node = this.root;
		for (const character of prefix) {
			const next = node.children.get(character);
			if (next === undefined) return false;
			node = next;
		}
		return true;
	}
}
```

Operations take $O(L)$ for length `L`; memory depends on total stored character nodes.

## W — Why It Matters

Tries support autocomplete, routing prefixes, spell checking, and dictionary search. They are valuable when prefix queries dominate and sorting or scanning a whole dictionary is too slow.

## I — Interview Q&A

### Why separate `isWord` from node existence?

A word can be a prefix of a longer word, such as `app` and `apple`.

### Map or fixed child array?

Use a map for sparse or broad alphabets; a fixed array can reduce lookup overhead for a small known alphabet at the cost of memory.

### How do you count words under a prefix?

Store a subtree word count at each node and update it during insertion/deletion.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Treating every prefix node as a complete word. **Fix:** keep `isWord`.
- **Pitfall:** Forgetting to update counts on deletion. **Fix:** define ownership of each node field.
- **Pitfall:** Ignoring character normalization. **Fix:** normalize at the input boundary if required.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Implement exact word lookup for a trie that already supports insertion.

### Solution

```ts
function hasWord(root: TrieNode, word: string): boolean {
	let node: TrieNode | undefined = root;
	for (const character of word) {
		node = node.children.get(character);
		if (node === undefined) return false;
	}
	return node.isWord;
}
```

**Right now:** Insert `app` and `apple` on paper, then mark which node has `isWord` for each.
