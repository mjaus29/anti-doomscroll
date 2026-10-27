# Tries

## T — TL;DR

A **trie** (say "try", also called a prefix tree) stores words one character per level, so words that share a start share the same path. Looking up a word or a prefix costs `O(length of the word)`, no matter how many words are stored.

**Reach for it when:**

- The problem says **prefix**, "starts with", autocomplete, or dictionary of words.
- You search many words against the same set, and a hash set cannot answer prefix questions.
- You walk a grid or string and want to stop early once no word can start this way (Word Search II).
- Wildcard matching where `.` means "any letter".

## K — Key Concepts

### Picture it

Think of a phone's contact search. Type `m` and you see every name starting with M. Type `ma` and the list shrinks. A trie is that list as a tree: each node is "what you have typed so far", and each child is one more letter. A flag on a node says "a full word ends here".

### Walk through it

Insert `"car"`, `"cat"`, `"cap"`, then `"do"`. Each row shows a node as the path from the root.

| Node (prefix) | Children | Word ends here? |
| :------------ | :------- | :-------------- |
| (root) | `c`, `d` | no |
| `c` | `a` | no |
| `ca` | `r`, `t`, `p` | no |
| `car`, `cat`, `cap` | — | yes |
| `d` | `o` | no |
| `do` | — | yes |

- `search("ca")`: the path exists, but `ca` is not marked as a word → `false`.
- `startsWith("ca")`: the path exists → `true`.
- `search("cow")`: no `o` under `c` → `false` after 2 steps.

### The template

```ts
class TrieNode {
  children = new Map<string, TrieNode>();
  isWord = false; // true if some inserted word ends exactly here
}

// Walk down one character at a time; return the last node, or null if the path breaks.
function walk(root: TrieNode, text: string): TrieNode | null {
  let node = root;
  for (const char of text) {
    const next = node.children.get(char);
    if (!next) return null;
    node = next;
  }
  return node;
}
```

**Time:** `O(L)` per walk, where `L` is the text length · **Space:** `O(total characters inserted)` — each new character can create one node.

### Interview classic: Implement Trie

Build a class with `insert(word)`, `search(word)` (exact word stored?), and `startsWith(prefix)` (any stored word with this start?).
Example: insert `"apple"` → `search("apple")` is `true`, `search("app")` is `false`, `startsWith("app")` is `true`.

- **Brute force:** keep an array of words and scan it for every query — `O(n · L)` per query.
- **Key insight:** shared prefixes share nodes, so each query walks at most `L` nodes.

```ts
class Trie {
  private root = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      let next = node.children.get(char);
      if (!next) { // create the path as we go
        next = new TrieNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.isWord = true;
  }

  search(word: string): boolean {
    return walk(this.root, word)?.isWord === true; // path exists AND a word ends here
  }

  startsWith(prefix: string): boolean {
    return walk(this.root, prefix) !== null; // path existing is enough
  }
}
```

`search` and `startsWith` differ in one check: whether the final node has `isWord` set.

## W — Why It Matters

- Autocomplete, spell checkers, and router path matching are tries in real code.
- **Word Search II** (find many words in a letter grid) is the famous hard problem that needs one.
- Interviewers listen for the `isWord` flag and for why a trie beats a `Set` here: prefix questions.

## I — Interview Q&A

### Q: How does a trie help Word Search II?

Put all target words in a trie. Run DFS from every cell, moving down the trie with each letter. The moment the trie has no child for the next letter, stop that path — that pruning is what makes it fast.

### Q: `Map` or a 26-slot array for children?

A 26-slot array (`index = charCode - 97`) is a little faster and works only for lowercase `a–z`. A `Map` handles any character and uses memory only for children that exist.

### Q: How would you delete a word?

Walk to the word and set `isWord = false`. To free memory, recurse back up and remove nodes that have no children and are not the end of another word.

## C — Common Pitfalls + Fix

### ❌ Forgetting the end-of-word flag

Without `isWord`, inserting `"apple"` makes `search("app")` return `true`. Every node on a path is a prefix; only flagged ones are words.

### ❌ Mixing up `search` and `startsWith`

```ts
return walk(this.root, word) !== null;          // ❌ that is startsWith
return walk(this.root, word)?.isWord === true;  // ✅ exact word
```

### ❌ Creating children with a shared default

`Array(26).fill(new TrieNode())` puts the **same** node in every slot. Create nodes only when a character is inserted.

### ❌ Using a trie when a `Set` is enough

If you only ever ask "is this exact word stored?", a `Set<string>` is simpler and just as fast.

## K — Coding Challenge with Solution

### Challenge

**Time:** 15 minutes · **Difficulty:** Medium

**Design Add and Search Words Data Structure:** build `addWord(word)` and `search(pattern)`. The pattern may contain `.`, which matches any single letter.

`addWord("bad")`, `addWord("dad")`, `addWord("mad")` → `search("pad")` is `false`, `search(".ad")` is `true`, `search("b..")` is `true`

<details><summary>Hint</summary>

Insert exactly like the Trie. For search, use recursion with an index: a normal letter follows one child; a `.` tries every child and succeeds if any of them does.

</details>

### Solution

```ts
class WordDictionary {
  private root = new TrieNode();

  addWord(word: string): void {
    let node = this.root;
    for (const char of word) {
      let next = node.children.get(char);
      if (!next) {
        next = new TrieNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.isWord = true;
  }

  search(pattern: string): boolean {
    const matchFrom = (node: TrieNode, index: number): boolean => {
      if (index === pattern.length) return node.isWord;
      const char = pattern[index];
      if (char === ".") { // wildcard: branch into every child
        for (const child of node.children.values()) {
          if (matchFrom(child, index + 1)) return true;
        }
        return false;
      }
      const next = node.children.get(char);
      return next !== undefined && matchFrom(next, index + 1);
    };
    return matchFrom(this.root, 0);
  }
}
```

(Uses `TrieNode` from the template.) **Time:** `O(L)` for words without dots; a pattern with many dots can visit every node · **Space:** `O(L)` recursion depth. Insertion is unchanged; only search branches, and only on `.`.

**Right now:** Draw the trie for `"to"`, `"tea"`, `"ten"`, `"inn"` and circle every node where `isWord` is `true`.
