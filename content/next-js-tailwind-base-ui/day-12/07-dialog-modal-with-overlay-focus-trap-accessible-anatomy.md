# 7 — Dialog — Modal with Overlay, Focus Trap, Accessible Anatomy

---

## T — TL;DR

`Dialog` renders a modal that traps focus, prevents body scroll, closes on Escape, and sets `aria-modal`. Anatomy: `Root → Trigger → Portal → Backdrop → Popup → Title → Description → Close`. Always include `Title` and `Description` for screen reader accessibility.

---

## K — Key Concepts

### Dialog Anatomy and Reusable Wrapper

```tsx
// src/components/ui/dialog.tsx
"use client";

import * as DialogPrimitive from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";

const DialogRoot = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>;
}

function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 bg-black/50 backdrop-blur-sm z-40",
        "transition-opacity duration-200",
        "data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function DialogPopup({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        // Layout — centered in viewport
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "z-50 w-full max-w-lg mx-4",
        // Visual
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "rounded-2xl shadow-2xl outline-none",
        // Transition
        "transition-all duration-200 ease-out",
        "data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:-translate-x-1/2 data-[starting-style]:-translate-y-[calc(50%-8px)]",
        "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Popup>
  );
}

function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        "px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
}

function DialogTitle({
  className,
  children,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-lg font-semibold text-gray-900 dark:text-white leading-tight",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  className,
  children,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-1",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4",
        "border-t border-gray-100 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
}

function DialogClose({
  className,
  children,
  ...props
}: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      className={cn(
        "inline-flex items-center justify-center size-8 rounded-xl shrink-0",
        "text-gray-400 dark:text-gray-500",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "hover:text-gray-700 dark:hover:text-gray-300",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
      {...props}
    >
      {children ?? "✕"}
    </DialogPrimitive.Close>
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  Body: DialogBody,
  Footer: DialogFooter,
  Close: DialogClose,
};
```

### Usage — Confirmation Dialog

```tsx
// src/components/confirm-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  variant?: "danger" | "primary";
  children: React.ReactNode; // The trigger
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  variant = "danger",
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={children as React.ReactElement} />

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Header>
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close />
          </Dialog.Header>

          <Dialog.Footer>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant}
              size="sm"
              onClick={handleConfirm}
              isLoading={loading}
            >
              {variant === "danger" ? "Delete" : "Confirm"}
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Usage:
<ConfirmDialog
  title="Delete account?"
  description="This action cannot be undone. All your data will be permanently deleted."
  onConfirm={handleDelete}
  variant="danger"
>
  <Button variant="danger">Delete account</Button>
</ConfirmDialog>;
```

---

## W — Why It Matters

- `Dialog.Title` and `Dialog.Description` are not optional from an accessibility standpoint — screen readers announce `aria-labelledby` and `aria-describedby` when the dialog opens. Without them, a screen reader user only hears "dialog" with no context. Base UI auto-wires these IDs, but you must render the components.
- `Dialog.Backdrop` with `backdrop-blur-sm` provides the modern frosted glass backdrop effect — but ensure sufficient opacity (`bg-black/50` minimum) so the backdrop clearly separates the dialog from the content behind it for users with visual processing difficulties.
- Focus trap is the hardest part of an accessible dialog — Base UI manages it automatically. Do not add `tabIndex={-1}` or `tabIndex={0}` to elements inside the dialog unless you have a specific reason, as it affects the focus trap's tab order.

---

## I — Interview Q&A

### Q1: What does `Dialog.Backdrop` vs `Dialog.Popup` do in Base UI, and why are both needed?

**A:** `Dialog.Backdrop` renders the overlay — a fixed full-screen element behind the dialog popup that visually darkens the page and captures clicks to close the dialog. It receives `data-starting-style` and `data-ending-style` for fade-in/out animations. `Dialog.Popup` renders the dialog container itself — the white card centered in the viewport that contains the actual content. It receives `aria-modal="true"`, `role="dialog"`, and the focus trap behaviour. Both are needed because they have separate visual and functional roles: the backdrop is the dim overlay, the popup is the focused content. They can be styled and animated independently — the backdrop fades while the popup can scale in from a slightly smaller size.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Missing `Dialog.Title` — screen readers announce only "dialog" with no context

```tsx
{
  /* ❌ No title — screen reader says "dialog" — no context for user */
}
<Dialog.Popup>
  <p>Are you sure you want to delete this item?</p>
  <button>Yes</button>
  <button>No</button>
</Dialog.Popup>;
```

**Fix:** Always include `Dialog.Title` and optionally `Dialog.Description`:

```tsx
{
  /* ✅ Screen reader announces: "Delete item dialog" then description */
}
<Dialog.Popup>
  <Dialog.Header>
    <Dialog.Title>Delete item</Dialog.Title>
    <Dialog.Description>This action cannot be undone.</Dialog.Description>
  </Dialog.Header>
  <Dialog.Footer>
    <button>Yes, delete</button>
    <button>Cancel</button>
  </Dialog.Footer>
</Dialog.Popup>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<FormDialog>` — a dialog triggered by a button that contains a small form (name + email), a loading state on submit, and closes on successful submission. Use fully controlled mode.

### Solution

```tsx
// src/components/form-dialog.tsx
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export function FormDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setOpen(false);
    setForm({ name: "", email: "" });
  }

  const inputCls = cn(
    "w-full px-3 py-2.5 text-sm rounded-xl border",
    "border-gray-300 dark:border-gray-600",
    "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
    "placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "transition-colors"
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="px-5 py-2.5 bg-blue-600 text-white
                                   font-semibold text-sm rounded-xl
                                   hover:bg-blue-700 transition-colors
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Invite member
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup>
          <Dialog.Header>
            <div>
              <Dialog.Title>Invite a team member</Dialog.Title>
              <Dialog.Description>
                They'll receive an invitation email to join your workspace.
              </Dialog.Description>
            </div>
            <Dialog.Close />
          </Dialog.Header>

          <form onSubmit={handleSubmit}>
            <Dialog.Body className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Alex Johnson"
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="alex@company.com"
                  className={inputCls}
                />
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl
                                  border border-gray-300 dark:border-gray-600
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-50 dark:hover:bg-gray-700
                                  transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl
                                  bg-blue-600 text-white hover:bg-blue-700
                                  transition-all active:scale-[0.98]
                                  disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? "⟳ Sending…" : "Send invitation"}
              </button>
            </Dialog.Footer>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

---
