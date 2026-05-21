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
