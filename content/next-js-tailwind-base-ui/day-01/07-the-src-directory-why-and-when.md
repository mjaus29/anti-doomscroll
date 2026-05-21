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
