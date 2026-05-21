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
