# Binary Search Trees

## T — TL;DR

A BST search follows one child at each step by preserving the global ordering invariant, but it is $O(log n)$ only when the tree stays balanced.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

A binary search tree keeps values organized so a comparison tells you which entire subtree cannot contain the target. This is the tree version of looking up a word in an ordered dictionary.

### Mental Model

At each node, stand at a fork labeled with a value. If the target is smaller, walk left; if larger, walk right. The ordering rule is global: every value below the left branch must be smaller, not just the immediate child.

### First Trace

For root `8`, left `3`, and right `10`, searching for `7` compares with `8` and goes left, then compares with `3` and goes right. If the next right child is `7`, it succeeds; otherwise the missing branch proves the value is absent.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Determine whether a binary tree is a valid binary search tree. This is **Validate Binary Search Tree**.

**Best interview-ready solution:**

1. **Recognize the global invariant:** each node must fit between bounds inherited from every ancestor.
2. **Start with negative and positive infinity bounds.**
3. **Recurse left with an updated upper bound and right with an updated lower bound.**
4. **Choose duplicate policy:** strict inequalities reject duplicates in this version.
5. **Complexity:** O(n) time and O(h) space.

**Code solution:**

```ts
// Pseudocode: carry ancestor bounds and reject any node outside its inherited interval.
type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };

function isValidBst(root: TreeNode | null, low = -Infinity, high = Infinity): boolean {
	if (root === null) return true;
	if (root.value <= low || root.value >= high) return false;
	return isValidBst(root.left, low, root.value) && isValidBst(root.right, root.value, high);
}
```

```ts
function contains(root: TreeNode | null, target: number): boolean {
	let current = root;
	while (current !== null) {
		if (current.value === target) return true;
		current = target < current.value ? current.left : current.right;
	}
	return false;
}
```

The search is $O(h)$ for height `h`. Inorder traversal is sorted. Validation needs inherited lower and upper bounds, not only a comparison with the parent. Choose one duplicate policy and use it everywhere.

## W — Why It Matters

BSTs model ordered indexes, symbol tables, and range queries. Interviews often test whether you know the difference between the abstract $O(log n)$ promise and the actual height of an unbalanced tree.

## I — Interview Q&A

### Why is local parent comparison insufficient for validation?

A node can be correctly ordered relative to its parent but violate a bound set by an ancestor.

### When is search logarithmic?

When height is $O(log n)$, usually because the tree is balanced or input guarantees it.

### How do duplicates affect implementation?

They need an explicit policy: reject them, place them consistently left, or place them consistently right.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Assuming every BST is balanced. **Fix:** state complexity as $O(h)$.
- **Pitfall:** Validating only immediate children. **Fix:** carry ancestor bounds.
- **Pitfall:** Inconsistent duplicate handling. **Fix:** document one policy at the boundary.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Validate a BST with strict ordering: every node in the left subtree is smaller and every node in the right subtree is larger.

### Solution

```ts
function isValidBst(root: TreeNode | null, low = -Infinity, high = Infinity): boolean {
	if (root === null) return true;
	if (root.value <= low || root.value >= high) return false;
	return isValidBst(root.left, low, root.value) && isValidBst(root.right, root.value, high);
}
```

**Right now:** Create a tree that passes parent comparisons but fails a global ancestor bound.
