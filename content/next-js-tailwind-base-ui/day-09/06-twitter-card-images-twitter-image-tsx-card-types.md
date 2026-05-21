# 6 — Twitter Card Images — `twitter-image.tsx`, Card Types

---

## T — TL;DR

Twitter (X) Card images use the `twitter-image.tsx` file convention — identical to OG images but sized and configured for Twitter's card display. The `summary_large_image` card type is the standard choice for maximum visual impact.

---

## K — Key Concepts

### Twitter Card Types

```
Card types (set in metadata twitter.card):
  'summary'               → Small square thumbnail left of title + description
                            Image: 144×144 min, 1:1 ratio, < 5MB
  'summary_large_image'   → Large image above title + description (RECOMMENDED)
                            Image: 300×157 min, 2:1 ratio, < 5MB
  'app'                   → App store card (mobile apps)
  'player'                → Video/audio player card

Recommendation: 'summary_large_image' for all content pages
```

### `twitter-image.tsx` — File Convention

```tsx
// src/app/blog/[slug]/twitter-image.tsx
// Generated automatically at /blog/:slug/twitter-image.png
// Next.js adds <meta name="twitter:image"> automatically

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Blog post preview";
export const size = { width: 1200, height: 630 }; // 2:1 ratio for summary_large_image
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function TwitterImage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug).catch(() => null);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        padding: "60px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Twitter logo watermark */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "48px",
          color: "#1d9bf0",
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        𝕏
      </div>

      <div
        style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          maxWidth: "900px",
        }}
      >
        {post?.title ?? "Acme Blog"}
      </div>

      <div
        style={{
          fontSize: "22px",
          color: "#94a3b8",
          marginTop: "20px",
          maxWidth: "800px",
          lineHeight: 1.5,
        }}
      >
        {post?.description?.slice(0, 100) ?? ""}
      </div>
    </div>,
    { ...size }
  );
}
```

### When to Use Separate `twitter-image.tsx` vs Shared OG

```tsx
// Option A: Shared OG image for both OG and Twitter
// In metadata:
twitter: {
  card:   'summary_large_image',
  images: [{ url: '/api/og?title=Post' }]   // ← reuse OG image URL
}

// Option B: Separate twitter-image.tsx
// Use when you want different visual treatment for Twitter:
// - Twitter shows image cropped differently than LinkedIn
// - Twitter-specific branding (@handle, 𝕏 logo)
// - Different aspect ratio between OG and Twitter

// Recommendation:
// → Same image works fine for most apps (use OG URL in twitter.images)
// → Separate twitter-image.tsx for high-traffic content with Twitter-first strategy
```

### Metadata for Twitter Cards

```tsx
// src/app/blog/[slug]/page.tsx — complete Twitter metadata
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);

  return {
    twitter: {
      card: "summary_large_image", // ← large image above text
      site: "@acmehq", // ← your account handle
      creator: "@markaustin", // ← content creator handle
      title: post?.title,
      description: post?.description?.slice(0, 200),
      images: [
        {
          url: `https://acme.com/blog/${slug}/twitter-image.png`,
          width: 1200,
          height: 630,
          alt: post?.title ?? "Acme Blog",
        },
      ],
    },
  };
}
```

---

## W — Why It Matters

- Twitter Card images are shown in tweets whenever someone shares your URL — they dramatically increase engagement. A post shared without an OG/Twitter image appears as a plain text link; with a large image card, it dominates the timeline visually.
- The `summary_large_image` card type requires a 2:1 aspect ratio (1200×630 is standard) — using the wrong dimensions causes Twitter to crop or reject the image.
- Twitter validates cards via its Card Validator — you can paste any URL at `cards-dev.twitter.com/validator` to verify your card renders correctly before publishing.

---

## I — Interview Q&A

### Q1: What is the difference between `opengraph-image.tsx` and `twitter-image.tsx`?

**A:** They use the same `ImageResponse` API and file convention, but serve different purposes. `opengraph-image.tsx` generates the `og:image` meta tag consumed by Facebook, LinkedIn, Slack, WhatsApp, iMessage, and most social platforms. `twitter-image.tsx` generates the `twitter:image` meta tag specifically for Twitter/X cards. In practice, many apps reuse the same image for both — pointing `twitter.images` to the same URL as `openGraph.images`. A separate `twitter-image.tsx` is useful when you want Twitter-specific branding or a different visual treatment for the platform.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Wrong aspect ratio for `summary_large_image`

```tsx
// ❌ Square image (1:1) with summary_large_image card type
export const size = { width: 800, height: 800 }; // ← Twitter crops this awkwardly
```

**Fix:** Use 2:1 aspect ratio for `summary_large_image`:

```tsx
export const size = { width: 1200, height: 630 }; // ← correct 2:1 ratio ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `twitter-image.tsx` for the root `/` route that shows "Acme", a tagline, and a `𝕏` watermark. Use `summary_large_image` dimensions. In root layout metadata, set `twitter.card = 'summary_large_image'` and `twitter.site = '@acmehq'`.

### Solution

```tsx
// src/app/twitter-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Acme — Build better products, faster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function RootTwitterImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* 𝕏 watermark */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "48px",
          color: "#1d9bf0",
          fontSize: "32px",
          fontWeight: 900,
        }}
      >
        𝕏
      </div>

      <div style={{ fontSize: "88px", fontWeight: 700, color: "white" }}>
        Acme
      </div>
      <div
        style={{
          fontSize: "28px",
          color: "#94a3b8",
          marginTop: "16px",
        }}
      >
        Build better products, faster.
      </div>
    </div>,
    { ...size }
  );
}
```

---

---
