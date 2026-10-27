# Lowest Common Ancestor and Path Sums

## T — TL;DR

Path problems follow one route from the root down. Pass the "remaining target" **down** as you go, and check it at a leaf. The **lowest common ancestor (LCA)** of two nodes is the deepest node that has both of them below it (a node counts as below itself); you find it by letting each subtree report **up** whether it contains either node.

**Reach for it when:**

- The problem says "root-to-leaf path" or "path sum".
- You need the meeting point of two nodes: "common ancestor", "shared manager", "nearest shared folder".
- The answer depends on what each subtree **contains**.

## K — Key Concepts

### Picture it

**Path Sum:** you start a hike with a budget of 22 coins, and each trail stop costs its value. When you reach a dead end (a leaf), you check whether you have exactly 0 left.
**LCA:** in a family tree, two cousins ask "who is our closest shared grandparent?" Each branch of the family reports "I have one of them" until someone hears "yes" from both sides.

### Walk through it

**Path Sum** with `target = 22`. Is there a root-to-leaf path that adds up to 22?

```text
        5
       / \
      4   8
     /   / \
    11  13  4
   /  \
  7    2
```

| Node | Remaining before | Remaining after | Action and why |
| :--- | :--------------- | :-------------- | :------------- |
| 5 | 22 | 17 | Not a leaf: go left. |
| 4 | 17 | 13 | Not a leaf: go left. |
| 11 | 13 | 2 | Not a leaf: try left. |
| 7 | 2 | -5 | Leaf, not 0. Back up, try right. |
| 2 | 2 | 0 | Leaf with 0 left. Return `true`. |

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

function hasPathSum(root: TreeNode | null, target: number): boolean {
  if (root === null) return false;
  const remaining = target - root.val; // pass the leftover budget down
  const isLeaf = root.left === null && root.right === null;
  if (isLeaf) return remaining === 0; // the path must end at a leaf
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
```

**Time:** `O(n)` · **Space:** `O(h)` — each node is visited at most once, and the stack holds one path.

### Interview classic: Lowest Common Ancestor of a Binary Tree

Given a tree and two nodes `p` and `q` that are both in it, return their lowest common ancestor.
Example: in the tree `3 → (5 → (6, 2), 1 → (0, 8))`, LCA of `5` and `1` is `3`; LCA of `5` and `6` is `5`.

- **Brute force:** record the root-to-node path for `p` and for `q`, then find the last node they share — `O(n)` time but two passes and two path arrays.
- **Key insight:** each call returns "the `p` or `q` I found in my subtree, or `null`." If **both** sides return something, this node is where the two paths meet.

```ts
function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode,
  q: TreeNode,
): TreeNode | null {
  if (root === null || root === p || root === q) return root; // found one (or nothing)
  const fromLeft = lowestCommonAncestor(root.left, p, q);
  const fromRight = lowestCommonAncestor(root.right, p, q);
  if (fromLeft !== null && fromRight !== null) return root; // p and q on opposite sides
  return fromLeft ?? fromRight; // pass up whichever side found something
}
```

If `p` is an ancestor of `q`, the search stops at `p` and returns it. That is correct, because `q` is somewhere below `p`. This is the "return info up" shape from Day 7, topic 3.

## W — Why It Matters

- LCA is one of the most asked tree questions. It tests whether you can define what a recursive call returns.
- Path problems (Path Sum II, Path Sum III, Sum Root to Leaf Numbers) all reuse "pass the remaining value down."
- Real uses: nearest shared folder of two files, merge-base of two branches in Git, shared manager in an org chart.

## I — Interview Q&A

### Q: What if `p` or `q` might not be in the tree?

The basic solution would return the one it found. Track whether each node was actually seen (two boolean flags) and return `null` unless both were found.

### Q: What if nodes have parent pointers?

Then it is like finding where two linked lists meet: walk up from `p` and store the ancestors in a `Set`, then walk up from `q` until you hit one in the set.

### Q: How would you return all paths that sum to the target (Path Sum II)?

Keep a `path` array. Push the node before recursing and pop it after (backtracking, Day 9). At a matching leaf, save a copy: `result.push([...path])`.

## C — Common Pitfalls + Fix

### ❌ Checking the sum at a non-leaf

```ts
if (remaining === 0) return true; // ❌ the path must end at a leaf
if (!root.left && !root.right) return remaining === 0; // ✅
```

### ❌ Treating `null` as a leaf in Path Sum

If `null` returned `target === 0`, a node with one child could "end" on its empty side. Only real nodes with no children are leaves.

### ❌ Comparing values instead of nodes in LCA

Use `root === p`, not `root.val === p.val`, unless the problem says values are unique.

### ❌ Stopping early on a negative remaining value

Values can be negative, so `-5` might become `0` further down. Only prune early if the problem says all values are positive.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Medium

**Lowest Common Ancestor of a BST:** same question as the classic, but the tree is a **binary search tree** (Day 7, topic 4). Use the ordering rule to avoid searching both sides.

In the BST `6 → (2 → (0, 4 → (3, 5)), 8 → (7, 9))`: LCA of `2` and `8` → `6` · LCA of `2` and `4` → `2`

<details><summary>Hint</summary>

If both values are smaller than the current node, the answer is on the left. If both are larger, it is on the right. Otherwise you are standing on the split point.

</details>

### Solution

```ts
function lowestCommonAncestorBST(
  root: TreeNode | null,
  p: TreeNode,
  q: TreeNode,
): TreeNode | null {
  let node = root;
  while (node !== null) {
    if (p.val < node.val && q.val < node.val) node = node.left;       // both on the left
    else if (p.val > node.val && q.val > node.val) node = node.right; // both on the right
    else return node; // they split here (or one of them is this node)
  }
  return null;
}
```

**Time:** `O(h)` · **Space:** `O(1)`. The first node where `p` and `q` stop going the same way is the deepest node that has both below it.

**Right now:** In the classic's example tree, find the LCA of `6` and `0` by hand, writing what each call returns from the bottom up.
