# Lowest Common Ancestor and Tree Paths

## T — TL;DR

The lowest common ancestor is the deepest node whose subtree contains both targets; postorder recursion can return the candidate found below.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

The lowest common ancestor is useful when two items in a hierarchy share a nearest parent: file folders, organization charts, or routes in a tree. The goal is to find the first node whose subtree contains both targets.

### Mental Model

Think of two people walking upward through a family tree. Their first shared ancestor is the answer. A postorder recursion asks the left and right subtrees whether they found either person, then combines those reports at the current node.

### First Trace

If `A` is in the left subtree and `B` is in the right subtree of `root`, the left call returns `A`, the right call returns `B`, and `root` is the LCA. If both are below the left child, the left child's result travels upward instead.

## K — Key Concepts

```ts
function lowestCommonAncestor(
  root: TreeNode | null,
  first: TreeNode,
  second: TreeNode
): TreeNode | null {
  if (root === null || root === first || root === second) return root;
  const left = lowestCommonAncestor(root.left, first, second);
  const right = lowestCommonAncestor(root.right, first, second);
  if (left !== null && right !== null) return root;
  return left ?? right;
}
```

If one target is not guaranteed to exist, return presence flags with the candidate. In a BST, ordering lets you descend into only one child; with parent pointers, compare ancestor sets.

## W — Why It Matters

Ancestor and path queries model file trees, organization charts, routing hierarchies, and DOM-like structures. The interview skill is choosing the strongest invariant the input gives you.

## I — Interview Q&A

### Why does a non-null result from both children identify the LCA?

Each child subtree contains one target, so the current node is the first subtree containing both on the upward return.

### What if both targets are in one child?

Return that child's candidate; the current node cannot be the lowest shared ancestor yet.

### Does identity or value identify a node?

Clarify it. Duplicate values require node identity or unique labels to avoid ambiguity.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Assuming targets exist. **Fix:** track found counts when the contract does not guarantee them.
- **Pitfall:** Comparing only values when duplicates exist. **Fix:** compare node references or unique IDs.
- **Pitfall:** Ignoring BST ordering. **Fix:** use the stronger one-branch invariant when available.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Find the LCA of two node references in a general binary tree. Assume both nodes exist.

### Solution

```ts
function lowestCommonAncestor(
  root: TreeNode | null,
  first: TreeNode,
  second: TreeNode
): TreeNode | null {
  if (root === null || root === first || root === second) return root;
  const left = lowestCommonAncestor(root.left, first, second);
  const right = lowestCommonAncestor(root.right, first, second);
  if (left !== null && right !== null) return root;
  return left ?? right;
}
```

**Right now:** Decide whether your tree problem identifies nodes by reference, value, or unique label.
