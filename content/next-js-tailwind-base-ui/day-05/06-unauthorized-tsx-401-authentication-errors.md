# 6 — `unauthorized.tsx` — 401 Authentication Errors

---

## T — TL;DR

`unauthorized.tsx` renders when you call `unauthorized()` — it signals **"you are not authenticated at all"**. It returns HTTP 401 and shows a sign-in prompt. It's the programmatic equivalent of redirecting to `/login`, but keeps users on the current URL with an inline auth prompt instead of navigating away.

---

## K — Key Concepts

### `unauthorized()` vs `redirect('/login')`

```
redirect('/login'):
  → Changes URL to /login
  → User must log in, then is returned to original URL (if redirect param set)
  → Always navigates away from the current page
  → Simple and common — correct for most cases

unauthorized():
  → Keeps URL as-is (e.g., /dashboard)
  → Renders unauthorized.tsx inline (sign-in form/prompt on the page)
  → HTTP 401 status code
  → Better when: the page itself should prompt auth inline
  → Use for: API-like flows, partial page auth, embeddable content
```

### Usage

```tsx
// src/app/dashboard/page.tsx
import { unauthorized } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    unauthorized(); // ← renders unauthorized.tsx, keeps URL as /dashboard
  }

  return <Dashboard user={user} />;
}
```

### `unauthorized.tsx` File

```tsx
// src/app/unauthorized.tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "401 — Sign In Required" };

export default function UnauthorizedPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center
                    bg-gray-50 px-4"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Sign In Required
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          You need to be signed in to access this page.
        </p>
        <Link
          href="/login"
          className="block w-full py-2.5 bg-blue-600 text-white text-sm
                     font-medium rounded-lg hover:bg-blue-700 transition-colors
                     text-center"
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="block mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Don't have an account? Sign up
        </Link>
      </div>
    </div>
  );
}
```

### When to Use `unauthorized()` vs `redirect('/login')`

```
Use redirect('/login?redirect=<current-url>'):
  ✅ Standard protected pages (dashboard, settings, account)
  ✅ You want users to clearly land on the login page
  ✅ Simple, widely understood UX pattern

Use unauthorized():
  ✅ Embeddable widgets or sections that inline-prompt for auth
  ✅ API routes that return 401 semantically
  ✅ When the URL should stay the same (share the locked-page URL)
  ✅ Progressive disclosure — show what the page IS, but require login to use it
```

---

## W — Why It Matters

- The 401 vs 403 distinction is semantically important for any app with an API layer — 401 means "who are you?", 403 means "I know who you are, you can't do this." Correct HTTP semantics improve debuggability and API consumer experience.
- Keeping the URL unchanged while showing `unauthorized.tsx` is a UX pattern for shareable locked content — a user can share `/dashboard/reports` and the recipient sees a sign-in prompt in context rather than being immediately redirected to a generic login page.

---

## I — Interview Q&A

### Q1: What is the difference between `unauthorized()` and `redirect('/login')`?

**A:** Both handle unauthenticated users, but differently. `redirect('/login')` navigates the user to the login page — the URL changes, the user logs in and returns. `unauthorized()` keeps the current URL and renders `unauthorized.tsx` inline — the user sees an authentication prompt on the same page. Use `redirect('/login')` for standard protected pages where login is the primary action. Use `unauthorized()` when the URL itself is meaningful to preserve, when building inline auth experiences, or when correct HTTP 401 semantics matter (API consumers, monitoring).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Confusing `unauthorized()` with `forbidden()`

```tsx
// ❌ User is logged in but not admin — calling unauthorized() is semantically wrong
if (!user.isAdmin) unauthorized(); // wrong HTTP code (401 vs 403)
```

**Fix:**

```tsx
if (!user) unauthorized(); // 401 — not authenticated
if (!user.isAdmin) forbidden(); // 403 — authenticated, no permission
```

---

## K — Coding Challenge + Solution

### Challenge

Build `unauthorized.tsx` that renders an inline login form (email + password), shows the page title in the prompt ("Sign in to access Reports"), and has a link to `/register`.

### Solution

```tsx
// src/app/(dashboard)/dashboard/reports/unauthorized.tsx
import Link from "next/link";

export default function ReportsUnauthorized() {
  return (
    <div className="flex items-center justify-center min-h-[500px] px-4">
      <div className="bg-white border rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-lg font-bold text-gray-900">
            Sign in to access Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Reports are only available to signed-in users.
          </p>
        </div>
        <form action="/api/auth/login" method="POST" className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full border rounded-lg px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 text-white text-sm
                       font-medium rounded-lg hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-4">
          No account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

---
