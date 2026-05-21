# 11 — Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes

---

## T — TL;DR

A production-ready Next.js 16 app needs a correct `next.config.ts` (security headers, image domains, redirects), a health check endpoint, proper `output` mode for your deployment target (Vercel/Docker/static), and a pre-deployment checklist that confirms env vars, caching, and metadata are all correct.

---

## K — Key Concepts

### Complete `next.config.ts` for Production

```tsx
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  // ─── 1. Security headers — applied to ALL responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevents MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controls referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disables browser features not needed
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Forces HTTPS for 1 year (enable only after confirming HTTPS works)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Basic XSS protection for older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
      // ─── CORS for API routes (adjust origin to your frontend domain)
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL ?? "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,Authorization",
          },
        ],
      },
    ];
  },

  // ─── 2. Redirects — static URL changes (no business logic)
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true, // 308
      },
      {
        source: "/blog/:slug",
        destination: "/posts/:slug",
        permanent: true,
      },
    ];
  },

  // ─── 3. Rewrites — proxy and internal routing
  async rewrites() {
    return [
      // ─── Proxy to external analytics (hides vendor URL from users)
      {
        source: "/stats/:path*",
        destination: `${process.env.ANALYTICS_URL ?? "http://localhost:8888"}/:path*`,
      },
    ];
  },

  // ─── 4. Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.acme.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ─── 5. Compiler options
  compiler: {
    // Remove console.log in production (keeps console.error/warn)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // ─── 6. Experimental (Next.js 16 features)
  experimental: {
    // Partial Prerendering (PPR) — static shell + dynamic streaming
    ppr: "incremental", // opt-in per route
    // React compiler optimization
    reactCompiler: true,
    // Typed routes (prevents typos in href)
    typedRoutes: true,
  },

  // ─── 7. TypeScript and ESLint — never fail build on errors in CI
  // (fix errors before enabling these)
  typescript: {
    // ignoreBuildErrors: true  // ← only use as temporary escape hatch
  },

  // ─── 8. Bundle analysis (enable temporarily to audit bundle size)
  // Use: ANALYZE=true next build
  ...(process.env.ANALYZE === "true" &&
    {
      // npm install @next/bundle-analyzer
      // const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true })
    }),

  // ─── 9. PoweredByHeader — remove "X-Powered-By: Next.js" header
  poweredByHeader: false,

  // ─── 10. Trailing slash — pick one and be consistent
  trailingSlash: false,

  // ─── 11. Output mode — see section below
  // output: 'standalone',   // ← for Docker
  // output: 'export',       // ← for pure static (no server features)
};

export default config;
```

### Output Modes — Vercel vs Docker vs Static

```tsx
// ─── MODE 1: Default (Vercel, Netlify, Railway)
// No 'output' config needed — Next.js handles it automatically
// Supports all features: SSR, ISR, Server Actions, Route Handlers
const config: NextConfig = {
  // No output field — default mode
};

// ─── MODE 2: Standalone (Docker, self-hosted VMs, Fly.io)
// Copies only the files needed to run the app into .next/standalone
// Greatly reduces Docker image size (no node_modules duplication)
const config: NextConfig = {
  output: "standalone",
  // After build: .next/standalone contains everything needed to run
  // Dockerfile copies .next/standalone + .next/static + public/
};

// ─── MODE 3: Static Export (GitHub Pages, S3, CDN-only)
// Pre-renders ALL routes as static HTML — no server at runtime
// LIMITATIONS: no Server Actions, no Route Handlers, no ISR, no cookies()
const config: NextConfig = {
  output: "export",
  trailingSlash: true, // Required for static hosting compatibility
  images: {
    unoptimized: true, // Required — no server for image optimization
  },
};
// Build: next build → generates /out directory
// Serve: any static file server (nginx, S3, GitHub Pages)
```

### Health Check Endpoint — Required for Production

```tsx
// src/app/api/health/route.ts
// Called by load balancers, container orchestrators (Kubernetes),
// uptime monitors, and deployment pipelines to verify the app is alive

import { NextResponse } from "next/server";

export const runtime = "edge"; // ← fastest, no cold start
export const dynamic = "force-dynamic"; // ← always live check

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  checks: Record<string, "ok" | "error" | "skip">;
}

export async function GET() {
  const checks: HealthStatus["checks"] = {};
  let overallStatus: HealthStatus["status"] = "ok";

  // ─── Check: database connectivity (skip in Edge runtime)
  // In Node.js runtime you could do:
  // try {
  //   await db.$queryRaw`SELECT 1`
  //   checks.database = 'ok'
  // } catch {
  //   checks.database = 'error'
  //   overallStatus   = 'degraded'
  // }
  checks.database = "skip"; // ← Edge runtime can't reach DB directly

  // ─── Check: environment variables present
  checks.env = process.env.NEXT_PUBLIC_SITE_URL ? "ok" : "error";
  if (checks.env === "error") overallStatus = "degraded";

  const body: HealthStatus = {
    status: overallStatus,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, {
    status: overallStatus === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Health-Check": "true",
    },
  });
}

/*
  Usage:
  → Load balancer: GET /api/health → 200 OK = healthy, 503 = unhealthy
  → Kubernetes liveness probe: /api/health
  → Uptime monitor (UptimeRobot, Pingdom): /api/health
  → Deployment pipeline verification: curl https://acme.com/api/health
*/
```

### Dockerfile for Standalone Output

```dockerfile
# Dockerfile — uses 'output: standalone' for minimal image size

# ─── Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for NEXT_PUBLIC_ vars (must be provided at build time)
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

RUN npm run build

# ─── Stage 3: Runner (production image — minimal)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy ONLY what's needed from standalone output
COPY --from=builder /app/public          ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static
# ↑ These three copies are the entire production app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### Pre-Deployment Checklist

```tsx
// src/scripts/pre-deploy-check.ts
// Run before deploying: npx tsx src/scripts/pre-deploy-check.ts

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

const REQUIRED_PUBLIC_VARS = ["NEXT_PUBLIC_SITE_URL"];

let passed = 0;
let failed = 0;
let warnings = 0;

function check(
  name: string,
  condition: boolean,
  message: string,
  warn = false
) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else if (warn) {
    console.warn(`  ⚠️  ${name}: ${message}`);
    warnings++;
  } else {
    console.error(`  ❌ ${name}: ${message}`);
    failed++;
  }
}

console.log("\n🚀 Pre-deployment checks\n");

// ─── Environment variables
console.log("Environment variables:");
for (const varName of REQUIRED_ENV_VARS) {
  check(varName, Boolean(process.env[varName]), `${varName} is not set`);
}

// ─── Production checks
console.log("\nProduction configuration:");
check(
  "NODE_ENV is production",
  process.env.NODE_ENV === "production",
  'NODE_ENV should be "production" in deployment',
  true
);
check(
  "NEXT_PUBLIC_SITE_URL is not localhost",
  !process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost"),
  "NEXT_PUBLIC_SITE_URL still points to localhost"
);
check(
  "Stripe key is live (not test)",
  !process.env.STRIPE_SECRET_KEY?.includes("test"),
  "Still using Stripe test key in production",
  true // warning only — test keys valid in staging
);
check(
  "JWT_SECRET is long enough",
  (process.env.JWT_SECRET?.length ?? 0) >= 32,
  "JWT_SECRET should be at least 32 characters"
);

console.log(`\n${passed} passed · ${warnings} warnings · ${failed} failed\n`);

if (failed > 0) {
  console.error(
    "❌ Pre-deployment checks FAILED — fix errors before deploying\n"
  );
  process.exit(1);
}
if (warnings > 0) {
  console.warn("⚠️  Pre-deployment checks passed with warnings\n");
}
```

### `package.json` Scripts for Production

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "pre-deploy": "npx tsx src/scripts/pre-deploy-check.ts",
    "deploy": "npm run type-check && npm run lint && npm run build",
    "analyze": "ANALYZE=true next build",
    "docker:build": "docker build -t acme-app --build-arg NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL .",
    "docker:run": "docker run -p 3000:3000 --env-file .env.production acme-app"
  }
}
```

### Vercel-Specific Setup — `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",

  "regions": ["iad1"],

  "functions": {
    "app/api/ai/**": {
      "maxDuration": 300
    },
    "app/api/pdf/**": {
      "maxDuration": 60
    }
  },

  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ],

  "crons": [
    {
      "path": "/api/cron/revalidate",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## W — Why It Matters

- `output: 'standalone'` can reduce a Docker image from 2GB+ to under 200MB — it copies only the files Next.js actually needs to run, without `node_modules` duplicates. This directly impacts deployment speed, cold start times, and container registry storage costs.
- Security headers in `next.config.ts` apply globally to every response — X-Frame-Options prevents your app from being embedded in iframes (clickjacking), X-Content-Type-Options prevents MIME sniffing attacks, and Strict-Transport-Security ensures browsers always use HTTPS. These require no code changes beyond the config.
- The health check endpoint is required infrastructure for any containerized deployment — without it, Kubernetes can't determine if a pod is alive, load balancers can't route away from crashed instances, and deployment pipelines can't verify a new release is working before shifting traffic.

---

## I — Interview Q&A

### Q1: What is `output: 'standalone'` and when should you use it?

**A:** `output: 'standalone'` is a Next.js build option that creates a self-contained directory (`.next/standalone`) containing only the files needed to run the application — the Next.js server, compiled code, and minimal dependencies. It traces which `node_modules` files are actually used and copies only those, eliminating unused packages. This dramatically reduces the final artifact size for Docker deployments — often from 2GB+ to under 200MB. Use it for any self-hosted deployment: Docker, Kubernetes, Fly.io, Railway, or any VM. Do not use it for Vercel (handled automatically) or static export (`output: 'export'`).

### Q2: What security headers should every Next.js app set and what does each do?

**A:** The essential security headers are: `X-Frame-Options: DENY` prevents the page from being embedded in iframes, blocking clickjacking attacks; `X-Content-Type-Options: nosniff` prevents browsers from guessing content types, blocking MIME-type confusion attacks; `Referrer-Policy: strict-origin-when-cross-origin` controls how much referrer information is sent with requests; `Permissions-Policy` disables browser features your app doesn't use (camera, microphone, geolocation); `Strict-Transport-Security` forces HTTPS for a year after the first visit; `X-XSS-Protection: 1; mode=block` adds basic XSS filtering in older browsers. All are set in `next.config.ts`'s `headers()` function and apply to every response without code changes in individual routes.

### Q3: What is the difference between `output: 'standalone'` and `output: 'export'`?

**A:** `output: 'standalone'` produces a Node.js server that runs Next.js — it supports all features: Server Components, Server Actions, Route Handlers, ISR, cookies, and headers. It's a server application that happens to be bundled efficiently. `output: 'export'` produces static HTML/CSS/JS files with no server — it pre-renders all routes at build time and generates files that can be served from any static file host (S3, GitHub Pages, nginx). The tradeoff: static export is simpler and cheaper to host but has major limitations — no Server Actions, no Route Handlers, no `cookies()` or `headers()`, no ISR, no dynamic routes unless you provide `generateStaticParams`. Choose `standalone` for most apps, `export` only for purely static content sites.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `output: 'export'` and expecting Server Actions to work

```tsx
// ❌ output: 'export' does not support Server Actions
// next.config.ts
const config: NextConfig = { output: "export" };

// src/app/contact/actions.ts
("use server");
export async function submitForm(formData: FormData) {
  await sendEmail(formData); // ← throws at build time:
} // "Server Actions are not supported with static export"
```

**Fix:** Use `output: 'standalone'` for apps with Server Actions:

```tsx
const config: NextConfig = {
  output: "standalone", // ← supports Server Actions ✅
};
// OR remove output entirely for Vercel deployment
```

### ❌ Pitfall: Forgetting to copy `.next/static` and `public/` in Dockerfile with standalone

```dockerfile
# ❌ Missing static assets — app runs but all CSS, JS, and images 404
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
# ← missing: .next/static and public/
CMD ["node", "server.js"]
# CSS files 404, images broken, app partially broken
```

**Fix:** Copy all three required directories:

```dockerfile
# ✅ All three required
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static   # ← CSS, JS chunks ✅
COPY --from=builder /app/public           ./public          # ← images, fonts ✅
```

### ❌ Pitfall: Not removing `console.log` statements in production

```tsx
// ❌ console.log with sensitive data ends up in production logs
console.log("User logged in:", { userId, email, ipAddress });
console.log("DB query result:", JSON.stringify(userData));
// → Exposes user data in server logs → compliance/GDPR issues
```

**Fix:** Use `removeConsole` in `next.config.ts` and a structured logger:

```tsx
// next.config.ts
compiler: {
  removeConsole: process.env.NODE_ENV === "production"
    ? { exclude: ["error", "warn"] } // ← removes log/debug in prod ✅
    : false;
}
// Or use pino/winston for structured logging with log levels
```

### ❌ Pitfall: `NEXT_PUBLIC_` vars changing after build without rebuild

```bash
# ❌ NEXT_PUBLIC_ vars are baked into the bundle at build time
# Changing them in your hosting platform does NOT take effect immediately

# Initial build with:
NEXT_PUBLIC_SITE_URL=https://staging.acme.com

# Later you change in Vercel dashboard:
NEXT_PUBLIC_SITE_URL=https://acme.com

# The old value is still in the bundle until you redeploy
```

**Fix:** Always trigger a new build when changing `NEXT_PUBLIC_` vars. Server-only vars (without `NEXT_PUBLIC_`) are read at runtime and take effect without a rebuild:

```bash
# Server-only vars → no rebuild needed (read from process.env at request time)
DATABASE_URL=postgresql://new-db.example.com/acme

# NEXT_PUBLIC_ vars → ALWAYS requires a new build
NEXT_PUBLIC_SITE_URL=https://acme.com   # ← new build required ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Build a production-ready Next.js 16 setup:

1. Complete `next.config.ts` with security headers, image config, `poweredByHeader: false`, and `output: 'standalone'`
2. `GET /api/health` Route Handler returning `{ status, version, timestamp, uptime }` with `no-store` cache and correct 200/503 status
3. `GET /api/version` Route Handler returning app version and build info
4. `package.json` scripts: `build`, `deploy` (type-check + lint + build), `docker:build`, `docker:run`
5. A `Dockerfile` using multi-stage build with standalone output

### Solution

```tsx
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  trailingSlash: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL ?? "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type,Authorization",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.acme.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  experimental: {
    ppr: "incremental",
    reactCompiler: true,
    typedRoutes: true,
  },
};

export default config;
```

```tsx
// src/app/api/health/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const START_TIME = Date.now();

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  uptimeSec: number;
  env: string;
  checks: {
    env: "ok" | "error";
    memory?: "ok" | "warn" | "skip";
  };
}

export async function GET() {
  const checks: HealthResponse["checks"] = {
    env: "ok",
    memory: "skip", // Edge runtime has no process.memoryUsage()
  };
  let status: HealthResponse["status"] = "ok";

  // Check: required public env vars are set
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    checks.env = "error";
    status = "degraded";
  }

  const body: HealthResponse = {
    status,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - START_TIME) / 1000),
    env: process.env.NODE_ENV ?? "unknown",
    checks,
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
```

```tsx
// src/app/api/version/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-static"; // ← version never changes at runtime

export async function GET() {
  return NextResponse.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      buildTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400", // ← cache version for 24h
      },
    }
  );
}
```

```json
{
  "name": "acme",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "deploy": "npm run type-check && npm run lint && npm run build",
    "analyze": "ANALYZE=true next build",
    "docker:build": "docker build -t acme-app --build-arg NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://acme.com} --build-arg NEXT_PUBLIC_APP_VERSION=${npm_package_version} .",
    "docker:run": "docker run -p 3000:3000 --env-file .env.production.local acme-app",
    "docker:push": "docker tag acme-app registry.acme.com/acme-app:latest && docker push registry.acme.com/acme-app:latest"
  }
}
```

```dockerfile
# Dockerfile
# Multi-stage build using output: 'standalone'

# ─── Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files only — cache this layer
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --prefer-offline

# ─── Stage 2: Build the app
FROM node:22-alpine AS builder
WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ vars must be provided at build time (inlined into bundle)
ARG NEXT_PUBLIC_SITE_URL=https://acme.com
ARG NEXT_PUBLIC_APP_VERSION=0.0.0
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Production runner (minimal image)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy ONLY the three required outputs from standalone build
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs
EXPOSE 3000

# server.js is generated by output: 'standalone'
CMD ["node", "server.js"]

# Build: docker build -t acme-app \
#          --build-arg NEXT_PUBLIC_SITE_URL=https://acme.com \
#          --build-arg NEXT_PUBLIC_APP_VERSION=1.0.0 .
#
# Run:   docker run -p 3000:3000 \
#          -e DATABASE_URL=postgresql://... \
#          -e JWT_SECRET=... \
#          acme-app
```

---

## ✅ Day 9 Complete — Assets, Metadata, and Deployment Basics

| #   | Subtopic                                                               | Status |
| --- | ---------------------------------------------------------------------- | ------ |
| 1   | Global CSS Entry Points — `globals.css`, CSS Modules, Tailwind v4      | ☐      |
| 2   | `next/font` — Google Fonts, Local Fonts, Font Optimization             | ☐      |
| 3   | `next/image` — Image Optimization, `sizes`, `priority`, `fill`         | ☐      |
| 4   | Metadata API — Static, Dynamic, `generateMetadata`                     | ☐      |
| 5   | Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images           | ☐      |
| 6   | Twitter Card Images — `twitter-image.tsx`, Card Types                  | ☐      |
| 7   | `robots.txt` — Static and Dynamic Generation                           | ☐      |
| 8   | `sitemap.xml` — Static and Dynamic Sitemap Generation                  | ☐      |
| 9   | JSON-LD — Structured Data for SEO                                      | ☐      |
| 10  | Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation       | ☐      |
| 11  | Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 9

```
CSS ARCHITECTURE
  globals.css:       @import "tailwindcss" + @theme {} + :root CSS vars
                     Import ONCE in root layout.tsx — never in components
  @theme {}:         Tailwind v4 config (replaces tailwind.config.js)
                     Custom colors, fonts, spacing, breakpoints
  CSS Modules:       .module.css → locally scoped hashed class names
                     No global collisions, use composes: for inheritance
  Mixing:            Tailwind for utilities + CSS Modules for complex components

FONTS (next/font)
  Google:            import { Inter } from 'next/font/google'
  Local:             import localFont from 'next/font/local'
  Options:           subsets, variable (CSS var), display, weight, style
  Apply to:          <html className={font.variable}> (not body)
  Tailwind:          @theme { --font-sans: var(--font-inter), system-ui }
  display:           'swap' (always visible) | 'optional' (no CLS)
  Rule:              NEVER instantiate inside a component — module level only

IMAGES (next/image)
  Required props:    src, alt + (width+height OR fill)
  sizes:             MOST IMPORTANT perf prop — tells browser what CSS width
                     '(max-width: 640px) 100vw, 50vw'
  priority:          Only for above-fold LCP image — adds <link rel="preload">
                     One or two per page max
  fill:              Fills parent (must have position:relative on parent)
                     Always pair with object-cover/contain class
  placeholder:       'blur' (local: automatic, remote: blurDataURL needed)
  remotePatterns:    Required in next.config.ts for external image domains
  formats:           ['image/avif', 'image/webp'] in next.config.ts

METADATA API
  Static:            export const metadata: Metadata = { title, description, ... }
  Dynamic:           export async function generateMetadata({ params }): Promise<Metadata>
  title.template:    '%s | Acme' → fills %s with child title
  title.absolute:    Ignores parent template
  viewport:          Separate export — NOT inside metadata object
  Deduplicate:       React.cache() between generateMetadata + page component
  canonical:         alternates.canonical → prevent duplicate content
  metadataBase:      new URL('https://acme.com') → resolves relative image URLs

OG IMAGES
  File convention:   opengraph-image.tsx in any route segment
  Exports:           runtime='edge', alt, size={1200,630}, contentType='image/png'
  API:               ImageResponse from 'next/og' — JSX → PNG via Satori
  Styles:            INLINE ONLY (no Tailwind classes — Satori doesn't support them)
  Route Handler:     /api/og?title=X — universal endpoint called from metadata
  twitter-image.tsx: Same API, separate file for Twitter-specific images
  Twitter card:      summary_large_image → 1200×630 (2:1 ratio)

ROBOTS.TXT
  Static:            public/robots.txt — for simple, never-changing rules
  Dynamic:           src/app/robots.ts → MetadataRoute.Robots
  Always include:    Disallow /api/, /dashboard/, /admin/, /_next/
  Always block:      Non-production environments: disallow: '/'
  Always add:        Sitemap: https://acme.com/sitemap.xml

SITEMAP.XML
  Dynamic:           src/app/sitemap.ts → MetadataRoute.Sitemap
  ISR:               export const revalidate = 3600 ← regenerate hourly
  Include only:      Public, indexable URLs (never /api/, /dashboard/)
  Fields:            url, lastModified, changeFrequency, priority
  Limit:             50,000 URLs per sitemap → use sitemap index for larger

JSON-LD
  Add via:           <script type="application/ld+json" dangerouslySetInnerHTML />
  Location:          In Server Component JSX (NOT in metadata object)
  Sanitize:          replace </> with Unicode escapes to prevent XSS
  Common types:      Product, Article, BreadcrumbList, FAQPage, Organization
  Multiple schemas:  Multiple <script> tags on same page — fine ✅
  Validates:         schema-dts for TypeScript types
  Rich results:      Product → price/stars in Google, FAQPage → accordion in SERP

ENVIRONMENT VARIABLES
  Server only:       DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY
                     Available: Server Components, Actions, Route Handlers
                     NOT available: Client Components, browser
  Public:            NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_VERSION
                     Available: EVERYWHERE (bundled into client JS)
  Rule:              NEVER put secrets in NEXT_PUBLIC_ vars
  Files:             .env (committed) → .env.local (gitignored, secrets)
  Validate:          Zod at startup → crashes with clear error at deploy time
  server-only:       import 'server-only' → build error if imported on client
  NEXT_PUBLIC_ vars: Inlined at BUILD TIME → changing requires rebuild

DEPLOYMENT
  output modes:
    (default)        → Vercel/Netlify — full features, auto-handled
    'standalone'     → Docker/VMs — minimal bundle, copies only needed files
    'export'         → Static HTML — no server features (no Actions/Handlers/ISR)
  Dockerfile:        3 stages: deps → builder → runner
                     COPY standalone + .next/static + public (all three required)
                     Non-root user (nextjs:nodejs)
  next.config.ts:    poweredByHeader:false, security headers, image remotePatterns
  Health check:      GET /api/health → { status, version, timestamp, uptimeSec }
                     200=ok, 503=degraded — required for load balancers/k8s
  Security headers:  X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
                     Permissions-Policy, HSTS (all in next.config.ts headers())
  Pre-deploy:        type-check + lint + env validation + build
  removeConsole:     Compiler option removes console.log in production builds
```

---

> **Your next action:** Open `next.config.ts` in your project. Add `poweredByHeader: false` and the five security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`) to the `headers()` function. Run `next build` and verify the build passes. Then visit any page in your browser DevTools → Network → Response Headers and confirm the headers appear.
>
> _Doing one small thing beats opening a feed._
