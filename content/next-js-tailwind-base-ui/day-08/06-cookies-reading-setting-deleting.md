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
