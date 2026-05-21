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
