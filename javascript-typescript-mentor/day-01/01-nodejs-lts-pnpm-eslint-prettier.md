# 1 — Node.js LTS, pnpm, ESLint & Prettier

## T — TL;DR

Before writing any JavaScript, set up a clean, professional environment:

- **Node.js LTS** — the stable runtime for executing JS outside the browser.
- **pnpm** — a fast, disk-efficient package manager (alternative to npm/yarn).
- **ESLint** — a static analysis tool that finds code quality problems.
- **Prettier** — an opinionated code formatter for consistent style.

## K — Key Concepts

### Node.js LTS

Node.js is a JavaScript runtime built on Chrome's V8 engine. **LTS** (Long-Term Support) versions receive security patches and bug fixes for 30 months.

```bash
# Check your Node version
node -v

# Recommended: use a version manager
# nvm (macOS/Linux) or fnm (cross-platform)
nvm install --lts
nvm use --lts
```

Key points:
- **Even-numbered** major versions become LTS (e.g., 18, 20, 22).
- Odd-numbered versions are "Current" — experimental, shorter support.
- Always use LTS for production and learning.

### pnpm

pnpm stores packages in a global content-addressable store and creates hard links into your project. This means:

- **Faster installs** — packages are downloaded once globally.
- **Less disk space** — shared across projects.
- **Strict by default** — you can only import packages you explicitly declare (prevents phantom dependencies).

```bash
# Install pnpm globally
npm install -g pnpm

# Initialize a project
pnpm init

# Install a package
pnpm add lodash

# Install dev dependency
pnpm add -D eslint

# Install all dependencies from package.json
pnpm install
```

| Feature | npm | yarn | pnpm |
|---------|-----|------|------|
| Speed | Baseline | Faster | Fastest |
| Disk usage | High (duplicate copies) | High | Low (hard links) |
| Phantom deps | Allowed | Allowed | Blocked by default |
| Lockfile | `package-lock.json` | `yarn.lock` | `pnpm-lock.yaml` |

### ESLint

ESLint statically analyzes your code to find problems — not formatting issues, but actual code quality concerns.

```bash
# Install
pnpm add -D eslint

# Initialize config
pnpm eslint --init
```

```js
// eslint.config.js (flat config — ESLint v9+)
import js from "@eslint/js"

export default [
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      eqeqeq: "error",         // enforce === over ==
      "no-var": "error",        // disallow var
      "prefer-const": "warn",   // prefer const over let when possible
    },
  },
]
```

What ESLint catches:
- Unused variables
- Unreachable code
- Accidental `==` instead of `===`
- Use of `var`
- Missing `return` in functions

### Prettier

Prettier is an **opinionated formatter**. It does not check logic — it only rewrites code style.

```bash
# Install
pnpm add -D prettier
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

### ESLint + Prettier Together

They can conflict. The solution:

```bash
pnpm add -D eslint-config-prettier
```

```js
// eslint.config.js
import js from "@eslint/js"
import prettier from "eslint-config-prettier"

export default [
  js.configs.recommended,
  prettier,  // must be last — disables ESLint formatting rules
]
```

| Tool | Purpose | Example |
|------|---------|---------|
| ESLint | Code quality | "You have an unused variable" |
| Prettier | Code formatting | "Use single quotes, add trailing comma" |

## W — Why It Matters

- A consistent environment eliminates "it works on my machine" problems.
- ESLint catches bugs before runtime — cheaper than debugging.
- Prettier removes all style arguments from code reviews.
- pnpm prevents phantom dependency bugs that npm allows silently.
- Every professional team uses some version of this toolchain.

## I — Interview Questions with Answers

### Q1: What is the difference between ESLint and Prettier?

**A:** ESLint is a **linter** — it analyzes code for quality issues like unused variables, unreachable code, and suspicious patterns. Prettier is a **formatter** — it rewrites code to enforce consistent style (indentation, quotes, semicolons). They serve different purposes and are used together in most projects.

### Q2: Why use pnpm over npm?

**A:** pnpm is faster, uses less disk space through a content-addressable store with hard links, and enforces strict dependency resolution that prevents phantom dependencies — packages you use but didn't explicitly declare.

### Q3: What does LTS mean in Node.js?

**A:** Long-Term Support. LTS versions receive security and bug fixes for 30 months. Even-numbered major releases become LTS. They are the recommended choice for production applications.

### Q4: What is a phantom dependency?

**A:** A package your code imports that is not listed in your `package.json` — it's only available because another dependency installed it. npm and yarn allow this silently; pnpm blocks it by default.

## C — Common Pitfalls with Fix

### Pitfall: ESLint and Prettier fighting over formatting

**Fix:** Install `eslint-config-prettier` and put it last in your ESLint config array. This disables all ESLint rules that conflict with Prettier.

### Pitfall: Installing packages globally for every project

**Fix:** Prefer project-local `devDependencies`. Only install tools you use across all projects globally (like `pnpm` itself).

### Pitfall: Using the "Current" Node.js version in production

**Fix:** Always use the **LTS** version. Check [nodejs.org](https://nodejs.org) for the current LTS.

### Pitfall: Not having a `.prettierrc` file

**Fix:** Always create one so every team member and CI gets the same formatting. Without it, Prettier uses defaults that may not match your preferences.

## K — Coding Challenge with Solution

### Challenge

Set up a minimal project with pnpm, ESLint, and Prettier:

1. Initialize a project with `pnpm init`.
2. Install ESLint and Prettier as dev dependencies.
3. Create a `.prettierrc` with: no semicolons, single quotes, tab width 2.
4. Create an `eslint.config.js` that extends recommended and uses `eslint-config-prettier`.
5. Create an `index.js` file that uses `var` and `==`, then run ESLint to see warnings.

### Solution

```bash
mkdir my-project && cd my-project
pnpm init
pnpm add -D eslint @eslint/js prettier eslint-config-prettier
```

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2
}
```

```js
// eslint.config.js
import js from "@eslint/js"
import prettier from "eslint-config-prettier"

export default [
  js.configs.recommended,
  prettier,
  {
    rules: {
      "no-var": "error",
      eqeqeq: "error",
    },
  },
]
```

```js
// index.js — intentionally bad code
var name = "Mark"
if (name == "Mark") {
  console.log("hello")
}
```

```bash
npx eslint index.js
# Expected output:
# error  Unexpected var, use let or const instead  no-var
# error  Expected === and instead saw ==            eqeqeq
```

---
