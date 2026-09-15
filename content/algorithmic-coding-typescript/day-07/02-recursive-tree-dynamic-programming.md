# Recursive Tree Dynamic Programming

## T — TL;DR

Tree DP computes child states first and returns the exact facts a parent needs, usually through postorder recursion.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

Tree DP is for questions where the answer for a parent depends on answers from its child subtrees. Instead of solving each subtree repeatedly, return a small state from each child and combine it at the parent.

### Mental Model

Imagine a manager asking each team for a report before writing the department report. A child sends back exactly the facts the manager needs. The parent should not need to inspect the entire team again.

### First Trace

For height, a leaf returns `1`. A parent with two leaf children receives `1` and `1`, then returns `1 + max(1, 1) = 2`. The empty child returns `0`, which is the base case that makes the combination work.

## K — Key Concepts

### 1. Most Common Coding Interview Question

**Question:** Find the diameter of a binary tree, measured as the number of edges on the longest path. This is **Diameter of Binary Tree**.

**Best interview-ready solution:**

1. **Recognize tree DP:** a node needs the height of each child to compute a path passing through itself.
2. **Return height upward:** height is one plus the larger child height.
3. **Update a global or returned best:** a path through the node has left height plus right height edges.
4. **Use postorder:** both child heights must exist before the parent calculation.
5. **Complexity:** O(n) time and O(h) recursion space.

**Code solution:**

```ts
// Pseudocode: postorder returns height and combines child heights into the best path diameter.
type TreeNode = { value: number; left: TreeNode | null; right: TreeNode | null };

function treeDiameter(root: TreeNode | null): number {
	let best = 0;
	const height = (node: TreeNode | null): number => {
		if (node === null) return 0;
		const left = height(node.left);
		const right = height(node.right);
		best = Math.max(best, left + right);
		return 1 + Math.max(left, right);
	};
	height(root);
	return best;
}
```

For a maximum independent set, return two values per subtree: best total when the node is included and when it is excluded.

```ts
type Choice = readonly [included: number, excluded: number];

function bestIndependentSet(root: TreeNode | null): number {
	function solve(node: TreeNode | null): Choice {
		if (node === null) return [0, 0];
		const left = solve(node.left);
		const right = solve(node.right);
		return [
			node.value + left[1] + right[1],
			Math.max(left[0], left[1]) + Math.max(right[0], right[1]),
		];
	}
	const [included, excluded] = solve(root);
	return Math.max(included, excluded);
}
```

The tuple meaning is the state contract. Avoid global variables; return facts upward so each subtree remains independent.

## W — Why It Matters

Tree DP appears in hierarchy optimization, permission systems, network placement, and interview problems such as diameter and maximum path sum. It trains state design on an acyclic dependency graph.

## I — Interview Q&A

### Why is postorder natural for tree DP?

The parent transition depends on child states, so children must be solved first.

### Why return multiple values?

The parent may need different outcomes based on its own choice; one scalar can lose necessary information.

### What is the complexity?

Usually $O(n)$ time and $O(h)$ recursion stack, where `h` is tree height.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Returning a state with unclear meaning. **Fix:** write one sentence for each field.
- **Pitfall:** Mutating a module-level answer. **Fix:** return the subtree result.
- **Pitfall:** Combining children before they are solved. **Fix:** use postorder recursion.

## K — Coding Challenge with Solution

### Challenge

**Time:** 5–10 minutes.

Return the height of a binary tree, where an empty tree has height `0` and a leaf has height `1`.

### Solution

```ts
function height(root: TreeNode | null): number {
	if (root === null) return 0;
	return 1 + Math.max(height(root.left), height(root.right));
}
```

The recursive state is the current subtree, and the parent waits for both child heights.

**Right now:** Write one sentence defining the state returned by your next tree recursion.
