# Binary Tree Basics and DFS

## T — TL;DR

A binary tree is a set of nodes where each node points to at most two children. Most tree problems are solved by **depth-first search (DFS)**: solve the problem for the left subtree, solve it for the right subtree, then combine the two answers at the current node.

**Reach for it when:**

- The input is a `TreeNode` root.
- The answer for a node depends on the answers for its children (height, size, sum, "are these equal").
- You need to visit every node once in a specific order (pre-order, in-order, post-order).

## K — Key Concepts

### Picture it

Think of a company org chart. To count everyone, the CEO asks each of her two direct reports, "How many people are in your team, including you?" Each report asks their own reports the same question. The answers flow back up, and the CEO adds them together plus one for herself. Nobody needs to see the whole chart.

### Vocabulary

| Term | Meaning in plain words |
| :--- | :--------------------- |
| **Root** | The top node. It has no parent. |
| **Leaf** | A node with no children. |
| **Subtree** | A node plus everything below it. Every child is the root of its own subtree. |
| **Depth** of a node | How many edges from the root down to it. The root has depth 0. |
| **Height** of a tree | The number of nodes on the longest root-to-leaf path. Empty tree = 0. |

We use this class in every tree lesson:

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
```

### The three DFS orders

DFS goes as deep as possible down one branch before backing up. The only difference between the orders is **when** you handle the current node:

```ts
function traverse(node: TreeNode | null, out: number[]): void {
  if (node === null) return;
  // out.push(node.val);  ← here = pre-order  (node, left, right)
  traverse(node.left, out);
  // out.push(node.val);  ← here = in-order   (left, node, right)
  traverse(node.right, out);
  // out.push(node.val);  ← here = post-order (left, right, node)
}
```

For the tree `2 → (1, 3)`: pre-order is `[2, 1, 3]`, in-order is `[1, 2, 3]`, post-order is `[1, 3, 2]`. Post-order is the one to remember: the children finish first, so the node can combine their answers.

### Walk through it

**Maximum Depth** of this tree (answer `3`):

```text
    3
   / \
  9   20
     /  \
    15   7
```

| Call | Left answer | Right answer | Returns | Why |
| :--- | :---------- | :----------- | :------ | :-- |
| `depth(9)` | 0 | 0 | 1 | Leaf: both children are `null` (depth 0). |
| `depth(15)` | 0 | 0 | 1 | Leaf. |
| `depth(7)` | 0 | 0 | 1 | Leaf. |
| `depth(20)` | 1 | 1 | 2 | `1 + max(1, 1)`. |
| `depth(3)` | 1 | 2 | 3 | `1 + max(1, 2)`. |

### The template

"Trust the recursion": assume the call on a child already returns the right answer for that subtree. Your only jobs are the **base case** (empty tree) and the **combine step**.

```ts
function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0; // base case: an empty tree has height 0
  const leftDepth = maxDepth(root.left);   // trust it: correct for the left subtree
  const rightDepth = maxDepth(root.right);
  return 1 + Math.max(leftDepth, rightDepth); // combine: this node + the deeper side
}
```

**Time:** `O(n)` · **Space:** `O(h)` — every node is visited once, and the call stack holds one frame per level, where `h` is the height (up to `n` for a tree shaped like a line).

### Interview classic: Same Tree

Given two roots, return `true` if the trees have the same shape and the same values.
Example: `1 → (2, 3)` and `1 → (2, 3)` → `true`; `1 → (2, null)` and `1 → (null, 2)` → `false`.

- **Brute force:** serialize both trees to strings and compare — `O(n)` but extra memory and fiddly `null` markers.
- **Key insight:** two trees are equal when their roots match **and** their left subtrees are equal **and** their right subtrees are equal. That is the same "combine children" shape.

```ts
function isSameTree(a: TreeNode | null, b: TreeNode | null): boolean {
  if (a === null && b === null) return true; // both empty: equal
  if (a === null || b === null) return false; // only one empty: different shape
  if (a.val !== b.val) return false;
  return isSameTree(a.left, b.left) && isSameTree(a.right, b.right);
}
```

Same template: base cases for `null`, then combine the answers from the two children. `&&` stops early at the first mismatch.

## W — Why It Matters

- Almost every tree question (and many graph ones) is "DFS plus a combine step." Learn this shape once.
- Real code is full of trees: the DOM, file systems, JSON, ASTs in compilers and linters.
- Interviewers listen for a clear base case and the sentence "assume the recursive call returns the right answer for the subtree."

## I — Interview Q&A

### Q: What is the space cost of recursion on a tree?

`O(h)` for the call stack. For a balanced tree that is `O(log n)`; for a tree shaped like a linked list it is `O(n)`.

### Q: Can you do it without recursion?

Yes. Use your own stack array: push the root, then repeatedly pop a node and push its children. For maximum depth, push `[node, depth]` pairs and track the largest depth seen.

### Q: Which traversal gives sorted output?

In-order, but only for a **binary search tree** (Day 7, topic 4). For a general binary tree, no order is sorted.

## C — Common Pitfalls + Fix

### ❌ Forgetting the `null` base case

```ts
return 1 + Math.max(maxDepth(root.left), maxDepth(root.right)); // ❌ crashes on null
if (root === null) return 0;                                     // ✅ handle empty first
```

### ❌ Treating a leaf as the base case only

If you only stop at leaves, a node with one child will call itself on `null` and crash. Stop at `null` and leaves work automatically.

### ❌ Tracing the whole recursion in your head

You will get lost. Check the base case, then check one node assuming its children are already correct. That is enough.

### ❌ Mixing up depth and height

Depth counts down from the root; height counts up from the leaves. Say which one the problem means, and whether it counts nodes or edges.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Invert Binary Tree:** mirror a tree so that every node's left and right children swap places. Return the root.

`4 → (2 → (1, 3), 7 → (6, 9))` → `4 → (7 → (9, 6), 2 → (3, 1))`

<details><summary>Hint</summary>

Invert the left subtree, invert the right subtree, then swap them at the current node.

</details>

### Solution

```ts
function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;
  const invertedLeft = invertTree(root.left);
  const invertedRight = invertTree(root.right);
  root.left = invertedRight; // swap the already-inverted subtrees
  root.right = invertedLeft;
  return root;
}
```

**Time:** `O(n)` · **Space:** `O(h)`. Each subtree is mirrored by the recursive call, so swapping them at the current node mirrors the whole tree.

**Right now:** Write the pre-order, in-order, and post-order output for the Maximum Depth example tree on paper, then check one with the `traverse` function.
