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
