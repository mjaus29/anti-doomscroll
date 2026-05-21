# 3 — Optional Catch-All Routes — `[[...slug]]`

---

## T — TL;DR

`[[...slug]]` is a catch-all that **also matches the base path** — double brackets make the segments optional. Where `[...slug]` gives a 404 on `/docs`, `[[...slug]]` renders the same `page.tsx` with `slug = undefined`. One file handles both the root and all sub-paths.

---

## K — Key Concepts

### Syntax Difference

```
[...slug]       Required catch-all → needs 1+ segments
                /docs/a ✅   /docs → 404 ❌

[[...slug]]     Optional catch-all → 0 or more segments
                /docs ✅    /docs/a ✅    /docs/a/b/c ✅
```

### What `params.slug` Looks Like

```tsx
// Route: src/app/docs/[[...slug]]/page.tsx

// URL: /docs
// params: { slug: undefined }

// URL: /docs/getting-started
// params: { slug: ['getting-started'] }

// URL: /docs/api/v2/auth
// params: { slug: ['api', 'v2', 'auth'] }
```

### Typed Params — Handle the undefined Case

```tsx
// src/app/docs/[[...slug]]/page.tsx
type Params = Promise<{ slug?: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;

  // ─── Explicit routing by slug presence
  if (!slug || slug.length === 0) {
    // Render: /docs home page
    return <DocsHomePage />;
  }

  if (slug.length === 1) {
    // Render: /docs/section-name
    return <DocsSectionPage section={slug[0]} />;
  }

  // Render: /docs/section/page-name (or deeper)
  return <DocsContentPage path={slug} />;
}

function DocsHomePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Documentation</h1>
      <p className="text-gray-600">
        Welcome to the docs. Choose a section to get started.
      </p>
    </div>
  );
}

function DocsSectionPage({ section }: { section: string }) {
  const title = section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return <h1 className="text-2xl font-bold">{title} Overview</h1>;
}

function DocsContentPage({ path }: { path: string[] }) {
  const title = path[path.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  return <h1 className="text-2xl font-bold">{title}</h1>;
}
```

### When to Choose `[[...slug]]` vs `[...slug]` + Separate `page.tsx`

```
Option A — [[...slug]] only (one file handles everything):
  ✅ Single file to maintain
  ✅ Base path handled automatically
  ✅ Simple for uniform layouts (docs, wikis)
  ❌ One big component handling multiple cases (can get complex)

Option B — page.tsx + [...slug] (two files, clear separation):
  ✅ Docs home has its own rich layout/data
  ✅ Dynamic docs have their own layout
  ✅ Each file is focused and clean
  ❌ Two files to maintain
  ✅ Better when the home page is significantly different from sub-pages

Choose [[...slug]] when:
  → The home page and sub-pages have the same layout/shell
  → The home page just renders a different content section
  → You want the fewest files possible

Choose page.tsx + [...slug] when:
  → The home page is significantly different (e.g., landing with cards)
  → The home page needs different data fetching
  → You want clean separation of concerns
```

### `generateStaticParams` — Include the Root

```tsx
export function generateStaticParams() {
  return [
    // ─── Include root (empty array = /docs)
    { slug: [] }, // → /docs

    // ─── Include sub-paths
    { slug: ["getting-started"] },
    { slug: ["api", "overview"] },
    { slug: ["api", "auth"] },
  ];
}
```

### Real-World Use Case — i18n Locale Routing

```
src/app/
└── [[...locale]]/        ← optional: matches / AND /en AND /fr AND /en/about
    └── page.tsx

// /            → locale = undefined  → use default language
// /en          → locale = ['en']     → English
// /fr          → locale = ['fr']     → French
// /en/about    → locale = ['en', 'about'] → English about page
```

```tsx
// src/app/[[...locale]]/page.tsx
type Params = Promise<{ locale?: string[] }>;

export default async function LocalizedPage({ params }: { params: Params }) {
  const { locale } = await params;
  const lang = locale?.[0] ?? "en"; // default to English
  const pathParts = locale?.slice(1) ?? []; // everything after locale

  return (
    <div>
      Language: {lang} | Path: {pathParts.join("/")}
    </div>
  );
}
```

---

## W — Why It Matters

- The base-path coverage of `[[...slug]]` solves the most common documentation site architecture mistake — using `[...slug]` and wondering why `/docs` returns 404.
- One file handling all routes reduces maintenance overhead for uniform content sites — the logic branches on `slug.length`, not on separate files.
- The undefined slug case (`slug?: string[]`) forces you to explicitly handle the base path in TypeScript — you can't accidentally forget it.
- i18n routing, multi-tenancy, and A/B testing are advanced cases that all leverage optional catch-all — understanding the primitive opens up these patterns.

---

## I — Interview Q&A

### Q1: What is the difference between `[...slug]` and `[[...slug]]`?

**A:** Both match URLs with one or more path segments. The difference is the base path. `[...slug]` is required — it only matches URLs with at least one segment; the base path (e.g., `/docs`) returns 404. `[[...slug]]` is optional — it matches both the base path (where `slug` is `undefined`) and any number of segments below it. Use `[[...slug]]` when you want the same page component to handle both the root of a section and all its sub-pages.

### Q2: What does `params.slug` equal when the user visits the base path `/docs` with `[[...slug]]`?

**A:** `slug` is `undefined` (the property may be absent from the params object). The TypeScript type is `{ slug?: string[] }` — the `?` indicates it's optional. Always guard against this: `if (!slug || slug.length === 0) { /* render home page */ }`.

### Q3: When would you use optional catch-all vs a separate `page.tsx` at the base path?

**A:** Use `[[...slug]]` (one file) when the home page and sub-pages share the same layout and the home page is just a special case of the content view — like a docs site where the home is just a "welcome to docs" version of the content page. Use `page.tsx + [...slug]` (two files) when the home page has a significantly different structure — like a docs landing page with feature cards, a search box, and category grid, while sub-pages are simple MDX renders.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `[...slug]` and getting 404 on the base path

```
src/app/docs/[...slug]/page.tsx
// User visits /docs → 404
// Developer confused — "I have a docs route!"
```

**Fix:** Change to optional catch-all:

```
src/app/docs/[[...slug]]/page.tsx
// /docs → renders with slug = undefined ✅
// /docs/anything → renders with slug = ['anything'] ✅
```

### ❌ Pitfall: Not guarding against undefined slug

```tsx
// ❌ Crashes when slug is undefined (/docs base path)
const { slug } = await params;
const path = slug.join("/"); // TypeError: Cannot read properties of undefined
```

**Fix:**

```tsx
const { slug } = await params;
const path = slug?.join("/") ?? ""; // ← safe: '' for base path
const isHome = !slug || slug.length === 0;
```

### ❌ Pitfall: Forgetting the empty array in `generateStaticParams`

```tsx
export function generateStaticParams() {
  return [
    // ❌ Missing root path
    { slug: ["getting-started"] },
    { slug: ["api", "auth"] },
  ];
  // /docs → not pre-rendered → falls through to SSR on each request
}
```

**Fix:**

```tsx
return [
  { slug: [] }, // ← pre-render /docs ✅
  { slug: ["getting-started"] },
  { slug: ["api", "auth"] },
];
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `/help/[[...topic]]` route that:

1. Shows a "Help Center Home" with 3 topic cards when visited at `/help`
2. Shows a topic page when visited at `/help/billing`, `/help/shipping`, etc.
3. Shows a subtopic page when visited at `/help/billing/refunds`
4. Returns `notFound()` for unknown topics
5. `slug` is fully typed with the optional `?`

### Solution

```tsx
// src/app/help/[[...topic]]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ topic?: string[] }>;

const VALID_TOPICS = ["billing", "shipping", "account", "returns"];

function toTitle(seg: string) {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { topic } = await params;
  if (!topic || topic.length === 0) return { title: "Help Center" };
  return { title: `${toTitle(topic[topic.length - 1])} — Help` };
}

export default async function HelpPage({ params }: { params: Params }) {
  const { topic } = await params;

  // ─── Home: /help
  if (!topic || topic.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-gray-600 mb-8">How can we help you today?</p>
        <div className="grid grid-cols-2 gap-4">
          {VALID_TOPICS.map((t) => (
            <Link
              key={t}
              href={`/help/${t}`}
              className="p-5 border rounded-xl hover:border-blue-400
                         hover:shadow-sm transition-all"
            >
              <h2 className="font-semibold text-gray-900">{toTitle(t)}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Get help with {t} questions
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ─── Validate topic
  const [mainTopic, ...rest] = topic;
  if (!VALID_TOPICS.includes(mainTopic)) notFound();

  const topicLabel = toTitle(mainTopic);

  // ─── Subtopic: /help/billing/refunds
  if (rest.length > 0) {
    const subtopicLabel = toTitle(rest[rest.length - 1]);
    return (
      <div className="max-w-2xl mx-auto py-10 px-4">
        <nav className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
          <Link href="/help" className="hover:text-gray-700">
            Help
          </Link>
          <span>/</span>
          <Link href={`/help/${mainTopic}`} className="hover:text-gray-700">
            {topicLabel}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{subtopicLabel}</span>
        </nav>
        <h1 className="text-2xl font-bold mb-4">{subtopicLabel}</h1>
        <p className="text-gray-600">
          Detailed help for {subtopicLabel} under {topicLabel}.
        </p>
      </div>
    );
  }

  // ─── Topic: /help/billing
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <nav className="text-sm text-gray-500 mb-6 flex gap-1 items-center">
        <Link href="/help" className="hover:text-gray-700">
          Help
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{topicLabel}</span>
      </nav>
      <h1 className="text-2xl font-bold mb-4">{topicLabel}</h1>
      <p className="text-gray-600 mb-6">
        Browse {topicLabel.toLowerCase()} help articles below.
      </p>
      <ul className="space-y-2">
        {["getting-started", "common-issues", "contact-support"].map((sub) => (
          <li key={sub}>
            <Link
              href={`/help/${mainTopic}/${sub}`}
              className="flex items-center gap-2 px-4 py-3 border rounded-lg
                         hover:border-blue-400 transition-colors text-sm"
            >
              <span className="text-blue-500">→</span>
              <span>{toTitle(sub)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

---
