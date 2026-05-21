# 📅 Day 8 — Mutations and Backend Integration (Next.js 16)

> **Goal:** Master every mechanism Next.js 16 provides for mutating data and building a backend layer — Server Actions, Route Handlers, request/response APIs, cookies, headers, redirects, and proxy patterns.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Prerequisite:** Day 7 complete — data fetching and cache strategy understood.

---

## 📋 Day 8 Subtopic Overview

| #   | Subtopic                                                      | Time   |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Server Actions — Fundamentals and the Execution Model         | 15 min |
| 2   | App Router Forms — `useActionState`, Progressive Enhancement  | 12 min |
| 3   | Updating Data — Mutations, Optimistic Updates, Error Handling | 15 min |
| 4   | Route Handlers — `route.ts`, GET and POST Handlers            | 12 min |
| 5   | `NextRequest` and `NextResponse` — The Request/Response API   | 12 min |
| 6   | Cookies — Reading, Setting, Deleting                          | 10 min |
| 7   | Headers — Request Headers, Response Headers, Custom Headers   | 10 min |
| 8   | Redirects — Server-Side, Client-Side, Middleware              | 12 min |
| 9   | Proxy and Backend-for-Frontend (BFF) Patterns                 | 15 min |
| 10  | Error Handling in Mutations and Route Handlers                | 12 min |

---

---

# 1 — Server Actions — Fundamentals and the Execution Model

---

## T — TL;DR

A **Server Action** is an `async` function marked with `'use server'` that runs exclusively on the server but can be called directly from Client Components or used as a `<form action>`. It is the primary mechanism for mutations in the App Router — replacing the need for separate API routes for internal data changes.

---

## K — Key Concepts

### What a Server Action Is Under the Hood

```
When you call a Server Action from a Client Component:
  1. Next.js generates a unique action ID at build time
  2. The client sends a POST request to the Next.js action endpoint
     POST /{page-path}  with header: Next-Action: {actionId}
  3. The server looks up the action by ID, executes it server-side
  4. The result (return value) is sent back to the client as RSC payload
  5. Next.js re-renders the Server Component tree with updated data

This means:
  ✅ The action function body NEVER ships to the browser
  ✅ DB credentials, secrets, and server-only logic stay on the server
  ✅ Automatic CSRF protection (Next-Action header + same-origin)
  ✅ Works with progressive enhancement (HTML form action)
```

### Two Ways to Declare Server Actions

```tsx
// ─── Option A: File-level directive (recommended for shared actions)
// src/app/products/actions.ts
"use server"; // ← entire file = server actions

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const name = formData.get("name") as string;
  const price = Number(formData.get("price"));
  await db.product.create({ data: { name, price } });
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath("/products");
}
```

```tsx
// ─── Option B: Inline directive (co-located in Server Component)
// src/app/products/new/page.tsx

export default function NewProductPage() {
  async function createProduct(formData: FormData) {
    "use server"; // ← function-level directive
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    await db.product.create({ data: { name, price } });
    revalidatePath("/products");
    redirect("/products");
  }

  return (
    <form action={createProduct}>
      {" "}
      // ← Server Action as HTML form action
      <input name="name" type="text" required />
      <input name="price" type="number" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

### Server Action Signature Rules

```tsx
// Server Actions have specific function signature requirements

// ─── Used as <form action> → receives FormData
async function formAction(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
}

// ─── Used with useActionState → receives (prevState, formData)
async function statefulAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";
  // prevState: previous return value (or initialState on first call)
  return { success: true, message: "Done" };
}

// ─── Called directly from Client Component → any signature
async function deleteItem(id: string) {
  "use server";
  await db.item.delete({ where: { id } });
  revalidatePath("/items");
}

// ─── Can accept non-FormData when called programmatically
async function updateSettings(settings: { theme: string; lang: string }) {
  "use server";
  // Note: settings must be serializable (plain object, string, number)
  await db.settings.update({ data: settings });
}
```

### Closure Binding — Capturing Server-Side Variables

```tsx
// Server Actions can close over server-side values
// These values are encrypted in the action payload sent to the client

// src/app/products/[id]/page.tsx  — Server Component
export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  // id is captured in the closure — encrypted, sent securely
  async function deleteThisProduct() {
    "use server";
    await db.product.delete({ where: { id } }); // ← id from closure
    revalidatePath("/products");
    redirect("/products");
  }

  return (
    <form action={deleteThisProduct}>
      <p>Delete: {product?.name}</p>
      <button type="submit">Delete</button>
    </form>
  );
}

// Security note: closed-over values are serialized and encrypted
// by Next.js — they CANNOT be tampered with by the client
```

### Server Actions vs API Routes — When to Use Each

```
Server Actions:
  ✅ Internal mutations (create, update, delete) called from YOUR UI
  ✅ Form submissions within your Next.js app
  ✅ Type-safe end-to-end (import + call directly)
  ✅ Progressive enhancement (works without JavaScript)
  ✅ Automatic CSRF protection
  ✅ Integrated with Next.js cache (revalidatePath, revalidateTag)
  ❌ External services can't call them (no stable public URL)
  ❌ Can't set custom HTTP status codes or response headers
  ❌ Not suitable for webhooks from third parties

API Routes (route.ts):
  ✅ Public endpoints for external consumers
  ✅ Webhooks (Stripe, GitHub, CMS publishing events)
  ✅ Custom HTTP status codes and response headers
  ✅ RESTful API for mobile apps or third-party clients
  ✅ SSE (Server-Sent Events), streaming responses
  ❌ No type safety without additional tooling (tRPC solves this)
  ❌ More boilerplate (manual request parsing, manual responses)

Rule: your own UI mutates data → Server Action
      external service calls your app → API Route (route.ts)
```

---

## W — Why It Matters

- Server Actions eliminate an entire class of boilerplate — no more creating `/api/products` POST route, no more `fetch('/api/products', { method: 'POST', body: JSON.stringify(data) })` in every mutation, no more manual CSRF token management.
- The closure encryption model is a critical security feature — captured variables like user IDs and database IDs are encrypted in the action payload, preventing client-side tampering. You don't need to re-fetch or re-validate IDs that come from the server.
- Progressive enhancement is a real benefit for forms — a `<form action={serverAction}>` works even when JavaScript hasn't loaded or fails to load, because HTML forms can natively submit to a URL. This matters for accessibility, resilience, and cold page loads.

---

## I — Interview Q&A

### Q1: How does a Server Action work under the hood when called from a Client Component?

**A:** When a Client Component calls a Server Action, Next.js generates a unique action ID at build time for that function. At runtime, the client sends a POST request to the current page's URL with a `Next-Action` header containing the action ID. The Next.js server receives the request, looks up the action by ID, executes the function body on the server (with access to the Node.js runtime, databases, and secrets), and sends the return value back as an RSC (React Server Component) payload. The UI re-renders with the updated data. The action function body never ships to the browser — only the action ID is sent to the client.

### Q2: What is the difference between a Server Action and an API route?

**A:** A Server Action is an internal, type-safe, co-located server function — it's imported and called like a regular TypeScript function from your UI, has automatic CSRF protection, and integrates with Next.js cache invalidation. It's ideal for mutations triggered by your own UI. An API route (`route.ts`) creates a public HTTP endpoint with a stable URL that can be called by external services, webhooks, mobile apps, or third-party consumers. It gives you full control over HTTP status codes and response headers. Use Server Actions for your own app's mutations; use API routes for anything that needs to be callable from outside your Next.js app.

### Q3: How are closed-over values in Server Actions kept secure?

**A:** When a Server Action captures a variable from its closure (like a `userId` or `productId` from a Server Component), Next.js serializes and encrypts that value into the action payload using a server-side encryption key. The encrypted value is sent to the client as part of the action's metadata, but it cannot be read or modified by the client. When the action is invoked, Next.js decrypts the value server-side and provides it to the function. This means you can safely close over server-fetched IDs and trust them at mutation time — the client cannot substitute a different ID.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using a Server Action in a Client Component that's defined in a Server Component file

```tsx
// ❌ Trying to define 'use server' inside a 'use client' file
"use client";

async function serverAction() {
  "use server"; // ← SyntaxError: 'use server' not allowed in
  await db.product.create(); //   Client Component files
}
```

**Fix:** Define Server Actions in separate files (no `'use client'`) or in Server Components:

```tsx
// ✅ Separate file for actions
// src/app/products/actions.ts  ← no 'use client'
"use server";
export async function createProduct(data: ProductData) {
  await db.product.create({ data });
}

// ✅ Import in Client Component
("use client");
import { createProduct } from "./actions";
```

### ❌ Pitfall: Not awaiting the Server Action call in `useTransition`

```tsx
// ❌ Missing await — action runs but isPending never becomes true correctly
"use client";
const [isPending, startTransition] = useTransition();
function handleClick() {
  startTransition(() => {
    deleteProduct(id); // ← not awaited inside startTransition
  });
}
```

**Fix:** Always `await` the action inside `startTransition`:

```tsx
function handleClick() {
  startTransition(async () => {
    await deleteProduct(id); // ← awaited ✅
    router.refresh();
  });
}
```

### ❌ Pitfall: Forgetting to validate input in a Server Action

```tsx
// ❌ No validation — raw FormData used directly
export async function createProduct(formData: FormData) {
  "use server";
  const name = formData.get("name") as string; // could be empty string
  const price = Number(formData.get("price")); // could be NaN
  await db.product.create({ data: { name, price } }); // ← invalid data inserted
}
```

**Fix:** Always validate with Zod before any DB operation:

```tsx
import { z } from "zod";
const Schema = z.object({
  name: z.string().min(2, "Name too short"),
  price: z.coerce.number().positive("Price must be positive"),
});

export async function createProduct(formData: FormData) {
  "use server";
  const result = Schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
  await db.product.create({ data: result.data });
  revalidatePath("/products");
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete Server Actions setup for a notes app with:

1. `actions.ts` with `createNote`, `updateNote`, `deleteNote` — all with Zod validation
2. All three actions properly call `revalidatePath` / `revalidateTag`
3. `deleteNote` uses closure binding for the note ID
4. `createNote` returns typed `ActionResult` (success + errors)
5. A `NoteActions` Server Component using inline closure-binding for delete

### Solution

```tsx
// src/app/notes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

// Shared types
export interface ActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  noteId?: string;
}

// Validation schemas
const CreateNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content too long"),
  color: z.enum(["white", "yellow", "blue", "green", "pink"]).default("white"),
});

const UpdateNoteSchema = CreateNoteSchema.partial().extend({
  id: z.string().min(1, "Note ID required"),
});

// Simulated DB
let NOTES: {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
}[] = [
  {
    id: "n1",
    title: "Meeting Notes",
    content: "Discuss Q3 roadmap",
    color: "yellow",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Shopping List",
    content: "Milk, eggs, bread, butter",
    color: "blue",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Project Ideas",
    content: "Build a note-taking app",
    color: "green",
    updatedAt: new Date().toISOString(),
  },
];

// ─── createNote ───────────────────────────────────────────────────────────────
export async function createNote(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const result = CreateNoteSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed — fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  // Simulate DB create
  const newNote = {
    id: `n${Date.now()}`,
    ...result.data,
    updatedAt: new Date().toISOString(),
  };
  NOTES = [...NOTES, newNote];

  revalidateTag("notes"); // ← tag-based: clears notes list
  revalidatePath("/notes"); // ← path-based: clears /notes page

  return {
    success: true,
    message: `Note "${result.data.title}" created!`,
    noteId: newNote.id,
  };
}

// ─── updateNote ───────────────────────────────────────────────────────────────
export async function updateNote(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  const result = UpdateNoteSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      message: "Validation failed.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { id, ...data } = result.data;
  const noteIndex = NOTES.findIndex((n) => n.id === id);

  if (noteIndex === -1) {
    return { success: false, message: "Note not found." };
  }

  NOTES[noteIndex] = {
    ...NOTES[noteIndex],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  revalidateTag("notes");
  revalidateTag(`note-${id}`); // ← surgical: only this note's detail
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);

  return { success: true, message: "Note updated!", noteId: id };
}

// ─── deleteNote ───────────────────────────────────────────────────────────────
// This can be called directly (closure binding) or via formData
export async function deleteNote(id: string): Promise<ActionResult> {
  if (!id || typeof id !== "string") {
    return { success: false, message: "Invalid note ID." };
  }

  const exists = NOTES.some((n) => n.id === id);
  if (!exists) {
    return { success: false, message: "Note not found." };
  }

  NOTES = NOTES.filter((n) => n.id !== id);

  revalidateTag("notes");
  revalidatePath("/notes");
  // No revalidatePath for /notes/[id] — it will 404 naturally

  return { success: true, message: "Note deleted." };
}

// ─── getNotes (not an action — helper for Server Components) ──────────────────
export async function getNotes() {
  return NOTES;
}

export async function getNote(id: string) {
  return NOTES.find((n) => n.id === id) ?? null;
}
```

```tsx
// src/app/notes/[id]/_components/note-actions.tsx
// Server Component — uses closure binding for delete
import { deleteNote, getNote } from "@/app/notes/actions";

export async function NoteActions({ noteId }: { noteId: string }) {
  const note = await getNote(noteId);
  if (!note) return null;

  // Closure binding: noteId captured from props, encrypted by Next.js
  async function deleteThisNote() {
    "use server";
    await deleteNote(noteId); // ← noteId from closure (encrypted, tamper-proof)
    // redirect happens server-side after deletion
  }

  return (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t">
      <a
        href={`/notes/${noteId}/edit`}
        className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
      >
        Edit
      </a>

      {/* Progressive enhancement: works without JavaScript */}
      <form action={deleteThisNote}>
        <button
          type="submit"
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg
                     hover:bg-red-700"
          onClick={(e) => {
            if (!confirm(`Delete "${note.title}"?`)) e.preventDefault();
          }}
        >
          Delete Note
        </button>
      </form>
    </div>
  );
}
```

```tsx
// src/app/notes/page.tsx — Server Component listing notes
import { Suspense } from "react";
import { getNotes } from "./actions";
import { NoteCard } from "./_components/note-card";
import { CreateNoteForm } from "./_components/create-note-form";

export default async function NotesPage() {
  const notes = await getNotes();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">My Notes</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {notes.length === 0 ? (
            <p className="text-gray-400 text-sm">No notes yet. Create one!</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
        <div>
          <CreateNoteForm />
        </div>
      </div>
    </div>
  );
}
```

---

---

# 2 — App Router Forms — `useActionState`, Progressive Enhancement

---

## T — TL;DR

`useActionState` is the React hook that connects a form to a Server Action — it manages the form's state (loading, errors, success) across submissions. Combined with `<form action={serverAction}>`, it provides **progressive enhancement** — the form works without JavaScript and becomes interactive when JS loads.

---

## K — Key Concepts

### `useActionState` — The Form State Hook

```tsx
// useActionState(action, initialState, permalink?)
// Returns: [state, formAction, isPending]

"use client";
import { useActionState } from "react";
import { createProduct } from "../actions";

interface FormState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

const INITIAL_STATE: FormState = {
  success: false,
  message: "",
  errors: {},
};

export function CreateProductForm() {
  const [state, formAction, isPending] = useActionState(
    createProduct, // ← Server Action (must accept (prevState, formData))
    INITIAL_STATE // ← initial state before first submission
  );

  return (
    <form action={formAction}>
      {/* formAction is the bound action — replaces native form submit */}

      <input
        name="name"
        disabled={isPending} // ← disable during submission
        className="border rounded px-3 py-2"
      />
      {state.errors?.name && (
        <p className="text-red-500 text-sm">{state.errors.name[0]}</p>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>

      {state.message && (
        <p className={state.success ? "text-green-600" : "text-red-500"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

### Progressive Enhancement — Works Without JavaScript

```tsx
// Progressive Enhancement means the form works in two modes:
//
// Mode 1: NO JavaScript (or JS not yet loaded)
//   → <form action={serverAction}> submits as a standard HTML form POST
//   → Server receives FormData, executes the Server Action
//   → Server responds with full page HTML (not RSC payload)
//   → User gets a full page reload with updated content
//   → Works in old browsers, slow networks, JS disabled
//
// Mode 2: WITH JavaScript
//   → React intercepts the form submit
//   → Sends as fetch POST with Next-Action header
//   → Receives RSC payload → partial re-render (no full page reload)
//   → isPending state provides loading UI
//   → Client-side error display without page reload

// The same <form action={serverAction}> code handles BOTH modes automatically
// No extra code required — this is the default behavior
```

### `useFormStatus` — Status Within a Form

```tsx
// useFormStatus() gives status of the NEAREST <form> ancestor
// Use inside child components of the form — not in the form component itself

"use client";
import { useFormStatus } from "react-dom";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus(); // ← reads from parent <form>

  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium
                  transition-all ${pending ? "opacity-60 cursor-wait" : "hover:bg-blue-700"}`}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <span
            className="w-4 h-4 border-2 border-white/30 border-t-white
                           rounded-full animate-spin"
          />
          {children}...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// Usage — SubmitButton must be a CHILD of the <form>
export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, INITIAL_STATE);

  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <input name="message" />
      <SubmitButton>Send Message</SubmitButton>
      {/* ↑ useFormStatus() reads pending state from the parent form */}
    </form>
  );
}
```

### Resetting Forms After Successful Submission

```tsx
"use client";
import { useActionState, useEffect, useRef } from "react";
import { createNote } from "../actions";

interface State {
  success: boolean;
  message: string;
}

export function CreateNoteForm() {
  const [state, formAction, isPending] = useActionState(createNote, {
    success: false,
    message: "",
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on success
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset(); // ← programmatically reset the form ✅
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <h2 className="font-semibold">New Note</h2>

      <input
        name="title"
        placeholder="Title"
        required
        disabled={isPending}
        className="w-full border rounded-lg px-3 py-2 text-sm"
      />
      <textarea
        name="content"
        placeholder="Content..."
        rows={4}
        required
        disabled={isPending}
        className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-blue-600 text-white text-sm
                         font-medium rounded-lg disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Note"}
      </button>

      {state.message && (
        <p
          className={`text-xs font-medium ${
            state.success ? "text-green-600" : "text-red-500"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
```

### Passing Additional Data to Server Actions

```tsx
// How to pass extra data (like a resource ID) alongside FormData

// ─── Method 1: Hidden input field
<form action={formAction}>
  <input type="hidden" name="productId" value={product.id} />
  <input name="name" />
  <button type="submit">Update</button>
</form>

// In the Server Action:
export async function updateProduct(_prev: State, formData: FormData) {
  'use server'
  const productId = formData.get('productId') as string   // ← from hidden input
  const name      = formData.get('name')      as string
  await db.product.update({ where: { id: productId }, data: { name } })
}

// ─── Method 2: bind() — create a pre-filled action
import { updateProduct } from './actions'

const updateProductWithId = updateProduct.bind(null, product.id)
// Now updateProductWithId is a Server Action where the first arg is product.id

<form action={updateProductWithId}>
  <input name="name" />
  <button type="submit">Update</button>
</form>

// Server Action signature with bind:
export async function updateProduct(
  productId: string,      // ← bound argument (comes first)
  _prev:     State,       // ← useActionState prev state
  formData:  FormData     // ← form data
) {
  'use server'
  await db.product.update({ where: { id: productId }, data: { name: formData.get('name') } })
}
```

---

## W — Why It Matters

- `useActionState` is the complete replacement for the `isLoading + error + success` useState pattern for forms — the action return value IS the state. A form that previously needed 5+ `useState` declarations now needs one `useActionState` call.
- Progressive enhancement means your forms work correctly from the first HTML load — before JavaScript hydrates, before the user's slow network downloads React, before any JS error occurs. This is a meaningful resilience and accessibility improvement.
- `useFormStatus` enables reusable, form-aware button components — a single `<SubmitButton>` component that shows a spinner during any form submission, without needing to pass `isLoading` props down.

---

## I — Interview Q&A

### Q1: What is `useActionState` and how does it differ from managing form state with `useState`?

**A:** `useActionState` connects a form to a Server Action and manages the form's state across submissions. It returns `[state, formAction, isPending]` — `state` is the value returned by the Server Action (errors, success message, updated data), `formAction` is used as the `<form action>` prop, and `isPending` is true while the action is executing. Compared to `useState`: with `useState` you'd need separate state variables for loading, errors, and success, plus a submit handler that calls `fetch`, parses the response, and updates each state variable. `useActionState` collapses all of that — the Server Action returns the state directly, and React manages the loading state automatically.

### Q2: What is progressive enhancement in the context of Server Actions and forms?

**A:** Progressive enhancement means a form works at the HTML level before JavaScript enhances it. With `<form action={serverAction}>`, when JavaScript hasn't loaded yet (first page load, slow network, JS error), the browser submits the form as a native HTML POST and receives a full page HTML response — the Server Action runs and the page reloads with updated data. When JavaScript is loaded, React intercepts the submit, sends a POST with the `Next-Action` header, receives an RSC payload, and does a partial re-render without a full page reload. The same `<form action={serverAction}>` code provides both behaviors — no extra code needed.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `useActionState` with an action that doesn't accept `(prevState, formData)`

```tsx
// ❌ Action signature doesn't match useActionState requirements
export async function createProduct(formData: FormData) {
  // ← missing prevState
  "use server";
  // ...
}

// useActionState expects: (prevState, formData) → state
const [state, action] = useActionState(createProduct, INITIAL_STATE);
// TypeScript error + runtime behavior undefined
```

**Fix:** Server Actions used with `useActionState` MUST accept `(prevState, formData)`:

```tsx
export async function createProduct(
  _prevState: FormState, // ← required first arg ✅
  formData: FormData
): Promise<FormState> {
  "use server";
  // ...
  return { success: true, message: "Created!" };
}
```

### ❌ Pitfall: Calling `useFormStatus` in the same component as the `<form>`

```tsx
// ❌ useFormStatus must be called in a CHILD of <form>, not in the same component
"use client";
export function ProductForm() {
  const { pending } = useFormStatus(); // ← wrong: no parent <form> here yet

  return (
    <form action={formAction}>
      <button disabled={pending}>Submit</button>
    </form>
  );
}
```

**Fix:** Extract the button into a child component:

```tsx
// ✅ SubmitButton is a child of <form>
function SubmitButton() {
  const { pending } = useFormStatus(); // ← correct: <form> is the parent ✅
  return (
    <button type="submit" disabled={pending}>
      Submit
    </button>
  );
}

export function ProductForm() {
  return (
    <form action={formAction}>
      <SubmitButton /> {/* ← SubmitButton is inside the form */}
    </form>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete contact form with:

1. Server Action `submitContactForm` with Zod validation returning `FormState`
2. `ContactForm` Client Component using `useActionState`
3. Reusable `SubmitButton` using `useFormStatus`
4. Field-level error display for name, email, and message
5. Form auto-resets after successful submission
6. Progressive enhancement: works without JavaScript

### Solution

```tsx
// src/app/contact/actions.ts
"use server";

import { z } from "zod";

export interface FormState {
  success: boolean;
  message: string;
  errors?: { name?: string[]; email?: string[]; message?: string[] };
}

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000),
});

export async function submitContactForm(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = Schema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  // Simulate sending email
  await new Promise((r) => setTimeout(r, 600));
  console.log("Contact form submitted:", result.data);

  return {
    success: true,
    message: `Thanks ${result.data.name}! We'll reply to ${result.data.email} soon.`,
  };
}
```

```tsx
// src/app/contact/_components/submit-button.tsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus(); // ← reads from parent <form>

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-3 font-semibold rounded-xl text-sm transition-all
                  ${
                    pending
                      ? "bg-blue-400 text-white cursor-wait"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span
            className="w-4 h-4 border-2 border-white/40 border-t-white
                           rounded-full animate-spin"
          />
          Sending...
        </span>
      ) : (
        "Send Message"
      )}
    </button>
  );
}
```

```tsx
// src/app/contact/_components/contact-form.tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactForm, type FormState } from "../actions";
import { SubmitButton } from "./submit-button";

const INITIAL: FormState = { success: false, message: "", errors: {} };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-red-500 text-xs mt-1">{errors[0]}</p>;
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactForm, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-reset after successful submission
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction} // ← progressive enhancement: works without JS
      className="bg-white border rounded-2xl p-6 space-y-4 max-w-md"
    >
      <h2 className="text-lg font-semibold text-gray-900">Contact Us</h2>
      {/* Name field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          name="name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${state.errors?.name ? "border-red-400" : "border-gray-200"}`}
        />
        <FieldError errors={state.errors?.name} />
      </div>
      {/* Email field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${state.errors?.email ? "border-red-400" : "border-gray-200"}`}
        />
        <FieldError errors={state.errors?.email} />
      </div>
      {/* Message field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          name="message"
          rows={4}
          placeholder="How can we help?"
          className={`w-full border rounded-lg px-3 py-2 text-sm resize-none
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${state.errors?.message ? "border-red-400" : "border-gray-200"}`}
        />
        <FieldError errors={state.errors?.message} />
      </div>
      {/* Status message */}
      {state.message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            state.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {state.message}
        </div>
      )}
      <SubmitButton /> {/* ← useFormStatus() reads pending from this form */}
    </form>
  );
}
```

```tsx
// src/app/contact/page.tsx — Server Component
import { ContactForm } from "./_components/contact-form";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ContactForm />
    </div>
  );
}
```

---

---

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

# 4 — Route Handlers — `route.ts`, GET and POST Handlers

---

## T — TL;DR

A **Route Handler** (`route.ts`) creates an HTTP API endpoint inside the App Router. It handles any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) and returns a `Response` or `NextResponse`. Use it for webhooks, public APIs, and any endpoint called by external services.

---

## K — Key Concepts

### Basic Route Handler Structure

```
File system routing for Route Handlers:
  src/app/api/products/route.ts           → /api/products
  src/app/api/products/[id]/route.ts      → /api/products/:id
  src/app/api/webhooks/stripe/route.ts    → /api/webhooks/stripe
  src/app/(dashboard)/api/stats/route.ts  → /api/stats (route group)

Rules:
  → File MUST be named route.ts (or route.js)
  → Cannot coexist with page.tsx at the same path level
  → Exports: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  → Each export is one HTTP method handler
```

### GET Handler — Read Data

```tsx
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/products
// ─── GET /api/products?category=shoes&limit=10
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Parse query params
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const [products, total] = await Promise.all([
      db.product.findMany({
        where: category ? { category } : undefined,
        take: Math.min(limit, 100), // cap at 100
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      db.product.count({
        where: category ? { category } : undefined,
      }),
    ]);

    return NextResponse.json(
      {
        data: products,
        meta: { total, limit, offset, hasMore: offset + limit < total },
      },
      {
        status: 200,
        headers: {
          // Cache at CDN for 60s, stale-while-revalidate for 5 min
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### POST Handler — Create Data

```tsx
// src/app/api/products/route.ts (continued)
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string().min(1),
  stock: z.number().int().nonnegative().default(0),
});

// ─── POST /api/products
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const result = CreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    // 2. Authenticate (verify bearer token or session)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 3. Write to DB
    const product = await db.product.create({
      data: { ...result.data, createdBy: userId },
    });

    // 4. Return 201 Created with the new resource
    return NextResponse.json(
      { data: product },
      {
        status: 201,
        headers: {
          Location: `/api/products/${product.id}`, // Location header for REST
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Handler — Single Resource

```tsx
// src/app/api/products/[id]/route.ts

type Params = { params: Promise<{ id: string }> };

// GET /api/products/:id
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product });
}

// PUT /api/products/:id — full update
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const result = UpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 }
    );
  }

  const product = await db.product.update({
    where: { id },
    data: result.data,
  });

  return NextResponse.json({ data: product });
}

// PATCH /api/products/:id — partial update
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const partial = UpdateSchema.partial().safeParse(body);

  if (!partial.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const product = await db.product.update({
    where: { id },
    data: partial.data,
  });

  return NextResponse.json({ data: product });
}

// DELETE /api/products/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  await db.product.delete({ where: { id } });

  return new Response(null, { status: 204 }); // 204 No Content
}
```

### HTTP Status Code Reference for Route Handlers

```tsx
// Common status codes for REST API Route Handlers:

// ─── Success
return NextResponse.json({ data }, { status: 200 }); // OK (GET, PUT, PATCH)
return NextResponse.json({ data }, { status: 201 }); // Created (POST)
return new Response(null, { status: 204 }); // No Content (DELETE)

// ─── Client errors
return NextResponse.json({ error }, { status: 400 }); // Bad Request (malformed)
return NextResponse.json({ error }, { status: 401 }); // Unauthorized (no auth)
return NextResponse.json({ error }, { status: 403 }); // Forbidden (no permission)
return NextResponse.json({ error }, { status: 404 }); // Not Found
return NextResponse.json({ error }, { status: 405 }); // Method Not Allowed
return NextResponse.json({ error }, { status: 409 }); // Conflict (duplicate)
return NextResponse.json({ error }, { status: 422 }); // Unprocessable (validation)
return NextResponse.json({ error }, { status: 429 }); // Too Many Requests (rate limit)

// ─── Server errors
return NextResponse.json({ error }, { status: 500 }); // Internal Server Error
return NextResponse.json({ error }, { status: 503 }); // Service Unavailable
```

---

## W — Why It Matters

- Route Handlers are the correct tool for any endpoint that needs to be callable from outside your Next.js app — Stripe webhooks, GitHub actions, mobile apps, third-party integrations. Server Actions cannot serve this role.
- The `params: Promise<{ id: string }>` pattern in Next.js 16 (params is now a Promise) is a breaking change from Next.js 14 — forgetting to `await params` is the most common migration error from older versions.
- Proper HTTP status codes (`201 Created`, `204 No Content`, `422 Unprocessable Entity`) are what make a REST API correct and usable by API consumers — returning `200` for everything breaks client error handling.

---

## I — Interview Q&A

### Q1: What is a Route Handler in Next.js and when should you use one instead of a Server Action?

**A:** A Route Handler is a file named `route.ts` in the App Router that exports named functions for HTTP methods (GET, POST, PUT, etc.), creating a public HTTP endpoint. Use Route Handlers for webhooks from external services (Stripe, GitHub), REST APIs consumed by mobile apps or third-party clients, endpoints requiring custom HTTP headers or status codes, and Server-Sent Events. Use Server Actions for mutations triggered by your own Next.js UI — they're type-safe, require no URL, have automatic CSRF protection, and integrate with Next.js cache. The rule: internal UI mutations → Server Actions, external HTTP consumers → Route Handlers.

### Q2: How do you access route parameters in a Route Handler in Next.js 16?

**A:** In Next.js 16, `params` is a Promise that must be awaited. The handler signature is `async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })`. You access the params with `const { id } = await params`. This is a change from Next.js 14 where `params` was a plain object — forgetting to await it is the most common migration error.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not returning a Response from a Route Handler

```tsx
// ❌ Missing return — Next.js will throw an error
export async function GET(request: NextRequest) {
  const data = await db.products.findMany();
  // ← no return statement! Next.js requires a Response
}
```

**Fix:** Always return a `Response` or `NextResponse`:

```tsx
export async function GET(request: NextRequest) {
  const data = await db.product.findMany();
  return NextResponse.json({ data }); // ← always return ✅
}
```

### ❌ Pitfall: Not awaiting `params` in Next.js 16

```tsx
// ❌ params is a Promise in Next.js 16 — not awaited
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // ← wrong type
) {
  const id = params.id; // ← params might be a pending Promise ❌
}
```

**Fix:**

```tsx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← correct type ✅
) {
  const { id } = await params; // ← awaited ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `/api/notes` REST API with:

1. `GET /api/notes` — list all notes (with optional `?color=` filter)
2. `POST /api/notes` — create a note (Zod validation, returns 201)
3. `GET /api/notes/[id]` — get one note (404 if not found)
4. `PATCH /api/notes/[id]` — partial update
5. `DELETE /api/notes/[id]` — delete, returns 204
6. Consistent error format: `{ error: string, details?: any }`

### Solution

```tsx
// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

let NOTES: Note[] = [
  {
    id: "n1",
    title: "Standup Notes",
    content: "Ship feature X",
    color: "yellow",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Ideas",
    content: "Build a note app",
    color: "blue",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Grocery List",
    content: "Milk, bread, butter",
    color: "green",
    createdAt: new Date().toISOString(),
  },
];

const CreateNoteSchema = z.object({
  title: z.string().min(1, "Title required").max(200),
  content: z.string().min(1, "Content required").max(5000),
  color: z.enum(["white", "yellow", "blue", "green", "pink"]).default("white"),
});

// ─── GET /api/notes ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const color = request.nextUrl.searchParams.get("color");

  const notes = color ? NOTES.filter((n) => n.color === color) : NOTES;

  return NextResponse.json(
    { data: notes, total: notes.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// ─── POST /api/notes ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateNoteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const newNote: Note = {
    id: `n${Date.now()}`,
    ...result.data,
    createdAt: new Date().toISOString(),
  };
  NOTES = [...NOTES, newNote];

  return NextResponse.json(
    { data: newNote },
    {
      status: 201,
      headers: { Location: `/api/notes/${newNote.id}` },
    }
  );
}
```

```tsx
// src/app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Import the shared NOTES array (in production: use your DB module)
// For this demo, re-declaring for isolation
let NOTES = [
  {
    id: "n1",
    title: "Standup Notes",
    content: "Ship feature X",
    color: "yellow",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Ideas",
    content: "Build a note app",
    color: "blue",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Grocery List",
    content: "Milk, bread, butter",
    color: "green",
    createdAt: new Date().toISOString(),
  },
];

const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  color: z.enum(["white", "yellow", "blue", "green", "pink"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/notes/:id ────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const note = NOTES.find((n) => n.id === id);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ data: note });
}

// ─── PATCH /api/notes/:id — partial update ─────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const noteIndex = NOTES.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateNoteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  NOTES[noteIndex] = { ...NOTES[noteIndex], ...result.data };

  return NextResponse.json({ data: NOTES[noteIndex] });
}

// ─── DELETE /api/notes/:id ─────────────────────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const exists = NOTES.some((n) => n.id === id);
  if (!exists) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  NOTES = NOTES.filter((n) => n.id !== id);

  return new Response(null, { status: 204 }); // 204 No Content
}
```

---

---

# 5 — `NextRequest` and `NextResponse` — The Request/Response API

---

## T — TL;DR

`NextRequest` extends the Web `Request` API with Next.js-specific properties (`nextUrl`, `cookies`, `geo`, `ip`). `NextResponse` extends the Web `Response` API with helpers for JSON, redirects, rewrites, and cookie management. They are the primary tools for building Route Handlers and Middleware.

---

## K — Key Concepts

### `NextRequest` — Reading the Incoming Request

```tsx
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // ─── URL and search params
  const url = request.nextUrl; // enhanced URL object
  const pathname = url.pathname; // '/api/products'
  const searchParams = url.searchParams; // URLSearchParams
  const category = searchParams.get("category"); // 'shoes'
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  // ─── Request method
  const method = request.method; // 'GET', 'POST', etc.

  // ─── Headers
  const contentType = request.headers.get("content-type");
  const authHeader = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent");
  const acceptLang = request.headers.get("accept-language");
  const xForwardedFor = request.headers.get("x-forwarded-for"); // real IP behind proxy

  // ─── Cookies (read-only on NextRequest)
  const sessionCookie = request.cookies.get("session"); // { name, value }
  const allCookies = request.cookies.getAll(); // all cookies
  const hasSession = request.cookies.has("session"); // boolean

  // ─── Body (for POST/PUT/PATCH)
  const jsonBody = await request.json(); // parse JSON body
  const textBody = await request.text(); // raw text body
  const formData = await request.formData(); // multipart form data
  const arrayBuffer = await request.arrayBuffer(); // binary data

  // ─── IP and Geo (Vercel-specific)
  const ip = request.ip; // client IP
  const country = request.geo?.country; // 'US'
  const city = request.geo?.city; // 'San Francisco'
  const region = request.geo?.region; // 'CA'

  return NextResponse.json({ status: "ok" });
}
```

### `NextResponse` — Building the Response

```tsx
import { NextResponse } from "next/server";

// ─── JSON response (most common)
return NextResponse.json({ data: products }, { status: 200 });
return NextResponse.json({ error: "Not found" }, { status: 404 });

// ─── Plain text response
return new NextResponse("Hello world", {
  status: 200,
  headers: { "Content-Type": "text/plain" },
});

// ─── Redirect
return NextResponse.redirect(new URL("/login", request.url));
return NextResponse.redirect(new URL("/products", request.url), {
  status: 301,
});

// ─── Rewrite (serve different content without changing URL)
return NextResponse.rewrite(new URL("/api/v2/products", request.url));

// ─── 204 No Content (for DELETE)
return new Response(null, { status: 204 });

// ─── Streaming response
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue("Hello ");
    controller.enqueue("World");
    controller.close();
  },
});
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" },
});
```

### Setting Headers on `NextResponse`

```tsx
export async function GET(request: NextRequest) {
  const data = await db.products.findMany();

  // ─── Option 1: headers in constructor
  return NextResponse.json(
    { data },
    {
      status: 200,
      headers: {
        "X-Total-Count": String(data.length),
        "X-Request-Id": crypto.randomUUID(),
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*", // CORS header
      },
    }
  );

  // ─── Option 2: set headers on the response object
  const response = NextResponse.json({ data });
  response.headers.set("X-Custom-Header", "my-value");
  response.headers.append("Vary", "Accept-Encoding");
  return response;
}
```

### CORS Handling in Route Handlers

```tsx
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://app.example.com",
  "https://admin.example.com",
  process.env.NODE_ENV === "development" ? "http://localhost:3000" : "",
].filter(Boolean);

function corsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    { headers: corsHeaders(request.headers.get("origin")) }
  );
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const data = await db.product.findMany();

  return NextResponse.json({ data }, { headers: corsHeaders(origin) });
}
```

### Cloning `NextResponse` for Header Modification

```tsx
// When you need to modify response headers from a component returned value
// (common in Middleware)
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next(); // pass through to the page

  // Add security headers to every response
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  return response;
}
```

---

## W — Why It Matters

- `request.nextUrl` vs `request.url` is a common confusion — `request.url` is the raw URL string, `request.nextUrl` is a `URL` object with `.pathname`, `.searchParams`, and `.host` pre-parsed. Always use `request.nextUrl` for URL manipulation.
- `request.cookies.get()` returns `{ name, value }` or `undefined` — not just the value string. Forgetting to access `.value` is a frequent bug.
- The CORS preflight (`OPTIONS`) handler is required for cross-origin API calls from browsers — forgetting it blocks API access from frontend apps on different domains.

---

## I — Interview Q&A

### Q1: What is the difference between `NextRequest` and the standard Web `Request`?

**A:** `NextRequest` extends the standard Web `Request` API with Next.js-specific additions: `nextUrl` (a `NextURL` object with `.pathname`, `.searchParams`, `.host` pre-parsed and editable for rewrites/redirects), `cookies` (a `RequestCookies` object with `.get()`, `.getAll()`, `.has()` methods), and `geo`/`ip` properties (on Vercel deployments) for client geolocation and IP. The standard `Request` has only `url` as a string and no cookie helpers. In Route Handlers and Middleware, always use `NextRequest` for these enhanced capabilities.

### Q2: How do you handle CORS in Next.js Route Handlers?

**A:** Handle CORS by setting `Access-Control-Allow-Origin` and related headers on every response, and handling the `OPTIONS` preflight request. Export an `OPTIONS` handler from `route.ts` that returns an empty response with CORS headers. For each actual handler (GET, POST, etc.), add the same CORS headers to the response. In production, never use `*` for allowed origins if credentials are involved — instead validate the request's `Origin` header against a whitelist of allowed domains and reflect the matching origin back.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Reading the body twice (body is a stream — can only be read once)

```tsx
// ❌ Reading body twice — second read returns empty
export async function POST(request: NextRequest) {
  const text = await request.text(); // ← consumes the stream
  const json = await request.json(); // ← Error: body already consumed
}
```

**Fix:** Read the body once and transform as needed:

```tsx
export async function POST(request: NextRequest) {
  const text = await request.text(); // ← read once ✅
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // use body...
}
```

### ❌ Pitfall: Using `request.cookies.get('name')` and expecting a string

```tsx
// ❌ .get() returns { name, value } not a string
const session = request.cookies.get('session')
if (session === 'valid-session-id') { ... }  // ← always false — comparing to object
```

**Fix:**

```tsx
const session = request.cookies.get('session')?.value   // ← access .value ✅
if (session === 'valid-session-id') { ... }
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `GET /api/search` Route Handler that:

1. Reads `?q=`, `?page=`, and `?limit=` from `request.nextUrl.searchParams`
2. Validates params and returns 400 if `q` is missing
3. Reads `Accept-Language` header to determine locale
4. Returns paginated results with proper headers including `X-Total-Count` and `Cache-Control`
5. Handles CORS for `https://app.example.com`

### Solution

```tsx
// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  q: z.string().min(1, "Search query required"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  locale: z.string().default("en"),
});

// Mock search results
const ITEMS = [
  { id: 1, title: "Next.js 16 Guide", category: "docs", locale: "en" },
  { id: 2, title: "React 19 Features", category: "blog", locale: "en" },
  { id: 3, title: "TypeScript 6 What New", category: "blog", locale: "en" },
  { id: 4, title: "Server Components", category: "docs", locale: "en" },
  { id: 5, title: "Route Handlers Guide", category: "docs", locale: "en" },
  { id: 6, title: "Next.js Guide DE", category: "docs", locale: "de" },
  { id: 7, title: "Server Actions DE", category: "blog", locale: "de" },
];

const ALLOWED_ORIGINS = ["https://app.example.com", "http://localhost:3000"];

function getCorsHeaders(origin: string | null) {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    { headers: getCorsHeaders(request.headers.get("origin")) }
  );
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");

  // ─── Parse and validate query parameters
  const rawParams = {
    q: request.nextUrl.searchParams.get("q"),
    page: request.nextUrl.searchParams.get("page"),
    limit: request.nextUrl.searchParams.get("limit"),
    locale:
      request.headers.get("accept-language")?.split(",")[0].split("-")[0] ??
      "en",
  };

  const parsed = QuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: parsed.error.flatten().fieldErrors,
      },
      {
        status: 400,
        headers: getCorsHeaders(origin),
      }
    );
  }

  const { q, page, limit, locale } = parsed.data;

  // ─── Search (case-insensitive, locale-aware)
  const query = q.toLowerCase();
  const matched = ITEMS.filter(
    (item) =>
      item.locale === locale &&
      (item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query))
  );

  // ─── Paginate
  const total = matched.length;
  const offset = (page - 1) * limit;
  const results = matched.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  // ─── Build response with metadata headers
  return NextResponse.json(
    {
      data: results,
      meta: {
        query: q,
        page,
        limit,
        total,
        hasMore,
        locale,
        pages: Math.ceil(total / limit),
      },
    },
    {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "X-Total-Count": String(total),
        "X-Page": String(page),
        "X-Has-More": String(hasMore),
        // Short cache — search results can be stale for 30s
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        Vary: "Accept-Language", // ← Vary by locale for CDN
      },
    }
  );
}
```

---

---

# 6 — Cookies — Reading, Setting, Deleting

---

## T — TL;DR

Next.js 16 provides `cookies()` from `'next/headers'` for Server Components, Server Actions, and Route Handlers — read, set, and delete cookies server-side. On the client, `request.cookies` in Middleware and `document.cookie` (via `js-cookie`) handle client-accessible cookies.

---

## K — Key Concepts

### `cookies()` in Server Components and Server Actions

```tsx
// src/app/dashboard/page.tsx — Server Component
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies(); // ← must be awaited in Next.js 16

  // ─── Read a cookie
  const session = cookieStore.get("session"); // { name, value } | undefined
  const sessionId = cookieStore.get("session")?.value; // string | undefined
  const theme = cookieStore.get("theme")?.value ?? "light";

  // ─── Check if a cookie exists
  const hasSession = cookieStore.has("session"); // boolean

  // ─── Get all cookies
  const allCookies = cookieStore.getAll(); // { name, value }[]

  if (!sessionId) redirect("/login");

  return <Dashboard theme={theme} />;
}
```

```tsx
// src/app/auth/actions.ts — Server Action
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Verify credentials
  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Invalid credentials" };

  // Generate session token
  const sessionToken = await createSession(user.id);

  // ─── Set a cookie
  const cookieStore = await cookies();
  cookieStore.set("session", sessionToken, {
    httpOnly: true, // ← not accessible via JS
    secure: process.env.NODE_ENV === "production", // ← HTTPS only in prod
    sameSite: "lax", // ← CSRF protection
    maxAge: 60 * 60 * 24 * 7, // ← 7 days in seconds
    path: "/", // ← available on all routes
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();

  // ─── Delete a cookie
  cookieStore.delete("session");

  // ─── OR: set with expired date (equivalent)
  cookieStore.set("session", "", {
    maxAge: 0, // ← immediately expires
    expires: new Date(0),
  });

  redirect("/login");
}
```

### Cookie Options Reference

```tsx
cookieStore.set("name", "value", {
  // ─── Security options
  httpOnly: true, // JS cannot access (prevents XSS theft) — use for session cookies
  secure: true, // HTTPS only — always true in production
  sameSite: "strict", // 'strict' | 'lax' | 'none'
  // strict: only same-site requests
  // lax:    allows GET from cross-site navigation (default for most session cookies)
  // none:   cross-site (requires secure: true)

  // ─── Expiry
  maxAge: 86400, // seconds until expiry (takes precedence over expires)
  expires: new Date(Date.now() + 86400_000), // exact expiry Date

  // ─── Scope
  path: "/", // which paths can access (default: '/')
  domain: ".example.com", // share across subdomains

  // ─── Partitioned (Chrome CHIPS)
  partitioned: true, // for third-party cookie isolation
});

// Rule of thumb for session cookies:
// httpOnly: true, secure: true (prod), sameSite: 'lax', maxAge: 604800 (7d)
```

### Setting Cookies in Route Handlers

```tsx
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionToken = await createSession(user.id);

  // ─── Set cookie on the response
  const response = NextResponse.json({
    user: { id: user.id, name: user.name },
  });

  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

// ─── DELETE route for logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session"); // ← delete from response
  return response;
}
```

### Reading Cookies in Middleware

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Read cookies on the request (before they hit the page)
  const session = request.cookies.get("session")?.value;

  // Auth guard: redirect to login if no session
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Pass through — optionally set response cookies
  const response = NextResponse.next();
  response.cookies.set("last-visited", request.nextUrl.pathname, {
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
```

---

## W — Why It Matters

- `httpOnly: true` is non-negotiable for session cookies — it prevents JavaScript (including malicious injected scripts via XSS) from reading the cookie value. A session cookie without `httpOnly` is vulnerable to theft.
- `sameSite: 'lax'` protects against CSRF attacks — it prevents cross-site forms and AJAX requests from including the cookie, while still allowing normal navigation links. Use `'strict'` for extra protection; `'none'` only for explicitly cross-site cookies.
- The `cookies()` function from `'next/headers'` making a route dynamic is intentional — cookies are per-request data, so reading them means the response can't be cached. Always use `cookies()` only in routes that genuinely need per-user data.

---

## I — Interview Q&A

### Q1: What is the difference between `httpOnly`, `secure`, and `sameSite` cookie attributes?

**A:** `httpOnly` prevents the cookie from being accessed by JavaScript (`document.cookie`) — use it for session tokens to protect against XSS attacks. `secure` ensures the cookie is only sent over HTTPS — always set this in production to prevent session tokens from being transmitted over plain HTTP. `sameSite` controls when cookies are sent in cross-origin requests: `'strict'` sends only to same-site requests; `'lax'` (recommended for session cookies) allows the cookie in GET requests from cross-site navigation but blocks cross-site forms and POST requests; `'none'` allows cross-site use but requires `secure: true`.

### Q2: Why does using `cookies()` make a route dynamic in Next.js?

**A:** `cookies()` reads the incoming HTTP request's cookie header, which is different for every user and every request. Since the response depends on per-request data, the page cannot be pre-rendered at build time as a static HTML file — it must be generated fresh for each request based on the cookies present. Next.js detects the use of `cookies()` (and `headers()`) and automatically opts the route out of static rendering and into dynamic (per-request) server rendering.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Setting cookies in a Server Component (not allowed — read-only)

```tsx
// ❌ Server Components can only READ cookies — not write them
export default async function Page() {
  const cookieStore = await cookies();
  cookieStore.set("theme", "dark"); // ← Error: cookies().set is not allowed in RSC
}
```

**Fix:** Set cookies in Server Actions, Route Handlers, or Middleware:

```tsx
// ✅ Server Action — can both read and write cookies
export async function setTheme(theme: string) {
  "use server";
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, { maxAge: 60 * 60 * 24 * 365 });
}
```

### ❌ Pitfall: Missing `path: '/'` — cookie only accessible on the current path

```tsx
// ❌ If set on /login, cookie is only sent for requests to /login and below
cookieStore.set("session", token, { httpOnly: true, secure: true });
// → navigating to /dashboard → no session cookie sent → logged out
```

**Fix:** Always explicitly set `path: '/'` for global cookies:

```tsx
cookieStore.set("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/", // ← available for ALL routes ✅
});
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete auth flow with cookies:

1. `loginAction(formData)` — validates credentials, sets `session` cookie (httpOnly, secure, lax, 7d)
2. `logoutAction()` — deletes session cookie, redirects to login
3. `getSessionUser()` helper — reads session cookie, returns user or null
4. A `ProfilePage` Server Component that uses `getSessionUser()` and redirects if not logged in
5. A `LogoutButton` Client Component calling `logoutAction`

### Solution

```tsx
// src/lib/auth.ts
import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

// Simulated session store
const SESSIONS: Record<string, { userId: string; expiresAt: number }> = {};

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  SESSIONS[token] = { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  return token;
}

// Deduplicated across layout + page + components in same request
export const getSessionUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const session = SESSIONS[token];
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  // In production: db.user.findUnique({ where: { id: session.userId } })
  const USERS: Record<string, { id: string; name: string; email: string }> = {
    "user-1": { id: "user-1", name: "Mark Austin", email: "mark@example.com" },
  };
  return USERS[session.userId] ?? null;
});
```

```tsx
// src/app/auth/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";

// Mock users
const USERS = [
  {
    id: "user-1",
    email: "mark@example.com",
    password: "password123",
    name: "Mark Austin",
  },
];

export interface AuthState {
  error?: string;
  success: boolean;
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const user = USERS.find((u) => u.email === email && u.password === password);
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  const token = await createSession(user.id);
  const cookieStore = await cookies();

  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  redirect("/profile");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
```

```tsx
// src/app/profile/_components/logout-button.tsx
"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/auth/actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className="px-4 py-2 border border-red-200 text-red-600 text-sm
                 font-medium rounded-lg hover:bg-red-50 disabled:opacity-50
                 transition-colors"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
```

```tsx
// src/app/profile/page.tsx — Server Component with auth guard
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "./_components/logout-button";

export default async function ProfilePage() {
  const user = await getSessionUser();

  // Auth guard — redirect if not logged in
  if (!user) redirect("/login");

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full bg-blue-500 flex items-center
                          justify-center text-white text-2xl font-bold"
          >
            {user.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-2">
          <p>
            <span className="text-gray-500">User ID:</span>
            <span className="ml-2 font-mono">{user.id}</span>
          </p>
          <p>
            <span className="text-gray-500">Session:</span>
            <span className="ml-2 text-green-600 font-medium">Active</span>
          </p>
        </div>

        <LogoutButton />
      </div>
    </div>
  );
}
```

---

---

# 7 — Headers — Request Headers, Response Headers, Custom Headers

---

## T — TL;DR

`headers()` from `'next/headers'` reads incoming request headers in Server Components, Server Actions, and Route Handlers. Response headers are set via `NextResponse`, `next.config.ts`, or Middleware. Headers are used for auth tokens, content negotiation, security policies, and custom metadata.

---

## K — Key Concepts

### Reading Request Headers

```tsx
// Server Component / Server Action
import { headers } from "next/headers";

export default async function Page() {
  const headerStore = await headers(); // ← must await in Next.js 16

  // ─── Common request headers
  const userAgent = headerStore.get("user-agent");
  const acceptLang = headerStore.get("accept-language"); // 'en-US,en;q=0.9'
  const authHeader = headerStore.get("authorization"); // 'Bearer token...'
  const contentType = headerStore.get("content-type");
  const host = headerStore.get("host"); // 'example.com'
  const forwarded = headerStore.get("x-forwarded-for"); // real IP behind proxy

  // ─── Custom headers (set by Middleware)
  const requestId = headerStore.get("x-request-id");
  const userId = headerStore.get("x-user-id"); // set by Middleware after auth

  // ─── Check if header exists
  const hasAuth = headerStore.has("authorization");

  // ─── Get all headers as object
  const allHeaders = Object.fromEntries(headerStore.entries());

  return <div>User-Agent: {userAgent}</div>;
}
```

### Passing Data via Custom Headers from Middleware

```tsx
// src/middleware.ts — add user context to headers for downstream use
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const payload = token ? await verifyToken(token) : null;

  // Clone headers and add user context
  const requestHeaders = new Headers(request.headers);

  if (payload) {
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-org-id", payload.orgId);
  }

  // Add request ID for tracing
  requestHeaders.set("x-request-id", crypto.randomUUID());

  return NextResponse.next({
    request: { headers: requestHeaders }, // ← pass modified headers to page
  });
}

// Now Server Components can read x-user-id, x-user-role, x-request-id
// WITHOUT calling verifyToken again — Middleware already did it
```

```tsx
// src/lib/auth.ts — read user from Middleware-set headers
import { headers } from "next/headers";
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");
  const role = headerStore.get("x-user-role");

  if (!userId) return null;
  return { userId, role };
  // No DB call needed — Middleware already verified the session
});
```

### Setting Response Headers

```tsx
// ─── In Route Handlers
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { data: [] },
    {
      headers: {
        "X-Total-Count": "42",
        "X-Rate-Limit": "100",
        "X-Rate-Remaining": "98",
        "Cache-Control": "public, s-maxage=60",
      },
    }
  );
}

// ─── In next.config.ts (applied to ALL matching routes)
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: "/(.*)", // all routes
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=()" },
        ],
      },
      {
        source: "/api/(.*)", // API routes only
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://app.example.com",
          },
        ],
      },
    ];
  },
};
export default config;
```

### Content Negotiation with `Accept` Header

```tsx
// src/app/api/products/[id]/route.ts
// Respond with different formats based on Accept header

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accept = request.headers.get("accept") ?? "application/json";

  // Return XML if client accepts it
  if (accept.includes("application/xml")) {
    const xml = `<?xml version="1.0"?>
<product>
  <id>${product.id}</id>
  <name>${product.name}</name>
  <price>${product.price}</price>
</product>`;
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  }

  // Default: JSON
  return NextResponse.json({ data: product });
}
```

---

## W — Why It Matters

- The Middleware header injection pattern (`x-user-id`, `x-user-role`) is a major performance optimization — instead of verifying the session token in every Server Component and every Server Action, Middleware verifies it once per request and forwards the result via headers. All downstream code reads the pre-verified header with `headers().get('x-user-id')`.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`) configured in `next.config.ts` apply globally to all routes — this is the correct place for them, not in individual handlers.
- The `headers()` function from `'next/headers'` makes a route dynamic — the same reason as `cookies()`. Only use it when you genuinely need per-request header data.

---

## I — Interview Q&A

### Q1: How can you avoid re-verifying the auth token in every Server Component?

**A:** Use Middleware to verify the token once per request and forward the result via custom request headers. In Middleware, verify the session cookie or Authorization header, extract the user ID and role, and add them as `x-user-id` and `x-user-role` headers using `NextResponse.next({ request: { headers: requestHeaders } })`. All downstream Server Components, Server Actions, and Route Handlers can then read these pre-verified headers with `(await headers()).get('x-user-id')` — no repeated token verification or database session lookups. Combine with `React.cache()` to memoize the `getCurrentUser()` call across components in the same request.

### Q2: What is the correct place to set global security headers in Next.js?

**A:** In `next.config.ts` using the `headers()` async function. This applies the headers to all matching routes at the infrastructure level — before the request even reaches your route handlers or Server Components. Use this for `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and `Permissions-Policy`. For route-specific headers (like CORS headers on API routes), you can use more specific `source` patterns in the `headers()` config, or set them in individual Route Handlers.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Trusting `x-user-id` header from the client directly

```tsx
// ❌ Client can set any header — reading x-user-id without Middleware verification
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id"); // ← set by CLIENT, not Middleware
  const data = await db.order.findMany({ where: { userId } }); // ← privilege escalation!
}
```

**Fix:** Only trust headers set by your own Middleware (which runs server-side). Never trust headers that could be set by the client:

```tsx
// ✅ Read from Middleware-set headers (server-side only)
// In Server Component:
const userId = (await headers()).get("x-user-id"); // set by Middleware ✅

// ✅ OR: verify token directly in the Route Handler
const authHeader = request.headers.get("authorization");
const userId = await verifyToken(authHeader?.split(" ")[1]); // ← verify yourself ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build an auth middleware + user context pattern:

1. `middleware.ts` — reads `session` cookie, verifies it, injects `x-user-id` and `x-user-role` into request headers for routes matching `/dashboard/(.*)`
2. `getCurrentUser()` in `src/lib/auth.ts` using `React.cache()` + `headers()`
3. A `DashboardLayout` Server Component that uses `getCurrentUser()` and shows user info in nav
4. Show that `x-user-id` is verified server-side (safe) vs client-set header (unsafe)

### Solution

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Mock session verification
async function verifySession(token: string) {
  const SESSIONS: Record<string, { userId: string; role: string }> = {
    "valid-session-token": { userId: "user-1", role: "admin" },
    "user-session-token": { userId: "user-2", role: "member" },
  };
  return SESSIONS[token] ?? null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only apply auth middleware to dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("session")?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Inject verified user context into request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.userId); // ← server-verified ✅
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-request-id", crypto.randomUUID());

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

```tsx
// src/lib/auth.ts
import "server-only";
import { headers } from "next/headers";
import { cache } from "react";

export interface SessionUser {
  userId: string;
  role: "admin" | "member";
}

// cache() ensures this runs only ONCE per request,
// even if called in layout + page + multiple components
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");
  const role = headerStore.get("x-user-role") as "admin" | "member" | null;

  if (!userId || !role) return null;

  return { userId, role };
  // No DB call: Middleware already verified the session ✅
});
```

```tsx
// src/app/dashboard/layout.tsx — Server Component
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(); // ← reads Middleware-set headers

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar with verified user context */}
      <nav
        className="bg-white border-b px-6 h-14 flex items-center
                      justify-between"
      >
        <span className="font-bold text-gray-900">Dashboard</span>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user.role === "admin"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {user.role}
          </span>
          <span className="text-sm text-gray-600 font-mono text-xs">
            {user.userId}
          </span>
        </div>
      </nav>

      <main className="p-8">{children}</main>
    </div>
  );
}
```

---

---

# 8 — Redirects — Server-Side, Client-Side, Middleware

---

## T — TL;DR

Next.js 16 provides `redirect()` (Server Components/Actions), `permanentRedirect()` (301 SEO), `useRouter().push()` (Client), and `NextResponse.redirect()` (Middleware/Route Handlers). Each has a specific use case — choosing the right one prevents auth bypasses, broken back buttons, and SEO issues.

---

## K — Key Concepts

### `redirect()` — Server-Side Redirect

```tsx
// src/app/dashboard/page.tsx — Server Component
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // ─── Auth guard: redirect if not authenticated
  if (!user) {
    redirect("/login"); // ← throws a special error caught by Next.js
    // Code below NEVER executes after redirect()
  }

  // ─── Role guard: redirect if insufficient permissions
  if (user.role !== "admin") {
    redirect("/dashboard"); // ← redirect non-admins to general dashboard
  }

  return <AdminDashboard user={user} />;
}
```

```tsx
// In a Server Action
export async function createProduct(formData: FormData) {
  'use server'

  const product = await db.product.create({ data: ... })
  revalidatePath('/products')
  redirect(`/products/${product.id}`)   // ← redirect after successful mutation ✅
  // redirect() in Server Actions causes a full navigation
}
```

### `permanentRedirect()` — 301 SEO Redirect

```tsx
// Use for permanently moved URLs (tells search engines to update their index)
import { permanentRedirect } from "next/navigation";

export default async function OldProductPage({ params }) {
  const { oldId } = await params;

  // Products were migrated to new slug-based URLs
  const product = await db.product.findFirst({
    where: { legacyId: oldId },
  });

  if (product?.slug) {
    permanentRedirect(`/products/${product.slug}`); // ← 308 response
    // 308 (Permanent Redirect) — method-preserving version of 301
  }

  notFound();
}
```

### `useRouter()` — Client-Side Navigation

```tsx
"use client";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();

  async function handleLogin(formData: FormData) {
    const result = await loginAction(formData);

    if (result.success) {
      // ─── Programmatic navigation options:
      router.push("/dashboard"); // ← navigate forward, adds to browser history
      router.replace("/dashboard"); // ← navigate, REPLACES current history entry
      //   (user can't click Back to return to login)
      router.back(); // ← go back one entry
      router.forward(); // ← go forward one entry
      router.refresh(); // ← re-fetch current page data (clears Router Cache)
      router.prefetch("/dashboard"); // ← prefetch in background (no navigation)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin(new FormData(e.currentTarget));
      }}
    >
      <button type="submit">Login</button>
    </form>
  );
}

// Rule: use router.replace() for post-login/post-form navigation
// so the user cannot press Back to return to the login form
```

### `NextResponse.redirect()` — Middleware and Route Handler Redirects

```tsx
// src/middleware.ts — redirect before the page even renders
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ─── Auth guard
  const session = request.cookies.get("session")?.value;
  if (!session && pathname.startsWith("/dashboard")) {
    // Preserve the intended destination for post-login redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Locale redirect
  if (pathname === "/") {
    const acceptLang = request.headers.get("accept-language") ?? "en";
    const locale = acceptLang.split(",")[0].split("-")[0];
    if (locale === "de") {
      return NextResponse.redirect(new URL("/de", request.url));
    }
  }

  // ─── Permanent redirect (301) for old URLs
  if (pathname.startsWith("/old-products")) {
    const newPath = pathname.replace("/old-products", "/products");
    return NextResponse.redirect(new URL(newPath, request.url), {
      status: 301,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### Static Redirects in `next.config.ts`

```tsx
// next.config.ts — declarative redirects (evaluated at request time, no code)
import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      // ─── Permanent redirect (308)
      {
        source: "/blog/:slug", // old path pattern
        destination: "/posts/:slug", // new path pattern
        permanent: true, // 308 — tell search engines to update
      },

      // ─── Temporary redirect (307)
      {
        source: "/sale",
        destination: "/products?discount=true",
        permanent: false, // 307 — temporary promotion
      },

      // ─── Conditional redirect (with has matcher)
      {
        source: "/dashboard",
        has: [
          { type: "cookie", key: "session", missing: true },
          // only redirects if 'session' cookie is absent
        ],
        destination: "/login",
        permanent: false,
      },

      // ─── Wildcard redirect
      {
        source: "/docs/:path*", // :path* = any depth
        destination: "/documentation/:path*",
        permanent: true,
      },
    ];
  },
};

export default config;
```

### The Post-Login Callback URL Pattern

```tsx
// src/app/login/page.tsx — Server Component
type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} />;
}
```

```tsx
// src/app/auth/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string;

  const user = await verifyCredentials(email, password);
  if (!user) {
    return { success: false, error: "Invalid credentials." };
  }

  const token = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // Validate callbackUrl to prevent open redirect attacks
  const safeCallback = callbackUrl?.startsWith("/")
    ? callbackUrl // ← only allow same-origin paths
    : "/dashboard"; // ← default fallback

  redirect(safeCallback);
}
```

### Redirect Decision Tree

```
Where are you redirecting from?
│
├── Server Component / Server Action
│     → redirect('/path')              ← throws Next.js redirect error, caught by framework
│     → permanentRedirect('/path')     ← 308, for permanently moved URLs (SEO)
│
├── Client Component (event handler / useEffect)
│     → router.push('/path')           ← adds to history (normal navigation)
│     → router.replace('/path')        ← replaces history (post-auth, post-form)
│
├── Middleware (before page renders)
│     → NextResponse.redirect(url)     ← fastest: prevents page render entirely
│     → Ideal for: auth guards, locale redirects, A/B tests
│
├── Route Handler
│     → NextResponse.redirect(url)     ← 307 by default
│     → NextResponse.redirect(url, { status: 301 }) ← permanent
│
└── next.config.ts (declarative, static)
      → redirects() array              ← for known URL changes (no business logic)
      → permanent: true/false          ← 308/307
```

---

## W — Why It Matters

- Middleware redirects are the most performant auth guard — they execute at the CDN edge before any page code runs, preventing the page from rendering at all. Server Component redirects execute after the component starts rendering. For auth-protected routes, Middleware is the right layer.
- `router.replace()` vs `router.push()` after login matters for UX — with `push()`, the user can press Back to return to the login form (confusing). With `replace()`, the login page is replaced in history so Back takes them to where they were before.
- The open redirect vulnerability is a real risk — never redirect to a `callbackUrl` without validating it's a same-origin path. An attacker can craft `/login?callbackUrl=https://evil.com` and steal credentials if the callbackUrl is used without validation.

---

## I — Interview Q&A

### Q1: What is the difference between `redirect()` and `permanentRedirect()` in Next.js?

**A:** `redirect()` sends a 307 (Temporary Redirect) response — browsers and search engines treat this as temporary and continue to index the original URL. `permanentRedirect()` sends a 308 (Permanent Redirect) — search engines update their index to point to the new URL and pass the original page's SEO ranking to the new URL. Use `permanentRedirect()` when a URL has moved forever (e.g., `/blog/slug` → `/posts/slug` after a site restructure). Use `redirect()` for conditional navigation (auth guards, business logic routing) that may change in the future.

### Q2: Why should `NextResponse.redirect()` in Middleware be preferred over `redirect()` in Server Components for auth guards?

**A:** Middleware runs at the CDN edge before any page code executes — if the session is missing, the redirect happens immediately without the page component, Server Actions, or database queries running at all. A `redirect()` in a Server Component runs after the component has started executing — the page request has already reached the server, any layout code has run, and resources have been consumed before the redirect fires. For auth guards, Middleware is correct: it's faster, more efficient, and provides a single enforcement point for all protected routes via the `matcher` config.

### Q3: How do you prevent open redirect attacks when using callback URLs?

**A:** Always validate that the `callbackUrl` is a relative path on your own domain before redirecting to it. The simplest check: `callbackUrl.startsWith('/')` ensures it's a relative URL (no protocol, no domain). A more robust check uses `URL` parsing to verify the origin matches your own domain. Never trust `callbackUrl` that could be an absolute URL pointing to an external site — an attacker can craft `/login?callbackUrl=https://evil.com/phishing` to redirect users after authentication.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `router.push()` after a form submission instead of `router.replace()`

```tsx
// ❌ User presses Back → returns to the form with stale state
"use client";
export function CheckoutForm() {
  const router = useRouter();
  async function onSubmit() {
    await placeOrder();
    router.push("/order-confirmation"); // ← Back button returns to checkout ❌
  }
}
```

**Fix:** Use `router.replace()` for post-mutation navigation:

```tsx
router.replace("/order-confirmation"); // ← Back skips the form ✅
```

### ❌ Pitfall: Calling `redirect()` inside a `try/catch` block

```tsx
// ❌ redirect() throws a special error that must NOT be caught
export async function createProduct(formData: FormData) {
  'use server'
  try {
    await db.product.create({ data: ... })
    redirect('/products')   // ← throws internally — caught by catch! ❌
  } catch (error) {
    return { error: 'Failed' }  // ← redirect never fires, user stays on form
  }
}
```

**Fix:** Call `redirect()` OUTSIDE the try/catch:

```tsx
export async function createProduct(formData: FormData) {
  'use server'
  try {
    await db.product.create({ data: ... })
  } catch (error) {
    return { error: 'Failed to create product.' }
  }
  // redirect() called outside try/catch — fires correctly ✅
  revalidatePath('/products')
  redirect('/products')
}
```

### ❌ Pitfall: Using `redirect()` in a Client Component

```tsx
// ❌ redirect() from 'next/navigation' is server-only
"use client";
import { redirect } from "next/navigation";

export function SomeClientComponent() {
  redirect("/login"); // ← runtime error in browser
}
```

**Fix:** Use `useRouter()` in Client Components:

```tsx
"use client";
import { useRouter } from "next/navigation";

export function SomeClientComponent() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login"); // ← client-side navigation ✅
  }, []);
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete protected route system that:

1. `middleware.ts` — redirects unauthenticated users to `/login?callbackUrl=/dashboard` for all `/dashboard/*` routes
2. `loginAction` — authenticates, validates callbackUrl (same-origin only), sets session cookie, redirects
3. A `LogoutButton` that calls `logoutAction` which deletes the cookie and uses `redirect('/login')`
4. `permanentRedirect` in an `/old-dashboard` page that redirects to `/dashboard`
5. `next.config.ts` static redirect from `/admin` → `/dashboard/admin`

### Solution

```tsx
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  async redirects() {
    return [
      // Static permanent redirect — evaluated at request time, no code needed
      {
        source: "/admin",
        destination: "/dashboard/admin",
        permanent: true, // 308 — search engines update their index
      },
      {
        source: "/admin/:path*",
        destination: "/dashboard/admin/:path*",
        permanent: true,
      },
    ];
  },
};

export default config;
```

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];
const PUBLIC_PATHS = ["/login", "/register", "/api/auth"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip public paths and static assets
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Check protected paths
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Verify session
  const session = request.cookies.get("session")?.value;
  if (!session) {
    // Build login URL with callbackUrl for post-login redirect
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
    // → /login?callbackUrl=/dashboard/settings ✅
  }

  // Inject user context into headers for Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-token", session);
  requestHeaders.set("x-request-id", crypto.randomUUID());

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

```tsx
// src/app/auth/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

interface AuthState {
  success: boolean;
  error?: string;
}

const VALID_USERS = [
  { id: "u1", email: "mark@example.com", password: "pass123", role: "admin" },
  { id: "u2", email: "user@example.com", password: "pass123", role: "member" },
];

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const user = VALID_USERS.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) {
    // Intentionally vague — don't reveal which field was wrong
    return { success: false, error: "Invalid email or password." };
  }

  // Create session token
  const token = `${user.id}-${crypto.randomUUID()}`;

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // ─── Validate callbackUrl — MUST be same-origin (relative path only)
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") // prevent protocol-relative URLs
      ? callbackUrl
      : "/dashboard";

  redirect(safeCallback); // ← outside try/catch ✅
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login"); // ← server-side, outside try/catch ✅
}
```

```tsx
// src/app/login/page.tsx — Server Component
import { LoginForm } from "./_components/login-form";

type SearchParams = Promise<{ callbackUrl?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <LoginForm callbackUrl={callbackUrl ?? "/dashboard"} urlError={error} />
    </div>
  );
}
```

```tsx
// src/app/login/_components/login-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/auth/actions";

interface AuthState {
  success: boolean;
  error?: string;
}
const INITIAL: AuthState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl
                 hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm({
  callbackUrl,
  urlError,
}: {
  callbackUrl: string;
  urlError?: string;
}) {
  const [state, formAction] = useActionState(loginAction, INITIAL);

  return (
    <form
      action={formAction}
      className="bg-white border rounded-2xl p-8 w-full max-w-sm space-y-4"
    >
      <h1 className="text-xl font-bold text-gray-900">Sign in</h1>

      {/* URL-level error (e.g., session expired) */}
      {urlError && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                        text-sm text-amber-700"
        >
          {urlError === "session_expired"
            ? "Your session expired. Please sign in again."
            : urlError}
        </div>
      )}

      {/* Action-level error */}
      {state.error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg px-4 py-3
                        text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* Callback URL — hidden, validated server-side */}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <SubmitButton />

      <p className="text-xs text-gray-400 text-center">
        Demo: mark@example.com / pass123
      </p>
    </form>
  );
}
```

```tsx
// src/app/old-dashboard/page.tsx — permanent redirect using permanentRedirect()
import { permanentRedirect } from "next/navigation";

export default function OldDashboardPage() {
  // 308 Permanent Redirect — search engines update their index
  permanentRedirect("/dashboard");
}

/*
  Result:
  GET /old-dashboard   → 308 → /dashboard ✅
  next.config.ts handles: /admin → /dashboard/admin (static, no code needed)
  middleware.ts handles: /dashboard/* without session → /login?callbackUrl=/dashboard/*
  loginAction: validates callbackUrl (same-origin only) → redirects after login
  logoutAction: deletes session cookie → redirects to /login ✅
*/
```

```tsx
// src/app/(dashboard)/dashboard/_components/logout-button.tsx
"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/auth/actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className="px-4 py-2 text-sm border border-gray-200 rounded-lg
                 text-gray-600 hover:bg-gray-50 disabled:opacity-50
                 transition-colors"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
```

---

---

# 9 — Proxy and Backend-for-Frontend (BFF) Patterns

---

## T — TL;DR

A **Backend-for-Frontend (BFF)** is a server layer that sits between your frontend and external APIs — aggregating, transforming, and securing requests so the browser never calls third-party APIs directly. In Next.js 16, Route Handlers implement the BFF pattern: they proxy requests, attach secrets, merge data sources, and return exactly what the UI needs.

---

## K — Key Concepts

### Why BFF? The Core Problems It Solves

```
Without BFF (frontend calls external API directly):
  ❌ API keys exposed in browser (anyone can see them in DevTools)
  ❌ Frontend receives ALL data — filters/shapes it with client-side code
  ❌ Multiple round-trips for related data (N+1 on the client)
  ❌ CORS issues — external APIs may not allow your origin
  ❌ No request aggregation — 4 endpoints = 4 network requests from browser
  ❌ Rate limits hit by browser — you can't pool them

With BFF (Next.js Route Handler proxies the calls):
  ✅ API keys stay on server — never exposed to browser
  ✅ Server shapes the response — frontend gets exactly what it needs
  ✅ Single browser request → server calls multiple APIs in parallel
  ✅ No CORS issues — server-to-server calls ignore browser CORS policy
  ✅ Rate limit pooling — server IP pool, not individual browser IPs
  ✅ Caching layer — server can cache expensive external API calls
```

### Simple Proxy — Forwarding Requests to External API

```tsx
// src/app/api/products/route.ts
// Proxy: browser calls /api/products → server calls external API with secret key

import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API = process.env.EXTERNAL_PRODUCTS_API_URL!;
const API_KEY = process.env.EXTERNAL_API_KEY!; // ← never exposed to browser

export async function GET(request: NextRequest) {
  // Forward search params to the external API
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${EXTERNAL_API}/products${searchParams ? `?${searchParams}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-API-Key": API_KEY, // ← server-side secret ✅
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
        "X-Client-Version": "2026-05",
      },
      next: { revalidate: 300, tags: ["external-products"] }, // ← cache the proxy response
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "External API error", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform response — frontend gets only what it needs
    const products = data.items.map((item: ExternalProduct) => ({
      id: item.product_id, // ← normalize field names
      name: item.display_name,
      price: item.price_usd / 100, // ← convert cents to dollars
      imageUrl: item.media?.cover_image?.url ?? null,
    }));

    return NextResponse.json(
      { data: products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("[BFF /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 502 }
    );
  }
}
```

### Data Aggregation BFF — Merge Multiple APIs

```tsx
// src/app/api/dashboard-summary/route.ts
// Aggregation: one browser request → three external API calls in parallel

import { NextRequest, NextResponse } from "next/server";

const CRM_URL = process.env.CRM_API_URL!;
const ANALYTICS_URL = process.env.ANALYTICS_API_URL!;
const BILLING_URL = process.env.BILLING_API_URL!;
const CRM_KEY = process.env.CRM_API_KEY!;
const ANALYTICS_KEY = process.env.ANALYTICS_API_KEY!;
const BILLING_KEY = process.env.BILLING_API_KEY!;

async function fetchCRMStats() {
  const res = await fetch(`${CRM_URL}/stats/monthly`, {
    headers: { "X-API-Key": CRM_KEY },
    next: { revalidate: 600, tags: ["crm-stats"] },
  });
  if (!res.ok) throw new Error(`CRM API error: ${res.status}`);
  return res.json();
}

async function fetchAnalytics() {
  const res = await fetch(`${ANALYTICS_URL}/summary?period=30d`, {
    headers: { Authorization: `Bearer ${ANALYTICS_KEY}` },
    next: { revalidate: 300, tags: ["analytics"] },
  });
  if (!res.ok) return null; // non-critical — graceful fallback
  return res.json();
}

async function fetchBillingOverview() {
  const res = await fetch(`${BILLING_URL}/overview`, {
    headers: { "X-Secret-Key": BILLING_KEY },
    next: { revalidate: 3600, tags: ["billing"] },
  });
  if (!res.ok) throw new Error(`Billing API error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    // Three external API calls → executed in parallel → one browser response
    const [crmRaw, analyticsRaw, billingRaw] = await Promise.allSettled([
      fetchCRMStats(),
      fetchAnalytics(),
      fetchBillingOverview(),
    ]);

    // Shape into exactly what the dashboard widget needs
    const summary = {
      customers: {
        total:
          crmRaw.status === "fulfilled" ? crmRaw.value.total_customers : null,
        newMonth:
          crmRaw.status === "fulfilled" ? crmRaw.value.new_this_month : null,
      },
      analytics:
        analyticsRaw.status === "fulfilled"
          ? {
              pageViews: analyticsRaw.value.page_views_30d,
              uniqueUsers: analyticsRaw.value.unique_visitors_30d,
              bounceRate: analyticsRaw.value.bounce_rate_pct,
            }
          : null,
      billing: {
        mrr:
          billingRaw.status === "fulfilled"
            ? billingRaw.value.mrr_cents / 100
            : null,
        nextInvoice:
          billingRaw.status === "fulfilled"
            ? billingRaw.value.next_invoice_date
            : null,
      },
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { data: summary },
      {
        headers: {
          // Short cache — dashboard data should be reasonably fresh
          "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("[BFF /api/dashboard-summary]", error);
    return NextResponse.json(
      { error: "Failed to load dashboard summary" },
      { status: 502 }
    );
  }
}
```

### Auth-Enriched Proxy — Per-User External API Calls

```tsx
// src/app/api/user/orders/route.ts
// User-specific proxy: add session user context to external API calls

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  // Read user context injected by Middleware (no DB call needed)
  const headerStore = await headers();
  const userId = headerStore.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  try {
    const response = await fetch(
      `${process.env.ORDERS_API_URL}/users/${userId}/orders?page=${page}&limit=${limit}`,
      {
        headers: {
          "X-API-Key": process.env.ORDERS_API_KEY!, // ← server secret
          "X-User-Id": userId, // ← forward verified user ID
          "X-Request-Id":
            headerStore.get("x-request-id") ?? crypto.randomUUID(),
        },
        // User-specific: do NOT cache (different per user)
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Could not load orders" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize field names for the frontend
    const orders = data.results.map((o: ExternalOrder) => ({
      id: o.order_uuid,
      number: o.order_number,
      total: o.total_amount_cents / 100,
      currency: o.currency_code,
      status: o.fulfillment_status.toLowerCase(),
      createdAt: o.created_at_iso,
    }));

    return NextResponse.json({
      data: orders,
      meta: {
        page: data.page,
        total: data.total_count,
        hasMore: data.has_more,
      },
    });
  } catch (error) {
    console.error(`[BFF /api/user/orders] userId=${userId}`, error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 502 }
    );
  }
}
```

### BFF with Server Components — No Route Handler Needed

```tsx
// When your UI is a Server Component, you can skip the BFF Route Handler entirely
// The Server Component IS the BFF — it calls external APIs directly server-side

// src/app/(dashboard)/dashboard/analytics/page.tsx
// Server Component calling external analytics API directly
// API key never reaches the browser ✅

export default async function AnalyticsPage() {
  // Called directly from the Server Component — no /api/analytics route needed
  const [pageViews, conversions] = await Promise.all([
    fetch(`${process.env.ANALYTICS_API}/page-views?period=30d`, {
      headers: { Authorization: `Bearer ${process.env.ANALYTICS_KEY}` },
      next: { revalidate: 300, tags: ["analytics"] },
    }).then((r) => r.json()),

    fetch(`${process.env.ANALYTICS_API}/conversions?period=30d`, {
      headers: { Authorization: `Bearer ${process.env.ANALYTICS_KEY}` },
      next: { revalidate: 300, tags: ["analytics"] },
    }).then((r) => r.json()),
  ]);

  return <AnalyticsDashboard pageViews={pageViews} conversions={conversions} />;
}

// When to use Server Component vs BFF Route Handler:
// Server Component: data is for YOUR Next.js UI only, no external callers
// BFF Route Handler: data is needed by Client Components via TanStack Query,
//                    OR by mobile apps, OR by third-party consumers
```

### Caching Strategy in BFF Route Handlers

```tsx
// src/app/api/catalogue/route.ts
// BFF with layered caching

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  // Layer 1: Next.js Data Cache — cache the external API response
  const externalData = await fetch(
    `${process.env.CATALOGUE_API}/products?category=${category ?? "all"}`,
    {
      headers: { "X-API-Key": process.env.CATALOGUE_KEY! },
      next: {
        revalidate: 1800, // ← 30 min ISR
        tags: ["catalogue", `cat-${category ?? "all"}`],
      },
    }
  ).then((r) => r.json());

  const products = externalData.products.map(normalize);

  // Layer 2: HTTP response Cache-Control — CDN/browser cache
  return NextResponse.json(
    { data: products, total: products.length },
    {
      headers: {
        // CDN caches for 5 min, serves stale for 30 min while revalidating
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        // CDN varies cache by category query param
        Vary: "Accept-Encoding",
      },
    }
  );
}

function normalize(item: ExternalProduct) {
  return {
    id: item.sku,
    name: item.title,
    price: item.price_usd,
    imageUrl: item.images?.[0]?.url ?? null,
    inStock: item.inventory_count > 0,
  };
}
```

---

## W — Why It Matters

- The BFF pattern is a security requirement for production apps — API keys for services like Stripe, SendGrid, HubSpot, and Google Analytics must never appear in browser-side code. A Route Handler BFF keeps them server-side while giving the frontend clean, shaped data.
- Server Component direct API calls are even better than a BFF Route Handler when your client is Server Components — no extra HTTP hop, no route to maintain, and the Next.js Data Cache applies directly to the fetch. Only use a Route Handler BFF when Client Components need to call the API (via TanStack Query), or when external services need to call it.
- The aggregation pattern (one browser request → multiple parallel external API calls) directly reduces the user-perceived latency of data-heavy pages — a dashboard that previously made 4 sequential external calls from the browser (potentially 4 × 300ms = 1200ms) becomes one server request with parallel calls (max(300ms) = 300ms).

---

## I — Interview Q&A

### Q1: What is a Backend-for-Frontend and why is it useful in Next.js?

**A:** A Backend-for-Frontend (BFF) is a server layer that sits between the frontend and external APIs. In Next.js, Route Handlers implement this pattern. The BFF solves several problems: it keeps API keys and secrets on the server (never exposed to the browser), it aggregates multiple external API calls into a single browser request, it normalizes and shapes response data to match exactly what the UI needs, and it provides a caching layer for expensive external calls. Without a BFF, the browser would need to call external APIs directly — requiring CORS headers, exposing secrets, making multiple sequential requests, and receiving over-fetched data that must be filtered client-side.

### Q2: When should you use a Server Component to call external APIs directly vs a BFF Route Handler?

**A:** Use a Server Component directly when the data is only needed for Server-Rendered HTML — no Client Component will call the same data via fetch after hydration. The Server Component IS the BFF in this case: it fetches from the external API server-side (keys hidden, data shaped), renders HTML, and the browser never makes a separate API call. Use a BFF Route Handler when: Client Components need to fetch data after page load (e.g., via TanStack Query for polling or user-triggered refreshes); mobile apps or third-party services need to call the same endpoint; or when you need custom cache headers, CORS headers, or HTTP status codes in the response.

### Q3: How does a BFF Route Handler improve performance compared to the browser calling the external API directly?

**A:** Three ways. First, parallelization: the BFF calls multiple external APIs simultaneously on the server (`Promise.all`), reducing total time to `max(t1, t2, t3)` instead of `t1 + t2 + t3`. Second, proximity: the Next.js server (typically in the same data center or region as external APIs) has lower latency to external APIs than a user's browser in a different country. Third, caching: the BFF can cache external API responses using `next: { revalidate }` — cached responses serve in milliseconds without hitting the external API at all, regardless of how many browser requests come in.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Returning the raw external API response without validation

```tsx
// ❌ External API shape changes → frontend breaks silently
export async function GET() {
  const data = await fetch(EXTERNAL_URL, { headers: { ... } }).then(r => r.json())
  return NextResponse.json(data)   // ← raw pass-through — no shape guarantee
}
```

**Fix:** Validate and transform external responses with Zod:

```tsx
import { z } from 'zod'

const ExternalSchema = z.object({
  items: z.array(z.object({
    product_id:   z.string(),
    display_name: z.string(),
    price_usd:    z.number()
  }))
})

export async function GET() {
  const raw    = await fetch(EXTERNAL_URL, { headers: { ... } }).then(r => r.json())
  const parsed = ExternalSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[BFF] External API schema changed:', parsed.error)
    return NextResponse.json({ error: 'Data format error' }, { status: 502 })
  }

  const products = parsed.data.items.map(item => ({
    id:    item.product_id,
    name:  item.display_name,
    price: item.price_usd / 100
  }))

  return NextResponse.json({ data: products })
}
```

### ❌ Pitfall: Caching user-specific BFF responses with public Cache-Control

```tsx
// ❌ User A's orders cached and served to User B
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const orders = await fetchUserOrders(userId);
  return NextResponse.json(
    { data: orders },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300", // ← cached at CDN, shared across users ❌
      },
    }
  );
}
```

**Fix:** Use `private` or `no-store` for user-specific data:

```tsx
return NextResponse.json(
  { data: orders },
  {
    headers: {
      "Cache-Control": "private, no-store", // ← never cached at CDN ✅
    },
  }
);
```

### ❌ Pitfall: Not handling external API timeouts — hanging requests

```tsx
// ❌ External API hangs → your Route Handler hangs too → user waits forever
const data = await fetch(SLOW_EXTERNAL_API).then((r) => r.json());
```

**Fix:** Use `AbortController` with a timeout:

```tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

try {
  const data = await fetch(SLOW_EXTERNAL_API, {
    signal: controller.signal, // ← abort after 5s ✅
  }).then((r) => r.json());
  clearTimeout(timeoutId);
  return NextResponse.json({ data });
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    return NextResponse.json(
      { error: "External API timed out" },
      { status: 504 }
    );
  }
  return NextResponse.json({ error: "External API error" }, { status: 502 });
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `GET /api/bff/product-detail/[id]` BFF Route Handler that:

1. Calls three "external" API functions in parallel: `fetchExternalProduct(id)`, `fetchExternalReviews(id)`, `fetchExternalInventory(id)`
2. Uses `Promise.allSettled` for graceful degradation
3. Validates and normalizes each response
4. Adds a 5-second timeout on each external call via `AbortController`
5. Returns a single shaped response with correct `Cache-Control` for public (non-user-specific) product data
6. Returns `502` with descriptive error if the product fetch fails (critical), but still returns data if reviews or inventory fail (non-critical)

### Solution

```tsx
// src/app/api/bff/product-detail/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── External API schemas ─────────────────────────────────────────────────────
const ProductSchema = z.object({
  sku: z.string(),
  display_name: z.string(),
  description: z.string(),
  price_cents: z.number(),
  category: z.string(),
  images: z.array(z.object({ url: z.string() })).default([]),
});

const ReviewSchema = z.object({
  reviews: z.array(
    z.object({
      id: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
      author: z.string(),
      created_at: z.string(),
    })
  ),
  avg_rating: z.number(),
  total: z.number(),
});

const InventorySchema = z.object({
  sku: z.string(),
  qty_on_hand: z.number(),
  warehouse: z.string(),
});

// ─── Fetch helpers with timeout ───────────────────────────────────────────────
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & { next?: object },
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// ─── Mock "external" API functions ────────────────────────────────────────────
async function fetchExternalProduct(id: string) {
  // Simulated external call with variable latency
  await new Promise((r) => setTimeout(r, 120));
  const PRODUCTS: Record<string, unknown> = {
    p1: {
      sku: "p1",
      display_name: "Air Max 90",
      description: "Classic Nike shoe.",
      price_cents: 12000,
      category: "footwear",
      images: [{ url: "/shoes/air-max-90.jpg" }],
    },
    p2: {
      sku: "p2",
      display_name: "Canvas Tote",
      description: "Durable everyday bag.",
      price_cents: 4500,
      category: "bags",
      images: [],
    },
  };
  const product = PRODUCTS[id];
  if (!product) throw new Error(`Product ${id} not found`);
  return product;
}

async function fetchExternalReviews(id: string) {
  await new Promise((r) => setTimeout(r, 280));
  return {
    reviews: [
      {
        id: "r1",
        rating: 5,
        comment: "Excellent!",
        author: "Alice",
        created_at: "2026-05-01",
      },
      {
        id: "r2",
        rating: 4,
        comment: "Very good.",
        author: "Bob",
        created_at: "2026-05-03",
      },
    ],
    avg_rating: 4.5,
    total: 2,
  };
}

async function fetchExternalInventory(id: string) {
  await new Promise((r) => setTimeout(r, 80));
  return { sku: id, qty_on_hand: 23, warehouse: "US-WEST" };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Parallel external calls with timeout — all start at t=0
  const [productResult, reviewsResult, inventoryResult] =
    await Promise.allSettled([
      fetchWithTimeout(
        `https://products-api.example.com/products/${id}`,
        {
          headers: { "X-API-Key": process.env.PRODUCTS_API_KEY ?? "dev-key" },
          // In real app, use actual fetch; here call our mock directly
        },
        5000
      ).catch(() => fetchExternalProduct(id)), // ← use mock in demo

      fetchWithTimeout(
        `https://reviews-api.example.com/products/${id}/reviews`,
        { headers: { "X-API-Key": process.env.REVIEWS_API_KEY ?? "dev-key" } },
        5000
      ).catch(() => fetchExternalReviews(id)),

      fetchWithTimeout(
        `https://inventory-api.example.com/inventory/${id}`,
        {
          headers: { "X-API-Key": process.env.INVENTORY_API_KEY ?? "dev-key" },
        },
        5000
      ).catch(() => fetchExternalInventory(id)),
    ]);

  // ─── Critical: product must succeed
  if (productResult.status === "rejected") {
    console.error(
      `[BFF product-detail] Product fetch failed for id=${id}:`,
      productResult.reason
    );
    return NextResponse.json(
      { error: "Product not found or unavailable" },
      { status: 502 }
    );
  }

  // ─── Validate product (critical)
  const productParsed = ProductSchema.safeParse(productResult.value);
  if (!productParsed.success) {
    console.error(
      "[BFF product-detail] Invalid product schema:",
      productParsed.error
    );
    return NextResponse.json(
      { error: "Product data format error" },
      { status: 502 }
    );
  }

  // ─── Non-critical: reviews and inventory degrade gracefully
  const reviewsParsed =
    reviewsResult.status === "fulfilled"
      ? ReviewSchema.safeParse(reviewsResult.value)
      : null;

  const inventoryParsed =
    inventoryResult.status === "fulfilled"
      ? InventorySchema.safeParse(inventoryResult.value)
      : null;

  if (reviewsResult.status === "rejected") {
    console.warn(
      `[BFF product-detail] Reviews fetch failed for id=${id}:`,
      reviewsResult.reason
    );
  }
  if (inventoryResult.status === "rejected") {
    console.warn(
      `[BFF product-detail] Inventory fetch failed for id=${id}:`,
      inventoryResult.reason
    );
  }

  // ─── Shape into exactly what the frontend needs
  const p = productParsed.data;

  const shaped = {
    id: p.sku,
    name: p.display_name,
    description: p.description,
    price: p.price_cents / 100, // ← cents → dollars
    priceFormatted: new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(p.price_cents / 100),
    category: p.category,
    imageUrl: p.images[0]?.url ?? null,

    // Non-critical fields — null if fetch or validation failed
    reviews: reviewsParsed?.success
      ? {
          items: reviewsParsed.data.reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            author: r.author,
            createdAt: r.created_at,
          })),
          avgRating: reviewsParsed.data.avg_rating,
          total: reviewsParsed.data.total,
        }
      : null,

    inventory: inventoryParsed?.success
      ? {
          inStock: inventoryParsed.data.qty_on_hand > 0,
          quantity: inventoryParsed.data.qty_on_hand,
          warehouse: inventoryParsed.data.warehouse,
        }
      : null,

    // Metadata for debugging
    meta: {
      fetchedAt: new Date().toISOString(),
      reviewsAvailable: reviewsParsed?.success ?? false,
      inventoryAvailable: inventoryParsed?.success ?? false,
    },
  };

  return NextResponse.json(
    { data: shaped },
    {
      headers: {
        // Public product data: CDN cache 5 min, stale-while-revalidate 30 min
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
        "X-Product-Id": id,
      },
    }
  );
}

/*
  BFF behavior breakdown:
  ─────────────────────────────────────────────────────────────────────
  Browser sends: GET /api/bff/product-detail/p1

  Server:
    t=0ms   fetchExternalProduct + fetchExternalReviews + fetchExternalInventory start
    t=80ms  inventory resolves ✅
    t=120ms product resolves  ✅
    t=280ms reviews resolves  ✅
    t=280ms all settled → shape response

  Total: ~280ms (parallel) vs ~480ms (sequential)

  Failures:
    product fails   → 502 immediately (critical) ✅
    reviews fails   → reviews: null in response (non-critical) ✅
    inventory fails → inventory: null in response (non-critical) ✅

  Security:
    API keys: server-side only, never in browser ✅
    Response: shaped — no raw external API data exposed ✅
    Cache: public (non-user-specific product data) ✅
  ─────────────────────────────────────────────────────────────────────
*/
```

---

---

# 10 — Error Handling in Mutations and Route Handlers

---

## T — TL;DR

Robust error handling means: **expected errors are returned** (validation failures, not found), **unexpected errors are thrown** (caught by `error.tsx`), **Route Handlers always return proper HTTP status codes**, and **internal error details never reach the client**. Every layer — Server Actions, Route Handlers, and Client Components — has its own error handling responsibility.

---

## K — Key Concepts

### The Two Error Categories

```
Expected errors (recoverable — user can fix):
  → Validation failures (missing field, invalid format)
  → Business rule violations (duplicate email, insufficient stock)
  → "Not found" for user-provided IDs
  → Unauthorized / Forbidden

  Handling: RETURN an error object from the Server Action
            Use actionState.errors to show field-level messages
            HTTP 400/401/403/404/409/422 in Route Handlers

Unexpected errors (unrecoverable — system issue):
  → Database connection failures
  → External API timeouts
  → Programming errors (null reference, etc.)
  → Disk/memory/infrastructure failures

  Handling: THROW an error from Server Components/Actions
            → caught by nearest error.tsx boundary
            HTTP 500/502/503/504 in Route Handlers
            Log internally with error.digest for tracing
```

### Error Handling in Server Actions — Return vs Throw

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export interface ActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  price: z.coerce.number().positive("Price must be a positive number"),
  stock: z.coerce
    .number()
    .int()
    .nonnegative("Stock cannot be negative")
    .default(0),
});

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // ─── Expected error: Validation
  const result = Schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // ─── Expected error: Business rule (duplicate)
    const existing = await db.product.findFirst({
      where: { name: result.data.name },
    });
    if (existing) {
      return {
        success: false,
        errors: { name: ["A product with this name already exists."] },
      };
    }

    await db.product.create({ data: result.data });
    revalidatePath("/products");

    return { success: true, message: "Product created successfully." };
  } catch (error) {
    // ─── Unexpected error: DB failure, etc.
    // Log with full detail server-side
    console.error("[createProduct] Unexpected error:", error);

    // Return generic message — never expose stack traces or DB errors
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({ where: { id } });

  // Use notFound() for resource not found — renders the nearest not-found.tsx
  if (!product) notFound();

  return product;
}
```

### `error.tsx` — Boundary for Thrown Errors

```tsx
// src/app/products/error.tsx
// Catches errors THROWN from Server Components, Server Actions, and
// async operations within the /products route segment
"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductsError({ error, reset }: Props) {
  useEffect(() => {
    // Log to monitoring (Sentry, DataDog, etc.)
    // error.digest is the server-side error ID — matches server logs
    console.error("Products error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mb-2 max-w-sm">
        We couldn't complete this action. Our team has been notified.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-gray-400 mb-6">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                     rounded-xl hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/products"
          className="px-5 py-2.5 border text-gray-700 text-sm font-medium
                     rounded-xl hover:bg-gray-50 transition-colors"
        >
          Go back
        </a>
      </div>
    </div>
  );
}
```

### `not-found.tsx` — Handle 404s

```tsx
// src/app/products/[id]/not-found.tsx
// Rendered when notFound() is called in the /products/[id] segment

import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Product not found
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        This product may have been removed or the link is incorrect.
      </p>
      <Link
        href="/products"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium
                   rounded-xl hover:bg-blue-700 transition-colors"
      >
        Browse all products
      </Link>
    </div>
  );
}
```

### Error Handling in Route Handlers — Consistent Error Format

```tsx
// src/lib/api-error.ts — shared error response utilities

export function apiError(message: string, status: number, details?: unknown) {
  return Response.json(
    {
      error: message,
      status,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// Typed error classes for consistent handling
export class ValidationError extends Error {
  constructor(public details: Record<string, string[]>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
```

```tsx
// src/app/api/products/[id]/route.ts — comprehensive error handling
import { NextRequest } from "next/server";
import {
  apiError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/api-error";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().positive().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // ─── Auth check
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Bearer token required");
    }
    const userId = await verifyToken(authHeader.slice(7));
    if (!userId) throw new UnauthorizedError("Invalid token");

    // ─── Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Request body must be valid JSON", 400);
    }

    // ─── Validate
    const result = UpdateSchema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(result.error.flatten().fieldErrors);
    }

    // ─── Check resource exists
    const product = await db.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product", id);

    // ─── Check ownership
    if (product.ownerId !== userId) {
      return apiError("Forbidden — you do not own this product", 403);
    }

    // ─── Update
    const updated = await db.product.update({
      where: { id },
      data: result.data,
    });

    return Response.json({ data: updated });
  } catch (error) {
    // ─── Typed error handling
    if (error instanceof ValidationError) {
      return apiError("Validation failed", 422, error.details);
    }
    if (error instanceof NotFoundError) {
      return apiError(error.message, 404);
    }
    if (error instanceof UnauthorizedError) {
      return apiError(error.message, 401);
    }

    // ─── Unexpected error
    console.error("[PATCH /api/products/:id]", error);
    return apiError("Internal server error", 500);
  }
}
```

### Client-Side Error Handling for Server Action Calls

```tsx
// When calling Server Actions from Client Components (non-form, programmatic)
"use client";

import { useTransition } from "react";
import { deleteProduct } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteProduct(id);
        // On success: revalidatePath in the action causes re-render
      } catch (error) {
        // Thrown errors from Server Actions reach here
        // Show toast / snackbar notification
        console.error("Delete failed:", error);
        alert("Failed to delete product. Please try again.");
        // In production: use a toast library (sonner, react-hot-toast)
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium
                 rounded-lg hover:bg-red-700 disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### Global Error Boundary — `global-error.tsx`

```tsx
// src/app/global-error.tsx
// Last resort: catches errors in the ROOT layout
// Must include its own <html> and <body>

"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-gray-50 flex items-center
                       justify-center px-4"
      >
        <div className="text-center max-w-md">
          <p className="text-6xl mb-6">🔥</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went seriously wrong
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            We're sorry — the application encountered an unexpected error.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-400 mb-6">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white font-semibold
                       rounded-xl hover:bg-blue-700"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## W — Why It Matters

- The return-vs-throw distinction is the single most important error handling design decision — using `throw` for validation errors means every form submission that has a typo shows the user a full-page error boundary instead of an inline field error message. Getting this wrong destroys UX.
- `error.digest` is Next.js's built-in error correlation ID — it's a hash of the error that's the same on both the server (in logs) and the client (in the error boundary). When a user reports "I got error ID abc123", you can find the exact stack trace in your server logs.
- The consistent error format in Route Handlers (`{ error, status, details, timestamp }`) makes frontend error handling predictable — every error response has the same shape regardless of which route threw it, so the frontend can handle them generically.

---

## I — Interview Q&A

### Q1: What is `error.digest` in Next.js and why is it important?

**A:** `error.digest` is a unique hash that Next.js generates server-side for each unexpected error. It's attached to the `error` object in `error.tsx` boundaries. The same digest appears in both the server logs (with the full stack trace and context) and in the `error.tsx` component (where it can be shown to the user as a reference number). This correlation allows support teams to match a user's error report ("I got error ID abc123") to the exact server-side stack trace, without exposing internal error details to the client.

### Q2: What is the difference between `error.tsx` and `global-error.tsx`?

**A:** `error.tsx` is a route-segment-level error boundary — it catches errors thrown within its co-located route segment (`page.tsx`, Server Actions, etc.) and renders an error UI while the surrounding layout (navigation, sidebar) remains intact. A user can recover without losing the page structure. `global-error.tsx` is the root-level fallback — it only triggers when an error occurs in the root `layout.tsx` itself, which is uncommon but catastrophic since the layout is shared by everything. It must include its own `<html>` and `<body>` tags because the root layout has failed and won't render them. In practice, you rarely need `global-error.tsx` — `error.tsx` at each route segment handles the vast majority of errors.

### Q3: How should Server Actions handle errors — return or throw?

**A:** Use the **return pattern** for expected, user-recoverable errors: validation failures, duplicate entries, business rule violations, "not found" for user-provided input. Return a typed state object with `{ success: false, errors: { fieldName: ['message'] } }` that `useActionState` propagates to the UI as inline error messages. Use the **throw pattern** for unexpected, system-level errors: database connection failures, external API errors, programming bugs. Thrown errors propagate to the nearest `error.tsx` boundary, showing a full-page error state with a retry option. The key principle: if the user can fix it, return it as field errors; if the system is broken, throw it to the error boundary.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Throwing inside a `try/catch` that swallows all errors — hiding bugs

```tsx
// ❌ Swallows ALL errors — unexpected bugs are silently lost
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  try {
    await db.product.update({ where: { id }, data });
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Something went wrong." };
    // If db.product.update throws a null pointer bug,
    // we return a generic error and the bug is never surfaced ❌
  }
}
```

**Fix:** Only catch expected errors — let unexpected ones propagate:

```tsx
export async function updateProduct(id: string, data: ProductData) {
  "use server";
  // ─── Expected: not found
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return { success: false, message: "Product not found." };

  // ─── Expected: authorization
  const user = await getCurrentUser();
  if (existing.ownerId !== user?.userId) {
    return { success: false, message: "Not authorized." };
  }

  // ─── Unexpected: let DB errors propagate → error.tsx boundary
  await db.product.update({ where: { id }, data });
  revalidatePath("/products");
  return { success: true };
}
```

### ❌ Pitfall: Not having an `error.tsx` at the right route level

```tsx
// ❌ Only global-error.tsx — any product mutation error takes down the whole app
// No error.tsx at /products or /products/[id]

// User sees the global error page (no navigation, no layout) for a simple
// "product not found" error that should show a scoped error with "go back"
```

**Fix:** Add `error.tsx` at each meaningful route segment:

```
src/app/
├── error.tsx                  ← catches app-level errors (keeps root layout)
├── global-error.tsx           ← absolute last resort (no layout)
├── products/
│   ├── error.tsx              ← catches /products errors (keeps nav)
│   └── [id]/
│       ├── error.tsx          ← catches /products/[id] errors (most specific)
│       └── not-found.tsx      ← for notFound() calls in /products/[id]
```

### ❌ Pitfall: Exposing validation error details from external libraries to the client

```tsx
// ❌ Prisma error message exposed to client
export async function createUser(data: UserData) {
  "use server";
  try {
    await db.user.create({ data });
  } catch (error: any) {
    return { error: error.message };
    // Might expose: "Unique constraint failed on the fields: (`email`)"
    // Leaks database schema information ❌
  }
}
```

**Fix:** Map known error codes to user-friendly messages:

```tsx
export async function createUser(data: UserData) {
  "use server";
  try {
    await db.user.create({ data });
    return { success: true };
  } catch (error: any) {
    // Handle known Prisma error codes
    if (error?.code === "P2002") {
      // Unique constraint violation
      const field = error.meta?.target?.[0] ?? "field";
      return {
        success: false,
        errors: { [field]: [`This ${field} is already taken.`] },
      };
    }
    // Unexpected: log and return generic message
    console.error("[createUser]", error);
    return {
      success: false,
      message: "Could not create account. Please try again.",
    };
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete error handling setup for a `/products` route with:

1. `createProductAction` with Zod validation (return errors) + unexpected error handling (catch and return generic)
2. `deleteProductAction` that throws for unauthorized access (caught by error boundary)
3. `error.tsx` for the products route segment
4. `not-found.tsx` for `/products/[id]`
5. A `ProductForm` Client Component that displays field errors from `useActionState`
6. A `DeleteButton` that uses `useTransition` and shows a toast-style notification on caught thrown errors

### Solution

```tsx
// src/app/products/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export interface ProductActionState {
  success: boolean;
  message?: string;
  errors?: { name?: string[]; price?: string[]; stock?: string[] };
}

const CreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  price: z.coerce.number().positive("Price must be a positive number"),
  stock: z.coerce
    .number()
    .int()
    .nonnegative("Stock cannot be negative")
    .default(0),
});

// Mock DB
let PRODUCTS = [
  { id: "p1", name: "Air Max 90", price: 120, stock: 15, ownerId: "u1" },
  { id: "p2", name: "Canvas Bag", price: 45, stock: 8, ownerId: "u1" },
];

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  // ─── Expected: Validation errors (return, not throw)
  const result = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return {
      success: false,
      message: "Please fix the errors below.",
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // ─── Expected: Business rule violation (return, not throw)
    const duplicate = PRODUCTS.find(
      (p) => p.name.toLowerCase() === result.data.name.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        errors: { name: ["A product with this name already exists."] },
      };
    }

    // Create product
    const newProduct = {
      id: `p${Date.now()}`,
      ownerId: "u1",
      ...result.data,
    };
    PRODUCTS = [...PRODUCTS, newProduct];
    revalidatePath("/products");

    return {
      success: true,
      message: `"${result.data.name}" created successfully!`,
    };
  } catch (error) {
    // ─── Unexpected: log server-side, generic message to client
    console.error("[createProductAction] Unexpected error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  const product = PRODUCTS.find((p) => p.id === id);

  // ─── Expected: Not found → notFound() renders not-found.tsx
  if (!product) notFound();

  // ─── Expected: Unauthorized → THROW (not return) to propagate to error.tsx
  const currentUserId = "u1"; // In production: from session
  if (product.ownerId !== currentUserId) {
    throw new Error("You are not authorized to delete this product.");
    // → Propagates to /products/error.tsx boundary
  }

  PRODUCTS = PRODUCTS.filter((p) => p.id !== id);
  revalidatePath("/products");
  // No redirect here — caller handles navigation
}

export async function getProduct(id: string) {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) notFound(); // ← renders not-found.tsx
  return product;
}

export async function getProducts() {
  return PRODUCTS;
}
```

```tsx
// src/app/products/error.tsx
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
    // In production: report to Sentry/DataDog with error.digest
    console.error("[products error boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-5xl mb-5">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mb-2 max-w-sm">
        We couldn't complete your request. Please try again or contact support.
      </p>
      {error.digest && (
        <p
          className="text-xs font-mono text-gray-400 bg-gray-50 border
                      rounded px-3 py-1.5 mb-6"
        >
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold
                     rounded-xl hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/products"
          className="px-5 py-2.5 border text-gray-700 text-sm font-medium
                      rounded-xl hover:bg-gray-50 transition-colors"
        >
          Back to products
        </a>
      </div>
    </div>
  );
}
```

```tsx
// src/app/products/[id]/not-found.tsx
import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-5xl mb-5">🔍</p>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Product not found
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        This product may have been removed or the link might be incorrect.
      </p>
      <Link
        href="/products"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold
                   rounded-xl hover:bg-blue-700 transition-colors"
      >
        Browse all products
      </Link>
    </div>
  );
}
```

```tsx
// src/app/products/_components/product-form.tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProductAction, type ProductActionState } from "../actions";
import { useFormStatus } from "react-dom";

const INITIAL: ProductActionState = { success: false };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p
      role="alert"
      className="text-red-500 text-xs mt-1 flex items-center gap-1"
    >
      <span>⚠</span> {errors[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl
                 hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span
            className="w-4 h-4 border-2 border-white/30 border-t-white
                           rounded-full animate-spin"
          />
          Creating...
        </span>
      ) : (
        "Create Product"
      )}
    </button>
  );
}

export function ProductForm() {
  const [state, formAction] = useActionState(createProductAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-reset on success
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate // ← we handle validation server-side
      className="bg-white border rounded-2xl p-6 space-y-4 max-w-sm"
    >
      <h2 className="font-semibold text-gray-900">New Product</h2>

      {/* Global status message */}
      {state.message && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            state.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* Name field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="name"
        >
          Product Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Air Max 90"
          aria-describedby={state.errors?.name ? "name-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.name
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="name-error">
          <FieldError errors={state.errors?.name} />
        </span>
      </div>

      {/* Price field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="price"
        >
          Price (USD)
        </label>
        <input
          id="price"
          name="price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          aria-describedby={state.errors?.price ? "price-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.price
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="price-error">
          <FieldError errors={state.errors?.price} />
        </span>
      </div>

      {/* Stock field */}
      <div>
        <label
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor="stock"
        >
          Initial Stock
        </label>
        <input
          id="stock"
          name="stock"
          type="number"
          min="0"
          placeholder="0"
          aria-describedby={state.errors?.stock ? "stock-error" : undefined}
          className={`w-full border rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${
                        state.errors?.stock
                          ? "border-red-400 focus:ring-red-300"
                          : "border-gray-200"
                      }`}
        />
        <span id="stock-error">
          <FieldError errors={state.errors?.stock} />
        </span>
      </div>

      <SubmitButton />
    </form>
  );
}
```

```tsx
// src/app/products/_components/delete-button.tsx
"use client";

import { useState, useTransition } from "react";
import { deleteProductAction } from "../actions";

interface Toast {
  message: string;
  type: "success" | "error";
}

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      try {
        await deleteProductAction(id);
        showToast(`"${name}" deleted.`, "success");
        // revalidatePath in the action causes the list to refresh ✅
      } catch (error) {
        // Server Action threw an error (e.g., unauthorized)
        // error.tsx boundary did NOT catch it because this is a
        // programmatic call, not a render-time throw
        const message =
          error instanceof Error ? error.message : "Failed to delete product.";
        showToast(message, "error");
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600
                   text-xs font-medium rounded-lg hover:bg-red-100
                   disabled:opacity-50 disabled:cursor-wait transition-colors"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {/* Toast notification */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl
                      text-sm font-medium shadow-lg border transition-all
                      ${
                        toast.type === "success"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/products/page.tsx — Server Component wiring it all together
import { getProducts } from "./actions";
import { ProductForm } from "./_components/product-form";
import { DeleteButton } from "./_components/delete-button";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Products</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Product list */}
        <div className="col-span-2 space-y-3">
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">
              No products yet. Create one!
            </p>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between bg-white
                           border rounded-xl px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ${product.price} · {product.stock} in stock
                  </p>
                </div>
                {/* DeleteButton: shows toast for thrown errors */}
                <DeleteButton id={product.id} name={product.name} />
              </div>
            ))
          )}
        </div>

        {/* Create form */}
        <div>
          {/* ProductForm: shows field errors for returned errors */}
          <ProductForm />
        </div>
      </div>
    </div>
  );
}

/*
  Error handling architecture for /products:
  ─────────────────────────────────────────────────────────────────────
  createProductAction
    Validation failure   → return { errors } → ProductForm field errors ✅
    Duplicate name       → return { errors } → ProductForm field error ✅
    DB failure           → return { message } → ProductForm status msg ✅

  deleteProductAction
    notFound()           → renders /products/[id]/not-found.tsx ✅
    Unauthorized throw   → caught in DeleteButton catch() → toast ✅
    DB failure (unexpected) → if called from page render → error.tsx
                           → if called programmatically → try/catch in client ✅

  error.tsx              → catches render-time throws in /products segment
  not-found.tsx          → catches notFound() in /products/[id] segment
  ─────────────────────────────────────────────────────────────────────
*/
```

---

## ✅ Day 8 Complete — Mutations and Backend Integration

| #   | Subtopic                                                      | Status |
| --- | ------------------------------------------------------------- | ------ |
| 1   | Server Actions — Fundamentals and the Execution Model         | ☐      |
| 2   | App Router Forms — `useActionState`, Progressive Enhancement  | ☐      |
| 3   | Updating Data — Mutations, Optimistic Updates, Error Handling | ☐      |
| 4   | Route Handlers — `route.ts`, GET and POST Handlers            | ☐      |
| 5   | `NextRequest` and `NextResponse` — The Request/Response API   | ☐      |
| 6   | Cookies — Reading, Setting, Deleting                          | ☐      |
| 7   | Headers — Request Headers, Response Headers, Custom Headers   | ☐      |
| 8   | Redirects — Server-Side, Client-Side, Middleware              | ☐      |
| 9   | Proxy and Backend-for-Frontend (BFF) Patterns                 | ☐      |
| 10  | Error Handling in Mutations and Route Handlers                | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 8

```
SERVER ACTIONS
  Declare:  'use server' at file-level (shared) or function-level (inline)
  Call from: form action={serverAction}, useActionState, useTransition
  Signature: (prevState, formData) for useActionState
             (arg1, arg2, ...) for direct programmatic calls
  Security: function body never ships to browser
            closed-over values are encrypted by Next.js
  vs API Routes: internal UI mutations → Server Action
                 external consumers / webhooks → Route Handler

FORM PATTERN
  useActionState(action, initialState)  → [state, formAction, isPending]
  <form action={formAction}>            → progressive enhancement ✅
  useFormStatus()                       → { pending } in child of <form>
  useEffect([state.success]) → form.reset()  ← reset after success
  <input type="hidden" name="id" value={id} /> ← pass extra data
  action.bind(null, id)                       ← alternative: bind()

OPTIMISTIC UPDATES
  useOptimistic(serverState, updaterFn) → [optimisticState, addOptimistic]
  Pattern:
    addOptimistic(change)   ← apply immediately (instant UI)
    await serverAction()    ← run real action
    // on success: server re-renders with real data
    // on failure: optimistic state auto-reverts to serverState ✅

MUTATIONS CHECKLIST
  1. Validate (Zod safeParse) — return errors if invalid
  2. Authorize — verify user owns the resource
  3. Write to DB
  4. Revalidate (revalidatePath / revalidateTag)
  5. Return result OR redirect()
  Never: call redirect() inside try/catch
  Never: expose raw DB/stack trace errors to client

ROUTE HANDLERS (route.ts)
  Export:   GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  Returns:  NextResponse.json() or new Response()
  Params:   await params (Promise in Next.js 16)
  Status codes: 200 GET/update, 201 create, 204 delete
                400 bad request, 401 auth, 403 forbidden
                404 not found, 422 validation, 500 server error

NextRequest / NextResponse
  request.nextUrl.searchParams  → query params (URL object)
  request.headers.get('name')   → request header value
  request.cookies.get('name')?.value ← .value (not string directly)
  request.json()                → parsed body (read once only)
  NextResponse.json(data, {status, headers})
  NextResponse.redirect(url)
  NextResponse.next({request:{headers}})  ← Middleware pass-through with modified headers

COOKIES
  Read:   (await cookies()).get('name')?.value
  Set:    cookieStore.set('name', value, { httpOnly, secure, sameSite, maxAge, path })
  Delete: cookieStore.delete('name')
  Server Components: read-only (cannot set)
  Server Actions / Route Handlers: read + write
  Rules: httpOnly:true for sessions, secure:true in prod, sameSite:'lax', path:'/'

HEADERS
  Read:  (await headers()).get('name')
  Middleware injection: set x-user-id, x-user-role in requestHeaders
    → Server Components read them → no repeated DB session lookups
  Security headers: configure in next.config.ts headers() for ALL routes
  headers() makes route dynamic (same as cookies())

REDIRECTS
  redirect('/path')              ← Server Component / Action (307, throws)
  permanentRedirect('/path')     ← SEO permanent move (308, throws)
  router.push('/path')           ← Client Component, adds history
  router.replace('/path')        ← Client Component, replaces history (post-login)
  NextResponse.redirect(url)     ← Middleware / Route Handler
  next.config.ts redirects()     ← static, no business logic
  NEVER: redirect() inside try/catch (it throws internally)
  ALWAYS: validate callbackUrl starts with '/' (prevent open redirect)

BFF PATTERN
  Server Component → external API: no Route Handler needed (for SSR-only data)
  Route Handler BFF: needed when Client Components fetch data via TanStack Query
  Benefits: API keys hidden, response shaped, parallel aggregation, caching
  Timeout: AbortController + setTimeout → 504 on timeout
  Cache: public s-maxage for shared data, private/no-store for user data
  Validate: Zod on external API responses → don't trust external schemas

ERROR HANDLING
  Return errors: validation, business rules, "not found" for user input
    → useActionState shows inline field errors
  Throw errors: DB failure, auth violation, programming bugs
    → error.tsx boundary with reset() + error.digest
  notFound(): → nearest not-found.tsx
  error.digest: correlates client error report to server log ✅
  NEVER: expose raw error.message / stack trace to client
  ALWAYS: log unexpected errors server-side with context
  error.tsx per segment: /products/error.tsx, /dashboard/error.tsx
  global-error.tsx: must include <html><body> (last resort)
```

---

> **Your next action:** Open your project and find one form that uses `useState` for `isLoading`, `error`, and `success`. Refactor it to use `useActionState` + a Server Action. Delete the three `useState` calls, add `'use server'` to the handler function, and replace the `fetch()` call with a direct DB operation. Run the form — watch the state management collapse from 30 lines to 5.
>
> _Doing one small thing beats opening a feed._
