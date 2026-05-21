# 3 — Updating Data — Mutations, Optimistic Updates, Error Handling

---

## T — TL;DR

Mutations in Next.js 16 follow a clear pattern: **Server Action → validate → DB write → revalidate cache → return result**. For instant-feeling UI, `useOptimistic` shows the expected result immediately while the action runs. Robust error handling in actions prevents silent failures.

---

## K — Key Concepts

### The Standard Mutation Pattern

```tsx
// src/app/todos/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";

const ToggleSchema = z.object({
  id: z.string().min(1),
  completed: z.coerce.boolean(),
});

export async function toggleTodo(id: string, completed: boolean) {
  // Step 1: Validate
  const result = ToggleSchema.safeParse({ id, completed });
  if (!result.success) throw new Error("Invalid input");

  // Step 2: Authorize (always verify the user owns this resource)
  const session = await getServerSession();
  const todo = await db.todo.findUnique({ where: { id } });

  if (!todo || todo.userId !== session?.userId) {
    throw new Error("Not authorized");
  }

  // Step 3: Write to DB
  await db.todo.update({
    where: { id },
    data: { completed },
  });

  // Step 4: Revalidate cache
  revalidatePath("/todos");
  revalidateTag("todos");
}
```

### `useOptimistic` — Instant UI Feedback

```tsx
// useOptimistic: show the expected result immediately
// If the server action fails, the optimistic state reverts automatically

"use client";
import { useOptimistic, useTransition } from "react";
import { toggleTodo } from "../actions";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [isPending, startTransition] = useTransition();

  // optimisticTodos: the UI source of truth during pending actions
  // addOptimistic: function to set the optimistic state
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state: Todo[], { id, completed }: { id: string; completed: boolean }) =>
      state.map((t) => (t.id === id ? { ...t, completed } : t))
  );

  function handleToggle(todo: Todo) {
    startTransition(async () => {
      // Step 1: Immediately update UI (optimistic)
      addOptimistic({ id: todo.id, completed: !todo.completed });

      // Step 2: Run the actual server action
      try {
        await toggleTodo(todo.id, !todo.completed);
        // On success: Next.js re-renders with real server data
        // (which should match the optimistic state)
      } catch {
        // On failure: optimistic state automatically REVERTS to `todos` prop
        // User sees the original state restored
      }
    });
  }

  return (
    <ul className="space-y-2">
      {optimisticTodos.map((todo) => (
        <li
          key={todo.id}
          className={`flex items-center gap-3 px-4 py-3 border rounded-xl
                      cursor-pointer hover:bg-gray-50 transition-colors
                      ${isPending ? "opacity-70" : ""}`}
          onClick={() => handleToggle(todo)}
        >
          <span className={`text-xl ${todo.completed ? "opacity-50" : ""}`}>
            {todo.completed ? "✅" : "⬜"}
          </span>
          <span
            className={`text-sm ${
              todo.completed ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {todo.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

### Error Handling Patterns in Server Actions

```tsx
// src/app/products/actions.ts
"use server";

// ─── Pattern 1: Return errors (non-throwing) — for expected errors
export async function createProduct(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const result = Schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { success: false, errors: result.error.flatten().fieldErrors };
    }

    // Check for business rule violations
    const exists = await db.product.findFirst({
      where: { name: result.data.name },
    });
    if (exists) {
      return {
        success: false,
        errors: { name: ["A product with this name already exists"] },
      };
    }

    await db.product.create({ data: result.data });
    revalidatePath("/products");
    return { success: true, message: "Product created!" };
  } catch (error) {
    // Log unexpected errors server-side
    console.error("[createProduct]", error);
    // Return generic message — never expose internal errors to client
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

// ─── Pattern 2: Throw errors — for unexpected/fatal errors
// These are caught by the nearest error.tsx boundary
export async function deleteProduct(id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    throw new Error("Product not found");
    // → caught by error.tsx boundary in the UI
  }
  await db.product.delete({ where: { id } });
  revalidatePath("/products");
}
```

### `error.tsx` — Error Boundary for Actions

```tsx
// src/app/products/error.tsx
// Catches errors thrown from Server Actions and Server Components
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking service
    console.error("Products page error:", error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px]
                    text-center px-4"
    >
      <p className="text-4xl mb-4">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        {/* Never show raw error.message in production — use a generic message */}
        We couldn't complete this action. Please try again.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-4">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-xl hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
```

---

## W — Why It Matters

- `useOptimistic` is the difference between a UI that feels instant and one that feels sluggish — toggling a checkbox or liking a post should feel immediate, not dependent on a network round-trip. If the action fails, the automatic revert handles the error state without any extra code.
- The pattern of returning errors vs throwing errors is a crucial design decision: returned errors are for expected, recoverable situations (validation failures, business rule violations) — they show field-level error messages. Thrown errors are for unexpected situations — they propagate to the nearest `error.tsx` boundary.
- Never exposing raw error messages to the client (use the `digest` for tracking instead) is a security requirement — raw database errors, stack traces, and internal system details must stay server-side.

---

## I — Interview Q&A

### Q1: How does `useOptimistic` work and what happens when the server action fails?

**A:** `useOptimistic` takes the current server state and an updater function, returning `[optimisticState, addOptimistic]`. When you call `addOptimistic(update)`, React immediately applies the updater function to produce a temporary optimistic state — the UI updates instantly without waiting for the server. The component re-renders with `optimisticState` (the optimistic version) instead of the original state. When the server action completes successfully, Next.js re-renders the component with the actual server data (which should match the optimistic prediction). If the action fails or throws an error, React automatically discards the optimistic state and reverts to the original `state` prop — the UI rolls back without any extra error-handling code.

### Q2: When should a Server Action return an error vs throw an error?

**A:** Return errors (as part of the action's return value) for expected, recoverable situations: validation failures, duplicate entries, business rule violations, "resource not found" for user input. The UI displays these as inline field errors or status messages, and the user can correct and retry. Throw errors for unexpected, unrecoverable situations: database connection failures, permission errors that should never happen for a valid user, infrastructure errors. Thrown errors propagate to the nearest `error.tsx` boundary, which shows a full-page error state with a retry option. The rule: if the user can fix it, return it; if the system is broken, throw it.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Mutating state directly in `useOptimistic` updater

```tsx
// ❌ Mutating the state array directly — React state must be immutable
const [optimistic, addOptimistic] = useOptimistic(
  todos,
  (state, { id, completed }) => {
    const todo = state.find((t) => t.id === id);
    todo!.completed = completed; // ← direct mutation ❌
    return state;
  }
);
```

**Fix:** Return a new array with the updated item:

```tsx
const [optimistic, addOptimistic] = useOptimistic(
  todos,
  (state, { id, completed }: { id: string; completed: boolean }) =>
    state.map((t) => (t.id === id ? { ...t, completed } : t)) // ← new array ✅
);
```

### ❌ Pitfall: Showing raw error messages from Server Actions to users

```tsx
// ❌ Exposes internal system information
export async function createProduct(formData: FormData) {
  'use server'
  try {
    await db.product.create({ data: ... })
  } catch (error) {
    return { error: error.message }
    // Might expose: "Unique constraint failed on the fields: (`name`)"
    // or DB connection strings, table names, internal IDs
  }
}
```

**Fix:** Return generic user-facing messages, log internally:

```tsx
export async function createProduct(formData: FormData) {
  'use server'
  try {
    await db.product.create({ data: ... })
    return { success: true }
  } catch (error) {
    console.error('[createProduct] DB error:', error)  // ← log server-side only
    return { success: false, message: 'Could not create product. Please try again.' }
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `TodoList` with:

1. `toggleTodo(id, completed)` Server Action
2. `deleteTodo(id)` Server Action
3. `TodoList` Client Component using `useOptimistic` for instant toggle
4. `DeleteButton` using `useTransition` with optimistic removal
5. Both actions revalidate `'todos'` tag and `/todos` path

### Solution

```tsx
// src/app/todos/actions.ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

// Simulated DB
let TODOS: Todo[] = [
  { id: "t1", title: "Read Next.js docs", completed: false },
  { id: "t2", title: "Build a Server Action", completed: true },
  { id: "t3", title: "Learn useOptimistic", completed: false },
  { id: "t4", title: "Deploy to Vercel", completed: false },
];

export async function getTodos(): Promise<Todo[]> {
  return TODOS;
}

export async function toggleTodo(
  id: string,
  completed: boolean
): Promise<void> {
  await new Promise((r) => setTimeout(r, 300)); // simulate network
  const todo = TODOS.find((t) => t.id === id);
  if (!todo) throw new Error("Todo not found");
  TODOS = TODOS.map((t) => (t.id === id ? { ...t, completed } : t));
  revalidateTag("todos");
  revalidatePath("/todos");
}

export async function deleteTodo(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
  TODOS = TODOS.filter((t) => t.id !== id);
  revalidateTag("todos");
  revalidatePath("/todos");
}
```

```tsx
// src/app/todos/_components/todo-list.tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { toggleTodo, deleteTodo, type Todo } from "../actions";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [isPending, startTransition] = useTransition();

  // Optimistic state for toggles AND deletes
  const [optimisticTodos, applyOptimistic] = useOptimistic(
    todos,
    (
      state: Todo[],
      action:
        | { type: "toggle"; id: string; completed: boolean }
        | { type: "delete"; id: string }
    ) => {
      if (action.type === "toggle") {
        return state.map((t) =>
          t.id === action.id ? { ...t, completed: action.completed } : t
        );
      }
      if (action.type === "delete") {
        return state.filter((t) => t.id !== action.id);
      }
      return state;
    }
  );

  function handleToggle(todo: Todo) {
    startTransition(async () => {
      applyOptimistic({
        type: "toggle",
        id: todo.id,
        completed: !todo.completed,
      });
      try {
        await toggleTodo(todo.id, !todo.completed);
      } catch {
        // Optimistic state reverts automatically on error
        console.error("Failed to toggle todo");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      try {
        await deleteTodo(id);
      } catch {
        console.error("Failed to delete todo");
      }
    });
  }

  const completed = optimisticTodos.filter((t) => t.completed).length;
  const total = optimisticTodos.length;

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {completed} / {total} completed
        </p>
        {/* Progress bar */}
        <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: total ? `${(completed / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {optimisticTodos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 px-4 py-3 bg-white border
                       rounded-xl group hover:border-gray-300 transition-colors"
          >
            {/* Toggle checkbox — optimistic click */}
            <button
              onClick={() => handleToggle(todo)}
              disabled={isPending}
              className="text-xl shrink-0 disabled:cursor-wait"
              aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
            >
              {todo.completed ? "✅" : "⬜"}
            </button>

            {/* Title */}
            <span
              className={`flex-1 text-sm transition-all ${
                todo.completed ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {todo.title}
            </span>

            {/* Delete button — optimistic removal */}
            <button
              onClick={() => handleDelete(todo.id)}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 text-gray-400
                         hover:text-red-500 transition-all text-sm
                         disabled:cursor-wait"
              aria-label="Delete todo"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {optimisticTodos.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">All done! 🎉</p>
      )}
    </div>
  );
}
```

```tsx
// src/app/todos/page.tsx — Server Component
import { getTodos } from "./actions";
import { TodoList } from "./_components/todo-list";

export default async function TodosPage() {
  const todos = await getTodos();
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-center mb-8">Todos</h1>
      <TodoList todos={todos} />
    </div>
  );
}
```

---

---
