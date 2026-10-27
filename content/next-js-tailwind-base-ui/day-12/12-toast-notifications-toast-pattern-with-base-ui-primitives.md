# 12 — Toast / Notifications — Toast Pattern with Base UI Primitives

---

## T — TL;DR

`@base-ui/react/toast` provides a full toast notification system — a `Toast.Provider` that owns the queue, a `Toast.useToastManager()` hook (this lesson wraps it as `useToast`) whose `add({ title, description, type, timeout, actionProps })` creates toasts, a `Toast.Portal` + `Toast.Viewport` that render the stack, and per-toast `Root`/`Content`/`Title`/`Description`/`Action`/`Close` anatomy. Toasts are live regions announced by screen readers automatically.

---

## K — Key Concepts

### Toast Anatomy

```tsx
{
  /* ─── Full anatomy (stacked toasts) */
}
import { Toast } from "@base-ui/react/toast";

{
  /* 1. Toast.Provider — creates the toast context / queue; wrap the app once */
}
<Toast.Provider>
  {children}
  {/* 2. Portal — moves the viewport to <body> */}
  <Toast.Portal>
    {/* 3. Viewport — wraps the stack (an ARIA live region) */}
    <Toast.Viewport>
      {/* 4. One Toast.Root per toast, rendered from useToastManager().toasts */}
      <Toast.Root toast={toast}>
        <Toast.Content>
          <Toast.Title /> {/* renders toast.title */}
          <Toast.Description /> {/* renders toast.description */}
          <Toast.Action /> {/* renders toast.actionProps */}
          <Toast.Close /> {/* dismiss button */}
        </Toast.Content>
      </Toast.Root>
    </Toast.Viewport>
  </Toast.Portal>
</Toast.Provider>;
```

Toasts are **data, not JSX you pass in**: you call `toastManager.add({ title, description, type, timeout, actionProps })` and a list component renders every entry of `useToastManager().toasts` with `<Toast.Root toast={toast}>`. There is no `render` option on `add()`.

### Full Toast Implementation

```tsx
// src/components/ui/toast.tsx
"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "@/lib/cn";

// ─── Provider — wrap app root once
export const ToastProvider = ToastPrimitive.Provider;

// ─── Variants map to Base UI's `type` field (sets data-type on Root)
type ToastVariant = "default" | "success" | "error" | "warning" | "info";

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  success: "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800",
  error: "bg-white dark:bg-gray-800 border-red-200 dark:border-red-800",
  warning: "bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-800",
  info: "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  default: "🔔",
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

const VARIANT_TITLE_COLOR: Record<ToastVariant, string> = {
  default: "text-gray-900 dark:text-white",
  success: "text-green-800 dark:text-green-200",
  error: "text-red-800 dark:text-red-200",
  warning: "text-amber-800 dark:text-amber-200",
  info: "text-blue-800 dark:text-blue-200",
};

// ─── Individual toast — renders ONE entry of the manager's `toasts` array
function ToastItem({ toast }: { toast: ToastPrimitive.Root.ToastObject }) {
  const variant = (toast.type as ToastVariant | undefined) ?? "default";

  return (
    <ToastPrimitive.Root
      toast={toast}
      className={cn(
        // Layout
        "flex items-start gap-3 p-4 rounded-2xl",
        "border shadow-lg",
        "w-full pointer-events-auto",
        // Transition — slide in from right + fade
        "transition-all duration-300 ease-out",
        "data-[starting-style]:opacity-0 data-[starting-style]:translate-x-4",
        "data-[ending-style]:opacity-0   data-[ending-style]:translate-x-4",
        // Variant color
        VARIANT_STYLES[variant]
      )}
    >
      {/* Icon */}
      <span className="shrink-0 text-xl leading-none mt-0.5">
        {VARIANT_ICONS[variant]}
      </span>

      {/* Content — Title/Description render toast.title / toast.description */}
      <ToastPrimitive.Content className="flex-1 min-w-0 space-y-1">
        <ToastPrimitive.Title
          className={cn(
            "text-sm font-semibold leading-tight",
            VARIANT_TITLE_COLOR[variant]
          )}
        />
        <ToastPrimitive.Description className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" />
        {/* Action button — rendered from toast.actionProps (children + onClick) */}
        {toast.actionProps && (
          <ToastPrimitive.Action
            className="mt-2 text-xs font-semibold text-blue-600
                        dark:text-blue-400 hover:text-blue-800
                        dark:hover:text-blue-300 transition-colors
                        focus-visible:outline-hidden focus-visible:ring-2
                        focus-visible:ring-blue-500 focus-visible:rounded-sm"
          />
        )}
      </ToastPrimitive.Content>

      {/* Close button */}
      <ToastPrimitive.Close
        className="shrink-0 size-6 rounded-lg flex items-center justify-center
                    text-gray-400 dark:text-gray-500 text-xs
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    hover:text-gray-600 dark:hover:text-gray-300
                    transition-colors
                    focus-visible:outline-hidden focus-visible:ring-2
                    focus-visible:ring-gray-400"
        aria-label="Dismiss notification"
      >
        ✕
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ─── Viewport — Portal + Viewport + the list (add once, INSIDE the Provider)
export function ToastViewport({ className }: { className?: string }) {
  const { toasts } = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        className={cn(
          // Fixed stack in bottom-right corner
          "fixed bottom-4 right-4 z-[100]",
          "flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]",
          "outline-hidden",
          className
        )}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

// ─── useToast hook — the imperative API to trigger toasts
interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  timeout?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast() {
  const toastManager = ToastPrimitive.useToastManager();

  function toast({
    title,
    description,
    variant = "default",
    timeout = 5000,
    actionLabel,
    onAction,
  }: ToastOptions) {
    return toastManager.add({
      title,
      description,
      type: variant, // → data-type on Toast.Root, read back in ToastItem
      timeout, // ms; 0 disables auto-dismiss
      priority: variant === "error" ? "high" : "low", // high = urgent announcement
      actionProps:
        actionLabel && onAction
          ? { children: `${actionLabel} →`, onClick: onAction }
          : undefined,
    });
  }

  return {
    toast,
    success: (title: string, description?: string) =>
      toast({ title, description, variant: "success", timeout: 4000 }),
    error: (title: string, description?: string) =>
      toast({ title, description, variant: "error", timeout: 6000 }),
    warning: (title: string, description?: string) =>
      toast({ title, description, variant: "warning", timeout: 5000 }),
    info: (title: string, description?: string) =>
      toast({ title, description, variant: "info", timeout: 4000 }),
  };
}
```

### Provider + Viewport in Layout

```tsx
// src/app/layout.tsx
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
          {/* Viewport renders all active toasts — one instance per app,
              and it must sit INSIDE the provider (it calls useToastManager) */}
          <ToastViewport />
        </ToastProvider>
      </body>
    </html>
  );
}
```

### Usage — Triggering Toasts

```tsx
// src/components/toast-demo.tsx
"use client";

import { useToast } from "@/components/ui/toast";

export function ToastDemo() {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-3 p-6">
      <button
        onClick={() =>
          toast.success("Changes saved", "Your profile has been updated.")
        }
        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-green-700 transition-colors"
      >
        Success toast
      </button>

      <button
        onClick={() => toast.error("Upload failed", "File exceeds 10MB limit.")}
        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-red-700 transition-colors"
      >
        Error toast
      </button>

      <button
        onClick={() =>
          toast.warning(
            "Storage almost full",
            "You are using 92% of your storage."
          )
        }
        className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold
                    rounded-xl hover:bg-amber-600 transition-colors"
      >
        Warning toast
      </button>

      <button
        onClick={() =>
          toast.toast({
            title: "Deployment started",
            description: "v1.2.3 is being deployed to production.",
            variant: "info",
            actionLabel: "View logs",
            onAction: () => console.log("View logs clicked"),
          })
        }
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold
                    rounded-xl hover:bg-blue-700 transition-colors"
      >
        Info + action toast
      </button>
    </div>
  );
}
```

---

## W — Why It Matters

- `Toast.Viewport` is an ARIA live region — screen readers announce new toasts automatically when they appear. This means users with visual impairments get the same feedback as sighted users without any extra work on your part.
- The imperative `useToast()` hook pattern (call `toast.success(...)` from event handlers) is superior to state-driven toast arrays because toasts are fire-and-forget notifications, not part of the render tree's data model. Keeping them in a queue managed by `ToastProvider` rather than in `useState` means they survive component unmounts and can be triggered from async callbacks.
- `timeout` on each toast ensures toasts auto-dismiss — leaving toasts on screen indefinitely creates visual clutter and can block interactive content on smaller screens. 4–6 seconds is the standard range, with longer timeouts for error toasts that may require action.

---

## I — Interview Q&A

### Q1: Why is a toast notification accessible without extra ARIA attributes, and what does Base UI handle automatically?

**A:** `Toast.Viewport` renders as an ARIA live region (toasts are announced politely by default and urgently when added with `priority: "high"`) which instructs screen readers to announce any new content added to it. When a toast appears, its `Toast.Title` and `Toast.Description` text is read aloud immediately without the user needing to navigate to it. Base UI manages the live region, the toast roles and the announcement timing. You only need to ensure the title and description text is meaningful and concise.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Placing `ToastViewport` inside a component that unmounts — toasts disappear

```tsx
{
  /* ❌ Viewport inside a page component — unmounts when navigating */
}
export default function DashboardPage() {
  return (
    <>
      <DashboardContent />
      <ToastViewport /> {/* ← unmounts on navigation — active toasts vanish */}
    </>
  );
}
```

**Fix:** Place `ToastViewport` and `ToastProvider` in `layout.tsx` — they persist across page navigations:

```tsx
{
  /* ✅ In root layout — persists across all routes */
}
export default function RootLayout({ children }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastViewport /> {/* ← always mounted */}
    </ToastPrimitive.Provider>
  );
}
```

### ❌ Pitfall: Triggering toasts from Server Components — `useToast` is client-only

```tsx
{/* ❌ Cannot use useToast in a Server Component */}
export default async function ServerPage() {
  const toast = useToast()  // ← Error: hooks don't work in Server Components
```

**Fix:** Move the toast trigger into a `'use client'` component:

```tsx
{
  /* ✅ Client component handles user interaction and toast */
}
("use client");
export function DeleteButton({ id }: { id: string }) {
  const toast = useToast();
  async function handleDelete() {
    await deleteItem(id);
    toast.success("Item deleted");
  }
  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SaveFormButton>` that:

1. Calls a mock async `saveForm()` API
2. Shows an info toast when save starts: "Saving changes…"
3. On success: shows success toast with action "View history"
4. On error: shows error toast with action "Retry" that re-triggers the save
5. Prevents double-submission while saving (`disabled` during load)
6. Uses the `useToast` hook

### Solution

```tsx
// src/components/save-form-button.tsx
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

// Mock async API
async function saveForm(): Promise<void> {
  await new Promise((resolve, reject) =>
    setTimeout(
      () =>
        Math.random() > 0.3
          ? resolve(undefined)
          : reject(new Error("Network error")),
      1500
    )
  );
}

export function SaveFormButton() {
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    toast.info("Saving changes…", "Your form data is being saved.");

    try {
      await saveForm();
      toast.success("Changes saved", "Your form has been saved successfully.");
    } catch {
      toast.toast({
        title: "Save failed",
        description: "Unable to save. Please check your connection.",
        variant: "error",
        actionLabel: "Retry",
        onAction: handleSave,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={cn(
        "inline-flex items-center gap-2",
        "px-6 py-2.5 rounded-xl text-sm font-semibold text-white",
        "transition-all duration-150 active:scale-[0.98]",
        "focus-visible:outline-hidden focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        saving ? "bg-blue-400 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
      )}
    >
      {saving && <span className="animate-spin text-sm leading-none">⟳</span>}
      {saving ? "Saving…" : "Save changes"}
    </button>
  );
}
```

---

---
