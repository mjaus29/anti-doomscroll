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
