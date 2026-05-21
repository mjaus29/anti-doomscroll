# 9 — Top-Level Config Files

---

## T — TL;DR

Every file at the project root does one specific job. `next.config.ts` controls the framework. `tsconfig.json` controls TypeScript. `tailwind.config.ts` controls styling. `package.json` controls dependencies and scripts. Know what each does — and don't touch them randomly.

---

## K — Key Concepts

### Complete Config File Map

```
my-app/
├── next.config.ts         ← Next.js framework configuration
├── tsconfig.json          ← TypeScript compiler options
├── tailwind.config.ts     ← Tailwind CSS theme + content
├── postcss.config.mjs     ← PostCSS pipeline (Tailwind needs this)
├── eslint.config.mjs      ← ESLint rules (flat config)
├── .prettierrc            ← Prettier formatting rules (if used)
├── package.json           ← dependencies + scripts
├── package-lock.json      ← exact dependency versions (npm)
│   OR pnpm-lock.yaml      ← (pnpm)
│   OR yarn.lock           ← (yarn)
├── .env.local             ← local environment variables (git ignored)
├── .env.example           ← env variable template (committed to git)
├── .gitignore             ← files git should ignore
└── README.md              ← project documentation
```

### `next.config.ts` — The Most Important Config

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Images — allow external image domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.myshop.com",
        pathname: "/products/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com", // ← ** matches any subdomain
      },
    ],
  },

  // ─── Redirects — server-side URL redirects
  async redirects() {
    return [
      { source: "/old-about", destination: "/about", permanent: true },
      {
        source: "/shop/:path*",
        destination: "/store/:path*",
        permanent: false,
      },
    ];
  },

  // ─── Rewrites — proxy without URL change (useful for API proxying)
  async rewrites() {
    return [{ source: "/api/old/:path*", destination: "/api/new/:path*" }];
  },

  // ─── Headers — add security headers to all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },

  // ─── Environment variables — expose to client (NEXT_PUBLIC_*)
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
  },

  // ─── Experimental features (Next.js 15/16)
  experimental: {
    // Enable React 19 features (stable in Next.js 15+)
    reactCompiler: true, // React Compiler — auto-memoization
    ppr: "incremental", // Partial Pre-Rendering (PPR)
  },
};

export default nextConfig;
```

### `tsconfig.json` — The Key Options

```json
{
  "compilerOptions": {
    // These are critical — understand what they do:
    "strict": true, // ← never turn this off
    "noEmit": true, // ← TypeScript only type-checks, doesn't output
    "moduleResolution": "bundler", // ← required for Next.js (not "node")
    "jsx": "preserve", // ← Next.js/Turbopack handles JSX transform
    "incremental": true, // ← caches type check results — faster re-runs
    "paths": {
      "@/*": ["./src/*"] // ← import alias
    }
  }
}
```

### `package.json` — Standard Scripts

```json
{
  "name": "my-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev --turbopack", // ← local development
    "build": "next build", // ← production build
    "start": "next start", // ← serve production build
    "lint": "next lint", // ← ESLint check
    "lint:fix": "next lint --fix", // ← auto-fix ESLint
    "type-check": "tsc --noEmit", // ← TypeScript check
    "format": "prettier --write src/", // ← format code (if Prettier)
    "test": "vitest", // ← unit tests
    "test:e2e": "playwright test", // ← end-to-end tests
    "ci": "npm run type-check && npm run lint && npm run build"
  }
}
```

### `.env` Files — Hierarchy and Rules

```bash
# Files loaded by Next.js (in priority order — first wins):
.env.local         ← your local overrides (git ignored — NEVER commit)
.env.development   ← loaded when NODE_ENV=development
.env.production    ← loaded when NODE_ENV=production
.env               ← base values (can commit if no secrets)

# Variable naming rules:
NEXT_PUBLIC_API_URL=https://api.example.com    # exposed to browser ✅
DATABASE_URL=postgres://...                    # server-only (never to browser) ✅
SECRET_KEY=abc123                              # server-only ✅

# Access in code:
process.env.NEXT_PUBLIC_API_URL   # ← available client + server
process.env.DATABASE_URL          # ← available server only (undefined in browser)
```

```bash
# .env.example — commit this as documentation (no real values)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SITE_URL=https://myapp.com
DATABASE_URL=                     # required — see Notion for local value
AUTH_SECRET=                      # generate with: openssl rand -base64 32
STRIPE_SECRET_KEY=                # from Stripe dashboard
```

### `.gitignore` — What Must Be Ignored

```gitignore
# .gitignore — critical entries
.next/           ← build output (can be hundreds of MB)
node_modules/    ← dependencies
.env.local       ← local secrets
.env*.local      ← any local env files

# Optional but recommended
*.tsbuildinfo    ← TypeScript incremental cache
.turbo/          ← Turbopack cache
coverage/        ← test coverage reports
```

---

## W — Why It Matters

- `next.config.ts` in TypeScript (vs the old `next.config.js`) means you get type-safe autocomplete for every config option — invalid options are caught at type-check time, not discovered via runtime errors.
- `.env.local` must be in `.gitignore` — accidentally committing secrets to git is one of the most common and serious developer mistakes.
- The `NEXT_PUBLIC_` prefix is the only way to expose env vars to the browser — a missing prefix means the var is `undefined` in client components with no error thrown.
- The `ci` script (`type-check && lint && build`) is the minimal CI validation — run it on every pull request to prevent regressions.

---

## I — Interview Q&A

### Q1: What is the difference between `NEXT_PUBLIC_API_URL` and `API_URL` as environment variables?

**A:** `NEXT_PUBLIC_API_URL` is bundled into the client-side JavaScript at build time — it's visible in the browser and accessible in both Server and Client Components. `API_URL` (without the prefix) is available only in Server Components, API routes, and `middleware.ts` — it's never sent to the browser. Use `NEXT_PUBLIC_` only for values that are safe to be public (API base URLs, public keys). Use unprefixed for secrets.

### Q2: What does `next build` do vs `next dev`?

**A:** `next dev` starts a development server with hot module replacement and source maps — fast iteration but not optimized. `next build` creates an optimized production build: minification, tree-shaking, static generation, image optimization, and route pre-rendering. It outputs to `.next/`. `next start` then serves the `.next/` output — you must run `next build` first. Never run `next dev` in production.

### Q3: Where should you configure image domain allowlists in Next.js 16?

**A:** In `next.config.ts` under `images.remotePatterns`. This is a security measure — Next.js only optimizes images from explicitly allowed hosts to prevent the image optimization API from being abused. Each pattern specifies protocol, hostname, and pathname. The old `images.domains` array is deprecated in favor of `remotePatterns` which supports wildcards.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Committing `.env.local` to git

```bash
git add .
git commit -m "initial setup"
# → .env.local with DATABASE_URL and API secrets committed to git history
# → Even if you delete it in a later commit, git history still contains it
```

**Fix:** Ensure `.gitignore` includes `.env.local` BEFORE first commit. If already committed, rotate all secrets immediately and use `git-filter-repo` to purge history.

### ❌ Pitfall: Using `NEXT_PUBLIC_` for secrets

```bash
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abc123
# ← Visible in browser's Network tab and source code
# ← Anyone can make Stripe API calls with your key
```

**Fix:** Never prefix secrets with `NEXT_PUBLIC_`. Server-only env vars (`process.env.STRIPE_SECRET_KEY`) are undefined in client components — that's the correct security behavior.

### ❌ Pitfall: Adding images from external domains without `remotePatterns`

```tsx
<Image
  src="https://cdn.shopify.com/product.jpg"
  alt="Product"
  width={400}
  height={400}
/>
// → Error: "hostname cdn.shopify.com is not configured"
```

**Fix:**

```ts
// next.config.ts
images: {
  remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }];
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a complete `next.config.ts` for an e-commerce app that:

1. Allows images from `cdn.myshop.com` and any `*.cloudinary.com` subdomain
2. Redirects `/shop/:path*` to `/store/:path*` permanently
3. Adds security headers to all routes
4. Exposes `NEXT_PUBLIC_APP_NAME` from env
5. Enables React Compiler (experimental)

Write the matching `.env.example` with three required variables.

### Solution

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.myshop.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/shop/:path*",
        destination: "/store/:path*",
        permanent: true, // 308 Permanent Redirect
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "MyShop",
  },

  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
```

```bash
# .env.example
# Copy to .env.local and fill in values
NEXT_PUBLIC_APP_NAME=MyShop
NEXT_PUBLIC_API_URL=https://api.myshop.com

# Server-only secrets — never expose to browser
DATABASE_URL=           # postgres://user:pass@host:5432/dbname
STRIPE_SECRET_KEY=      # sk_live_... from Stripe Dashboard
AUTH_SECRET=            # generate: openssl rand -base64 32
```

---

---
