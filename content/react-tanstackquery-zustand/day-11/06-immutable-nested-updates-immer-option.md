# 6 — Immutable Nested Updates + Immer Option

---

## T — TL;DR

Deep nested updates in Zustand require multi-level spreading — verbose and error-prone. The `immer` middleware lets you **mutate a draft** and automatically produces an immutable result. Use it when your store has 2+ levels of nesting.

---

## K — Key Concepts

```tsx
// ── Deep nested update without Immer — painful ────────────────────────────
interface AppStore {
  user: {
    profile: { name: string; bio: string }
    settings: { theme: string; notifications: { email: boolean; push: boolean } }
  }
}

// ❌ Manual spread chain — 3 levels deep
set(state => ({
  user: {
    ...state.user,
    settings: {
      ...state.user.settings,
      notifications: {
        ...state.user.settings.notifications,
        email: true,   // finally
      }
    }
  }
}))
```

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// ── Immer middleware: mutate the draft ───────────────────────────────────
const useAppStore = create<AppStore>()(
  immer(set => ({
    user: {
      profile: { name: 'Alice', bio: '' },
      settings: {
        theme: 'light',
        notifications: { email: true, push: false }
      }
    },

    // ✅ Direct mutation on draft — Immer handles immutability
    updateEmailNotif: (enabled: boolean) => set(state => {
      state.user.settings.notifications.email = enabled
      // ← looks like mutation, but Immer produces a new object ✅
    }),

    updateTheme: (theme: string) => set(state => {
      state.user.settings.theme = theme
    }),

    updateProfile: (name: string, bio: string) => set(state => {
      state.user.profile.name = name
      state.user.profile.bio  = bio
    }),
  }))
)
```

```tsx
// ── Immer for array operations ────────────────────────────────────────────
const useTodoStore = create<TodoStore>()(
  immer(set => ({
    todos: [] as Todo[],

    addTodo: (text: string) => set(state => {
      state.todos.push({ id: Date.now(), text, done: false })   // ✅ push on draft
    }),

    toggleTodo: (id: number) => set(state => {
      const todo = state.todos.find(t => t.id === id)
      if (todo) todo.done = !todo.done   // ✅ direct mutation on draft
    }),

    removeTodo: (id: number) => set(state => {
      const idx = state.todos.findIndex(t => t.id === id)
      if (idx !== -1) state.todos.splice(idx, 1)   // ✅ splice on draft
    }),

    reorderTodos: (fromIdx: number, toIdx: number) => set(state => {
      const [item] = state.todos.splice(fromIdx, 1)
      state.todos.splice(toIdx, 0, item)
    }),
  }))
)
```

```tsx
// ── When to use Immer vs manual spread ───────────────────────────────────
// Use manual spread:
//   - Flat store (no nesting)
//   - 1 level deep updates only
//   - Minimal bundle size is critical

// Use Immer:
//   - 2+ levels of nesting
//   - Array operations (push, splice, sort)
//   - Complex update logic on deeply nested objects
//   - Team prefers "mutation-style" code for readability
```

---

## W — Why It Matters

- Every extra level of nesting in a manual spread is a potential bug source — it's easy to forget a `...spread` at one level, silently replacing sibling fields.
- Immer's `produce` is the industry-standard immutability helper — it's what Redux Toolkit uses internally. Learning it once applies everywhere.
- Immer operations (`push`, `splice`, `direct assignment`) are dramatically more readable for array manipulation than `[...arr.slice(0, i), changed, ...arr.slice(i+1)]`.

---

## I — Interview Q&A

### Q: What is the Immer middleware in Zustand and when should you use it?

**A:** The Immer middleware wraps Zustand's `set` so the updater function receives a **draft** — a mutable proxy of the current state. You write mutations on the draft (direct assignment, array push/splice), and Immer automatically produces a new immutable state object using structural sharing. Use it when: your store has nested objects requiring multi-level spreading (2+ levels deep), you have array operations that are verbose with spread syntax, or you want mutation-style code that's easier to read and maintain. The trade-off is a small bundle size addition (~14KB from Immer) and a slightly different mental model — but for any non-trivial nested state, it's the right default.

---

## C — Common Pitfalls + Fix

### ❌ Returning from an Immer set callback — conflict with Immer's tracking

```tsx
// ❌ Returning a new object from Immer callback — breaks Immer's draft tracking
const useStore = create<Store>()(
  immer(set => ({
    items: [],
    addItem: (item: Item) => set(state => {
      return { items: [...state.items, item] }  // ❌ return + mutation conflict
    }),
  }))
)
// Immer: either mutate the draft OR return a new state — never both

// ✅ Mutate the draft (Immer style)
addItem: (item: Item) => set(state => {
  state.items.push(item)   // ✅ mutate draft, don't return
}),

// ✅ Or return new state (non-Immer style — Immer passes it through)
addItem: (item: Item) => set(state => ({
  items: [...state.items, item]   // ✅ return without mutating draft
})),
```

---

## K — Coding Challenge + Solution

### Challenge

Build `useProjectStore` with Immer: projects contain tasks, tasks contain subtasks. Implement: `addTask`, `toggleSubtask`, `reorderTasks`.

### Solution

```tsx
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface Subtask { id: number; text: string; done: boolean }
interface Task    { id: number; title: string; subtasks: Subtask[] }
interface Project { id: number; name: string; tasks: Task[] }

interface ProjectStore {
  projects:       Project[]
  addTask:        (projectId: number, title: string) => void
  toggleSubtask:  (projectId: number, taskId: number, subtaskId: number) => void
  reorderTasks:   (projectId: number, fromIdx: number, toIdx: number) => void
}

const useProjectStore = create<ProjectStore>()(
  immer(set => ({
    projects: [
      { id: 1, name: 'Website Redesign', tasks: [] }
    ],

    addTask: (projectId, title) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      project?.tasks.push({ id: Date.now(), title, subtasks: [] })
      // Deep mutation — Immer handles all spreading ✅
    }),

    toggleSubtask: (projectId, taskId, subtaskId) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      const task    = project?.tasks.find(t => t.id === taskId)
      const subtask = task?.subtasks.find(s => s.id === subtaskId)
      if (subtask) subtask.done = !subtask.done   // 3 levels deep — clean ✅
    }),

    reorderTasks: (projectId, fromIdx, toIdx) => set(state => {
      const project = state.projects.find(p => p.id === projectId)
      if (!project) return
      const [task] = project.tasks.splice(fromIdx, 1)
      project.tasks.splice(toIdx, 0, task)        // splice on draft ✅
    }),
  }))
)
```

---

---
