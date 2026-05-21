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
