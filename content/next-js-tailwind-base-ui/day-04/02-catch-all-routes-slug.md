# 2 — Catch-All Routes — `[...slug]`

---

## T — TL;DR

`[...slug]` creates a **required catch-all route** — one `page.tsx` that matches any URL with one or more segments after a given path. The matched segments arrive as a `string[]`. Perfect for documentation sites, CMS-driven pages, and file system browsers.

---

## K — Key Concepts

### The Syntax

```
Folder name          URL pattern              params.slug
─────────────────    ─────────────────────    ────────────────────
[...slug]            /docs/:a/:b/:c/...       string[] (1+ segments)
[...path]            /files/:a/:b/:c/...      string[] (1+ segments)
[...segments]        /:a/:b/:c/...            string[] (1+ segments)

❌ Does NOT match the base path:
  /docs (no segments after base) → 404
  Must use [[...slug]] for optional (see Subtopic 3)
```

### File Placement and URL Mapping

```
src/app/docs/
└── [...slug]/
    └── page.tsx

Matches:
  /docs/getting-started           → slug = ['getting-started']
  /docs/api/auth                  → slug = ['api', 'auth']
  /docs/api/v2/endpoints/create   → slug = ['api', 'v2', 'endpoints', 'create']

Does NOT match:
  /docs                           → 404 (use [[...slug]] for this)
```

### Accessing the Slug Array

```tsx
// src/app/docs/[...slug]/page.tsx
type Params = Promise<{ slug: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  // /docs/api/authentication → slug = ['api', 'authentication']

  const section = slug[0]; // 'api'
  const subsection = slug[1]; // 'authentication'
  const fullPath = slug.join("/"); // 'api/authentication'
  const depth = slug.length; // 2
  const filename = slug[slug.length - 1]; // 'authentication' (last segment)

  return (
    <div>
      <p>Path: {fullPath}</p>
      <p>Depth: {depth} levels</p>
    </div>
  );
}
```

### Real-World: Documentation Site

```tsx
// src/app/docs/[...slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string[] }>;

// Mock content fetcher — in production: MDX/CMS lookup
async function getDocContent(slugPath: string[]) {
  const path = slugPath.join("/");

  const docs: Record<string, { title: string; content: string }> = {
    "getting-started": { title: "Getting Started", content: "..." },
    "getting-started/installation": { title: "Installation", content: "..." },
    "api/overview": { title: "API Overview", content: "..." },
    "api/authentication": { title: "Authentication", content: "..." },
    "api/endpoints/products": { title: "Products Endpoint", content: "..." },
  };

  return docs[path] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocContent(slug);
  return { title: doc?.title ?? "Not Found" };
}

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const doc = await getDocContent(slug);

  if (!doc) notFound();

  // Build breadcrumbs from slug
  const breadcrumbs = slug.map((segment, i) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    href: "/docs/" + slug.slice(0, i + 1).join("/"),
  }));

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <a href="/docs" className="hover:text-gray-700">
          Docs
        </a>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <span>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <a href={crumb.href} className="hover:text-gray-700">
                {crumb.label}
              </a>
            )}
          </span>
        ))}
      </nav>

      <h1 className="text-3xl font-bold mb-6">{doc.title}</h1>
      <div className="prose">{doc.content}</div>
    </article>
  );
}
```

### `generateStaticParams` with Catch-All

```tsx
// src/app/docs/[...slug]/page.tsx
export async function generateStaticParams() {
  // Return all known doc paths to pre-render at build time
  return [
    { slug: ["getting-started"] },
    { slug: ["getting-started", "installation"] },
    { slug: ["getting-started", "configuration"] },
    { slug: ["api", "overview"] },
    { slug: ["api", "authentication"] },
    { slug: ["api", "endpoints", "products"] },
  ];
}
// Next.js pre-renders all these paths at build time
// Any unrecognized path → notFound() at request time (or 404 if fallback: false)
```

### Catch-All + Static Segments Together

```
src/app/docs/
├── page.tsx              → /docs (explicit home — wins over catch-all)
├── changelog/
│   └── page.tsx          → /docs/changelog (explicit — wins)
└── [...slug]/
    └── page.tsx          → /docs/* (everything else)

Priority:
  /docs              → docs/page.tsx (static wins)
  /docs/changelog    → docs/changelog/page.tsx (static wins)
  /docs/api/auth     → docs/[...slug]/page.tsx (catch-all fallback)
```

---

## W — Why It Matters

- Documentation sites, wikis, CMSes, and file browsers all need routes of arbitrary depth — `[...slug]` is the only way to handle this cleanly without creating hundreds of nested route files.
- The slug array lets you reconstruct context at any depth: `slug[0]` is the section, `slug.join('/')` is the full path, `slug.length` tells you how deep the content is — all without any regex.
- Combining `[...slug]` with an explicit `page.tsx` at the base path (e.g., `/docs`) is the correct pattern to handle both the root and all sub-paths without using optional catch-all.
- `generateStaticParams` with catch-all routes is how documentation sites achieve static generation — all known paths pre-rendered at build time, unknown paths resolved on demand.

---

## I — Interview Q&A

### Q1: What is a catch-all route and what URL shapes does `[...slug]` match?

**A:** A catch-all route (`[...slug]`) is a folder that matches any URL with one or more path segments at that position. For `src/app/docs/[...slug]`, it matches `/docs/a`, `/docs/a/b`, `/docs/a/b/c`, and any deeper path. The matched segments arrive as a `string[]`. Critically, it does NOT match the base path `/docs` — that requires either a separate `page.tsx` at `/docs` or an optional catch-all `[[...slug]]`.

### Q2: How is the `slug` param structured for a URL like `/docs/api/v2/auth`?

**A:** `slug` is `['api', 'v2', 'auth']` — an array where each element is one path segment in order. You can access individual segments by index (`slug[0] === 'api'`), reconstruct the full path with `slug.join('/')`, get the last segment with `slug.at(-1)`, or get the depth with `slug.length`.

### Q3: How do you pre-render all paths for a documentation site using catch-all routes?

**A:** Export `generateStaticParams()` from the `[...slug]/page.tsx` — return an array of objects, each with a `slug` key containing a `string[]` of path segments. For example: `[{ slug: ['getting-started'] }, { slug: ['api', 'auth'] }]`. Next.js pre-renders each path at build time. Unknown paths can be handled with `notFound()` at runtime or by configuring `dynamicParams`.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `[...slug]` when the base path also needs to render

```
src/app/docs/[...slug]/page.tsx
// /docs → 404 (catch-all requires at least one segment)
// Developer expects /docs to show a docs home page
```

**Fix:** Either add a separate `page.tsx` at the base, or use optional catch-all:

```
src/app/docs/
├── page.tsx        → /docs (explicit home) ✅
└── [...slug]/
    └── page.tsx    → /docs/* (everything else) ✅
```

### ❌ Pitfall: Treating `slug` as a string instead of array

```tsx
const { slug } = await params;
const path = slug.replace(/-/g, "/"); // TypeError: slug.replace is not a function
// slug is string[] not string
```

**Fix:**

```tsx
const path = slug.join("/"); // ✅ ['api', 'auth'] → 'api/auth'
```

### ❌ Pitfall: Not validating slug depth or content

```tsx
// ❌ Assumes at least 2 segments — crashes on /docs/single
const [section, page] = slug; // page = undefined if only 1 segment
await getDoc(section, page); // unexpected undefined arg
```

**Fix:**

```tsx
const section = slug[0]; // always exists (catch-all requires 1+)
const subsection = slug[1] ?? null; // safely undefined for single-segment paths
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/wiki/[...path]` catch-all route for a company wiki that:

1. Parses the path into `section` (first segment) and `subpath` (rest)
2. Shows a "section not found" if section is invalid (valid: `engineering`, `product`, `design`)
3. Generates metadata with the last path segment as title
4. Builds a breadcrumb from the full path array
5. Pre-generates 4 hardcoded paths with `generateStaticParams`

### Solution

```tsx
// src/app/wiki/[...path]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ path: string[] }>;

const VALID_SECTIONS = ["engineering", "product", "design"];

function labelFromSegment(seg: string): string {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── Static params
export function generateStaticParams() {
  return [
    { path: ["engineering"] },
    { path: ["engineering", "onboarding"] },
    { path: ["product", "roadmap"] },
    { path: ["design", "brand-guidelines"] },
  ];
}

// ─── Metadata
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { path } = await params;
  const lastSeg = path[path.length - 1];
  return {
    title: labelFromSegment(lastSeg),
    description: `Wiki page: ${path.join(" / ")}`,
  };
}

// ─── Page
export default async function WikiPage({ params }: { params: Params }) {
  const { path } = await params;
  const section = path[0];
  const subpath = path.slice(1); // everything after section
  const fullPath = path.join("/");

  // Validate section
  if (!VALID_SECTIONS.includes(section)) {
    notFound();
  }

  const sectionLabel = labelFromSegment(section);
  const pageTitle = labelFromSegment(path[path.length - 1]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1 text-sm text-gray-500 mb-6"
        aria-label="Wiki breadcrumb"
      >
        <Link href="/wiki" className="hover:text-gray-700">
          Wiki
        </Link>
        {path.map((seg, i) => {
          const href = "/wiki/" + path.slice(0, i + 1).join("/");
          const isLast = i === path.length - 1;
          return (
            <span key={href} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span className="text-gray-900 font-medium">
                  {labelFromSegment(seg)}
                </span>
              ) : (
                <Link href={href} className="hover:text-gray-700">
                  {labelFromSegment(seg)}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Section badge */}
      <span
        className="inline-block text-xs font-semibold text-blue-700
                       bg-blue-50 px-2 py-0.5 rounded-full mb-4"
      >
        {sectionLabel}
      </span>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">{pageTitle}</h1>

      <div className="text-gray-500 text-sm mb-8">
        Path:{" "}
        <code className="bg-gray-100 px-2 py-0.5 rounded">
          /wiki/{fullPath}
        </code>
        {subpath.length > 0 && (
          <span className="ml-3">Subpath depth: {subpath.length}</span>
        )}
      </div>

      {/* Placeholder content */}
      <div className="prose prose-gray">
        <p>
          Content for <strong>{pageTitle}</strong> in the {sectionLabel}{" "}
          section.
        </p>
        <p>
          This page lives at <code>/wiki/{fullPath}</code>.
        </p>
      </div>
    </div>
  );
}
```

---

---
