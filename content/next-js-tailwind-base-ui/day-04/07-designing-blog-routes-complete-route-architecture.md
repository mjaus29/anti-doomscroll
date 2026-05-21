# 7 — Designing Blog Routes — Complete Route Architecture

---

## T — TL;DR

A blog is the canonical exercise for dynamic routing — it needs a listing page, category pages, post pages (dynamic by slug), author pages, and tag pages. Designing it well reveals every App Router pattern in context.

---

## K — Key Concepts

### The Complete Blog Route Map

```
/blog                               → Blog home (recent posts, featured)
/blog/[slug]                        → Individual post
/blog/category/[category]           → Posts by category
/blog/tag/[tag]                     → Posts by tag
/blog/author/[username]             → Posts by author
/blog/archive/[year]/[month]        → Posts by date (nested dynamic)
/blog/search                        → Search results (query via searchParams)
/blog/feed.xml                      → RSS feed (route.ts)
```

### Full Directory Structure

```
src/app/
└── (marketing)/
    └── blog/
        ├── layout.tsx                          ← blog shell layout
        ├── page.tsx                            → /blog
        ├── [slug]/
        │   ├── page.tsx                        → /blog/:slug
        │   ├── loading.tsx
        │   ├── not-found.tsx
        │   └── opengraph-image.tsx             ← dynamic OG image
        ├── category/
        │   └── [category]/
        │       ├── page.tsx                    → /blog/category/:category
        │       └── loading.tsx
        ├── tag/
        │   └── [tag]/
        │       └── page.tsx                    → /blog/tag/:tag
        ├── author/
        │   └── [username]/
        │       └── page.tsx                    → /blog/author/:username
        ├── archive/
        │   └── [year]/
        │       └── [month]/
        │           └── page.tsx                → /blog/archive/:year/:month
        ├── search/
        │   └── page.tsx                        → /blog/search
        └── feed.xml/
            └── route.ts                        → /blog/feed.xml (RSS)
```

### Blog Layout — Shared Shell

```tsx
// src/app/(marketing)/blog/layout.tsx
import Link from "next/link";

const CATEGORIES = ["Tech", "Business", "Design", "Engineering"];

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Blog header */}
      <header className="mb-8">
        <Link href="/blog" className="text-2xl font-bold hover:text-blue-600">
          The Blog
        </Link>
        <nav className="flex gap-4 mt-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/blog/category/${cat.toLowerCase()}`}
              className="text-sm text-gray-500 hover:text-gray-900 capitalize"
            >
              {cat}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
```

### Blog Home — `/blog`

```tsx
// src/app/(marketing)/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest articles and insights",
};

// Mock posts — in production: CMS/DB query
const POSTS = [
  {
    slug: "nextjs-16-guide",
    title: "Next.js 16 Complete Guide",
    category: "tech",
    date: "2026-05-01",
    excerpt: "Everything you need to know.",
  },
  {
    slug: "design-systems-101",
    title: "Design Systems 101",
    category: "design",
    date: "2026-04-20",
    excerpt: "Build consistent UIs.",
  },
  {
    slug: "startup-lessons",
    title: "10 Startup Lessons Learned",
    category: "business",
    date: "2026-04-10",
    excerpt: "Hard-won wisdom.",
  },
];

export default function BlogHomePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Latest Articles</h1>
      <p className="text-gray-500 mb-10">
        Insights on tech, design, and business.
      </p>
      <div className="space-y-8">
        {POSTS.map((post) => (
          <article key={post.slug} className="border-b pb-8">
            <Link
              href={`/blog/category/${post.category}`}
              className="text-xs font-semibold text-blue-600 uppercase tracking-wide"
            >
              {post.category}
            </Link>
            <h2 className="text-xl font-bold mt-1 mb-2">
              <Link href={`/blog/${post.slug}`} className="hover:text-blue-600">
                {post.title}
              </Link>
            </h2>
            <p className="text-gray-600 text-sm mb-3">{post.excerpt}</p>
            <time className="text-xs text-gray-400">{post.date}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
```

### Blog Post — `/blog/[slug]`

```tsx
// src/app/(marketing)/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

// Fake post data
async function getPost(slug: string) {
  const posts: Record<
    string,
    {
      title: string;
      content: string;
      author: string;
      category: string;
      date: string;
      readTime: number;
    }
  > = {
    "nextjs-16-guide": {
      title: "Next.js 16 Complete Guide",
      content: "<p>This is the full guide content...</p>",
      author: "mark",
      category: "tech",
      date: "2026-05-01",
      readTime: 12,
    },
  };
  return posts[slug] ?? null;
}

export async function generateStaticParams() {
  return [
    { slug: "nextjs-16-guide" },
    { slug: "design-systems-101" },
    { slug: "startup-lessons" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };
  return { title: post.title, description: `Read: ${post.title}` };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <article className="max-w-2xl">
      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
        <a
          href={`/blog/category/${post.category}`}
          className="text-blue-600 font-medium capitalize"
        >
          {post.category}
        </a>
        <span>·</span>
        <time>{post.date}</time>
        <span>·</span>
        <span>{post.readTime} min read</span>
      </div>

      <h1 className="text-4xl font-bold leading-tight mb-6">{post.title}</h1>

      <div className="flex items-center gap-3 mb-8 pb-8 border-b">
        <div
          className="w-9 h-9 rounded-full bg-blue-100 flex items-center
                        justify-center font-semibold text-blue-600 text-sm"
        >
          {post.author[0].toUpperCase()}
        </div>
        <div>
          <a
            href={`/blog/author/${post.author}`}
            className="font-medium text-gray-900 hover:text-blue-600 text-sm"
          >
            {post.author}
          </a>
        </div>
      </div>

      <div
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
```

### RSS Feed — `/blog/feed.xml`

```ts
// src/app/(marketing)/blog/feed.xml/route.ts
export async function GET() {
  const posts = [
    {
      title: "Next.js 16 Guide",
      slug: "nextjs-16-guide",
      date: "2026-05-01",
      excerpt: "Guide content",
    },
  ];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mysite.com";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>The Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Latest articles</description>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${post.title}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <description>${post.excerpt}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

---

## W — Why It Matters

- The blog architecture is used in technical interviews as a system design question — "design the URL structure for a blog" — knowing this pattern answers it authoritatively.
- The combination of static segments (`category/`, `author/`, `tag/`) before dynamic segments (`[category]`, `[username]`) is what prevents conflicts and creates readable URLs.
- The RSS feed as a `route.ts` response (returning raw XML) demonstrates that API routes aren't just JSON — they can serve any content type, enabling sitemaps, feeds, and webhooks.
- Per-post OG images via `opengraph-image.tsx` at the `[slug]` level are what make blog sharing compelling on social media — each post gets a generated image with its title and author.

---

## I — Interview Q&A

### Q1: How would you design the URL structure for a blog with categories and tags?

**A:** Use static prefixes before dynamic segments to create semantic, conflict-free URLs. Categories: `/blog/category/[category]`. Tags: `/blog/tag/[tag]`. Authors: `/blog/author/[username]`. Posts: `/blog/[slug]`. The static prefix (`category/`, `tag/`, `author/`) disambiguates between `/blog/nextjs-tips` (a post slug) and `/blog/category/tech` (a category page) — without the prefix, `tech` would be ambiguous with a post slug.

### Q2: How do you serve an RSS feed from a Next.js App Router application?

**A:** Create `src/app/blog/feed.xml/route.ts` with an exported `GET` function that returns a `Response` with `Content-Type: application/xml`. Build the XML string with post data and return it. This creates a `/blog/feed.xml` endpoint that serves raw XML. Add `Cache-Control` headers for CDN caching — RSS feeds don't need to be fresh on every request.

### Q3: Where should per-post OG images be placed?

**A:** Place `opengraph-image.tsx` inside the `[slug]/` folder — `src/app/blog/[slug]/opengraph-image.tsx`. This file exports an `ImageResponse` component that receives the post's params, fetches the post title and cover image, and generates a customized social share image. Next.js automatically links it in the `<head>` for each post URL. The `size` and `contentType` exports control the image dimensions and format.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `/blog/[slug]` for both posts AND categories

```
/blog/tech      → Is this a post with slug 'tech' or the tech category?
/blog/nextjs    → Post or category?
```

**Fix:** Prefix category pages with `/blog/category/`:

```
/blog/nextjs-guide             → post (slug)
/blog/category/tech            → category page
/blog/tag/typescript           → tag page
```

### ❌ Pitfall: No `not-found.tsx` for invalid post slugs

```
User visits /blog/typo-in-slug → blank page or confusing error
```

**Fix:**

```tsx
// src/app/(marketing)/blog/[slug]/not-found.tsx
import Link from "next/link";
export default function PostNotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
      <p className="text-gray-500 mb-6">
        This article doesn't exist or was removed.
      </p>
      <Link href="/blog" className="text-blue-600 hover:underline">
        ← Back to Blog
      </Link>
    </div>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design and implement `/blog/archive/[year]/[month]` that:

1. Shows all posts for that year/month
2. Validates that year is 2020–2026 and month is 1–12
3. Returns `notFound()` for invalid ranges
4. Displays previous/next month navigation links
5. Exports typed params and metadata

### Solution

```tsx
// src/app/(marketing)/blog/archive/[year]/[month]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ year: string; month: string }>;

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function validateArchiveParams(year: string, month: string) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || y < 2020 || y > 2026) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function adjacentMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const valid = y >= 2020 && y <= 2026;
  return valid ? { year: y, month: m, href: `/blog/archive/${y}/${m}` } : null;
}

// Fake posts
async function getPostsByMonth(year: number, month: number) {
  return [
    {
      slug: "sample-post-1",
      title: "Sample Post One",
      date: `${year}-${String(month).padStart(2, "0")}-05`,
    },
    {
      slug: "sample-post-2",
      title: "Sample Post Two",
      date: `${year}-${String(month).padStart(2, "0")}-18`,
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year, month } = await params;
  const v = validateArchiveParams(year, month);
  if (!v) return { title: "Archive Not Found" };
  return {
    title: `Archive: ${MONTH_NAMES[v.month]} ${v.year}`,
    description: `All posts from ${MONTH_NAMES[v.month]} ${v.year}`,
  };
}

export default async function ArchivePage({ params }: { params: Params }) {
  const { year, month } = await params;
  const v = validateArchiveParams(year, month);

  if (!v) notFound();

  const posts = await getPostsByMonth(v.year, v.month);
  const prev = adjacentMonth(v.year, v.month, -1);
  const next = adjacentMonth(v.year, v.month, +1);
  const title = `${MONTH_NAMES[v.month]} ${v.year}`;

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <Link href="/blog" className="hover:text-gray-700">
          Blog
        </Link>
        <span>/</span>
        <Link href={`/blog/archive/${v.year}`} className="hover:text-gray-700">
          {v.year}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {MONTH_NAMES[v.month]}
        </span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">Archive: {title}</h1>
      <p className="text-gray-500 mb-8">{posts.length} posts</p>

      {/* Post list */}
      {posts.length === 0 ? (
        <p className="text-gray-400 italic">No posts published this month.</p>
      ) : (
        <ul className="space-y-4 mb-10">
          {posts.map((post) => (
            <li key={post.slug} className="border rounded-lg p-4">
              <time className="text-xs text-gray-400">{post.date}</time>
              <h2 className="font-semibold mt-1">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-blue-600"
                >
                  {post.title}
                </Link>
              </h2>
            </li>
          ))}
        </ul>
      )}

      {/* Prev / Next navigation */}
      <div className="flex justify-between pt-6 border-t">
        {prev ? (
          <Link
            href={prev.href}
            className="text-sm text-blue-600 hover:underline"
          >
            ← {MONTH_NAMES[prev.month]} {prev.year}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link
            href={next.href}
            className="text-sm text-blue-600 hover:underline"
          >
            {MONTH_NAMES[next.month]} {next.year} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
```

---

---
