# 📅 Day 1 — Environment Setup & Mental Model (Next.js 16)

> **Goal:** Go from zero to a running, correctly structured Next.js 16 project — and understand _why_ every file and folder exists before writing a single component.
> **Format:** Each subtopic = 5–15 min. Do one. Stop. Come back.
> **Next.js version context:** Next.js 16 builds on Next.js 15 — React 19 stable, Turbopack default for dev, App Router as the only recommended router, updated caching model, and TypeScript-first defaults throughout.

---

## 📋 Day 1 Subtopic Overview

| #   | Subtopic                                             | Time   |
| --- | ---------------------------------------------------- | ------ |
| 1   | `create-next-app` — Scaffolding the Project          | 10 min |
| 2   | TypeScript in Next.js 16                             | 10 min |
| 3   | ESLint — Configuration & Rules                       | 10 min |
| 4   | Tailwind CSS Integration                             | 10 min |
| 5   | App Router Mental Model                              | 15 min |
| 6   | The `app/` Directory — Structure & Conventions       | 15 min |
| 7   | The `src/` Directory — Why and When                  | 8 min  |
| 8   | The `public/` Directory                              | 8 min  |
| 9   | Top-Level Config Files                               | 15 min |
| 10  | Local Development Flow                               | 10 min |
| 11  | Project Structure Overview — Putting It All Together | 15 min |

---

---

# 1 — `create-next-app` — Scaffolding the Project

---

## T — TL;DR

`create-next-app` is the official CLI to scaffold a production-ready Next.js 16 project in one command — with TypeScript, ESLint, Tailwind, and the App Router configured correctly out of the box. Never set these up manually from scratch.

---

## K — Key Concepts

### The Command

```bash
npx create-next-app@latest my-app
# or
pnpm dlx create-next-app@latest my-app
# or
yarn create next-app my-app
# or
bunx create-next-app@latest my-app
```

### The Interactive Prompt (Next.js 16 Defaults)

```bash
✔ Would you like to use TypeScript?          › Yes   ← always yes
✔ Would you like to use ESLint?              › Yes   ← always yes
✔ Would you like to use Tailwind CSS?        › Yes   ← yes for most projects
✔ Would you like your code inside a `src/` directory?  › Yes ← recommended
✔ Would you like to use App Router?          › Yes   ← the only modern choice
✔ Would you like to use Turbopack for `next dev`? › Yes ← default in v16
✔ Would you like to customize the import alias? › No (or @/* which is default)
```

### Non-Interactive (CI / Scripts)

```bash
# All defaults, no prompts — fastest way to scaffold
npx create-next-app@latest my-app \
  --typescript \
  --eslint \
  --tailwind \
  --src-dir \
  --app \
  --turbopack \
  --import-alias "@/*" \
  --no-git          # skip git init if you want to control this
```

### What Gets Generated

```
my-app/
├── src/
│   └── app/
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx        ← root layout
│       └── page.tsx          ← home page (/)
├── public/
│   ├── next.svg
│   └── vercel.svg
├── .eslintrc.json            ← or eslint.config.mjs (flat config)
├── .gitignore
├── next.config.ts            ← TypeScript config (v15+)
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

### Package Manager Detection

`create-next-app` automatically detects which package manager you're using (npm / pnpm / yarn / bun) based on the command used and locks it:

```json
// package.json — auto-configured
{
  "packageManager": "pnpm@9.x.x"
}
```

### After Scaffolding

```bash
cd my-app
npm run dev       # or pnpm dev / yarn dev / bun dev
# → http://localhost:3000
```

### Template Flags (Useful for Learning)

```bash
# Scaffold with a specific example from next.js examples repo
npx create-next-app@latest --example with-supabase my-app
npx create-next-app@latest --example blog-starter my-app

# See all examples: https://github.com/vercel/next.js/tree/canary/examples
```

---

## W — Why It Matters

- Manual setup of TypeScript + ESLint + Tailwind + App Router has dozens of interdependencies and config files — `create-next-app` gets them right without you needing to know all of them yet.
- Next.js 16 uses `next.config.ts` (TypeScript) by default — the old `next.config.js` still works but TypeScript config gives you type checking on Next.js configuration options.
- The `--turbopack` flag enables the Rust-based bundler that replaces Webpack for dev — **10–700x faster** HMR (Hot Module Replacement). It's the default in Next.js 16.
- Choosing the wrong options (Pages Router, no TypeScript, no src/) creates friction when following any modern Next.js tutorial or working with teams — always use the options above.

---

## I — Interview Q&A

### Q1: What does `create-next-app` configure that you'd have to set up manually otherwise?

**A:** TypeScript with `tsconfig.json` and Next.js-specific type paths, ESLint with `eslint-config-next` (which includes rules for accessibility, imports, React hooks, and Next.js-specific patterns), Tailwind CSS with PostCSS pipeline and `globals.css` import, the App Router directory structure, Turbopack for dev, and the `@/*` import alias pointing to `src/`. Getting all of these to work together correctly from scratch would take 30–60 minutes.

### Q2: What is Turbopack and why is it enabled by default in Next.js 16?

**A:** Turbopack is the Rust-based successor to Webpack, built by the Vercel team. It bundles only what changed incrementally — making dev server startup and HMR dramatically faster than Webpack (10–700x in benchmarks for large apps). In Next.js 16, it's the default for `next dev`. The production build (`next build`) still uses a different pipeline — Turbopack for production reached stable in Next.js 15.2.

### Q3: Should you use the Pages Router or App Router in a new Next.js 16 project?

**A:** Always App Router for new projects. The Pages Router is in maintenance mode — it still works and is fully supported but receives no new features. The App Router, introduced in Next.js 13 and stabilized in 13.4, is the architecture Next.js is investing in. It supports React Server Components, streaming, Server Actions, nested layouts, and the new caching model.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Running `create-next-app` with outdated npx cache

```bash
npx create-next-app my-app
# ← Gets a cached old version of create-next-app
```

**Fix:** Use `@latest` to always get the current version:

```bash
npx create-next-app@latest my-app  # ✅
```

### ❌ Pitfall: Choosing "No" for TypeScript thinking it's simpler

```bash
✔ Would you like to use TypeScript? › No
# ← Now you have .js files in a world where every tutorial, example, and
# Next.js internal type is TypeScript — you'll fight this for the whole project
```

**Fix:** Always choose TypeScript. You don't have to write complex types immediately — but you get type safety, autocomplete, and compatibility with the ecosystem for free.

### ❌ Pitfall: Forgetting `--no-git` in monorepos or existing git repos

```bash
npx create-next-app@latest my-app
# ← Initializes a new git repo inside an existing git repo → nested git repos
```

**Fix:**

```bash
npx create-next-app@latest my-app --no-git  # ✅
```

### ❌ Pitfall: Not using `src/` directory

```bash
✔ Would you like your code inside a `src/` directory? › No
# ← app/, components/, lib/ all sit at root level alongside config files
# → Gets messy fast as the project grows
```

**Fix:** Always use `src/` — separates your code from config files at the root level.

---

## K — Coding Challenge + Solution

### Challenge

Scaffold a Next.js 16 project called `storefront` non-interactively with:

- TypeScript enabled
- ESLint enabled
- Tailwind CSS enabled
- `src/` directory
- App Router
- Turbopack
- `@/*` alias
- No git initialization
- Using pnpm

Then verify it runs on port `3001` instead of the default `3000`.

### Solution

```bash
# ─── 1. Scaffold
pnpm dlx create-next-app@latest storefront \
  --typescript \
  --eslint \
  --tailwind \
  --src-dir \
  --app \
  --turbopack \
  --import-alias "@/*" \
  --no-git

cd storefront

# ─── 2. Run on custom port
pnpm dev -- --port 3001
# OR add to package.json:
```

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbopack --port 3001"
  }
}
```

```bash
# ─── 3. Verify
# Browser: http://localhost:3001 → Next.js welcome page ✅

# ─── 4. Check generated structure
ls src/app/
# favicon.ico  globals.css  layout.tsx  page.tsx  ✅
```

---

---

# 2 — TypeScript in Next.js 16

---

## T — TL;DR

Next.js 16 is **TypeScript-first** — all configuration, internal types, and new APIs are designed around TypeScript. You get type-safe page props, route params, server actions, and config without any extra setup. Treat TypeScript not as a complexity overhead but as the built-in documentation layer.

---

## K — Key Concepts

### Auto-Generated `tsconfig.json`

```json
// tsconfig.json — generated by create-next-app
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true, // ← allow mixing .js and .ts during migration
    "skipLibCheck": true, // ← skip type checking of node_modules
    "strict": true, // ← enables all strict checks (recommended)
    "noEmit": true, // ← Next.js handles compilation, not tsc
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler", // ← "bundler" mode (Next.js 15+)
    "resolveJsonModule": true,
    "isolatedModules": true, // ← required for React Fast Refresh
    "jsx": "preserve", // ← Next.js transforms JSX itself
    "incremental": true, // ← faster subsequent type checks
    "plugins": [
      { "name": "next" } // ← enables Next.js-specific TS completions
    ],
    "paths": {
      "@/*": ["./src/*"] // ← import alias
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Next.js TypeScript Plugin

The `"plugins": [{ "name": "next" }]` entry enables:

- Auto-completion for `layout.tsx`, `page.tsx`, `loading.tsx` exports
- Type errors in the editor for incorrect metadata shapes
- Navigation type checking (in IDE, not compile time)

Activate it in VS Code:

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Typed Page Props — App Router

```tsx
// src/app/products/[id]/page.tsx

// Next.js 16 — typed route params
type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface ProductPageProps {
  params: Params;
  searchParams: SearchParams;
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  // params and searchParams are Promises in Next.js 15+ (async params)
  const { id } = await params;
  const { q } = await searchParams;

  return (
    <div>
      Product {id} — search: {q}
    </div>
  );
}
```

> ⚠️ **Next.js 15+ breaking change:** `params` and `searchParams` are now `Promise<>` — you must `await` them. This was synchronous in Next.js 14.

### Typed Metadata

```tsx
// src/app/products/[id]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      images: [product.imageUrl],
    },
  };
}
```

### Typed `next.config.ts`

```ts
// next.config.ts — TypeScript config (Next.js 15+)
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript catches invalid options here
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.myshop.com",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
```

### Type-Safe Environment Variables

```ts
// src/lib/env.ts — validate env vars with types
const requiredEnvVars = [
  "NEXT_PUBLIC_API_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
] as const;

type EnvVar = (typeof requiredEnvVars)[number];

function getEnv(key: EnvVar): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  apiUrl: getEnv("NEXT_PUBLIC_API_URL"),
  databaseUrl: getEnv("DATABASE_URL"),
  authSecret: getEnv("AUTH_SECRET"),
} as const;
```

### TypeScript Strict Mode — What It Enables

```ts
// strict: true turns on all of these:
{
  "strictNullChecks":            true,  // null/undefined not assignable to other types
  "strictFunctionTypes":         true,  // function parameter types checked contravariantly
  "strictBindCallApply":         true,  // bind/call/apply are type-checked
  "strictPropertyInitialization": true, // class properties must be initialized
  "noImplicitAny":               true,  // forbids implicit any type
  "noImplicitThis":              true,  // forbids this: any
  "alwaysStrict":                true,  // emits 'use strict' in output
  "useUnknownInCatchVariables":  true   // catch (e) → e is unknown, not any
}
```

---

## W — Why It Matters

- Next.js 15+ made `params` and `searchParams` async — without TypeScript, this breaking change causes runtime errors that are hard to debug. With TypeScript, the type error is immediate.
- Typed metadata prevents malformed OpenGraph tags from silently failing — the compiler catches missing required fields.
- `moduleResolution: "bundler"` is a Next.js 15+ default that correctly resolves imports the way bundlers do (not Node.js resolution) — changing this breaks most Next.js apps.
- `noEmit: true` means TypeScript is only used for type checking — Next.js/Turbopack handles compilation. Running `tsc --noEmit` in CI is the type-check step.

---

## I — Interview Q&A

### Q1: Why is `noEmit: true` set in Next.js's `tsconfig.json`?

**A:** Next.js uses its own compilation pipeline (SWC or Turbopack) — not the TypeScript compiler — to transform TypeScript to JavaScript. Setting `noEmit: true` tells `tsc` to only type-check without producing output files. This prevents conflicts between `tsc`'s output and Next.js's build output. In CI, you run `tsc --noEmit` as a separate type-checking step.

### Q2: What changed about `params` in Next.js 15 and why does it matter for TypeScript?

**A:** In Next.js 15, `params` and `searchParams` in page components became `Promise<>` instead of plain objects — you must `await params` before accessing route parameters. TypeScript catches this immediately: `params.id` is a type error because you're accessing `.id` on a `Promise`. Without TypeScript, this would be a silent `undefined` bug at runtime.

### Q3: What does `moduleResolution: "bundler"` do?

**A:** It tells TypeScript to resolve imports the way modern bundlers (Webpack, Turbopack, Vite) do — not the way Node.js resolves them. This means it supports `exports` field in `package.json`, allows omitting file extensions in relative imports, and correctly handles ESM packages. Using `"node"` resolution with Next.js causes false type errors for packages that use the `exports` field.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Accessing `params.id` without awaiting (Next.js 15+)

```tsx
// ❌ Breaks in Next.js 15+
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>; // params is a Promise — .id is undefined
}
```

**Fix:**

```tsx
// ✅ Await params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <div>{id}</div>;
}
```

### ❌ Pitfall: Turning off `strict: false` to silence type errors

```json
{ "compilerOptions": { "strict": false } }
// ← Now null/undefined checks are off, any is silent, real bugs hide
```

**Fix:** Keep `strict: true`. Fix the actual type errors — they're pointing at real problems.

### ❌ Pitfall: Not running type checks in CI

```json
// package.json — missing type-check script
{
  "scripts": {
    "build": "next build"
    // ← next build doesn't fail on type errors in Next.js 16 by default
  }
}
```

**Fix:**

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "build": "npm run type-check && next build"
  }
}
```

---

## K — Coding Challenge + Solution

### Challenge

Create a typed `[slug]/page.tsx` for a blog that:

1. Accepts `slug` route param (awaited)
2. Accepts optional `preview` search param (boolean)
3. Has typed `generateMetadata` that uses `slug`
4. All types are explicit — no `any`

### Solution

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";

// ─── Types
type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ preview?: string }>;

interface BlogPostPageProps {
  params: Params;
  searchParams: SearchParams;
}

// ─── Metadata
export async function generateMetadata(
  { params }: BlogPostPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `Blog: ${slug.replace(/-/g, " ")}`,
    description: `Read our post about ${slug}`,
  };
}

// ─── Page component
export default async function BlogPostPage({
  params,
  searchParams,
}: BlogPostPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;

  const isPreview = preview === "true";

  return (
    <article>
      <h1>{slug.replace(/-/g, " ")}</h1>
      {isPreview && (
        <p className="text-yellow-600 bg-yellow-50 p-2 rounded">
          Preview Mode Active
        </p>
      )}
    </article>
  );
}
```

---

---

# 3 — ESLint — Configuration & Rules

---

## T — TL;DR

Next.js 16 ships with `eslint-config-next` — a curated set of ESLint rules that catches bugs specific to Next.js patterns: missing `alt` on images, wrong `<Link>` usage, broken `<Script>` placement, and React hooks violations. It's pre-configured — you just keep it enabled.

---

## K — Key Concepts

### Two Config Formats — Old vs New

Next.js 16 supports both:

```json
// .eslintrc.json — legacy format (still works)
{
  "extends": "next/core-web-vitals"
}
```

```js
// eslint.config.mjs — flat config (ESLint 9+, default in Next.js 16)
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

> Next.js 16 uses **flat config** (`eslint.config.mjs`) by default when you use `create-next-app`.

### What `next/core-web-vitals` Includes

```
eslint-config-next includes:
  ├── eslint-plugin-react           (React rules)
  ├── eslint-plugin-react-hooks     (hooks rules: rules-of-hooks, exhaustive-deps)
  ├── eslint-plugin-next            (Next.js-specific rules)
  ├── eslint-plugin-jsx-a11y        (accessibility rules)
  └── @typescript-eslint/eslint-plugin  (TypeScript rules, via next/typescript)

next/core-web-vitals adds stricter rules on top of next:
  → Errors on patterns that hurt Core Web Vitals scores
```

### Key Next.js-Specific Rules

```tsx
// ❌ @next/next/no-html-link-for-pages
<a href="/about">About</a>
// → Should use <Link href="/about"> for client-side navigation

// ❌ @next/next/no-img-element
<img src="/photo.jpg" alt="Photo" />
// → Should use next/image for optimization

// ❌ @next/next/no-sync-scripts
<script src="https://cdn.example.com/lib.js" />
// → Should use next/script with strategy prop

// ❌ @next/next/no-head-element (App Router)
import Head from 'next/head'
// → App Router uses metadata export, not <Head>

// ❌ react-hooks/rules-of-hooks
function Component() {
  if (condition) {
    const [state, setState] = useState(0)  // ← hook inside conditional
  }
}
// → ReferenceError at runtime → ESLint catches it at save time

// ❌ react-hooks/exhaustive-deps
useEffect(() => {
  fetchData(userId)  // userId used but not in deps
}, [])
// → Stale closure bug → ESLint warns
```

### Running ESLint

```bash
# Check all files
npm run lint
# Or directly:
npx next lint

# Fix auto-fixable issues
npx next lint --fix

# Lint specific directory
npx next lint --dir src/app

# Output as JSON (for CI)
npx next lint --format json
```

### Customizing Rules

```js
// eslint.config.mjs — adding custom rules
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Turn off if you're intentionally using <img> for external images
      "@next/next/no-img-element": "off",

      // Enforce consistent imports
      "import/order": "warn",

      // Custom TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",

      // Prefer const
      "prefer-const": "error",
    },
  },
];

export default eslintConfig;
```

### ESLint in VS Code — Real-Time Feedback

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript", "typescriptreact"],
  "eslint.useFlatConfig": true
}
```

### Adding Prettier (Optional but Recommended)

```bash
npm install -D prettier eslint-config-prettier
```

```js
// eslint.config.mjs — add prettier LAST to override formatting rules
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.extends("prettier"), // ← must be last
];
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## W — Why It Matters

- The `react-hooks/exhaustive-deps` rule catches stale closure bugs before they hit production — missing `useEffect` dependencies are one of the most common React bugs.
- `@next/next/no-img-element` enforces Next.js Image optimization — raw `<img>` tags skip LCP optimization and CLS protection that `next/image` provides.
- The flat config format (`eslint.config.mjs`) is the future of ESLint — understanding it means you're not stuck copying `.eslintrc.json` from old tutorials that use the legacy format.
- Running `next lint` in CI catches regressions that TypeScript misses — accessibility violations, broken hook patterns, and Next.js antipatterns.

---

## I — Interview Q&A

### Q1: What is `eslint-config-next` and what does it include?

**A:** It's the official ESLint config for Next.js that bundles rules from `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-next` (Next.js-specific rules), and `eslint-plugin-jsx-a11y`. The `next/core-web-vitals` preset adds stricter rules that flag patterns affecting Core Web Vitals scores. The `next/typescript` preset adds TypeScript-specific rules.

### Q2: What's the difference between `.eslintrc.json` and `eslint.config.mjs`?

**A:** `.eslintrc.json` is the legacy ESLint config format (pre-ESLint 9). `eslint.config.mjs` is the "flat config" format introduced in ESLint 9 — a single JavaScript file with explicit imports instead of string extends. Next.js 16 uses flat config by default. Flat config is more explicit, easier to debug, and is the only format supported in future ESLint versions.

### Q3: The `react-hooks/exhaustive-deps` rule is annoying — should you disable it?

**A:** No. It catches real bugs — stale closures that cause `useEffect` to use outdated values. When it fires, the correct fix is to add the missing dependency to the array or use `useCallback`/`useMemo` to stabilize the reference. Disabling it trades a lint warning for a category of subtle production bugs.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Suppressing lint errors with `// eslint-disable` without understanding why

```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  fetchUser(userId);
}, []);
// ← The lint rule is correct — fetchUser uses userId from outer scope
//    which may change. This "fix" just hides the bug.
```

**Fix:** Understand the rule, then fix the code:

```tsx
useEffect(() => {
  fetchUser(userId);
}, [userId]); // ✅ correct dependency
```

### ❌ Pitfall: Not installing `eslint-plugin-next` separately when not using `create-next-app`

```bash
# If you set up Next.js manually, the plugins must be explicit
npm install -D eslint eslint-config-next
# eslint-config-next installs the plugins automatically as peer deps ✅
```

### ❌ Pitfall: Running old `.eslintrc.json` flat config rules expecting them to work with ESLint 9

```json
// .eslintrc.json — legacy config
{ "extends": ["next/core-web-vitals"] }
// In ESLint 9+ with flat config mode, this file is ignored silently
```

**Fix:** Use `eslint.config.mjs` with `FlatCompat` as shown above.

---

## K — Coding Challenge + Solution

### Challenge

Write an `eslint.config.mjs` for a Next.js 16 project that:

1. Extends `next/core-web-vitals` and `next/typescript`
2. Bans `any` type (`error`)
3. Allows unused variables that start with `_` (warning, not error)
4. Disables `no-img-element` for a specific file: `src/app/og/route.tsx` (OG image generation legitimately uses `<img>`)
5. Integrates `prettier`

### Solution

```js
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // ─── Base: Next.js recommended rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ─── Global custom rules
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "prefer-const": "error",
    },
  },

  // ─── File-specific override: OG route may use <img>
  {
    files: ["src/app/og/route.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },

  // ─── Prettier — MUST be last to override formatting rules
  ...compat.extends("prettier"),
];

export default eslintConfig;
```

---

---

# 4 — Tailwind CSS Integration

---

## T — TL;DR

Next.js 16 + `create-next-app` sets up Tailwind CSS v4 with PostCSS automatically. Tailwind v4 uses a CSS-first configuration approach — most setup happens in `globals.css` instead of `tailwind.config.ts`. Write utility classes directly in JSX. No CSS files needed for 90% of styling.

---

## K — Key Concepts

### Tailwind v4 — What Changed from v3

```
Tailwind CSS v4 (default in Next.js 16):
  - Configuration moved to CSS file (@import "tailwindcss" in globals.css)
  - No tailwind.config.js required for basic use
  - Automatic content detection (no content array to configure)
  - CSS variables replace the design token system
  - 5x faster build times (Oxide engine in Rust)
  - New utilities and updated defaults
```

### What `create-next-app` Generates

```css
/* src/app/globals.css — Tailwind v4 */
@import "tailwindcss";

/* Custom CSS variables / theme tokens */
:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
```

```ts
// tailwind.config.ts — still present but minimal in v4
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
```

```js
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Tailwind v4 uses @tailwindcss/postcss instead of tailwindcss directly
  },
};
export default config;
```

### Using Tailwind Classes in Next.js

```tsx
// src/app/page.tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Storefront
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Built with Next.js 16 + Tailwind CSS v4
        </p>
        <button
          className="
          mt-8 px-6 py-3
          bg-blue-600 hover:bg-blue-700
          text-white font-medium
          rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        "
        >
          Get Started
        </button>
      </div>
    </main>
  );
}
```

### Extending the Theme (Tailwind v4 CSS Variables)

```css
/* src/app/globals.css — v4 custom theme via CSS */
@import "tailwindcss";

@theme {
  /* Custom colors — available as bg-brand-500, text-brand-500, etc. */
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-900: #1e3a8a;

  /* Custom fonts — available as font-display */
  --font-display: "Cal Sans", sans-serif;

  /* Custom spacing */
  --spacing-18: 4.5rem;
}
```

### Extending the Theme (Tailwind v3 Style — `tailwind.config.ts`)

```ts
// tailwind.config.ts — v3 compatible approach
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          900: "#1e3a8a",
        },
      },
      fontFamily: {
        display: ["Cal Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

### `cn()` Utility — Class Name Merging (Essential Pattern)

```bash
npm install clsx tailwind-merge
```

```ts
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

```tsx
// Usage — conditional classes + conflict resolution
function Button({
  variant = "primary",
  className,
  children,
}: {
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" &&
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        className // ← caller overrides win, twMerge resolves conflicts
      )}
    >
      {children}
    </button>
  );
}

// twMerge resolves Tailwind conflicts:
cn("px-4 px-8"); // → 'px-8'  (later wins)
cn("text-red-500", "text-blue-500"); // → 'text-blue-500'
```

### VS Code Tailwind IntelliSense

```json
// .vscode/extensions.json — recommend to all contributors
{
  "recommendations": [
    "bradlc.vscode-tailwindcss", // ← class autocomplete + preview
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

---

## W — Why It Matters

- Tailwind v4's CSS-first configuration means no JavaScript object to understand — the theme lives in CSS variables that are also usable in plain CSS.
- Next.js + Tailwind is the dominant production stack for React apps in 2025/2026 — every job posting for Next.js assumes Tailwind familiarity.
- The `cn()` utility (clsx + tailwind-merge) is a community standard — it appears in shadcn/ui, Radix examples, and virtually every Next.js component library. Learn it once, see it everywhere.
- `tailwind-merge` specifically prevents the common bug where two conflicting Tailwind classes both render and the "winner" is unpredictable (e.g., `px-4 px-8` — without merge, CSS specificity order determines which wins, not the class order in the string).

---

## I — Interview Q&A

### Q1: What changed in Tailwind CSS v4 compared to v3?

**A:** Tailwind v4 moves configuration to CSS files using `@import "tailwindcss"` and `@theme {}` blocks instead of `tailwind.config.js`. It uses CSS variables for the design token system, has automatic content detection (no `content` array needed), and uses a Rust-based engine (Oxide) that's 5x faster. The class names are largely the same — migration from v3 is mostly config file changes.

### Q2: What does `tailwind-merge` do that `clsx` doesn't?

**A:** `clsx` concatenates class names and handles conditional logic (`clsx('a', condition && 'b')`). It doesn't resolve Tailwind conflicts — `clsx('px-4 px-8')` produces `"px-4 px-8"` and the CSS order determines which wins (unpredictable). `tailwind-merge` knows about Tailwind's class groups and picks the winner correctly — `twMerge('px-4 px-8')` produces `"px-8"`. Use both together via `cn()`.

### Q3: Why is Next.js's CSS Modules approach unnecessary when using Tailwind?

**A:** CSS Modules scope CSS class names to the component to avoid collisions. Tailwind classes are globally defined utility classes — there are no collisions to worry about because each class does exactly one thing. Tailwind replaces the need for CSS Modules for component styling. CSS Modules are still useful for complex animations or third-party library style overrides.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Building class strings dynamically (Tailwind purges them)

```tsx
// ❌ Tailwind's content scanner cannot detect dynamically built classes
const color = 'blue'
const size  = '500'
<div className={`bg-${color}-${size}`}>  // 'bg-blue-500' — purged in production!
```

**Fix:** Use complete class names in conditions:

```tsx
const classes = {
  blue:  'bg-blue-500',
  green: 'bg-green-500',
  red:   'bg-red-500'
}
<div className={classes[color]}>  // ✅ complete class names — not purged
```

### ❌ Pitfall: Not importing Tailwind in `globals.css` and wondering why no styles apply

```css
/* globals.css — missing Tailwind import */
/* (empty or only custom CSS) */
```

**Fix:**

```css
/* globals.css */
@import "tailwindcss"; /* ← v4: this one line includes everything */
/* or for v3: */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ❌ Pitfall: Importing `globals.css` in every component instead of root layout

```tsx
// ❌ Importing globals.css in individual components
import "../../globals.css"; // duplicated styles, potential issues
```

**Fix:** Import `globals.css` only once in `src/app/layout.tsx`:

```tsx
// src/app/layout.tsx
import "./globals.css"; // ✅ imported once in root layout
```

---

## K — Coding Challenge + Solution

### Challenge

Create a reusable `Card` component with Tailwind that:

1. Accepts `variant: 'default' | 'featured' | 'danger'`
2. Accepts optional `className` override
3. Uses `cn()` utility for class merging
4. Has different background/border colors per variant
5. Maintains consistent padding and shadow

### Solution

```tsx
// src/components/ui/card.tsx
import { cn } from "@/lib/utils";

interface CardProps {
  variant?: "default" | "featured" | "danger";
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const variantStyles = {
  default: "bg-white border-gray-200",
  featured: "bg-blue-50 border-blue-200 ring-1 ring-blue-500",
  danger: "bg-red-50 border-red-200",
} as const;

export function Card({
  variant = "default",
  className,
  children,
  title,
}: CardProps) {
  return (
    <div
      className={cn(
        // Base styles
        "rounded-xl border p-6 shadow-sm",
        // Variant styles
        variantStyles[variant],
        // Caller override — wins over variant via twMerge
        className
      )}
    >
      {title && (
        <h3
          className={cn(
            "text-lg font-semibold mb-3",
            variant === "danger" && "text-red-700",
            variant === "featured" && "text-blue-700",
            variant === "default" && "text-gray-900"
          )}
        >
          {title}
        </h3>
      )}
      <div className="text-gray-600">{children}</div>
    </div>
  );
}

// Usage:
// <Card variant="featured" title="Pro Plan">Best value</Card>
// <Card variant="danger"   className="mt-4">Danger zone</Card>
// <Card className="p-10">Custom padding — twMerge keeps p-10, drops p-6</Card>
```

---

---

# 5 — App Router Mental Model

---

## T — TL;DR

The App Router is a **file-system based router where the file structure IS the route tree**. Every folder is a URL segment. Special file names (`page.tsx`, `layout.tsx`, `loading.tsx`) have specific roles. Server Components are the default. This is the core mental model of all Next.js 16 development.

---

## K — Key Concepts

### File System = Routes

```
src/app/
├── page.tsx              → /
├── about/
│   └── page.tsx          → /about
├── products/
│   ├── page.tsx          → /products
│   └── [id]/
│       └── page.tsx      → /products/:id
├── blog/
│   ├── page.tsx          → /blog
│   └── [slug]/
│       └── page.tsx      → /blog/:slug
└── dashboard/
    ├── layout.tsx        → shared layout for /dashboard/*
    ├── page.tsx          → /dashboard
    ├── settings/
    │   └── page.tsx      → /dashboard/settings
    └── analytics/
        └── page.tsx      → /dashboard/analytics
```

### The Special File Names

```
page.tsx        ← defines a ROUTE — makes the segment publicly accessible
layout.tsx      ← wraps all routes in the segment and persists between navigations
loading.tsx     ← automatic Suspense wrapper — shown while page is streaming
error.tsx       ← error boundary — shown when an error is thrown in the segment
not-found.tsx   ← shown when notFound() is called or no route matches
template.tsx    ← like layout but re-mounts on every navigation (rare)
route.ts        ← API endpoint (replaces pages/api/) — no UI rendered
middleware.ts   ← runs before every request (authentication, redirects)
```

### Server Components vs Client Components

```
App Router default: EVERY component is a SERVER COMPONENT
  → Runs on the server
  → Can use async/await directly (fetch, database, fs)
  → Cannot use: useState, useEffect, event handlers, browser APIs
  → Result: HTML sent to the browser (zero JS for the component itself)

To opt into CLIENT COMPONENT: add "use client" at the top of the file
  → Runs in the browser (also pre-rendered on server for initial HTML)
  → Can use: useState, useEffect, useRef, event handlers, browser APIs
  → Ships JavaScript to the browser
```

```tsx
// ─── Server Component (default — no directive needed)
// src/app/products/[id]/page.tsx
async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } }); // direct DB access ✅
  return <div>{product?.name}</div>;
}

// ─── Client Component
// src/components/add-to-cart-button.tsx
("use client"); // ← directive must be first line

import { useState } from "react";

function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  return (
    <button onClick={() => setAdded(true)}>
      {added ? "Added!" : "Add to Cart"}
    </button>
  );
}
```

### The Component Tree Model

```
Server Component tree:
  layout.tsx        (server)
    └── page.tsx    (server)
          ├── ProductDetails     (server — can fetch DB directly)
          └── AddToCartButton    (client — has 'use client')

Rules:
  ✅ Server Component can render Client Component
  ❌ Client Component CANNOT render Server Component directly
  ✅ Client Component CAN render Server Component via children prop (composition)
```

```tsx
// ✅ Server wraps Client (correct)
// Server Component
export default function ProductPage() {
  return (
    <div>
      <ProductDetails /> {/* server component */}
      <AddToCartButton /> {/* client component */}
    </div>
  );
}

// ✅ Passing Server Component as children to Client (composition pattern)
// Server Component
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientShell>{children}</ClientShell>; // ClientShell has 'use client'
  // children (server components) are passed as pre-rendered HTML — not re-rendered client-side
}
```

### Data Fetching in the App Router

```tsx
// Server Component — fetch directly in the component
async function ProductList() {
  // fetch() in Server Components is extended by Next.js with caching
  const res = await fetch("https://api.example.com/products", {
    next: { revalidate: 60 }, // revalidate every 60 seconds (ISR)
  });
  const data = await res.json();

  return (
    <ul>
      {data.products.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Route Groups — Organize Without Affecting URL

```
src/app/
├── (marketing)/          ← route group — ignored in URL
│   ├── layout.tsx        ← layout for marketing pages only
│   ├── page.tsx          → /
│   ├── about/
│   │   └── page.tsx      → /about
│   └── pricing/
│       └── page.tsx      → /pricing
│
└── (dashboard)/          ← different layout for dashboard
    ├── layout.tsx        ← dashboard sidebar layout
    ├── dashboard/
    │   └── page.tsx      → /dashboard
    └── settings/
        └── page.tsx      → /settings
```

### Parallel Routes and Intercepting Routes (Advanced)

```
@modal/          ← parallel slot (@-prefixed folders)
@notifications/  ← rendered alongside the main content

(.)path         ← intercept same level
(..)path        ← intercept one level up
(...)path       ← intercept from root
```

---

## W — Why It Matters

- The file-system router means no router configuration file — the structure of your `app/` folder IS your route manifest. Understanding this is understanding Next.js.
- Server Components by default is a paradigm shift from the entire React/Webpack era — data fetching lives in the component that needs it, not in a global store. This is the new mental model.
- `layout.tsx` persists between route navigations — the server doesn't re-render it. This enables persistent sidebars, navigation, and context without state lifting.
- Route groups `(groupName)` let you apply different layouts to groups of routes without creating URL nesting — essential for apps with distinct sections (marketing, dashboard, auth).

---

## I — Interview Q&A

### Q1: What is the difference between a Server Component and a Client Component in Next.js App Router?

**A:** Server Components run only on the server — they can directly access databases, filesystem, and environment variables, and ship zero client-side JavaScript. Client Components (marked with `'use client'`) run in the browser and support React hooks, event handlers, and browser APIs. Server Components are the default — you opt into Client Components when you need interactivity.

### Q2: What does `layout.tsx` do and how is it different from `template.tsx`?

**A:** `layout.tsx` wraps its segment's routes and **persists between navigations** — it doesn't re-render when you navigate between routes within the segment. State inside a layout (scroll position, form input) is preserved. `template.tsx` is like layout but **re-mounts on every navigation** — all state is reset. Use `layout.tsx` for persistent navigation/sidebars and `template.tsx` for per-page animations or analytics events.

### Q3: Can a Client Component render a Server Component?

**A:** Not directly — you can't `import` a Server Component inside a Client Component because the Client Component runs in the browser where Server Component code can't execute. However, you can pass Server Components as `children` props to Client Components. The Server Component renders to HTML on the server first, then passes the result as `children` to the Client Component — this is the composition pattern.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting `'use client'` on every component by default

```tsx
// ❌ Treating 'use client' as the default
'use client'
async function ProductList() { ... }  // ← now a Client Component unnecessarily
// Sends the component's JS to the browser + can't fetch server-side data
```

**Fix:** Only add `'use client'` when the component actually needs browser APIs, hooks, or event handlers. Default to Server Component — add `'use client'` at the "leaf" components that need interactivity.

### ❌ Pitfall: Not creating `page.tsx` and wondering why the route doesn't work

```
src/app/products/
  └── ProductList.tsx    ← this is a component, NOT a route
```

**Fix:** Routes require `page.tsx` — the component inside can be named anything but the file must be `page.tsx`:

```
src/app/products/
  └── page.tsx           ← this creates the /products route
```

### ❌ Pitfall: Using `useState`/`useEffect` in a Server Component

```tsx
// ❌ No 'use client' directive — Server Component can't use hooks
import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0); // ← Error at build time
}
```

**Fix:** Add `'use client'` at the top of the file.

---

## K — Coding Challenge + Solution

### Challenge

Design the `app/` directory structure for a Next.js 16 e-commerce app with:

1. Marketing site (`/`, `/about`, `/pricing`) — uses a minimal layout with just a nav
2. Store section (`/store`, `/store/[category]`, `/store/product/[id]`) — uses a store layout with category sidebar
3. Dashboard (`/dashboard`, `/dashboard/orders`, `/dashboard/profile`) — uses an authenticated layout with sidebar nav
4. Auth pages (`/login`, `/register`) — uses a centered card layout, no nav
5. API route for `POST /api/checkout`

Write out the folder structure with file names only (no content).

### Solution

```
src/app/
│
├── (marketing)/                    ← route group: marketing layout
│   ├── layout.tsx                  ← minimal nav (links: About, Pricing, Login)
│   ├── page.tsx                    → /
│   ├── about/
│   │   └── page.tsx                → /about
│   └── pricing/
│       └── page.tsx                → /pricing
│
├── (store)/                        ← route group: store layout
│   ├── layout.tsx                  ← store nav + category sidebar
│   ├── store/
│   │   ├── page.tsx                → /store
│   │   └── [category]/
│   │       ├── page.tsx            → /store/:category
│   │       └── product/
│   │           └── [id]/
│   │               ├── page.tsx    → /store/:category/product/:id
│   │               ├── loading.tsx ← loading skeleton for product page
│   │               └── error.tsx   ← product not found error boundary
│
├── (dashboard)/                    ← route group: dashboard layout
│   ├── layout.tsx                  ← sidebar nav, auth guard
│   ├── dashboard/
│   │   ├── page.tsx                → /dashboard
│   │   ├── orders/
│   │   │   └── page.tsx            → /dashboard/orders
│   │   └── profile/
│   │       └── page.tsx            → /dashboard/profile
│
├── (auth)/                         ← route group: centered card layout
│   ├── layout.tsx                  ← centered layout, no nav
│   ├── login/
│   │   └── page.tsx                → /login
│   └── register/
│       └── page.tsx                → /register
│
├── api/
│   └── checkout/
│       └── route.ts                ← POST /api/checkout
│
├── layout.tsx                      ← ROOT layout (html + body + providers)
├── not-found.tsx                   ← global 404 page
├── error.tsx                       ← global error boundary
└── globals.css                     ← Tailwind import
```

---

---

# 6 — The `app/` Directory — Structure & Conventions

---

## T — TL;DR

The `app/` directory is the heart of Next.js 16. Every file inside it either **creates a route** (via `page.tsx`, `layout.tsx`, `route.ts`) or **is private** (any other file). Knowing exactly which files do what — and which files are just co-located components — is the core of App Router development.

---

## K — Key Concepts

### The Two Categories of Files in `app/`

```
ROUTE files (recognized by Next.js — create routing behavior):
  page.tsx          → renders the UI for a route
  layout.tsx        → wraps child routes, persists between navigations
  loading.tsx       → automatic Suspense + loading UI
  error.tsx         → error boundary for the segment
  not-found.tsx     → shown when notFound() is called
  template.tsx      → like layout but remounts on each navigation
  route.ts / route.js  → API endpoint (no UI)
  middleware.ts     → edge middleware (must be at root of app or src)

NON-ROUTE files (ignored by router — co-location):
  components/
  hooks/
  utils/
  types.ts
  constants.ts
  _private-folder/   ← underscore prefix opts entire folder out of routing
  (group-name)/      ← parentheses = route group (no URL impact)
```

### Full Anatomy of a Segment

```
src/app/products/[id]/
├── page.tsx          ← REQUIRED for route to exist: GET /products/:id
├── layout.tsx        ← optional: wraps all /products/:id/* routes
├── loading.tsx       ← optional: shown during page async operations
├── error.tsx         ← optional: boundary for errors in this segment
├── not-found.tsx     ← optional: UI when notFound() is called here
├── route.ts          ← API endpoint: GET/POST /products/:id (OR page.tsx, not both)
│
└── _components/      ← co-located private components (underscore = not routed)
    ├── ProductGallery.tsx
    ├── PriceTag.tsx
    └── ReviewList.tsx
```

### `layout.tsx` — In Depth

```tsx
// src/app/layout.tsx — ROOT layout (required)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Static metadata
export const metadata: Metadata = {
  title: {
    template: "%s | MyShop", // ← page title | site name
    default: "MyShop", // ← fallback if no title from page
  },
  description: "The best online shop",
  metadataBase: new URL("https://myshop.com"), // ← needed for OG image URLs
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Providers, global nav, etc. */}
        {children}
      </body>
    </html>
  );
}
```

### `loading.tsx` — Automatic Streaming

```tsx
// src/app/products/loading.tsx
// Shown while page.tsx is fetching data (Server Component)

export default function ProductsLoading() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-lg bg-gray-200 h-64" />
      ))}
    </div>
  );
}
```

### `error.tsx` — Error Boundaries

```tsx
// src/app/products/error.tsx
// Must be a Client Component (error boundaries require class components or hooks)
"use client";

import { useEffect } from "react";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }; // digest = server-side error ID (for logging)
  reset: () => void; // retry the failed route
}) {
  useEffect(() => {
    console.error("Products route error:", error);
    // logToSentry(error)
  }, [error]);

  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold text-red-600">
        Something went wrong
      </h2>
      <p className="text-gray-500 mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try Again
      </button>
    </div>
  );
}
```

### `route.ts` — API Endpoints

```ts
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

// GET /api/products
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
  });

  return NextResponse.json({ data: products });
}

// POST /api/products
export async function POST(request: NextRequest) {
  const body = await request.json();

  const product = await db.product.create({ data: body });
  return NextResponse.json({ data: product }, { status: 201 });
}
```

### Dynamic Segments

```
[id]          → single dynamic segment   /products/123
[...slug]     → catch-all segment        /docs/a/b/c  → slug = ['a','b','c']
[[...slug]]   → optional catch-all       /docs        → slug = undefined
                                          /docs/a/b    → slug = ['a','b']
(group)       → route group — no URL impact
_folder       → private folder — never a route
```

---

## W — Why It Matters

- The `loading.tsx` file automatically wraps `page.tsx` in a `<Suspense>` boundary — you don't need to add `<Suspense>` manually for page-level loading. This enables streaming HTML progressively from the server.
- `error.tsx` MUST be a Client Component (`'use client'`) — error boundaries in React require component-level error handling which only works in client components. This is a common "why doesn't my error.tsx work?" question.
- Co-locating `_components/` next to route files is a Next.js-recommended pattern — components live close to where they're used, making the codebase navigable without jumping between `components/` and `app/` directories.
- `route.ts` in the `app/` directory replaces `pages/api/` from the Pages Router — same file-system convention, new location.

---

## I — Interview Q&A

### Q1: What is the difference between `layout.tsx` and `template.tsx`?

**A:** `layout.tsx` persists between navigations — it renders once and wraps child routes without unmounting. State inside a layout is preserved when navigating between routes in the same segment. `template.tsx` creates a new instance on every navigation — state is reset. Use `layout.tsx` for persistent UI (sidebars, nav bars) and `template.tsx` for per-page side effects like analytics page views or enter/exit animations.

### Q2: How does `loading.tsx` work under the hood?

**A:** Next.js automatically wraps the `page.tsx` (and any layouts below the `loading.tsx`) in a React `<Suspense>` boundary. The `loading.tsx` component is the fallback. When `page.tsx` is a Server Component that fetches data, React streams the loading fallback immediately, then streams the page content when the data resolves. No manual `<Suspense>` needed.

### Q3: Can you have both `page.tsx` and `route.ts` in the same directory?

**A:** No. A directory can define a UI route (`page.tsx`) or an API route (`route.ts`), but not both. They would conflict — both respond to the same URL. If you need an API endpoint at `/products` alongside the page, use `app/api/products/route.ts` for the API endpoint and `app/products/page.tsx` for the UI page.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `'use client'` on `error.tsx`

```tsx
// error.tsx — missing 'use client'
export default function Error({ error, reset }) {
  // Error: error.tsx must be a Client Component
}
```

**Fix:** Always add `'use client'` to `error.tsx` — React error boundaries require it.

### ❌ Pitfall: Calling `notFound()` without a `not-found.tsx`

```tsx
// page.tsx
import { notFound } from "next/navigation";
if (!product) notFound(); // ← Next.js returns the nearest not-found.tsx
// If no not-found.tsx exists in the tree → global 404 page (plain and unstyled)
```

**Fix:** Create `not-found.tsx` next to your `page.tsx` for resource-specific 404 UIs.

### ❌ Pitfall: Creating a folder with only a component file and expecting it to be a route

```
src/app/about/
  └── AboutPage.tsx   ← This file is IGNORED by the router

# /about returns 404 — there's no page.tsx
```

**Fix:**

```
src/app/about/
  ├── page.tsx        ← creates the /about route
  └── _components/
      └── AboutPage.tsx  ← co-located component (underscore = private)
```

---

## K — Coding Challenge + Solution

### Challenge

Build the complete file structure for a `/dashboard/orders` route that:

1. Has a dashboard layout with a sidebar that persists across dashboard pages
2. Shows a skeleton loading state while orders load
3. Has an error boundary with a retry button
4. Shows a custom "No orders yet" not-found page
5. The orders page itself fetches from a server and renders a list

### Solution

```
src/app/(dashboard)/
├── layout.tsx           ← dashboard layout with sidebar
└── dashboard/
    └── orders/
        ├── page.tsx     ← orders list (Server Component)
        ├── loading.tsx  ← skeleton rows
        ├── error.tsx    ← error boundary (must be 'use client')
        └── not-found.tsx ← "no orders yet" UI
```

```tsx
// src/app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-6">
        <nav className="space-y-2">
          <a
            href="/dashboard"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Overview
          </a>
          <a
            href="/dashboard/orders"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Orders
          </a>
          <a
            href="/dashboard/profile"
            className="block px-3 py-2 rounded hover:bg-gray-700"
          >
            Profile
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/page.tsx
import { notFound } from "next/navigation";
import { getOrders } from "@/lib/db";

export default async function OrdersPage() {
  const orders = await getOrders();
  if (!orders || orders.length === 0) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Orders</h1>
      <ul className="space-y-4">
        {orders.map((order) => (
          <li key={order.id} className="border rounded-lg p-4">
            <span className="font-medium">#{order.id}</span>
            <span className="ml-4 text-gray-500">{order.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/loading.tsx
export default function OrdersLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/error.tsx
"use client";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 font-medium">Failed to load orders</p>
      <p className="text-gray-500 text-sm mt-1">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Retry
      </button>
    </div>
  );
}
```

```tsx
// src/app/(dashboard)/dashboard/orders/not-found.tsx
import Link from "next/link";

export default function NoOrdersFound() {
  return (
    <div className="text-center py-16">
      <h2 className="text-xl font-semibold text-gray-700">No orders yet</h2>
      <p className="text-gray-500 mt-2">
        Start shopping to see your orders here.
      </p>
      <Link
        href="/store"
        className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        Browse Store
      </Link>
    </div>
  );
}
```

---

---

# 7 — The `src/` Directory — Why and When

---

## T — TL;DR

The `src/` directory is optional but **strongly recommended** — it moves all your application code into one folder, cleanly separating your source from config files at the project root. `create-next-app` defaults to it and so should you.

---

## K — Key Concepts

### With vs Without `src/`

```
WITHOUT src/ (not recommended):
my-app/
├── app/                   ← application routes
├── components/            ← shared components
├── lib/                   ← utilities
├── hooks/                 ← custom hooks
├── types/                 ← TypeScript types
├── next.config.ts         ← config files mixed with source
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .eslintrc.json
└── postcss.config.mjs
→ Config files and source code mixed at root — gets messy at 20+ files

WITH src/ (recommended):
my-app/
├── src/                   ← ALL application code lives here
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── next.config.ts         ← only config files at root
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── .eslintrc.json
└── postcss.config.mjs
→ Clean separation — source is in src/, config is at root
```

### How Next.js Finds Files

```
With src/:
  app/         → src/app/
  public/      → stays at root (not in src/)
  middleware   → src/middleware.ts
  @/* alias   → src/* (configured in tsconfig.json)

Without src/:
  app/         → app/
  public/      → public/
  middleware   → middleware.ts (root level)
```

### The `@/*` Import Alias with `src/`

```ts
// tsconfig.json — paths config
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]  // ← @/ maps to src/
    }
  }
}
```

```tsx
// Using the alias — works anywhere inside src/
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@/types/user";

// Without alias — relative hell
import { Button } from "../../../../components/ui/button"; // ← fragile
```

### What Goes in `src/` vs Root

```
src/         ← application code (everything you write)
  app/       ← routes, layouts, pages
  components/ ← reusable UI components
  lib/       ← utilities, API clients, db
  hooks/     ← custom React hooks
  types/     ← TypeScript type definitions
  stores/    ← state management (Zustand, Jotai)
  styles/    ← CSS modules or additional style files (rare with Tailwind)

Root level  ← configuration files (only one of each)
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
  .env.local
  .eslintrc.json / eslint.config.mjs
  postcss.config.mjs
  .gitignore
  README.md
```

### Migrating a Project to `src/` (If Needed)

```bash
# 1. Create src/ and move app/ into it
mkdir src
mv app src/
mv components src/  # (if exists)
mv lib src/         # (if exists)

# 2. Update tsconfig.json
# paths: { "@/*": ["./src/*"] }

# 3. Update next.config.ts if you have custom webpack/turbopack config
# that references app/ directly

# 4. Move middleware.ts into src/ if it exists
mv middleware.ts src/
```

---

## W — Why It Matters

- At scale (20+ engineers, 500+ files), the project root becomes unnavigable without `src/` — mixing config and code creates mental overhead.
- The `@/*` alias only resolves to `src/*` when `src/` is configured in `tsconfig.json` — without `src/`, the alias points to the root level, mixing config imports with source imports.
- GitHub and tooling (code coverage, import sorting) treat `src/` as a conventional boundary — source maps, coverage reports, and IDE file finders work better when code is in a dedicated folder.
- `public/` intentionally stays at the root level (not inside `src/`) — it's served as static assets, not part of the compilation pipeline.

---

## I — Interview Q&A

### Q1: Why is `src/` recommended but not required in Next.js?

**A:** It's a convention that improves project organization at scale, not a technical requirement. Next.js supports both layouts. `src/` is recommended because it separates application code from configuration files, making the root directory cleaner and the project easier to navigate as it grows.

### Q2: What does the `@/*` alias resolve to and why is it useful?

**A:** It resolves to `./src/*` (when using `src/`) or `./` (without `src/`), as configured in `tsconfig.json`. It's useful because it enables absolute-style imports from anywhere in the project without relative path climbing (`../../..`). Moving files to different directories doesn't break imports — you update the file, not all its import paths.

### Q3: Does `public/` go inside `src/`?

**A:** No. `public/` stays at the project root regardless of whether you use `src/`. Files in `public/` are served as static assets at the root URL (`/filename`) — they're not part of the compilation pipeline. Next.js serves them directly from the filesystem, which requires them to be at a known root-level path.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting to update `tailwind.config.ts` content paths when using `src/`

```ts
// tailwind.config.ts — wrong paths without src/
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}", // ← wrong: should be ./src/app/**
    "./components/**/*.{ts,tsx}", // ← wrong: should be ./src/components/**
  ],
};
// Result: Tailwind purges all classes because no files match
```

**Fix:**

```ts
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // ✅ covers all src/ files
  ],
};
```

### ❌ Pitfall: Putting `middleware.ts` in the wrong location

```
my-app/
├── src/
│   └── app/
│       └── middleware.ts   ← WRONG: middleware.ts must be in src/ root or project root
```

**Fix:**

```
my-app/
├── src/
│   ├── middleware.ts       ← ✅ correct (when using src/)
│   └── app/
```

### ❌ Pitfall: Using relative imports instead of `@/` alias

```tsx
// ❌ Relative path — breaks if file moves
import { Button } from "../../../components/ui/button";

// ✅ Alias — stable regardless of file location
import { Button } from "@/components/ui/button";
```

---

## K — Coding Challenge + Solution

### Challenge

Given the messy project structure below (no `src/`), reorganize it with `src/`, update the `tsconfig.json` `paths`, and update the `tailwind.config.ts` `content` array:

```
my-app/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/
│       └── button.tsx
├── lib/
│   └── utils.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Solution

```
my-app/                     ← after reorganization
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/
│   │       └── button.tsx
│   └── lib/
│       └── utils.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

```json
// tsconfig.json — updated paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// tailwind.config.ts — updated content
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;
```

```tsx
// src/app/page.tsx — update import to use alias
import { Button } from "@/components/ui/button"; // ✅ @/ now resolves to src/
import { cn } from "@/lib/utils";
```

---

---

# 8 — The `public/` Directory

---

## T — TL;DR

`public/` is the static asset folder. Every file inside is served at the root URL — `public/logo.png` is accessible at `/logo.png`. No webpack processing, no imports needed. Use it for favicons, robots.txt, sitemaps, and OG images.

---

## K — Key Concepts

### How `public/` Works

```
File:     public/logo.png
URL:      https://mysite.com/logo.png
Import:   Not needed — reference directly in src attribute

File:     public/fonts/CustomFont.woff2
URL:      https://mysite.com/fonts/CustomFont.woff2

File:     public/icons/apple-touch-icon.png
URL:      https://mysite.com/icons/apple-touch-icon.png
```

### Referencing Public Files

```tsx
// In Next.js components — use root-relative paths (no /public prefix)
export default function Header() {
  return (
    <header>
      {/* ✅ Root-relative path — /public is NOT part of the URL */}
      <img src="/logo.png" alt="Logo" width={120} height={40} />

      {/* ✅ Better: use next/image for optimization */}
      <Image src="/logo.png" alt="Logo" width={120} height={40} />
    </header>
  );
}
```

### Typical `public/` Contents

```
public/
├── favicon.ico           ← browser tab icon (referenced in metadata)
├── apple-touch-icon.png  ← iOS home screen icon
├── robots.txt            ← search engine crawler rules
├── sitemap.xml           ← optional (or generate dynamically)
├── manifest.json         ← PWA manifest
│
├── images/
│   ├── og-default.jpg    ← default OpenGraph image
│   └── hero.webp         ← hero image (or use CDN for large images)
│
├── fonts/                ← self-hosted fonts (if not using next/font)
│   └── CustomFont.woff2
│
└── icons/
    ├── icon-192.png      ← PWA icons
    └── icon-512.png
```

### `robots.txt` Example

```
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://mysite.com/sitemap.xml
```

### Metadata for Favicon and Icons (App Router)

```tsx
// src/app/layout.tsx — reference public/ files in metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-16x16.png",
  },
  manifest: "/manifest.json",
};
```

### What NOT to Put in `public/`

```
❌ Source code (.ts, .tsx files) — not processed, served as raw text
❌ Environment variables — public means PUBLIC (served over HTTP)
❌ Large binary files — use a CDN (S3, Cloudinary) instead
❌ Secrets or API keys — they become publicly accessible URLs

✅ Small static assets (icons, logos, robots.txt)
✅ Files that must be at specific URLs (OG images, PWA manifest)
✅ Files referenced by third-party services (Google site verification)
```

### Generating Dynamic Robots and Sitemaps (App Router)

```ts
// src/app/robots.ts — dynamic robots.txt (replaces public/robots.txt)
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/dashboard/" }],
    sitemap: "https://mysite.com/sitemap.xml",
  };
}
// → Generates /robots.txt at build time
```

```ts
// src/app/sitemap.ts — dynamic sitemap
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  return [
    { url: "https://mysite.com", lastModified: new Date() },
    { url: "https://mysite.com/products", lastModified: new Date() },
    ...products.map((p) => ({
      url: `https://mysite.com/products/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
// → Generates /sitemap.xml at build time with dynamic data
```

---

## W — Why It Matters

- Files in `public/` bypass the bundler — they're served directly by Next.js/CDN at full speed with no transformation. This is why it's the right place for PWA manifests and favicons.
- The App Router's `robots.ts` and `sitemap.ts` dynamic generators are preferred over static `public/robots.txt` when you need environment-specific rules or dynamic page URLs.
- Putting large images in `public/` on Vercel or similar platforms means they're deployed with every build — use a CDN (Cloudinary, S3) for user-uploaded or large images.
- The `metadataBase` in root layout metadata tells Next.js how to resolve relative URLs in metadata (like OG image paths) — without it, relative paths in metadata produce warnings.

---

## I — Interview Q&A

### Q1: What is the URL path for a file at `public/images/logo.png`?

**A:** `/images/logo.png` — the `public/` prefix is not part of the URL. Everything inside `public/` is served from the root of the domain. Reference it in HTML/JSX as `/images/logo.png`, not as `public/images/logo.png`.

### Q2: When should you use `public/robots.txt` vs `src/app/robots.ts`?

**A:** Use `src/app/robots.ts` when you need dynamic content (e.g., different rules per environment — allow all in production, disallow all in staging, or generate the sitemap URL dynamically). Use `public/robots.txt` for a completely static, simple robots file that never changes. The App Router convention prefers `robots.ts` because it's co-located with the app and can use environment variables.

### Q3: Should you use `next/image` with files in `public/` or just a regular `<img>` tag?

**A:** Use `next/image` for local images in `public/`. It provides automatic WebP/AVIF conversion, responsive sizing (`srcset`), lazy loading, and CLS prevention (reserves space via the `width`/`height` props). Raw `<img>` tags serve the original file without any optimization. ESLint's `@next/next/no-img-element` rule enforces this.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `/public/` prefix in the src attribute

```tsx
<img src="/public/logo.png" />
// → 404: the URL is /logo.png, not /public/logo.png
```

**Fix:**

```tsx
<Image src="/logo.png" alt="Logo" width={120} height={40} />
// ← No /public/ prefix ✅
```

### ❌ Pitfall: Putting sensitive files in `public/`

```
public/
└── config.json   ← contains API keys
```

Any file in `public/` is served at `https://yourdomain.com/config.json` — publicly readable by anyone.

**Fix:** Environment variables belong in `.env.local`, never in `public/`.

### ❌ Pitfall: Not setting `metadataBase` for OG images

```tsx
export const metadata: Metadata = {
  openGraph: {
    images: ["/og-image.jpg"], // relative path
  },
};
// Warning: metadataBase is not set — OG image URL is unresolvable
```

**Fix:**

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://mysite.com"), // ✅
  openGraph: {
    images: ["/og-image.jpg"], // now resolves to https://mysite.com/og-image.jpg
  },
};
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the complete `public/` structure and a dynamic `sitemap.ts` for a blog with:

1. favicon, apple-touch-icon
2. A default OG image
3. A `robots.ts` that blocks `/admin` and `/api`
4. A `sitemap.ts` that includes static pages and dynamic blog posts
5. Root layout metadata with `metadataBase`, icons, and manifest

### Solution

```
public/
├── favicon.ico
├── apple-touch-icon.png   (180x180px)
├── manifest.json
└── images/
    └── og-default.jpg     (1200x630px)
```

```ts
// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetch(`${BASE_URL}/api/posts`).then((r) => r.json());

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), priority: 0.9 },
  ];

  const dynamicPages: MetadataRoute.Sitemap = posts.map(
    (post: { slug: string; updatedAt: string }) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      priority: 0.7,
    })
  );

  return [...staticPages, ...dynamicPages];
}
```

```tsx
// src/app/layout.tsx — root metadata
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://myblog.com"
  ),
  title: {
    template: "%s | My Blog",
    default: "My Blog",
  },
  description: "A Next.js 16 blog",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    images: ["/images/og-default.jpg"], // resolves using metadataBase
  },
};
```

---

---

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

# 10 — Local Development Flow

---

## T — TL;DR

The local development loop is: `pnpm dev` → edit file → see change in browser in under 100ms. Next.js 16 with Turbopack makes this feel instant. Know the commands, understand Hot Module Replacement, and set up the tools that make the loop frictionless.

---

## K — Key Concepts

### Starting the Dev Server

```bash
pnpm dev                    # Turbopack (default in Next.js 16)
pnpm dev -- --port 3001     # Custom port
pnpm dev -- --hostname 0.0.0.0  # Accessible on local network (for mobile testing)

# What happens:
# → Next.js starts Turbopack dev server
# → http://localhost:3000 opens
# → Files are compiled on-demand (not all at once)
# → HMR socket established
```

### Understanding the Dev Console Output

```bash
$ pnpm dev

  ▲ Next.js 16.x.x (Turbopack)
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.5:3000

 ✓ Starting...
 ✓ Ready in 847ms     ← cold start time with Turbopack

# When you navigate to a page:
 ✓ Compiled /          in 234ms   ← first compile of home route
 ✓ Compiled /products  in 89ms    ← second route compiles faster

# When you edit a file:
 ✓ Compiled in 43ms    ← HMR update — near-instant
```

### Hot Module Replacement (HMR) Explained

```
You edit:   src/app/page.tsx
HMR does:   1. Detects the file change
            2. Compiles only the changed module (Turbopack — incremental)
            3. Sends the update to the browser via WebSocket
            4. Browser patches the running app without full reload
            5. React state is preserved (Fast Refresh)

Effect:     You see the change in ~50-100ms
            Form input values are preserved
            Scroll position is preserved

When HMR can't patch (full reload triggers):
            - Changes to layout.tsx at root
            - Changes to globals.css
            - Changes to next.config.ts (requires restart)
            - Adding 'use client' to a file for the first time
```

### React Fast Refresh Rules

```tsx
// ✅ Fast Refresh works — state is preserved across edits
'use client'
export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
// Edit the button text → count state is preserved

// ❌ Fast Refresh resets state for this component:
// - Multiple components exported from the same file (non-default exports)
// - Exporting non-component values from a component file
export function Counter() { ... }     // named export
export const CONSTANT = 'value'       // non-component export
// → Both cause full component remount (state reset)
```

### The Essential Dev Commands

```bash
# ─── Development
pnpm dev                  # start dev server (Turbopack)
pnpm build                # production build
pnpm start                # serve production build (requires build first)

# ─── Code Quality
pnpm lint                 # ESLint check
pnpm lint:fix             # ESLint auto-fix
pnpm type-check           # TypeScript type check (tsc --noEmit)
pnpm format               # Prettier format

# ─── Analysis
pnpm build && npx @next/bundle-analyzer  # analyze bundle sizes

# ─── When things go wrong:
rm -rf .next              # clear build cache
rm -rf node_modules && pnpm install  # reinstall dependencies
```

### VS Code Setup for the Best Dev Loop

```json
// .vscode/settings.json
{
  // ─── TypeScript: use workspace version
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // ─── Format on save
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // ─── ESLint auto-fix on save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never" // don't auto-sort — ESLint handles this
  },

  // ─── Tailwind IntelliSense
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],

  // ─── File nesting (cleaner file tree)
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "*.ts": "${capture}.js, ${capture}.d.ts, ${capture}.test.ts",
    "*.tsx": "${capture}.test.tsx, ${capture}.stories.tsx"
  }
}
```

### Restarting the Dev Server

```bash
# next.config.ts changes require a restart:
# ← Ctrl+C to stop, then pnpm dev again

# OR use the rs command in the terminal:
# → Press Ctrl+C
# → pnpm dev

# Environment variable changes (.env.local):
# ← Also requires a dev server restart
```

### Testing on Mobile / Tablet

```bash
# Start server accessible on local network
pnpm dev -- --hostname 0.0.0.0

# Find your local IP:
# macOS: ipconfig getifaddr en0
# Linux: hostname -I
# Windows: ipconfig

# On your phone (same WiFi): http://192.168.x.x:3000
```

---

## W — Why It Matters

- Turbopack's incremental compilation means the dev server compiles only changed modules — a large Next.js app that took 30s to start with Webpack starts in under 2s with Turbopack.
- Understanding Fast Refresh rules (default export, single component per file) means you write code that preserves React state during development — making UI iteration faster.
- `rm -rf .next` is the most common fix for mysterious build errors — knowing this saves hours of debugging.
- The VS Code settings above (format on save + ESLint auto-fix) eliminate an entire class of style/lint errors before you ever run `pnpm lint`.

---

## I — Interview Q&A

### Q1: What is Turbopack and how does it improve the development experience?

**A:** Turbopack is Next.js's Rust-based bundler that replaced Webpack for dev in Next.js 16. It uses incremental compilation — only rebuilding modules that changed, not the whole bundle. This reduces HMR update time from seconds (Webpack) to milliseconds (Turbopack). Cold start time for large apps drops from 30+ seconds to under 2 seconds.

### Q2: What is React Fast Refresh and what breaks it?

**A:** Fast Refresh is the HMR mechanism for React — it patches changed components in the running app without a full page reload, preserving component state. It breaks (falls back to full remount) when a file exports multiple components or exports non-component values alongside components. Keep one component per file and use default exports to maximize Fast Refresh effectiveness.

### Q3: When do you need to restart the Next.js dev server?

**A:** When you change `next.config.ts`, `.env.local`, or other configuration files that are read at server startup. Next.js doesn't hot-reload its own config. File changes in `src/` are handled by Turbopack HMR — no restart needed. A common mistake is editing `.env.local` and wondering why the new variable is still `undefined` — it requires a server restart.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Running `next dev` without Turbopack on Next.js 16

```bash
next dev   # ← Without --turbopack flag, falls back to Webpack in older configs
```

**Fix:** Ensure `--turbopack` is in your dev script (it's default in Next.js 16's `create-next-app`):

```json
{ "scripts": { "dev": "next dev --turbopack" } }
```

### ❌ Pitfall: Editing `.env.local` and not restarting

```bash
# Added DATABASE_URL to .env.local
# Still getting: TypeError: Cannot read property of undefined
# Reason: dev server started before the variable was added
```

**Fix:** Ctrl+C and restart `pnpm dev` after any `.env.local` change.

### ❌ Pitfall: Not clearing `.next/` when seeing inexplicable errors

```bash
# Errors that make no sense, type errors on files that look correct,
# changes not reflecting in the browser after restart
```

**Fix:**

```bash
rm -rf .next
pnpm dev   # ← fresh build cache
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `package.json` scripts section for a Next.js 16 project that:

1. `dev` — Turbopack on port 3000
2. `dev:network` — Turbopack accessible on local network (for mobile testing)
3. `build` — type-check + lint + Next.js build (all three must pass)
4. `start` — serve production build
5. `lint` — ESLint check
6. `lint:fix` — ESLint auto-fix
7. `type-check` — TypeScript check only
8. `clean` — removes `.next/` and `node_modules/.cache/`

### Solution

```json
{
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "dev:network": "next dev --turbopack --hostname 0.0.0.0 --port 3000",
    "build": "npm run type-check && npm run lint && next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf .next node_modules/.cache",
    "clean:all": "rm -rf .next node_modules && npm install"
  }
}
```

---

---

# 11 — Project Structure Overview — Putting It All Together

> Picking up from **Feature-Based vs Type-Based Structure**, continuing through **W, I, C, and K**.

---

## K — Key Concepts _(continued)_

### Feature-Based vs Type-Based Structure

```
TYPE-BASED (what we've shown above):
  src/
    components/
    hooks/
    services/
    types/
  → Simple, obvious, works well for small-medium apps (< 10 features)
  → Easy to onboard new developers — everyone knows where "components" are

FEATURE-BASED (scales better for large apps):
  src/
    features/
      products/
        components/
          product-card.tsx
          product-grid.tsx
        hooks/
          use-products.ts
        services/
          product-service.ts
        types/
          product.ts
        index.ts          ← public API of the feature
      cart/
        components/
        hooks/
        stores/
        types/
        index.ts
      auth/
        components/
        hooks/
        services/
        types/
        index.ts
    components/           ← truly shared (Button, Card, Input)
    lib/                  ← infrastructure (db, api, auth)
  → Scales to 20+ features / 50+ developers
  → All code for one feature is co-located — easy to find and delete

Recommendation:
  Start with type-based.
  Switch to feature-based when a single components/ folder exceeds 20 files
  OR when two developers keep editing the same files for different features.
```

### The Barrel File Pattern (`index.ts`)

```ts
// src/components/ui/index.ts — barrel file
// Collects all exports from a folder into one entry point

export { Button } from "./button";
export { Card } from "./card";
export { Input } from "./input";
export { Dialog } from "./dialog";
export { Badge } from "./badge";

// Import from the folder instead of individual files:
import { Button, Card, Input } from "@/components/ui";
// instead of:
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

> ⚠️ **Barrel file caveat:** Next.js and Turbopack can tree-shake correctly, but large barrel files in deeply nested imports can slow down HMR. Use barrels for `components/ui/` and `types/` — avoid them for `services/` or `lib/` where each file may have heavy dependencies.

### The `middleware.ts` Position

```
src/
├── middleware.ts      ← CORRECT position when using src/ directory
└── app/

# middleware.ts must be at the root of src/ (or project root without src/)
# It is NOT inside app/ — it intercepts requests before routing

# Common uses:
- Auth redirect: redirect /dashboard → /login if no session
- Locale detection: redirect /products → /en/products
- A/B testing: rewrite to different page variants
- Rate limiting on API routes
```

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Auth guard: protect dashboard routes
  const isProtected = pathname.startsWith("/dashboard");
  const token = request.cookies.get("auth-token")?.value;

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// ─── Matcher: only run middleware on these paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    // Exclude static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### The `components/ui/` Pattern — shadcn/ui Convention

```
The industry standard in 2025/2026:

src/components/ui/     ← low-level, unstyled primitives
  button.tsx           ← wraps a <button> with Tailwind + variants
  card.tsx
  input.tsx
  label.tsx
  dialog.tsx           ← wraps Radix Dialog
  select.tsx           ← wraps Radix Select
  badge.tsx
  skeleton.tsx         ← loading skeleton shape

src/components/        ← composed feature components
  navbar.tsx           ← uses Button, Link from ui/
  product-card.tsx     ← uses Card, Badge from ui/
  auth-form.tsx        ← uses Input, Button, Label from ui/
```

Why this separation matters:

```tsx
// ❌ Without the layer separation:
// ProductCard needs a button — directly uses button styles
<button className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 ...">
  Add to Cart
</button>;
// → Button styles duplicated in 40 components → hard to update globally

// ✅ With ui/ layer:
// ProductCard uses the Button primitive
import { Button } from "@/components/ui/button";
<Button variant="primary" size="sm">
  Add to Cart
</Button>;
// → Update button styles in ONE file → all 40 usages updated
```

### Recommended File Naming in Practice

```
Page components (app/ special files):
  page.tsx, layout.tsx, loading.tsx, error.tsx  ← lowercase (Next.js convention)

Shared components:
  product-card.tsx        ← kebab-case file
  export function ProductCard() {}  ← PascalCase export

Hooks:
  use-cart.ts             ← kebab-case file
  export function useCart() {}  ← camelCase "use" prefix export

Services:
  product-service.ts      ← kebab-case
  export const productService = { ... }  ← camelCase export

Types:
  product.ts              ← kebab-case file
  export interface Product { ... }  ← PascalCase type

Stores:
  cart-store.ts           ← kebab-case
  export const useCartStore = create(...)  ← camelCase export

Utilities:
  utils.ts
  export function formatPrice() {}
  export function cn() {}
```

### Reading the Project at a Glance

```
When a new developer joins, they should be able to answer these in 60 seconds:

Q: Where is the home page?          → src/app/(marketing)/page.tsx
Q: Where are reusable buttons?      → src/components/ui/button.tsx
Q: Where does auth logic live?      → src/lib/auth.ts + src/middleware.ts
Q: Where are product API calls?     → src/services/product-service.ts
Q: Where are environment variables? → .env.local (see .env.example for keys)
Q: Where is global CSS?             → src/app/globals.css
Q: How do I run this locally?       → README.md → pnpm dev
Q: Where do I put a new page?       → src/app/(section)/new-page/page.tsx
Q: Where do I put a shared hook?    → src/hooks/use-thing.ts
Q: How is the API configured?       → src/lib/api.ts
```

---

## W — Why It Matters

- A consistent project structure is a **communication tool** — it tells the next developer exactly where to look without asking anyone. This is the difference between a project that's easy to contribute to and one that requires a 2-hour onboarding call.
- The `_components/` co-location pattern (underscore prefix = private, next to the route that owns it) reduces the cognitive overhead of deciding "is this shared or specific?" — if it's only used in one route, it lives next to that route.
- Route groups `(marketing)`, `(store)`, `(dashboard)` solve the "one app, three layouts" problem without polluting the URL — essential for any app with distinct sections for different user types.
- The decision guide ("where does X go?") eliminates daily friction — developers stop making one-off decisions and start following a rule. This is what makes a codebase scale.

---

## I — Interview Q&A

### Q1: How do you decide whether a component goes in `app/route/_components/` vs `src/components/`?

**A:** The rule is reuse. If a component is used only by one route, co-locate it next to that route in `_components/` — the underscore prefix marks it as private and the router ignores it. If two or more routes use the same component, or if it's clearly a general-purpose UI primitive (Button, Card, Input), it belongs in `src/components/`. Co-location keeps related code together and makes it obvious what can be safely deleted when a route is removed.

### Q2: What is the purpose of `src/lib/` vs `src/services/` vs `src/hooks/`?

**A:** `lib/` contains infrastructure and external integrations — the Axios instance, database client, auth configuration, Zod schemas. These are low-level utilities that services and components depend on. `services/` contains API layer functions that call HTTP endpoints, organized by resource (`productService.list()`, `orderService.create()`). `hooks/` contains custom React hooks for client-side behavior — they wrap browser APIs, state, and services into reusable React primitives. The separation means each layer has a single responsibility: lib = infrastructure, services = HTTP, hooks = React state.

### Q3: Walk me through where you'd put each of these: a reusable Modal component, a `useDebounce` hook, a function to format currency, and an API call to create an order.

**A:** Modal → `src/components/ui/modal.tsx` (it's a low-level UI primitive used across the app). `useDebounce` → `src/hooks/use-debounce.ts` (custom React hook, client-side behavior). `formatCurrency` → `src/lib/utils.ts` (pure utility function, no React or HTTP concerns). `createOrder` API call → `src/services/order-service.ts` (HTTP service function, part of the service layer from Day 4).

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Everything in `src/app/` — using app/ as a dumping ground

```
src/app/
├── page.tsx
├── layout.tsx
├── Button.tsx           ← component sitting in app/ root
├── utils.ts             ← utility in app/
├── useCart.ts           ← hook in app/
└── products/
    ├── page.tsx
    └── ProductCard.tsx  ← component in route folder but not _components/
```

**Fix:** The `app/` directory is for **routing files only** (`page.tsx`, `layout.tsx`, etc.) and co-located private route components (`_components/`). Everything else goes in `src/components/`, `src/hooks/`, `src/lib/`:

```
src/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── products/
│       ├── page.tsx
│       └── _components/
│           └── product-card.tsx  ← private to this route
├── components/
│   └── ui/
│       └── button.tsx            ← shared component
├── hooks/
│   └── use-cart.ts               ← shared hook
└── lib/
    └── utils.ts                  ← shared utility
```

### ❌ Pitfall: Creating deeply nested `components/` subdirectories with no rule

```
src/components/
├── common/
│   └── shared/
│       └── reusable/
│           └── button/
│               └── index.tsx    ← 5 levels deep for a button
```

**Fix:** Maximum 2 levels of nesting in `components/`:

```
src/components/
├── ui/           ← level 1: primitives
│   └── button.tsx
├── layout/       ← level 1: layout components
│   └── navbar.tsx
└── product/      ← level 1: feature components
    └── product-card.tsx
```

### ❌ Pitfall: Mixing Server and Client Component concerns in `lib/`

```ts
// src/lib/utils.ts
'use client'                        // ← why is a utility file client-only?
import { useState } from 'react'

export function cn(...) {}          // pure utility — doesn't need useState
export function useToggle() {}      // hook — belongs in hooks/, not lib/
```

**Fix:** Keep `lib/` free of React hooks and browser APIs — it should be importable in both Server and Client Components:

```ts
// src/lib/utils.ts — pure, no React, works everywhere
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// src/hooks/use-toggle.ts — React hook, belongs in hooks/
("use client");
import { useState } from "react";
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)] as const;
}
```

### ❌ Pitfall: No `index.ts` barrel for `types/` — importing from deeply nested type files everywhere

```ts
// Repeated in 20 files:
import type { Product } from "@/types/product";
import type { User } from "@/types/user";
import type { Order } from "@/types/order";
import type { ApiError } from "@/types/api";
```

**Fix:** Create a barrel `src/types/index.ts`:

```ts
// src/types/index.ts
export type { Product, ProductVariant } from "./product";
export type { User, UserProfile } from "./user";
export type { Order, OrderItem } from "./order";
export type { ApiError, ApiErrorDetail } from "./api";

// Now import from one place:
import type { Product, User, Order } from "@/types";
```

---

## K — Coding Challenge + Solution

### Challenge

You've inherited a Next.js 16 project with this flat, unorganized structure. Reorganize it into the recommended structure from this subtopic:

```
my-shop/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   ├── ProductCard.tsx          ← component in app/
│   ├── AddToCartButton.tsx      ← component in app/
│   ├── useCart.ts               ← hook in app/
│   ├── formatPrice.ts           ← utility in app/
│   ├── api.ts                   ← axios instance in app/
│   ├── products/
│   │   ├── page.tsx
│   │   └── ProductGrid.tsx      ← component in route
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       └── checkout/
│           └── route.ts
├── types.ts                     ← all types in one root file
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Requirements:**

1. Move all files to the correct `src/` locations
2. Apply the `_components/` convention for route-specific components
3. Separate the single `types.ts` into individual type files with a barrel
4. Update the `tsconfig.json` `paths` for the `src/` move
5. Show two example import statements before and after the refactor

### Solution

```
my-shop/                              ← after reorganization
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── _components/         ← route-private components
│   │   │       └── product-grid.tsx
│   │   ├── (dashboard)/             ← route group (add layout later)
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── checkout/
│   │           └── route.ts
│   │
│   ├── components/
│   │   └── product/
│   │       ├── product-card.tsx     ← was ProductCard.tsx in app/
│   │       └── add-to-cart-button.tsx  ← was AddToCartButton.tsx in app/
│   │
│   ├── hooks/
│   │   └── use-cart.ts              ← was useCart.ts in app/
│   │
│   ├── lib/
│   │   ├── api.ts                   ← was api.ts in app/
│   │   └── utils.ts                 ← was formatPrice.ts in app/
│   │
│   └── types/
│       ├── index.ts                 ← barrel file
│       ├── product.ts               ← split from types.ts
│       ├── cart.ts                  ← split from types.ts
│       └── api.ts                   ← split from types.ts
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

```json
// tsconfig.json — updated paths for src/
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// src/types/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string;
  inStock: boolean;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
}
```

```ts
// src/types/cart.ts
import type { Product } from "./product";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}
```

```ts
// src/types/api.ts
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  status: number | null;
}
```

```ts
// src/types/index.ts — barrel export
export type { Product, ProductVariant } from "./product";
export type { CartItem, Cart } from "./cart";
export type { ApiError, ApiErrorDetail } from "./api";
```

```ts
// src/lib/utils.ts — renamed + expanded from formatPrice.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
```

```tsx
// ─── BEFORE refactor — messy imports ─────────────────────

// src/app/products/page.tsx (old)
import ProductCard from "../ProductCard";
import { useCart } from "../useCart";
import { formatPrice } from "../formatPrice";
import type { Product } from "../../types";

// src/app/page.tsx (old)
import AddToCartButton from "./AddToCartButton";
import ProductCard from "./ProductCard";
import type { Cart } from "../types";
```

```tsx
// ─── AFTER refactor — clean @/ alias imports ─────────────

// src/app/products/page.tsx (new)
import { ProductGrid } from "./_components/product-grid"; // ← co-located
import type { Product } from "@/types"; // ← clean barrel import

// src/app/page.tsx (new)
import { ProductCard } from "@/components/product/product-card";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import type { Cart, Product } from "@/types"; // ← single import

// src/hooks/use-cart.ts (new)
import { formatPrice } from "@/lib/utils"; // ← clear lib import
import type { Cart } from "@/types"; // ← barrel type import
```

---

## ✅ Day 1 Complete — Environment Setup & Mental Model

| #   | Subtopic                                             | Status |
| --- | ---------------------------------------------------- | ------ |
| 1   | `create-next-app` — Scaffolding the Project          | ☐      |
| 2   | TypeScript in Next.js 16                             | ☐      |
| 3   | ESLint — Configuration & Rules                       | ☐      |
| 4   | Tailwind CSS Integration                             | ☐      |
| 5   | App Router Mental Model                              | ☐      |
| 6   | The `app/` Directory — Structure & Conventions       | ☐      |
| 7   | The `src/` Directory — Why and When                  | ☐      |
| 8   | The `public/` Directory                              | ☐      |
| 9   | Top-Level Config Files                               | ☐      |
| 10  | Local Development Flow                               | ☐      |
| 11  | Project Structure Overview — Putting It All Together | ☐      |

---

## 🗺️ The One-Page Mental Model — Everything From Day 1

```
SCAFFOLD
  npx create-next-app@latest --typescript --eslint --tailwind --src-dir --app --turbopack

CONFIG FILES (root level — don't touch without understanding)
  next.config.ts     ← framework behavior (images, redirects, headers, env)
  tsconfig.json      ← TypeScript (strict: true, moduleResolution: bundler, @/* alias)
  tailwind.config.ts ← Tailwind theme + content paths
  eslint.config.mjs  ← code quality rules (next/core-web-vitals + next/typescript)
  .env.local         ← secrets (git ignored — never commit)

ROUTING (file system = routes)
  src/app/page.tsx          → /
  src/app/about/page.tsx    → /about
  src/app/[id]/page.tsx     → /:id  (dynamic)
  src/app/(group)/          → route group (no URL impact)
  src/app/api/x/route.ts   → API endpoint

SPECIAL FILES (each has ONE job)
  page.tsx      → UI for a route
  layout.tsx    → persistent wrapper (survives navigation)
  loading.tsx   → automatic Suspense fallback
  error.tsx     → error boundary ('use client' required)
  not-found.tsx → 404 UI
  route.ts      → API handler (GET, POST, etc.)
  middleware.ts → runs before routing (auth, redirects)

COMPONENT TYPES
  Default           → Server Component (zero JS shipped, async/await allowed)
  'use client'      → Client Component (hooks, events, browser APIs)
  Rule: push 'use client' as far down the tree as possible

SOURCE STRUCTURE
  src/app/           ← routes only + _components/ for co-located private UI
  src/components/    ← shared UI (ui/ for primitives, feature/ for composed)
  src/lib/           ← infrastructure (db, api, auth, utils)
  src/hooks/         ← custom React hooks (client-side)
  src/services/      ← API service functions (HTTP layer)
  src/stores/        ← client state (Zustand, Jotai)
  src/types/         ← TypeScript types + barrel index.ts
  src/middleware.ts  ← edge middleware
  public/            ← static assets at root URL (not in src/)

DEV LOOP
  pnpm dev           → http://localhost:3000 (Turbopack, instant HMR)
  pnpm type-check    → TypeScript errors
  pnpm lint          → ESLint errors
  pnpm build         → production build
  rm -rf .next       → fix mysterious errors
```

---

> **Your next action:** Run `npx create-next-app@latest my-first-app --typescript --eslint --tailwind --src-dir --app --turbopack` right now. Open the project in VS Code. Spend 5 minutes just reading the generated file structure — match every file to what you just learned.
>
> _Doing one small thing beats opening a feed._

### The Complete Recommended Project Structure

```
my-app/
│
├── src/                              ← ALL application code
│   │
│   ├── app/                          ← Next.js App Router (routes + layouts)
│   │   ├── (marketing)/              ← route group: marketing layout
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              → /
│   │   │   ├── about/page.tsx        → /about
│   │   │   └── pricing/page.tsx      → /pricing
│   │   │
│   │   ├── (store)/                  ← route group: store layout
│   │   │   ├── layout.tsx
│   │   │   └── store/
│   │   │       ├── page.tsx          → /store
│   │   │       └── [category]/
│   │   │           ├── page.tsx      → /store/:category
│   │   │           ├── loading.tsx
│   │   │           ├── error.tsx
│   │   │           └── _components/  ← co-located, private
│   │   │               ├── CategoryHero.tsx
│   │   │               └── ProductGrid.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       └── orders/
│   │   │           ├── page.tsx
│   │   │           ├── loading.tsx
│   │   │           └── error.tsx
│   │   │
│   │   ├── api/                      ← API routes
│   │   │   ├── products/route.ts     → GET/POST /api/products
│   │   │   └── checkout/route.ts     → POST /api/checkout
│   │   │
│   │   ├── globals.css               ← Tailwind import + global styles
│   │   ├── layout.tsx                ← ROOT layout (required)
│   │   ├── not-found.tsx             ← global 404
│   │   ├── error.tsx                 ← global error boundary
│   │   ├── robots.ts                 ← dynamic robots.txt
│   │   └── sitemap.ts                ← dynamic sitemap.xml
│   │
│   ├── components/                   ← shared, reusable UI components
│   │   ├── ui/                       ← low-level primitives (shadcn/ui pattern)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── dialog.tsx
│   │   ├── layout/                   ← layout components
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── sidebar.tsx
│   │   └── product/                  ← feature-specific shared components
│   │       ├── product-card.tsx
│   │       └── product-image.tsx
│   │
│   ├── lib/                          ← utilities, API clients, external services
│   │   ├── api.ts                    ← Axios instance + interceptors (Day 4)
│   │   ├── db.ts                     ← database client (Prisma, Drizzle)
│   │   ├── auth.ts                   ← auth configuration (next-auth, clerk)
│   │   ├── utils.ts                  ← cn() + general utilities
│   │   └── validations.ts            ← Zod schemas
│   │
│   ├── hooks/                        ← custom React hooks (client-side)
│   │   ├── use-cart.ts
│   │   ├── use-auth.ts
│   │   └── use-local-storage.ts
│   │
│   ├── stores/                       ← client-side state (Zustand, Jotai)
│   │   ├── cart-store.ts
│   │   └── ui-store.ts
│   │
│   ├── services/                     ← API service functions (from Day 4)
│   │   ├── product-service.ts
│   │   ├── order-service.ts
│   │   └── user-service.ts
│   │
│   ├── types/                        ← TypeScript type definitions
│   │   ├── api.ts                    ← API request/response types
│   │   ├── product.ts
│   │   └── user.ts
│   │
│   └── middleware.ts                 ← Edge middleware (auth redirects)
│
├── public/                           ← static assets (NOT in src/)
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── manifest.json
│   └── images/
│       └── og-default.jpg
│
├── next.config.ts                    ← Next.js config
├── tailwind.config.ts                ← Tailwind config
├── tsconfig.json                     ← TypeScript config
├── eslint.config.mjs                 ← ESLint config
├── postcss.config.mjs                ← PostCSS config
├── package.json                      ← dependencies + scripts
├── .env.local                        ← local secrets (git ignored)
├── .env.example                      ← env template (committed)
├── .gitignore
└── README.md
```

### Decision Guide — Where Does X Go?

```
UI component used in one route only     → app/.../route/_components/
UI component used in 2+ routes         → src/components/feature/
Low-level UI primitive (button, input) → src/components/ui/
Data fetching function                  → src/services/ OR co-locate in app/route/
Database queries                        → src/lib/db.ts or src/lib/queries/
Shared TypeScript type                  → src/types/
Shared utility function                 → src/lib/utils.ts
Custom hook with browser APIs          → src/hooks/
Global state (Zustand/Jotai)           → src/stores/
API route handler                       → src/app/api/resource/route.ts
Edge middleware (auth, redirects)       → src/middleware.ts
Static file (favicon, robot.txt)       → public/
```

### The Naming Convention Standard

```
Files/folders:     kebab-case
  product-card.tsx  ✅
  ProductCard.tsx   ❌ (PascalCase for files is a React convention, not Next.js)

Components:        PascalCase
  export function ProductCard() {}  ✅

Hooks:             camelCase with "use" prefix
  useCart.ts, use-cart.ts  ← both acceptable (kebab for file, camelCase for export)

Types:             PascalCase
  interface ProductCardProps {}  ✅

Constants:         SCREAMING_SNAKE_CASE
  const MAX_PRODUCTS = 100  ✅

Utilities:         camelCase
  function formatPrice() {}  ✅
```

### Feature-Based vs Type-Based Structure

```
TYPE-BASED (what we've shown above):
  components/
  hooks/
  services/
  types/
  → Simple, works well for small-medium apps

FEATURE-BASED (scales better for large apps):
  features/
    products/
      components/
      hooks/
      services/
      types/
    cart/
      components
```
