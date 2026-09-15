# Breadth-First Search and Depth-First Search

## T — TL;DR

BFS explores by increasing unweighted distance; DFS explores a branch deeply, so choose from the output dependency rather than habit.

## Beginner Walkthrough — Purpose, Mental Model, and First Trace

### Purpose

BFS and DFS are two ways to explore everything reachable from a starting point. BFS is for distance layers; DFS is for going deep into a branch and returning when it is exhausted.

### Mental Model

BFS is a ripple spreading across a pond: all points one step away are reached before points two steps away. DFS is a person exploring a maze corridor until it ends, then walking back to try another corridor.

### First Trace

For graph edges `0 -> 1` and `0 -> 2`, BFS starts at `0`, then visits `1` and `2` at distance `1`. If `1` points to `3`, `3` waits until the distance-one layer has been processed. That layer order is what makes the first distance shortest.

## K — Key Concepts

```ts
function distances(graph: readonly number[][], source: number): number[] {
  const distance = new Array<number>(graph.length).fill(-1);
  const queue = [source];
  let head = 0;
  distance[source] = 0;
  while (head < queue.length) {
    const vertex = queue[head++];
    for (const neighbor of graph[vertex]) {
      if (distance[neighbor] !== -1) continue;
      distance[neighbor] = distance[vertex] + 1;
      queue.push(neighbor);
    }
  }
  return distance;
}
```

Mark on enqueue. BFS gives shortest edge count in an unweighted graph. DFS is useful for exhaustive components, recursion, and cycle-state analysis. Both are $O(V + E)$ with adjacency lists.

## W — Why It Matters

Traversal is the foundation of route finding, dependency analysis, permissions, and connectivity. Interviewers often test whether you can explain why BFS, not just implement a queue.

## I — Interview Q&A

### Why is first BFS discovery shortest?

The queue processes vertices layer by layer, so the first path to a vertex has the fewest edges.

### Why mark visited on enqueue?

Multiple frontier vertices may point to the same neighbor; marking immediately prevents duplicate queue entries.

### When is DFS preferable?

When you need recursive structure, components, cycle states, or exhaustive exploration rather than minimum unweighted distance.

## C — Common Pitfalls (+ Fix)

- **Pitfall:** Using BFS for weighted edges. **Fix:** choose a weighted shortest-path algorithm.
- **Pitfall:** Marking late. **Fix:** mark when adding to the queue or stack.
- **Pitfall:** Recursion overflow on a long path. **Fix:** use an explicit stack.

## K — Coding Challenge with Solution

### Challenge

**Time:** 10 minutes.

Return the shortest number of edges from `source` to every vertex, or `-1` if unreachable.

### Solution

```ts
function distances(graph: readonly number[][], source: number): number[] {
  const distance = new Array<number>(graph.length).fill(-1);
  const queue = [source];
  let head = 0;
  distance[source] = 0;
  while (head < queue.length) {
    const vertex = queue[head++];
    for (const neighbor of graph[vertex]) {
      if (distance[neighbor] !== -1) continue;
      distance[neighbor] = distance[vertex] + 1;
      queue.push(neighbor);
    }
  }
  return distance;
}
```

**Right now:** Decide whether your next graph problem asks for layers, connectivity, or a weighted route.
