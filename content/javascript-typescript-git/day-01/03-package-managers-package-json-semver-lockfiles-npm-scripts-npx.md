# 3 — Package Managers — package.json, semver, lockfiles, npm scripts, npx

---

## T — TL;DR

`package.json` is the project manifest — it declares dependencies, scripts, and metadata. **semver** defines version ranges for packages. **Lockfiles** pin exact versions for reproducible installs. `npm scripts` are task runners. `npx` runs a package binary without installing it globally. Never delete the lockfile.

---

## K — Key Concepts

```json
// package.json — essential fields
{
  "name":        "my-app",
  "version":     "1.0.0",
  "description": "My Node.js application",
  "main":        "dist/index.js",      // CJS entry point
  "module":      "dist/index.mjs",     // ESM entry point
  "types":       "dist/index.d.ts",    // TypeScript types
  "type":        "module",             // treat .js files as ESM
  "engines":     { "node": ">=22.0.0" },

  "scripts": {
    "start":     "node dist/server.js",
    "dev":       "tsx watch src/server.ts",
    "build":     "tsc",
    "test":      "vitest",
    "test:ci":   "vitest run --coverage",
    "lint":      "eslint src",
    "db:migrate": "prisma migrate dev"
  },

  "dependencies": {
    "express":  "^4.18.0",   // ^ = compatible (4.x.x, not 5.x.x)
    "zod":      "~3.22.0",   // ~ = patch only (3.22.x)
    "lodash":   "4.17.21"    // exact version
  },

  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest":     "^4.0.0"
  }
}
```

```
── Semver ranges ──────────────────────────────────────────────────────────────

"4.18.0"    → exact version only
"^4.18.0"   → >=4.18.0 <5.0.0   (same major — most common)
"~4.18.0"   → >=4.18.0 <4.19.0  (same minor — conservative)
">=4.0.0"   → anything 4.0.0 or higher
"*"         → any version (dangerous)
"4.x"       → any 4.x.x
"4.18.x"    → any 4.18.x
"4.18.0 || 5.0.0"  → specific versions only

Semver version structure: MAJOR.MINOR.PATCH
  MAJOR → breaking change
  MINOR → new feature, backward compatible
  PATCH → bug fix only
```

```bash
# ── Lockfiles — pin exact versions ───────────────────────────────────────
# npm  → package-lock.json
# yarn → yarn.lock
# pnpm → pnpm-lock.yaml

# ALWAYS commit lockfiles to git
# NEVER delete them (causes non-reproducible installs)

# npm commands
npm install          # install from package.json, update lockfile
npm ci               # install EXACTLY from lockfile (CI/production)
npm install zod      # add to dependencies
npm install -D vitest # add to devDependencies (-D = --save-dev)
npm uninstall lodash  # remove package
npm update           # update to latest within semver ranges
npm outdated         # show packages with newer versions available
npm audit            # check for security vulnerabilities
npm audit fix        # auto-fix vulnerabilities where possible
```

```bash
# ── npm scripts ───────────────────────────────────────────────────────────
npm run dev          # run "dev" script
npm start            # shortcut for "start" script (no "run" needed)
npm test             # shortcut for "test" script
npm run build        # custom scripts require "run"

# Pre/post hooks — run automatically before/after a script
# "prebuild": "rm -rf dist"   → runs before "build"
# "postbuild": "echo Done"    → runs after  "build"

# Pass arguments to scripts with --
npm run test -- --watch       # passes --watch to vitest

# ── npx — run package binaries ────────────────────────────────────────────
npx prisma generate           # run prisma CLI (installed in node_modules)
npx create-next-app@latest    # download and run without installing
npx tsx src/seed.ts           # run TypeScript file directly

# npx first checks node_modules/.bin, then downloads if not found
```

```bash
# ── Package manager comparison ────────────────────────────────────────────
# npm:  comes with Node.js, slowest, most widely supported
# pnpm: content-addressable store, fastest, best for monorepos
# yarn: (classic or berry) — yarn workspaces well supported

# This curriculum uses npm — all concepts apply to pnpm/yarn with minor syntax differences
```

---

## W — Why It Matters

- `npm install` vs `npm ci` is a production-critical distinction — `npm ci` installs exactly what the lockfile says (reproducible), while `npm install` may update the lockfile. Always use `npm ci` in CI and Docker builds.
- `^` semver range is the npm default and is usually safe for minor/patch updates but can introduce breaking changes if the package doesn't follow semver — this is why lockfiles exist.
- `devDependencies` vs `dependencies` affects production Docker image size — `npm ci --omit=dev` in a production Docker build skips all devDeps, cutting image size significantly. TypeScript, ESLint, and Vitest should always be devDependencies.

---

## I — Interview Q&A

### Q: What is the difference between `npm install` and `npm ci`?

**A:** `npm install` reads `package.json`, resolves the dependency tree respecting semver ranges, and updates `package-lock.json` if needed. It's for development — adding packages, updating versions. `npm ci` reads `package-lock.json` exactly and installs precisely those versions, deletes `node_modules` first, and fails if `package-lock.json` is missing or inconsistent. It's faster (no resolution step) and reproducible — the same lockfile always produces the same `node_modules`. Use `npm ci` in CI pipelines and Dockerfiles.

---

## C — Common Pitfalls + Fix

### ❌ Installing a devDependency as a regular dependency

```bash
# ❌ TypeScript ends up in production bundle
npm install typescript

# ✅ TypeScript is a build tool — only needed during development
npm install -D typescript
# or: npm install --save-dev typescript
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `package.json` for a TypeScript Node.js app that: has scripts for `dev` (tsx watch), `build` (tsc), `start` (node dist/server.js), `test` (vitest run), and `db:seed` (tsx src/seed.ts); declares `express` and `zod` as regular dependencies; declares `typescript`, `vitest`, and `tsx` as devDependencies with `^` ranges.

### Solution

```json
{
  "name": "my-node-app",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=22.0.0" },
  "scripts": {
    "dev":      "tsx watch src/server.ts",
    "build":    "tsc",
    "start":    "node dist/server.js",
    "test":     "vitest run",
    "db:seed":  "tsx src/seed.ts"
  },
  "dependencies": {
    "express": "^4.18.0",
    "zod":     "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "vitest":     "^4.0.0",
    "tsx":        "^4.0.0"
  }
}
```

---

---
