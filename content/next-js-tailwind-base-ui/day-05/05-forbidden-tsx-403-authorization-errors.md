# 5 — `forbidden.tsx` — 403 Authorization Errors

---

## T — TL;DR

`forbidden.tsx` is a special file that renders when you call `forbidden()` from a Server Component. It signals **"you are authenticated but not authorized"** — the user is logged in but lacks permission for this resource. It returns HTTP 403 and renders your custom UI.

---

## K — Key Concepts

### `forbidden()` vs `notFound()` vs `redirect()`

```
forbidden()  → HTTP 403 — user is authenticated, lacks permission
              "You don't have access to this resource"
              Shows forbidden.tsx

notFound()   → HTTP 404 — resource doesn't exist (or intentionally hidden)
              "This resource doesn't exist"
              Shows not-found.tsx

redirect()   → HTTP 307/308 — move user to another page
              Used for: unauthenticated users (→ /login)
              NOT for: authenticated users lacking permission (use forbidden())

unauthorized() → HTTP 401 — user is NOT authenticated
                "Please sign in to access this"
                Shows unauthorized.tsx
```

### Import and Usage

```tsx
// src/app/admin/page.tsx
import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();

  // Not authenticated → redirect to login
  if (!user) redirect("/login?redirect=/admin");

  // Authenticated but not admin → 403 Forbidden
  if (user.role !== "admin") {
    forbidden(); // ← throws internally, stops execution
  }

  return <AdminDashboard />;
}
```

### `forbidden.tsx` File

```tsx
// src/app/forbidden.tsx — root level, catches all forbidden() calls
// without a closer handler
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "403 — Forbidden" };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don't have permission to view this page. Contact your
          administrator if you believe this is a mistake.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm
                           font-medium rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="mailto:support@example.com"
            className="px-5 py-2.5 border text-gray-600 text-sm
                           font-medium rounded-lg hover:bg-gray-50"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Section-Level `forbidden.tsx`

```tsx
// src/app/admin/forbidden.tsx
// Shows when forbidden() is called within /admin/* routes
// Renders inside parent layout (if any)

export default function AdminForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">🔐</div>
      <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        This area is restricted to administrators. Request access from your
        organization owner.
      </p>
    </div>
  );
}
```

---

## W — Why It Matters

- `forbidden()` vs `notFound()` is a security design decision — returning 404 for an unauthorized resource prevents enumeration attacks (user can't tell if the resource exists or they just lack access). Use `notFound()` for sensitive resources you want to hide entirely, `forbidden()` for resources users know about but can't access.
- HTTP 403 semantics are important for API consumers and monitoring systems — a proper 403 response is distinguishable from 404 in logs, alerting, and automated tools.
- The separation of `forbidden()` (authenticated, no permission) and `unauthorized()` (not authenticated) enables different UX flows: forbidden shows an "ask your admin" message, unauthorized shows a login prompt.

---

## I — Interview Q&A

### Q1: When should you use `forbidden()` vs `notFound()` for protected resources?

**A:** Use `forbidden()` when the resource exists and the user is authenticated but lacks permission — this is semantically correct (403) and tells the user they need elevated access. Use `notFound()` when you want to hide the existence of a resource entirely for security — a 404 response doesn't reveal whether the resource exists, preventing enumeration attacks. For example, admin settings: use `forbidden()` — the user knows admin settings exist. For private user data: use `notFound()` — don't reveal other users' data exists.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `redirect('/login')` for authenticated users with wrong permissions

```tsx
// ❌ User is logged in but not admin — sending them to login is wrong
if (user.role !== "admin") redirect("/login");
// User logs in again (already logged in!) → back to /admin → same redirect → infinite loop
```

**Fix:**

```tsx
if (!user) redirect("/login?redirect=/admin"); // not authenticated
if (user.role !== "admin") forbidden(); // authenticated, wrong role
```

---

## K — Coding Challenge + Solution

### Challenge

Build `/dashboard/billing` that requires `plan === 'pro'`. Free users see `forbidden()`. The section-level `forbidden.tsx` shows an upgrade CTA.

### Solution

```tsx
// src/app/(dashboard)/dashboard/billing/page.tsx
import { forbidden } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.plan !== "pro" && user.plan !== "enterprise") forbidden();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Billing</h1>
      <p className="text-gray-600">Pro plan — active ✅</p>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/billing/forbidden.tsx
import Link from "next/link";

export default function BillingForbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center
                    min-h-[400px] text-center px-4"
    >
      <div className="text-5xl mb-4">⭐</div>
      <h2 className="text-xl font-bold mb-2">Pro Feature</h2>
      <p className="text-gray-500 text-sm max-w-xs mb-6">
        Billing management is available on the Pro plan. Upgrade to unlock
        invoices, payment methods, and usage reports.
      </p>
      <Link
        href="/pricing"
        className="px-5 py-2.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg hover:bg-blue-700"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
```

---

---
