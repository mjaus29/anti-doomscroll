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
