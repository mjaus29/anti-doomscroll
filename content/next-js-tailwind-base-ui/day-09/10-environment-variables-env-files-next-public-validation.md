# 10 — Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation

---

## T — TL;DR

Environment variables in Next.js 16 follow strict rules: **only `NEXT_PUBLIC_` prefixed variables are sent to the browser** — everything else stays server-side. Use `.env.local` for secrets, validate all env vars at startup with Zod to catch missing config before runtime crashes.

---

## K — Key Concepts

### The `.env` File Hierarchy

```bash
# File load order (later files override earlier ones):
.env                 ← shared defaults (committed to git — NO secrets)
.env.local           ← local overrides (gitignored — put secrets here)
.env.development     ← loaded in development only
.env.development.local ← local development overrides (gitignored)
.env.production      ← loaded in production only
.env.production.local  ← local production overrides (gitignored)
.env.test            ← loaded in test environment

# Gitignore rule — ALWAYS gitignore .local files
# .gitignore:
*.local
```

### The Two Categories of Env Vars

```bash
# ─── Category 1: SERVER-ONLY (no NEXT_PUBLIC_ prefix)
# Available in: Server Components, Server Actions, Route Handlers, Middleware
# NOT available in: Client Components, browser console, network requests

DATABASE_URL="postgresql://user:password@localhost:5432/acme"
STRIPE_SECRET_KEY="sk_live_abc123..."
SENDGRID_API_KEY="SG.xxx..."
JWT_SECRET="my-super-secret-jwt-signing-key"
INTERNAL_API_KEY="internal-service-key"
NEXTAUTH_SECRET="random-secret-string"

# ─── Category 2: PUBLIC (NEXT_PUBLIC_ prefix)
# Available in: EVERYTHING — server AND client
# Bundled into client JavaScript — visible in browser DevTools
# NEVER put secrets here

NEXT_PUBLIC_SITE_URL="https://acme.com"
NEXT_PUBLIC_APP_VERSION="1.2.0"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_abc123..."  # ← safe: publishable key
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_POSTHOG_KEY="phc_xxx..."
```

### `.env` File Structure — Full Example

```bash
# .env — committed to git (safe defaults, no secrets)
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Acme
NEXT_PUBLIC_APP_VERSION=1.0.0

# .env.local — gitignored (local secrets)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme_dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG.xxx...
JWT_SECRET=dev-jwt-secret-change-in-production
NEXTAUTH_SECRET=dev-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# .env.production — committed to git (production non-secrets)
NEXT_PUBLIC_SITE_URL=https://acme.com
NEXT_PUBLIC_APP_VERSION=1.2.0

# Production secrets set as environment variables in hosting platform
# (Vercel, Railway, Fly.io, etc.) — never in .env.production
```

### Env Var Validation with Zod — Catch Missing Config at Startup

```tsx
// src/lib/env.ts
// Validates ALL env vars at module load time
// If any required var is missing → server crashes with clear error at startup
// (not a cryptic TypeError deep in request handling)

import { z } from "zod";

// ─── Server-only env vars
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "Must be a Stripe secret key"),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "Must be a Stripe webhook secret"),
  SENDGRID_API_KEY: z.string().min(1, "SENDGRID_API_KEY is required"),
  // Optional with defaults
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// ─── Public env vars (safe for client)
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Acme"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
});

// ─── Validate server env (only runs server-side)
function validateServerEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    console.error(
      "❌ Invalid server environment variables:\n",
      result.error.flatten().fieldErrors
    );
    throw new Error("Invalid environment configuration — check server logs");
  }
  return result.data;
}

// ─── Validate client env (runs both server and client)
function validateClientEnv() {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  });
  if (!result.success) {
    console.error(
      "❌ Invalid public environment variables:\n",
      result.error.flatten().fieldErrors
    );
    throw new Error("Invalid public environment configuration");
  }
  return result.data;
}

// ─── Export typed env objects
// Server env: only import in server-side files
export const serverEnv =
  typeof window === "undefined"
    ? validateServerEnv()
    : ({} as ReturnType<typeof validateServerEnv>);

// Client env: safe to import anywhere
export const clientEnv = validateClientEnv();

// ─── Type exports for autocomplete
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
```

### Using Validated Env Vars

```tsx
// ─── Server-side usage (Server Component, Server Action, Route Handler)
// src/lib/db.ts
import { serverEnv } from "@/lib/env";

export const db = new PrismaClient({
  datasources: { db: { url: serverEnv.DATABASE_URL } },
});
```

```tsx
// ─── Server Action using validated env
// src/app/auth/actions.ts
"use server";

import { serverEnv } from "@/lib/env";
import { SignJWT } from "jose";

export async function createToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(serverEnv.JWT_SECRET)); // ← typed, validated ✅
}
```

```tsx
// ─── Client Component using public env
// src/components/analytics.tsx
"use client";

import { clientEnv } from "@/lib/env";

export function Analytics() {
  // clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID is typed string | undefined ✅
  if (!clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) return null;

  return (
    <script
      async
      src={`https://www.googletagmanager.com/gtag/js?id=${clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
    />
  );
}
```

### `server-only` Package — Prevent Secret Leaks

```tsx
// npm install server-only

// src/lib/stripe.ts — contains secret key, must never reach browser
import "server-only"; // ← build error if this file is imported in a Client Component

import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// If a Client Component tries to import this:
// Error: You're importing a component that needs "server-only" ← build error ✅
// Prevents accidentally shipping secrets to the browser
```

### `t3-env` — Alternative Validated Env Library

```tsx
// npm install @t3-oss/env-nextjs zod
// Alternative to manual Zod validation — popular in the T3 Stack

// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  },
});

// Usage: env.DATABASE_URL, env.NEXT_PUBLIC_SITE_URL — fully typed ✅
```

### Environment Variable Access — Complete Reference

```tsx
// ─── Where each type is accessible
//
//                        Server    Client
// ─────────────────────────────────────────────
// DATABASE_URL           ✅        ❌
// JWT_SECRET             ✅        ❌
// NEXT_PUBLIC_SITE_URL   ✅        ✅
//
// Server Components      → process.env.DATABASE_URL ✅
// Client Components      → process.env.DATABASE_URL ❌ (undefined)
// Server Actions         → process.env.DATABASE_URL ✅
// Route Handlers         → process.env.DATABASE_URL ✅
// Middleware             → process.env.DATABASE_URL ✅
// next.config.ts         → process.env.DATABASE_URL ✅
//
// ─── Edge Runtime limitation:
// Edge Runtime does NOT support all env var access patterns
// Always test env var access in Edge Routes specifically

// ─── Build-time vs Runtime:
// NEXT_PUBLIC_ vars: inlined at BUILD TIME (static string in bundle)
//   → Changing them requires a rebuild
//   → process.env.NEXT_PUBLIC_SITE_URL === 'https://acme.com' literally in bundle
//
// Server vars: read at RUNTIME (from process.env each call)
//   → Can be changed without rebuilding (on the server)
```

---

## W — Why It Matters

- The `NEXT_PUBLIC_` prefix rule is the most common security mistake in Next.js apps — developers put `DATABASE_URL` or `STRIPE_SECRET_KEY` in a `NEXT_PUBLIC_` variable and ship their credentials to every browser. The prefix convention makes the exposure explicit.
- Validating env vars at startup (rather than discovering missing vars at runtime during a production request) is the difference between catching a deployment error in your CI/CD pipeline vs getting a 500 error for real users at 2am when a secret wasn't set.
- The `server-only` package is a zero-cost compile-time guard — it causes a build error if you accidentally import a server-side module (with secrets) into a Client Component. This is defense-in-depth: even if a developer forgets about the `NEXT_PUBLIC_` rule, the build fails before deployment.

---

## I — Interview Q&A

### Q1: What is the difference between a regular env var and a `NEXT_PUBLIC_` env var in Next.js?

**A:** Regular environment variables (without the `NEXT_PUBLIC_` prefix) are only available in server-side code — Server Components, Server Actions, Route Handlers, and Middleware. They are never included in the client-side JavaScript bundle. `NEXT_PUBLIC_` prefixed variables are inlined into the client JavaScript bundle at build time — they're accessible everywhere, including Client Components and the browser console. The practical rule: database URLs, API secret keys, JWT secrets, and anything sensitive must never have the `NEXT_PUBLIC_` prefix. Only put values in `NEXT_PUBLIC_` that you're comfortable with every user seeing in their browser DevTools.

### Q2: Why should you validate environment variables with Zod at startup rather than at the point of use?

**A:** Validating at the point of use means a missing variable causes a runtime error deep in request handling — potentially during a production request that affects a real user, at an unclear error location, possibly hours after deployment. Validating at startup (when the module is first imported or when the server starts) fails fast and visibly — the server crashes immediately with a clear error message listing exactly which variables are missing or malformed. This surfaces the issue during deployment or CI/CD, before any user traffic reaches the server, and provides an actionable error: "DATABASE_URL must be a valid URL" rather than "Cannot read properties of undefined."

### Q3: What does the `server-only` package do?

**A:** `server-only` is an npm package that, when imported at the top of a file, causes a build-time error if that file is imported in a Client Component (anything in the client bundle). It's a compile-time guard that prevents server-only code — containing secrets, database connections, or server-side APIs — from accidentally ending up in the browser bundle. You add `import 'server-only'` at the top of files like `lib/db.ts`, `lib/auth.ts`, or `lib/stripe.ts`. If a developer accidentally imports one of these files in a `'use client'` component, the build fails immediately with a clear error, before any code is deployed.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting secret keys in `NEXT_PUBLIC_` variables

```bash
# ❌ THIS EXPOSES YOUR SECRET TO EVERY USER'S BROWSER
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abc123...
NEXT_PUBLIC_DATABASE_URL=postgresql://user:password@db.example.com/prod
NEXT_PUBLIC_JWT_SECRET=my-super-secret-key
```

**Fix:** Remove `NEXT_PUBLIC_` from all secret values:

```bash
# ✅ Server-only secrets — never sent to browser
STRIPE_SECRET_KEY=sk_live_abc123...
DATABASE_URL=postgresql://user:password@db.example.com/prod
JWT_SECRET=my-super-secret-key

# ✅ Only PUBLIC values get NEXT_PUBLIC_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_abc123...  # safe — publishable key
```

### ❌ Pitfall: Accessing server env vars in Client Components

```tsx
// ❌ DATABASE_URL is undefined in the browser — silently fails
"use client";
export function DataFetcher() {
  const dbUrl = process.env.DATABASE_URL; // ← undefined in browser ❌
  // No error — just silently undefined, causing subtle bugs
}
```

**Fix:** Server env vars belong exclusively in server-side code:

```tsx
// ✅ Move data fetching to a Server Component
export default async function DataPage() {
  const data = await db.item.findMany(); // uses DATABASE_URL server-side ✅
  return <DataDisplay data={data} />; // pass serialized data to client
}
```

### ❌ Pitfall: Committing `.env.local` to git

```bash
# ❌ This exposes production secrets in your git history
git add .env.local
git commit -m "add env vars"
# Now everyone with repo access has your DATABASE_URL, JWT_SECRET, etc.
```

**Fix:** Always gitignore local env files:

```bash
# .gitignore
.env*.local
.env.local
.env.production.local
.env.development.local
```

### ❌ Pitfall: Not providing a `.env.example` file for new developers

```bash
# ❌ New team member clones repo → no idea what env vars are needed
# → runtime errors with no guidance
```

**Fix:** Maintain a `.env.example` file committed to git with placeholder values:

```bash
# .env.example — committed, shows required vars with fake values
DATABASE_URL=postgresql://user:password@localhost:5432/acme_dev
JWT_SECRET=change-this-to-a-random-32-char-string
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

---

## K — Coding Challenge + Solution

### Challenge

Build a complete env validation setup:

1. `src/lib/env.ts` with Zod schemas for server env (`DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `NODE_ENV`) and client env (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_VERSION`)
2. Clear startup error messages listing all missing/invalid vars
3. `src/lib/stripe.ts` marked `server-only` using the validated `serverEnv`
4. A `src/lib/config.ts` that exports a typed `config` object combining both for convenient access
5. `.env.example` file showing all required variables

### Solution

```tsx
// src/lib/env.ts
import { z } from "zod";

// ─── Server schema
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith("sk_", "STRIPE_SECRET_KEY must start with sk_")
    .min(20, "STRIPE_SECRET_KEY appears invalid — check your Stripe dashboard"),
  SENDGRID_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

// ─── Client schema
const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("0.0.0"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith("pk_", "Must start with pk_")
    .optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, "GA ID format: G-XXXXXXXXXX")
    .optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

// ─── Validation helpers
function formatErrors(errors: z.ZodError): string {
  return Object.entries(errors.flatten().fieldErrors)
    .map(([field, messages]) => `  • ${field}: ${messages?.join(", ")}`)
    .join("\n");
}

function validateServer(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const msg = `\n❌ Invalid server environment variables:\n${formatErrors(result.error)}\n`;
    console.error(msg);
    throw new Error(
      "Invalid server environment — fix the variables above and restart"
    );
  }
  return result.data;
}

function validateClient(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  });
  if (!result.success) {
    const msg = `\n❌ Invalid public environment variables:\n${formatErrors(result.error)}\n`;
    console.error(msg);
    throw new Error("Invalid public environment — fix the variables above");
  }
  return result.data;
}

// ─── Validated, typed exports
export const serverEnv: ServerEnv =
  typeof window === "undefined" ? validateServer() : ({} as ServerEnv); // ← client-side: server vars not available

export const clientEnv: ClientEnv = validateClient();

export type { ServerEnv, ClientEnv };
```

```tsx
// src/lib/stripe.ts
import "server-only"; // ← build error if imported in Client Component ✅
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});

// If imported in 'use client' file:
// Error: You're importing a component that needs server-only ← build fails ✅
```

```tsx
// src/lib/config.ts
// Convenient typed config object combining both env schemas
import { serverEnv, clientEnv } from "@/lib/env";

export const config = {
  app: {
    name: clientEnv.NEXT_PUBLIC_APP_VERSION,
    version: clientEnv.NEXT_PUBLIC_APP_VERSION,
    url: clientEnv.NEXT_PUBLIC_SITE_URL,
    isDev: process.env.NODE_ENV === "development",
    isProd: process.env.NODE_ENV === "production",
  },
  analytics: {
    gaId: clientEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  },
  stripe: {
    publishableKey: clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
} as const;

// Server config — only use in server-side files
export const serverConfig =
  typeof window === "undefined"
    ? ({
        db: {
          url: serverEnv.DATABASE_URL,
        },
        auth: {
          jwtSecret: serverEnv.JWT_SECRET,
        },
        stripe: {
          secretKey: serverEnv.STRIPE_SECRET_KEY,
        },
        logging: {
          level: serverEnv.LOG_LEVEL,
        },
        rateLimit: {
          max: serverEnv.RATE_LIMIT_MAX,
        },
      } as const)
    : null;
```

```bash
# .env.example — committed to git, shows all required variables
# Copy this file to .env.local and fill in real values

# ─── App
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_VERSION=0.0.0

# ─── Database (required)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acme_dev

# ─── Auth (required — generate with: openssl rand -base64 32)
JWT_SECRET=change-this-to-a-random-32-character-string-minimum

# ─── Stripe (required)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_publishable_key_here

# ─── Email (optional)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# ─── Analytics (optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# ─── Server config
LOG_LEVEL=debug
RATE_LIMIT_MAX=100
```

---

---
