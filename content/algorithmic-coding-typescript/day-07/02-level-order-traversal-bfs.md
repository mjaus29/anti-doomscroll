# Level Order Traversal (BFS)

## T — TL;DR

**Breadth-first search (BFS)** visits a tree one level at a time: the root, then all nodes at depth 1, then depth 2, and so on. Keep the current level in a list, build the next level from their children, and repeat.

**Reach for it when:**

- The problem says "level", "row", "layer", or "left to right".
- You need the **closest** or **shallowest** node (the first match BFS finds is the nearest).
- You need something per level: averages, the last node, the widest level.

## K — Key Concepts

### Picture it

Think of floors in an office building. A fire warden checks every room on floor 1, writing down who has a staircase to floor 2. Then she checks all those rooms on floor 2, and so on. She finishes a whole floor before going down a level.

### Walk through it

Level order of this tree (answer `[[3], [9, 20], [15, 7]]`):

```text
    3
   / \
  9   20
     /  \
    15   7
```

| Round | Current level | Values recorded | Next level built from children |
| :---- | :------------ | :-------------- | :----------------------------- |
| 1 | `[3]` | `[3]` | `[9, 20]` |
| 2 | `[9, 20]` | `[9, 20]` | `9` has none; `20` gives `[15, 7]` |
| 3 | `[15, 7]` | `[15, 7]` | `[]` — empty, so stop |

Because each round handles exactly one level, you always know which level a node belongs to.

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

function levelOrder(root: TreeNode | null): number[][] {
  const levels: number[][] = [];
  if (root === null) return levels;

  let current: TreeNode[] = [root];
  while (current.length > 0) {   // one loop = one whole level
    levels.push(current.map((node) => node.val));
    const next: TreeNode[] = [];
    for (const node of current) {
      if (node.left) next.push(node.left); // children go to the NEXT level
      if (node.right) next.push(node.right);
    }
    current = next;
  }
  return levels;
}
```

**Time:** `O(n)` · **Space:** `O(w)` — every node is handled once, and at most one level (width `w`, up to about `n / 2`) is stored at a time.

Building a fresh `next` array avoids `queue.shift()`, which is `O(n)` in JavaScript (Day 5, topic 3).

### Interview classic: Binary Tree Right Side View

Imagine standing to the right of the tree. Return the values you can see, top to bottom.
Example: `1 → (2 → (null, 5), 3 → (null, 4))` → `[1, 3, 4]`.

```text
    1        ← see 1
   / \
  2   3      ← see 3
   \   \
    5   4    ← see 4
```

- **Brute force:** walk only right children — wrong, because a left node is visible when the right side is shorter.
- **Key insight:** the visible node on each level is the **last** node of that level. Level order gives you every level directly.

```ts
function rightSideView(root: TreeNode | null): number[] {
  const visible: number[] = [];
  if (root === null) return visible;

  let current: TreeNode[] = [root];
  while (current.length > 0) {
    visible.push(current[current.length - 1].val); // rightmost node of this level
    const next: TreeNode[] = [];
    for (const node of current) {
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    current = next;
  }
  return visible;
}
```

The loop is identical to the template; only the line that records the level changed.

## W — Why It Matters

- BFS is the go-to for "nearest", "fewest steps", and anything "per level". The same idea powers shortest paths in graphs (Day 10).
- Common tree questions: Level Order, Zigzag Level Order, Average of Levels, Right Side View, Minimum Depth.
- Interviewers listen for how you separate levels, and whether you know `shift()` is slow.

## I — Interview Q&A

### Q: Can you do level order with a single queue?

Yes. Push the root, then at the start of each round save `size = queue.length` and process exactly `size` nodes. Use a head index instead of `shift()` to keep it `O(n)`.

### Q: Can DFS solve Right Side View?

Yes. Visit the right child first and pass the depth down. The first node you reach at each new depth is the visible one. Same `O(n)` time.

### Q: When is BFS better than DFS on a tree?

When the answer is near the top, such as the shallowest leaf. BFS stops at the first level that has it; DFS may explore a deep branch first.

## C — Common Pitfalls + Fix

### ❌ Using `shift()` on a big queue

Each `shift()` moves every remaining element. On a tree with 100,000 nodes that adds up. Build per-level arrays or keep a head index.

### ❌ Mixing levels together

```ts
for (const node of current) current.push(node.left!); // ❌ grows the list you are reading
for (const node of current) next.push(node.left!);    // ✅ children go to a new list
```

### ❌ Pushing `null` children

Check `if (node.left)` before pushing. Otherwise the next round crashes on `null.val`.

### ❌ Forgetting the empty tree

Return `[]` (or `0`) when `root` is `null` before the loop starts.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes · **Difficulty:** Easy

**Minimum Depth of Binary Tree:** return the number of nodes on the shortest path from the root down to a **leaf** (a node with no children). An empty tree has depth `0`.

`3 → (9, 20 → (15, 7))` → `2` (path `3 → 9`) · `1 → (null, 2)` → `2` (node `1` is not a leaf)

<details><summary>Hint</summary>

Run level order and count levels. Return as soon as you meet a node with no children.

</details>

### Solution

```ts
function minDepth(root: TreeNode | null): number {
  if (root === null) return 0;

  let current: TreeNode[] = [root];
  let depth = 1;
  while (current.length > 0) {
    const next: TreeNode[] = [];
    for (const node of current) {
      if (!node.left && !node.right) return depth; // first leaf found = shallowest leaf
      if (node.left) next.push(node.left);
      if (node.right) next.push(node.right);
    }
    current = next;
    depth++;
  }
  return depth;
}
```

**Time:** `O(n)` · **Space:** `O(w)`. BFS reaches levels in order, so the first leaf it meets is on the shallowest level, and it can stop early without visiting deeper nodes.

**Right now:** Trace `rightSideView` on `1 → (2 → (4, null), 3)` and predict the output before checking (it should be `[1, 3, 4]`).
