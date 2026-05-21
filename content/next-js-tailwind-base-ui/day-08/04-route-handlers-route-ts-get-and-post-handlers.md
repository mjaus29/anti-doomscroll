# 4 — Route Handlers — `route.ts`, GET and POST Handlers

---

## T — TL;DR

A **Route Handler** (`route.ts`) creates an HTTP API endpoint inside the App Router. It handles any HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) and returns a `Response` or `NextResponse`. Use it for webhooks, public APIs, and any endpoint called by external services.

---

## K — Key Concepts

### Basic Route Handler Structure

```
File system routing for Route Handlers:
  src/app/api/products/route.ts           → /api/products
  src/app/api/products/[id]/route.ts      → /api/products/:id
  src/app/api/webhooks/stripe/route.ts    → /api/webhooks/stripe
  src/app/(dashboard)/api/stats/route.ts  → /api/stats (route group)

Rules:
  → File MUST be named route.ts (or route.js)
  → Cannot coexist with page.tsx at the same path level
  → Exports: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  → Each export is one HTTP method handler
```

### GET Handler — Read Data

```tsx
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── GET /api/products
// ─── GET /api/products?category=shoes&limit=10
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Parse query params
  const category = searchParams.get("category");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const [products, total] = await Promise.all([
      db.product.findMany({
        where: category ? { category } : undefined,
        take: Math.min(limit, 100), // cap at 100
        skip: offset,
        orderBy: { createdAt: "desc" },
      }),
      db.product.count({
        where: category ? { category } : undefined,
      }),
    ]);

    return NextResponse.json(
      {
        data: products,
        meta: { total, limit, offset, hasMore: offset + limit < total },
      },
      {
        status: 200,
        headers: {
          // Cache at CDN for 60s, stale-while-revalidate for 5 min
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### POST Handler — Create Data

```tsx
// src/app/api/products/route.ts (continued)
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.string().min(1),
  stock: z.number().int().nonnegative().default(0),
});

// ─── POST /api/products
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const result = CreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 422 } // Unprocessable Entity
      );
    }

    // 2. Authenticate (verify bearer token or session)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 3. Write to DB
    const product = await db.product.create({
      data: { ...result.data, createdBy: userId },
    });

    // 4. Return 201 Created with the new resource
    return NextResponse.json(
      { data: product },
      {
        status: 201,
        headers: {
          Location: `/api/products/${product.id}`, // Location header for REST
        },
      }
    );
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Handler — Single Resource

```tsx
// src/app/api/products/[id]/route.ts

type Params = { params: Promise<{ id: string }> };

// GET /api/products/:id
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const product = await db.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product });
}

// PUT /api/products/:id — full update
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const result = UpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422 }
    );
  }

  const product = await db.product.update({
    where: { id },
    data: result.data,
  });

  return NextResponse.json({ data: product });
}

// PATCH /api/products/:id — partial update
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const partial = UpdateSchema.partial().safeParse(body);

  if (!partial.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const product = await db.product.update({
    where: { id },
    data: partial.data,
  });

  return NextResponse.json({ data: product });
}

// DELETE /api/products/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  await db.product.delete({ where: { id } });

  return new Response(null, { status: 204 }); // 204 No Content
}
```

### HTTP Status Code Reference for Route Handlers

```tsx
// Common status codes for REST API Route Handlers:

// ─── Success
return NextResponse.json({ data }, { status: 200 }); // OK (GET, PUT, PATCH)
return NextResponse.json({ data }, { status: 201 }); // Created (POST)
return new Response(null, { status: 204 }); // No Content (DELETE)

// ─── Client errors
return NextResponse.json({ error }, { status: 400 }); // Bad Request (malformed)
return NextResponse.json({ error }, { status: 401 }); // Unauthorized (no auth)
return NextResponse.json({ error }, { status: 403 }); // Forbidden (no permission)
return NextResponse.json({ error }, { status: 404 }); // Not Found
return NextResponse.json({ error }, { status: 405 }); // Method Not Allowed
return NextResponse.json({ error }, { status: 409 }); // Conflict (duplicate)
return NextResponse.json({ error }, { status: 422 }); // Unprocessable (validation)
return NextResponse.json({ error }, { status: 429 }); // Too Many Requests (rate limit)

// ─── Server errors
return NextResponse.json({ error }, { status: 500 }); // Internal Server Error
return NextResponse.json({ error }, { status: 503 }); // Service Unavailable
```

---

## W — Why It Matters

- Route Handlers are the correct tool for any endpoint that needs to be callable from outside your Next.js app — Stripe webhooks, GitHub actions, mobile apps, third-party integrations. Server Actions cannot serve this role.
- The `params: Promise<{ id: string }>` pattern in Next.js 16 (params is now a Promise) is a breaking change from Next.js 14 — forgetting to `await params` is the most common migration error from older versions.
- Proper HTTP status codes (`201 Created`, `204 No Content`, `422 Unprocessable Entity`) are what make a REST API correct and usable by API consumers — returning `200` for everything breaks client error handling.

---

## I — Interview Q&A

### Q1: What is a Route Handler in Next.js and when should you use one instead of a Server Action?

**A:** A Route Handler is a file named `route.ts` in the App Router that exports named functions for HTTP methods (GET, POST, PUT, etc.), creating a public HTTP endpoint. Use Route Handlers for webhooks from external services (Stripe, GitHub), REST APIs consumed by mobile apps or third-party clients, endpoints requiring custom HTTP headers or status codes, and Server-Sent Events. Use Server Actions for mutations triggered by your own Next.js UI — they're type-safe, require no URL, have automatic CSRF protection, and integrate with Next.js cache. The rule: internal UI mutations → Server Actions, external HTTP consumers → Route Handlers.

### Q2: How do you access route parameters in a Route Handler in Next.js 16?

**A:** In Next.js 16, `params` is a Promise that must be awaited. The handler signature is `async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })`. You access the params with `const { id } = await params`. This is a change from Next.js 14 where `params` was a plain object — forgetting to await it is the most common migration error.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Not returning a Response from a Route Handler

```tsx
// ❌ Missing return — Next.js will throw an error
export async function GET(request: NextRequest) {
  const data = await db.products.findMany();
  // ← no return statement! Next.js requires a Response
}
```

**Fix:** Always return a `Response` or `NextResponse`:

```tsx
export async function GET(request: NextRequest) {
  const data = await db.product.findMany();
  return NextResponse.json({ data }); // ← always return ✅
}
```

### ❌ Pitfall: Not awaiting `params` in Next.js 16

```tsx
// ❌ params is a Promise in Next.js 16 — not awaited
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // ← wrong type
) {
  const id = params.id; // ← params might be a pending Promise ❌
}
```

**Fix:**

```tsx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← correct type ✅
) {
  const { id } = await params; // ← awaited ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete `/api/notes` REST API with:

1. `GET /api/notes` — list all notes (with optional `?color=` filter)
2. `POST /api/notes` — create a note (Zod validation, returns 201)
3. `GET /api/notes/[id]` — get one note (404 if not found)
4. `PATCH /api/notes/[id]` — partial update
5. `DELETE /api/notes/[id]` — delete, returns 204
6. Consistent error format: `{ error: string, details?: any }`

### Solution

```tsx
// src/app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
}

let NOTES: Note[] = [
  {
    id: "n1",
    title: "Standup Notes",
    content: "Ship feature X",
    color: "yellow",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Ideas",
    content: "Build a note app",
    color: "blue",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Grocery List",
    content: "Milk, bread, butter",
    color: "green",
    createdAt: new Date().toISOString(),
  },
];

const CreateNoteSchema = z.object({
  title: z.string().min(1, "Title required").max(200),
  content: z.string().min(1, "Content required").max(5000),
  color: z.enum(["white", "yellow", "blue", "green", "pink"]).default("white"),
});

// ─── GET /api/notes ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const color = request.nextUrl.searchParams.get("color");

  const notes = color ? NOTES.filter((n) => n.color === color) : NOTES;

  return NextResponse.json(
    { data: notes, total: notes.length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// ─── POST /api/notes ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = CreateNoteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const newNote: Note = {
    id: `n${Date.now()}`,
    ...result.data,
    createdAt: new Date().toISOString(),
  };
  NOTES = [...NOTES, newNote];

  return NextResponse.json(
    { data: newNote },
    {
      status: 201,
      headers: { Location: `/api/notes/${newNote.id}` },
    }
  );
}
```

```tsx
// src/app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Import the shared NOTES array (in production: use your DB module)
// For this demo, re-declaring for isolation
let NOTES = [
  {
    id: "n1",
    title: "Standup Notes",
    content: "Ship feature X",
    color: "yellow",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Ideas",
    content: "Build a note app",
    color: "blue",
    createdAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "Grocery List",
    content: "Milk, bread, butter",
    color: "green",
    createdAt: new Date().toISOString(),
  },
];

const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  color: z.enum(["white", "yellow", "blue", "green", "pink"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/notes/:id ────────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const note = NOTES.find((n) => n.id === id);
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ data: note });
}

// ─── PATCH /api/notes/:id — partial update ─────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const noteIndex = NOTES.findIndex((n) => n.id === id);
  if (noteIndex === -1) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = UpdateNoteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  NOTES[noteIndex] = { ...NOTES[noteIndex], ...result.data };

  return NextResponse.json({ data: NOTES[noteIndex] });
}

// ─── DELETE /api/notes/:id ─────────────────────────────────────────────────────
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const exists = NOTES.some((n) => n.id === id);
  if (!exists) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  NOTES = NOTES.filter((n) => n.id !== id);

  return new Response(null, { status: 204 }); // 204 No Content
}
```

---

---
