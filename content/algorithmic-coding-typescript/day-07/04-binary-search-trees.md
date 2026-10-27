# Binary Search Trees

## T — TL;DR

A **binary search tree (BST)** keeps every value in a node's left subtree smaller than the node, and every value in its right subtree larger. That order lets you search, insert, and find neighbours by walking one path from the root, like binary search on a sorted array.

**Reach for it when:**

- The problem says "BST" — the ordering rule is a gift; use it.
- You need sorted order from a tree (in-order traversal gives values in increasing order).
- You need to find a value, or the nearest value, faster than checking every node.

## K — Key Concepts

### Picture it

A BST is a "guess the number" game built into a tree. At each node you ask, "Is my target smaller or bigger than this?" and walk left or right. Each answer throws away a whole subtree, just like binary search throws away half the array.

### Walk through it

Search for `6` in this BST:

```text
      8
     / \
    3   10
   / \    \
  1   6    14
```

| Step | Node | Compare | Action and why |
| :--- | :--- | :------ | :------------- |
| 1 | 8 | `6 < 8` | Go left. Everything on the right is bigger than 8. |
| 2 | 3 | `6 > 3` | Go right. Everything on the left is smaller than 3. |
| 3 | 6 | `6 === 6` | Found it. |

Insert `7` follows the same path: `8 → left → 3 → right → 6 → right`, which is empty, so `7` becomes the right child of `6`.

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

function searchBST(root: TreeNode | null, target: number): TreeNode | null {
  let node = root;
  while (node !== null && node.val !== target) {
    node = target < node.val ? node.left : node.right; // the BST rule picks one side
  }
  return node;
}

function insertIntoBST(root: TreeNode | null, value: number): TreeNode {
  if (root === null) return new TreeNode(value); // found the empty spot
  if (value < root.val) root.left = insertIntoBST(root.left, value);
  else root.right = insertIntoBST(root.right, value);
  return root;
}
```

**Time:** `O(h)` · **Space:** `O(1)` for search, `O(h)` for recursive insert — you walk one root-to-leaf path. `h` is `O(log n)` for a balanced tree but `O(n)` if values were inserted in sorted order (the tree becomes a line).

### Interview classic: Validate Binary Search Tree

Return `true` if a tree follows the BST rule (strictly smaller on the left, strictly larger on the right).
Example: `5 → (1, 4 → (3, 6))` → `false`. `4` is on the right of `5` but smaller than it.

- **Brute force:** for every node, scan its whole left and right subtrees — `O(n²)`.
- **Key insight:** checking only a node against its children is **not** enough. Each node must fit inside a range `(low, high)` set by all its ancestors. Pass that range **down**: going left lowers `high`, going right raises `low`.

```ts
function isValidBST(root: TreeNode | null): boolean {
  function check(node: TreeNode | null, low: number, high: number): boolean {
    if (node === null) return true;
    if (node.val <= low || node.val >= high) return false; // outside allowed range
    return check(node.left, low, node.val) && check(node.right, node.val, high);
  }
  return check(root, -Infinity, Infinity);
}
```

The search template walks one path; this one visits every node but still uses the BST rule to decide what each node is allowed to be.

### Variation: Kth Smallest Element in a BST

In-order traversal (left, node, right) visits a BST in increasing order. Stop at the `k`-th node visited.
Example: `3 → (1 → (null, 2), 4)`, `k = 1` → `1`.

```ts
function kthSmallest(root: TreeNode | null, k: number): number {
  const stack: TreeNode[] = [];
  let node = root;
  let count = 0;
  while (node !== null || stack.length > 0) {
    while (node !== null) { stack.push(node); node = node.left; } // go far left first
    const current = stack.pop()!;
    count++;
    if (count === k) return current.val;
    node = current.right;
  }
  throw new Error("k is larger than the tree size");
}
```

**Time:** `O(h + k)` · **Space:** `O(h)`. The iterative version can stop early without unwinding a recursion.

## W — Why It Matters

- BST questions test whether you **use** the ordering rule. Treating a BST like a plain tree is a common miss.
- Sorted maps and database indexes (B-trees) are built on the same idea.
- Interviewers listen for the range argument in Validate BST and for "in-order is sorted."

## I — Interview Q&A

### Q: Why does checking each node against its children fail?

In `5 → (1, 4 → (3, 6))`, the node `4` has children `3 < 4 < 6`, so a local check passes. But `4` lives in the right subtree of `5` and must be larger than `5`. Only a range from the ancestors catches that.

### Q: What is the worst case for a BST?

Inserting sorted values builds a line, so every operation becomes `O(n)`. Self-balancing trees (AVL, red-black) fix this; you only need to name them.

### Q: Can you validate with in-order traversal instead?

Yes. Do an in-order walk and check that each value is strictly greater than the previous one. Same `O(n)` time.

## C — Common Pitfalls + Fix

### ❌ Comparing only with the parent

See the Q&A above. Always carry `low` and `high` down.

### ❌ Using `0` or `Number.MAX_SAFE_INTEGER` as the starting bounds

Node values can be negative or huge. Start with `-Infinity` and `Infinity`.

### ❌ Allowing duplicates by accident

```ts
if (node.val < low || node.val > high) return false;   // ❌ lets equal values through
if (node.val <= low || node.val >= high) return false; // ✅ strict BST
```

### ❌ Forgetting to return the root from insert

The recursive insert re-links each child. If the function does not return `root`, the parent's pointer becomes `undefined`.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Convert Sorted Array to BST:** given a sorted array, build a **height-balanced** BST (left and right heights differ by at most 1 at every node). Any valid answer is accepted.

`[-10, -3, 0, 5, 9]` → a tree with root `0`, left subtree from `[-10, -3]`, right subtree from `[5, 9]`.

<details><summary>Hint</summary>

Make the middle element the root. Build the left half and the right half the same way.

</details>

### Solution

```ts
function sortedArrayToBST(values: readonly number[]): TreeNode | null {
  function build(start: number, end: number): TreeNode | null {
    if (start > end) return null; // empty range: no node
    const mid = Math.floor((start + end) / 2);
    const node = new TreeNode(values[mid]); // middle value splits the rest evenly
    node.left = build(start, mid - 1);
    node.right = build(mid + 1, end);
    return node;
  }
  return build(0, values.length - 1);
}
```

**Time:** `O(n)` · **Space:** `O(log n)` for the recursion. Smaller values go left and larger go right, so the BST rule holds; splitting at the middle keeps both halves the same size within one, so the tree is balanced.

**Right now:** Insert `5, 3, 8, 1, 4` into an empty BST on paper, then write its in-order traversal and check that it is sorted.
