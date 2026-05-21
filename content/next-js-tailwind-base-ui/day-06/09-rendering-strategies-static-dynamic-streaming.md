# 9 — Rendering Strategies — Static, Dynamic, Streaming

---

## T — TL;DR

Next.js 16 has three rendering strategies: **Static** (HTML generated at build time — fastest), **Dynamic** (HTML generated per request — always fresh), and **Streaming** (HTML sent progressively as data resolves — best of both). Every route falls into one or a combination of these, and you control which with specific APIs.

---

## K — Key Concepts

### The Three Strategies

```
Strategy        When HTML is generated       Use for
────────────    ──────────────────────────   ────────────────────────────────
Static (SSG)    At build time (next build)   Blog posts, marketing pages, docs
Dynamic (SSR)   Per request                  Dashboards, user-specific pages
Streaming       Per request, progressively   Mixed: fast shell + slow data
                (as Suspense resolves)

Next.js 16 default:
  → A route is Static unless it opts into Dynamic (by using dynamic APIs)
  → Adding Suspense to an async component enables Streaming automatically
```

### What Makes a Route Dynamic

```tsx
// A route becomes DYNAMIC when it uses any of these:

// 1. cookies()
import { cookies } from "next/headers";
const theme = (await cookies()).get("theme"); // ← forces dynamic

// 2. headers()
import { headers } from "next/headers";
const ua = (await headers()).get("user-agent"); // ← forces dynamic

// 3. searchParams prop
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>; // ← forces dynamic
}) {}

// 4. Dynamic route segment with no generateStaticParams
// /products/[id]/page.tsx with no generateStaticParams ← dynamic by default

// 5. cache: 'no-store' fetch
fetch(url, { cache: "no-store" }); // ← forces dynamic

// 6. export const dynamic = 'force-dynamic'
export const dynamic = "force-dynamic"; // ← explicit opt-in
```

### Route Segment Config — Explicit Control

```tsx
// src/app/products/page.tsx

// ─── Option 1: Force static (build-time generation)
export const dynamic = "force-static";
// Ignores dynamic APIs — page is always static
// searchParams, cookies() return empty/undefined values

// ─── Option 2: Force dynamic (per-request rendering)
export const dynamic = "force-dynamic";
// Never cached — fresh HTML on every request
// Equivalent to getServerSideProps in Pages Router

// ─── Option 3: ISR — static with time-based revalidation
export const revalidate = 3600; // regenerate every 1 hour
// First request after expiry: serves stale HTML, regenerates in background

// ─── Option 4: ISR with no expiry — only on-demand revalidation
export const revalidate = false; // (default) never auto-revalidate
// Only revalidates when revalidatePath() or revalidateTag() is called
```

### Strategy Decision Tree

```
Is the page the SAME for every user?
├── YES
│   └── Does it need to be 100% fresh on every request?
│       ├── YES → Dynamic (export const dynamic = 'force-dynamic')
│       │         Example: real-time dashboard, live pricing
│       └── NO  → Does it change occasionally?
│                 ├── YES → ISR (export const revalidate = N)
│                 │         Example: blog posts, product pages
│                 └── NO  → Static (default, or generateStaticParams)
│                           Example: marketing pages, docs
└── NO (user-specific content)
    └── Is some content slow to load?
        ├── YES → Dynamic + Streaming (Suspense boundaries)
        │         Example: dashboard with slow analytics
        └── NO  → Dynamic (cookies/session based)
                  Example: user profile, settings page
```

### Static Generation with `generateStaticParams`

```tsx
// src/app/blog/[slug]/page.tsx
// Pre-build ALL blog post pages at build time

export async function generateStaticParams() {
  const posts = await cms.getPosts(); // fetch all post slugs at build time
  return posts.map((post) => ({ slug: post.slug }));
}

export const revalidate = 3600; // regenerate stale after 1 hour

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await cms.getPost(slug); // this runs at BUILD TIME for known slugs
  if (!post) notFound();
  return <Article post={post} />;
}

// Result:
// /blog/hello-world    → pre-built at next build ✅
// /blog/new-post       → if dynamicParams=true (default): builds on first visit
// /blog/new-post       → if dynamicParams=false: 404
```

### The Partial Pre-rendering Mental Model (PPR)

```tsx
// PPR: Static shell + Dynamic/Streaming holes
// The page's static parts are pre-rendered at build time
// Dynamic sections (wrapped in Suspense) are filled in per-request

// Enable PPR (experimental in Next.js 16)
// next.config.ts:
// experimental: { ppr: true }

// src/app/products/[id]/page.tsx
import { Suspense } from "react";

// Static shell — built at build time
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      {/* Static header — pre-rendered */}
      <ProductHeader productId={id} />

      {/* Dynamic inventory — per-request stream */}
      <Suspense fallback={<InventorySkeleton />}>
        <LiveInventory productId={id} /> {/* cache: 'no-store' inside */}
      </Suspense>

      {/* Static related products — pre-rendered */}
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts productId={id} /> {/* cached */}
      </Suspense>
    </div>
  );
}
```

### Rendering Per-Route Strategy Summary

```
Route type              Recommended strategy      Config
─────────────────────   ──────────────────────    ─────────────────────────────
Marketing homepage      Static                    default (no config needed)
Blog post               ISR                       revalidate = 3600
Product detail          ISR + streaming           revalidate = 1800 + Suspense
User dashboard          Dynamic + streaming       cookies() makes it dynamic
User profile            Dynamic                   cookies() + no Suspense needed
Live prices             Dynamic (no cache)        cache: 'no-store'
Docs page               Static                    generateStaticParams
Admin panel             Dynamic                   force-dynamic or cookies()
Search results          Dynamic                   searchParams makes it dynamic
404 page                Static                    not-found.tsx is always static
```

### Verifying Your Rendering Strategy

```bash
# next build output shows which routes are static (○) vs dynamic (ƒ):

Route (app)                              Size     First Load JS
┌ ○ /                                    1.2 kB         87.4 kB
├ ○ /about                               890 B          87.1 kB
├ ○ /blog                                2.1 kB         88.3 kB
├ ● /blog/[slug]                         1.8 kB         88.0 kB   ← ISR
├ ƒ /dashboard                           3.4 kB         89.6 kB   ← Dynamic
├ ƒ /dashboard/orders/[id]               2.2 kB         88.4 kB   ← Dynamic
└ ○ /pricing                             1.5 kB         87.7 kB

○  (Static)   — prerendered as static HTML
●  (ISR)      — prerendered with revalidate config
ƒ  (Dynamic)  — rendered on demand (server-side)
```

---

## W — Why It Matters

- Choosing the right strategy for each route is a performance multiplier — a static blog post page serves in 5ms from a CDN edge; the same page rendered dynamically on every request takes 200–400ms.
- The default-to-static behavior in Next.js 16 is a safety net — you get CDN-speed performance unless you opt into dynamic rendering, usually by using `cookies()` or `searchParams`.
- ISR (Incremental Static Regeneration) with `revalidate` is the "best of both" for most content: pre-built performance with automatic freshness. Content-heavy sites (e-commerce, blogs) see 90%+ cache hit rates.
- Understanding the build output (○ vs ƒ) lets you verify your rendering strategy — a route you expected to be static appearing as dynamic (ƒ) tells you something in the route is triggering dynamic rendering unexpectedly.

---

## I — Interview Q&A

### Q1: What is the difference between Static, ISR, and Dynamic rendering in Next.js?

**A:** Static means the HTML is generated once at build time and served from a CDN — the fastest possible delivery but requires a new build to reflect content changes. ISR (Incremental Static Regeneration) pre-builds pages but automatically regenerates them in the background after a `revalidate` period — stale content is served instantly while a fresh version is generated. Dynamic renders the page on the server for each incoming request — always fresh but slower (database query on every page load). The App Router defaults to static and opts into dynamic when you use request-specific APIs like `cookies()`, `headers()`, or `searchParams`.

### Q2: How do `cookies()` and `searchParams` affect the rendering strategy?

**A:** Both force a route into dynamic rendering. `cookies()` and `headers()` are per-request — they read the incoming HTTP request, which means the page cannot be pre-rendered because it depends on data that doesn't exist at build time. `searchParams` (accessed as a prop) contains the URL query string which varies per request. When Next.js detects these in a route, it automatically opts the page out of static generation and into server-side rendering per request. This is why auth-protected pages are automatically dynamic — they read the session cookie.

### Q3: What is Streaming and how does it differ from static and dynamic rendering?

**A:** Static and dynamic rendering produce a complete HTML response — the user waits until the entire page is ready. Streaming sends HTML in chunks as each part resolves. When a page uses `<Suspense>` to wrap async components, Next.js immediately sends the page shell and any statically-available content, then streams the deferred sections as their data resolves. This means users see the page structure almost instantly (same as static) while dynamic content fills in progressively. Streaming is dynamic rendering with progressive delivery — it combines the UX of static (instant shell) with the freshness of dynamic (per-request data).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Accidentally making a static route dynamic with `cookies()` in a layout

```tsx
// src/app/layout.tsx — root layout
import { cookies } from "next/headers";

export default async function RootLayout({ children }) {
  const theme = (await cookies()).get("theme")?.value ?? "light";
  // ❌ This forces EVERY route in the app to be dynamic
  // A blog post page is now server-rendered per request instead of static
  return <html data-theme={theme}>{/* ... */}</html>;
}
```

**Fix:** Read the cookie client-side for UI preferences, or use a client provider:

```tsx
// ✅ Option A: Read theme client-side in a Client Component
// ThemeProvider.tsx ('use client') reads localStorage/cookies on mount

// ✅ Option B: Keep layout static, apply theme via CSS class on <html>
// Use middleware to set a cookie and a class on the response
// Or use CSS custom properties that JavaScript sets on load
export default function RootLayout({ children }) {
  // No cookies() here — layout stays static
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {" "}
          {/* Client Component handles theme */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### ❌ Pitfall: Using `force-dynamic` on routes that could use ISR

```tsx
// ❌ Blog post with force-dynamic — re-renders on every request
// 10,000 visitors/hour = 10,000 database queries
export const dynamic = "force-dynamic";

export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  // Post content changes once a day at most — dynamic is overkill
}
```

**Fix:** Use ISR — pre-built + automatically refreshed:

```tsx
// ✅ ISR — pre-built at build, regenerated every hour
export const revalidate = 3600;

export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  // Serves pre-built HTML at CDN speed
  // Regenerates in background when stale — database queries only on refresh
}
```

### ❌ Pitfall: Not using Suspense in dynamic routes with mixed-speed data

```tsx
// ❌ Dynamic route — page waits for ALL data (slowest wins)
export default async function DashboardPage() {
  const [fast, slow] = await Promise.all([
    getFastStats(), // 100ms
    getSlowAnalytics(), // 1800ms  ← entire page blocked until 1800ms
  ]);
  return (
    <div>
      <FastStats data={fast} />
      <SlowAnalytics data={slow} />
    </div>
  );
}
```

**Fix:** Use Suspense for the slow section — fast content streams immediately:

```tsx
// ✅ Fast section streams at ~100ms, slow at ~1800ms
export default async function DashboardPage() {
  const fast = await getFastStats(); // awaited in page (fast — 100ms)

  return (
    <div>
      <FastStats data={fast} /> {/* visible at ~100ms */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <SlowAnalytics /> {/* streams at ~1800ms independently */}
      </Suspense>
    </div>
  );
}

// SlowAnalytics fetches its own data
async function SlowAnalytics() {
  const data = await getSlowAnalytics(); // 1800ms — runs independently
  return <AnalyticsChart data={data} />;
}
```

### ❌ Pitfall: Misunderstanding the build output — shipping dynamic routes that should be static

```tsx
// Developer runs next build and sees:
// ƒ /blog/[slug]   ← Dynamic
// But blog posts never change without a new CMS publish

// Investigation finds:
export default async function BlogPost({ params, searchParams }) {
  //                                              ^^^^^^^^^^
  // searchParams accessed as prop — forces dynamic!
  // But searchParams isn't even used in the component
  const post = await cms.getPost(params.slug);
  return <Article post={post} />;
}
```

**Fix:** Remove unused `searchParams` from the destructuring:

```tsx
// ✅ Without searchParams — route becomes static (ISR)
export const revalidate = 3600;
export default async function BlogPost({ params }) {
  const post = await cms.getPost(params.slug);
  return <Article post={post} />;
}
// Build output:
// ● /blog/[slug]   ← ISR ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `/blog/[slug]` route that demonstrates all three strategies in one codebase:

1. The **post content** uses ISR (`revalidate = 3600`) — pre-built, refreshes hourly
2. The **comment count** uses dynamic streaming (`cache: 'no-store'`) — always live
3. The **related posts** uses static data — pre-built at build time
4. `generateStaticParams` pre-builds 3 known posts
5. `dynamicParams = true` allows new posts to render on first visit
6. Show the rendering strategy for each section in comments

### Solution

```tsx
// src/app/blog/[slug]/_components/comment-count.tsx
// Dynamic section — always fresh, streamed progressively

async function getLiveCommentCount(slug: string): Promise<number> {
  // cache: 'no-store' makes this section always dynamic
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/comments/${slug}/count`,
    { cache: "no-store" } // ← forces dynamic rendering for this section
  ).catch(() => null);

  if (!res?.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export async function CommentCount({ slug }: { slug: string }) {
  const count = await getLiveCommentCount(slug);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-500">
      <span>💬</span>
      <span>
        {count} comment{count !== 1 ? "s" : ""}
      </span>
      <span className="text-xs text-gray-400">(live)</span>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/_components/related-posts.tsx
// Static section — data fetched at build time via the page's ISR

interface Post {
  slug: string;
  title: string;
  date: string;
}

export function RelatedPosts({ posts }: { posts: Post[] }) {
  // No async — data passed from parent (fetched at ISR time)
  // This component adds zero dynamic overhead ✅
  return (
    <div className="border-t pt-8 mt-8">
      <h3 className="font-semibold text-gray-900 mb-4">Related Posts</h3>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={`/blog/${post.slug}`}
              className="flex items-start gap-2 group"
            >
              <span className="text-gray-400 group-hover:text-blue-500 mt-0.5">
                →
              </span>
              <div>
                <p
                  className="text-sm font-medium text-gray-800
                               group-hover:text-blue-600 transition-colors"
                >
                  {post.title}
                </p>
                <p className="text-xs text-gray-400">{post.date}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CommentCount } from "./_components/comment-count";
import { RelatedPosts } from "./_components/related-posts";

// ─── Strategy: ISR — pre-built at next build, regenerates every hour ──────────
export const revalidate = 3600; // ← ISR: stale after 1 hour
export const dynamicParams = true; // ← unknown slugs render on first visit, then cached

type Params = Promise<{ slug: string }>;

// Mock CMS data
const ALL_POSTS: Record<
  string,
  {
    title: string;
    date: string;
    excerpt: string;
    content: string;
    author: string;
    related: { slug: string; title: string; date: string }[];
  }
> = {
  "nextjs-16-guide": {
    title: "The Complete Next.js 16 Guide",
    date: "May 15, 2026",
    excerpt: "Everything you need to know about Next.js 16.",
    content:
      "Next.js 16 brings significant improvements to the App Router, including better streaming support, improved caching APIs, and enhanced Server Actions...",
    author: "Mark Austin",
    related: [
      {
        slug: "server-components-deep-dive",
        title: "Server Components Deep Dive",
        date: "May 10, 2026",
      },
      {
        slug: "react-19-features",
        title: "React 19 New Features",
        date: "May 5, 2026",
      },
    ],
  },
  "server-components-deep-dive": {
    title: "Server Components Deep Dive",
    date: "May 10, 2026",
    excerpt: "Understanding React Server Components from first principles.",
    content:
      "React Server Components represent a fundamental shift in how we think about rendering. They run exclusively on the server...",
    author: "Mark Austin",
    related: [
      {
        slug: "nextjs-16-guide",
        title: "The Complete Next.js 16 Guide",
        date: "May 15, 2026",
      },
      {
        slug: "react-19-features",
        title: "React 19 New Features",
        date: "May 5, 2026",
      },
    ],
  },
  "react-19-features": {
    title: "React 19 New Features",
    date: "May 5, 2026",
    excerpt: "A practical look at every major feature in React 19.",
    content:
      "React 19 introduces useActionState, improved Suspense, asset loading, and more. This guide covers every new feature with practical examples...",
    author: "Mark Austin",
    related: [
      {
        slug: "nextjs-16-guide",
        title: "The Complete Next.js 16 Guide",
        date: "May 15, 2026",
      },
      {
        slug: "server-components-deep-dive",
        title: "Server Components Deep Dive",
        date: "May 10, 2026",
      },
    ],
  },
};

// ─── Pre-build known slugs at next build ──────────────────────────────────────
export async function generateStaticParams() {
  // In production: const posts = await cms.getPosts(); return posts.map(p => ({ slug: p.slug }))
  return Object.keys(ALL_POSTS).map((slug) => ({ slug }));
  // Generates: /blog/nextjs-16-guide, /blog/server-components-deep-dive, /blog/react-19-features
}

// ─── Dynamic metadata — also benefits from ISR ────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = ALL_POSTS[slug];
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
    },
  };
}

// ─── Page component ───────────────────────────────────────────────────────────
export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const post = ALL_POSTS[slug];

  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      {/* ── Static section: pre-built at ISR time ── */}
      <header className="mb-8">
        <p className="text-sm text-blue-600 font-medium mb-2">Blog</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{post.author}</span>
          <span>·</span>
          <time>{post.date}</time>
          <span>·</span>
          {/* ── Dynamic section: live comment count, streams in ── */}
          {/*    Suspense shows "... comments" until CommentCount resolves */}
          <Suspense
            fallback={
              <span className="text-gray-400 text-sm">Loading comments...</span>
            }
          >
            {/* CommentCount uses cache: 'no-store' → always fresh */}
            {/* It STREAMS in independently — doesn't block the article text */}
            <CommentCount slug={slug} />
          </Suspense>
        </div>
      </header>

      {/* ── Static section: pre-built at ISR time ── */}
      <div className="prose prose-gray max-w-none">
        <p className="text-lg text-gray-600 mb-6 font-medium leading-relaxed">
          {post.excerpt}
        </p>
        <p className="text-gray-700 leading-relaxed">{post.content}</p>
      </div>

      {/* ── Static section: related posts passed from ISR-cached data ── */}
      {/* RelatedPosts receives data fetched at ISR time — zero dynamic overhead */}
      <RelatedPosts posts={post.related} />
    </article>
  );
}

/*
  Rendering strategy breakdown:
  ──────────────────────────────────────────────────────────────────────
  Route:           ISR (revalidate = 3600)
  Article content: Static/ISR — served from CDN in ~5ms
  Comment count:   Dynamic streaming — live, streams in after article
  Related posts:   Static — data from ISR fetch, zero dynamic overhead

  Timeline for a returning visitor (cache warm):
    t=0ms    → CDN serves pre-built HTML (article + related posts visible)
    t=0ms    → CommentCount Suspense fallback shows ("Loading comments...")
    t=~80ms  → CommentCount resolves (live fetch completes), streams in

  Timeline for first visitor after cache expiry:
    t=0ms    → Previous stale HTML served instantly (while regenerating)
    t=~500ms → New HTML built in background (next visitor gets fresh version)
    t=~80ms  → CommentCount always fresh regardless of ISR state

  generateStaticParams pre-built: 3 routes ✅
  dynamicParams = true: new posts work on first visit, then cached ✅
  ──────────────────────────────────────────────────────────────────────
*/
```

---

---
