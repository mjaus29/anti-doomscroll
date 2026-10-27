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
├── eslint.config.mjs         ← ESLint flat config (eslint-config-next)
├── .gitignore
├── next.config.ts            ← TypeScript config (v15+)
├── package.json
├── postcss.config.mjs        ← Tailwind v4 plugin (no tailwind.config.ts)
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
