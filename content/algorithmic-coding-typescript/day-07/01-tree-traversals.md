# Tree Traversals

## T — TL;DR

Choose traversal order from when a node becomes processable: preorder before children, inorder between them, postorder after them, and BFS by depth.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Tree traversal is a systematic way to visit every node in a hierarchy. The order matters because some questions need a node before its children, between them, or after both children.

### Mental Model

Picture walking through a family tree. Preorder introduces a person before visiting descendants; postorder waits until descendants are understood; level order visits everyone on one generation before moving deeper.

### First Trace

For a tree with root `2`, left child `1`, and right child `3`, preorder is `[2, 1, 3]`, inorder is `[1, 2, 3]`, and postorder is `[1, 3, 2]`. The same shape produces different answers because the visit moment changes.

## K — Key Concepts

```ts
type TreeNode = {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
};
```

- Preorder is useful for copying or serializing structure.
- Inorder returns sorted values from a BST.
- Postorder computes answers that depend on children.
- Level order uses a queue for depth and nearest-layer questions.

In iterative preorder, push right before left because the stack pops last-in first.

## W — Why It Matters

Traversal is the dependency order for tree algorithms. The same reasoning appears in file systems, expression trees, UI hierarchies, and dependency graphs.

## I — Interview Q&A

### When is postorder required?

When the parent needs child results first, such as height, diameter, or subtree totals.

### Why does inorder sort a BST?

The BST invariant places smaller values left and larger values right, so left-node-right visits ascending order.

### Recursive or iterative?

Recursion is concise; an explicit stack avoids call-stack limits and exposes pending work.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Pushing children in the wrong order. **Fix:** trace one stack step and remember LIFO.
- **Pitfall:** Treating an empty tree as a normal node. **Fix:** handle `null` at the boundary.
- **Pitfall:** Using preorder when child answers are required. **Fix:** identify the dependency before choosing traversal.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return an iterative inorder traversal of a binary tree.

### Solution

```ts
function inorder(root: TreeNode | null): number[] {
  const result: number[] = [];
  const stack: TreeNode[] = [];
  let current = root;

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }
    current = stack.pop() as TreeNode;
    result.push(current.value);
    current = current.right;
  }
  return result;
}
```

**Right now:** Name the traversal you would choose for a problem that needs child heights.
