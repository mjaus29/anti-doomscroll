# Tree Recursion That Returns Information

## T — TL;DR

Make each recursive call return a small **summary** of its subtree (like its height), and let the parent build its own summary from the two children. One pass up the tree then answers questions that look like they need many passes.

**Reach for it when:**

- The question is about a property of every subtree (balanced, longest path, largest sum).
- A naive solution calls a helper like `height()` inside another recursion (`O(n²)`).
- The best answer might pass **through** a node without going through the root.

## K — Key Concepts

### Picture it

A manager wants to know whether every team is evenly staffed. Instead of counting each team herself, she asks every team lead to report one number: the team size, or "-1" if any team under them is already unbalanced. Each lead does the same with their leads. One round of reports answers the whole question.

### Info flows two ways

| Direction | How | Use it when | Example |
| :-------- | :-- | :---------- | :------ |
| **Down** (parent → child) | Pass an extra argument | The child needs context from above | "largest value on the path so far" |
| **Up** (child → parent) | Use the return value | The parent needs facts about the subtree | height, size, "is it valid" |

Many problems use both. This lesson's template returns info up; the challenge passes info down.

### Walk through it

**Balanced Binary Tree:** a tree is balanced when, at **every** node, the left and right heights differ by at most 1. Check `1 → (2 → (3 → (4, null), null), 5)`:

```text
        1
       / \
      2   5
     /
    3
   /
  4
```

| Call | Left returns | Right returns | Returns | Why |
| :--- | :----------- | :------------ | :------ | :-- |
| `check(4)` | 0 | 0 | 1 | Leaf. |
| `check(3)` | 1 | 0 | 2 | Differ by 1: fine. |
| `check(2)` | 2 | 0 | -1 | Differ by 2: unbalanced, report `-1`. |
| `check(5)` | 0 | 0 | 1 | Leaf. |
| `check(1)` | -1 | 1 | -1 | A child already failed: pass `-1` up. |

`-1` is a **sentinel** — a special value that means "stop, the answer is already no." A real height is never negative, so it cannot be confused.

### The template

```ts
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function isBalanced(root: TreeNode | null): boolean {
  // Returns the subtree height, or -1 if any part of it is unbalanced.
  function check(node: TreeNode | null): number {
    if (node === null) return 0;
    const leftHeight = check(node.left);
    if (leftHeight === -1) return -1; // fail fast: no need to look further
    const rightHeight = check(node.right);
    if (rightHeight === -1) return -1;
    if (Math.abs(leftHeight - rightHeight) > 1) return -1;
    return 1 + Math.max(leftHeight, rightHeight); // the summary the parent needs
  }
  return check(root) !== -1;
}
```

**Time:** `O(n)` · **Space:** `O(h)` — each node is visited once and returns one number, instead of recomputing heights from scratch at every node (`O(n²)`).

### Interview classic: Diameter of Binary Tree

The diameter is the number of **edges** on the longest path between any two nodes. The path does not have to pass through the root.
Example: `1 → (2 → (4, 5), 3)` → `3` (path `4 → 2 → 1 → 3`).

- **Brute force:** for every node, compute the left and right heights with a separate helper — `O(n²)`.
- **Key insight:** the longest path that "bends" at a node has length `leftHeight + rightHeight`. Return the height up to the parent, and update a shared `best` with the bend at every node.

```ts
function diameterOfBinaryTree(root: TreeNode | null): number {
  let best = 0;

  function height(node: TreeNode | null): number {
    if (node === null) return 0;
    const leftHeight = height(node.left);
    const rightHeight = height(node.right);
    best = Math.max(best, leftHeight + rightHeight); // path bending at this node
    return 1 + Math.max(leftHeight, rightHeight);    // parent can only extend ONE side
  }

  height(root);
  return best;
}
```

Two different values: the **return** value is what the parent can use (one branch), and `best` records the answer (both branches). Keeping them separate is the whole trick.

## W — Why It Matters

- This turns many `O(n²)` tree solutions into `O(n)`. Interviewers often ask for the slow version first, then "can you do it in one pass?"
- The same "return one side, record both sides" shape solves Binary Tree Maximum Path Sum, a famous Hard problem.
- Interviewers listen for you naming what the helper returns, in one sentence, before you write it.

## I — Interview Q&A

### Q: Why not call a `height()` helper from `isBalanced()`?

It works, but `height` walks the whole subtree, and you call it at every node. On a line-shaped tree that is `n + (n - 1) + ... = O(n²)`.

### Q: How would you return more than one value?

Return a small object or tuple, such as `{ height: number; balanced: boolean }`. A sentinel like `-1` is shorter, but only when a real value can never take that form.

### Q: Why is `best` outside the helper?

The best path can bend at any node, not only the root. A shared variable, set from every call, is the simplest way to keep the maximum across all of them.

## C — Common Pitfalls + Fix

### ❌ Returning the answer instead of the summary

```ts
return leftHeight + rightHeight;           // ❌ parent cannot extend a bent path
return 1 + Math.max(leftHeight, rightHeight); // ✅ return height, record the bend in best
```

### ❌ Counting nodes when the problem counts edges

Diameter counts edges. With heights measured in nodes, `leftHeight + rightHeight` already equals the number of edges through the node. Check with a two-node tree: the answer is `1`.

### ❌ Only checking balance at the root

Balance must hold at **every** node. A tree can have equal heights at the root and still be badly unbalanced below.

### ❌ Not stopping on the sentinel

If you forget `if (leftHeight === -1) return -1`, a `-1` may be treated as a height and give a wrong answer.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Count Good Nodes in Binary Tree:** a node is *good* if no node on the path from the root down to it has a larger value. Return how many good nodes there are. The root is always good.

`3 → (1 → (3, null), 4 → (1, 5))` → `4` (the good nodes are `3`, `3`, `4`, `5`)

<details><summary>Hint</summary>

This time pass information **down**: give each call the largest value seen on the path so far.

</details>

### Solution

```ts
function goodNodes(root: TreeNode | null): number {
  function count(node: TreeNode | null, maxSoFar: number): number {
    if (node === null) return 0;
    const isGood = node.val >= maxSoFar ? 1 : 0;
    const newMax = Math.max(maxSoFar, node.val); // context for the children
    return isGood + count(node.left, newMax) + count(node.right, newMax);
  }
  return count(root, -Infinity);
}
```

**Time:** `O(n)` · **Space:** `O(h)`. Each node only needs the largest value above it, which the parent hands down. The counts are then added on the way back up.

**Right now:** Trace `diameterOfBinaryTree` on `1 → (2 → (4, 5), 3)` and write the value of `best` after each call returns.
