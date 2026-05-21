# 4 — dotenv and console Methods

---

## T — TL;DR

`dotenv` loads a `.env` file into `process.env` at startup — the standard way to manage local environment variables without committing secrets to git. `console` has more than just `log` — `error`, `warn`, `table`, `time`/`timeEnd`, `group`, and `assert` each serve a specific debugging purpose.

---

## K — Key Concepts

```bash
# .env — local environment file (NEVER commit to git)
DATABASE_URL=postgresql://postgres:pass@localhost:5432/myapp
PORT=3000
NODE_ENV=development
JWT_SECRET=supersecretkey
API_KEY=abc123
```

```javascript
// ── dotenv setup ──────────────────────────────────────────────────────────
// npm install dotenv

// Option A: import/require at top of entry point
import 'dotenv/config'           // ESM — loads .env immediately
// require('dotenv').config()    // CJS equivalent

// Option B: explicit config with options
import dotenv from 'dotenv'
dotenv.config({
  path:     '.env.local',    // custom file path
  override: true,            // override existing process.env values
  debug:    true,            // log what gets loaded
})

// Multiple env files (common pattern)
dotenv.config({ path: '.env' })
dotenv.config({ path: `.env.${process.env.NODE_ENV}`, override: true })
// .env → shared defaults
// .env.development → dev overrides
// .env.test        → test overrides
// .env.local       → never committed (personal overrides)
```

```javascript
// ── console methods ───────────────────────────────────────────────────────

// Basic output
console.log('Hello', 'World', 42)       // space-separated
console.log({ user: 'Mark', age: 28 })  // pretty-prints objects
console.error('Something broke')        // stderr (red in terminals)
console.warn('This is deprecated')      // stderr (yellow in terminals)

// Structured output
console.table([
  { name: 'Mark',  role: 'admin' },
  { name: 'Alice', role: 'user'  },
])
// ┌─────────┬───────┬─────────┐
// │ (index) │ name  │ role    │
// ├─────────┼───────┼─────────┤
// │ 0       │ Mark  │ admin   │
// └─────────┴───────┴─────────┘

// Timing
console.time('db-query')
await db.query('SELECT * FROM users')
console.timeEnd('db-query')     // db-query: 12.34ms

// Grouping
console.group('Request')
  console.log('Method: GET')
  console.log('Path: /users')
console.groupEnd()

// Assertion — throws AssertionError if false
console.assert(1 === 1, 'Math works')      // nothing
console.assert(1 === 2, '1 is not 2')     // Assertion failed: 1 is not 2

// Count calls
console.count('loop')   // loop: 1
console.count('loop')   // loop: 2
console.countReset('loop')

// Stack trace
console.trace('Where am I?')   // prints current call stack
```

```javascript
// ── String substitution in console ────────────────────────────────────────
console.log('%s is %d years old', 'Mark', 28)   // Mark is 28 years old
console.log('%o', { nested: { object: true } })  // deep object inspection
console.log('%c bold text', 'font-weight:bold')  // browser only (CSS styling)
```

---

## W — Why It Matters

- Never commit `.env` to git — it contains passwords, API keys, and secrets. Always add `.env` to `.gitignore` and commit a `.env.example` with placeholder values.
- `console.error` writes to stderr, not stdout — this is important in CLI tools and Docker where stdout and stderr are processed separately. Error messages belong on stderr; program output belongs on stdout.
- `console.time`/`timeEnd` is the fastest way to profile a slow operation without setting up a profiler — add it around a suspect function, get the duration in milliseconds.

---

## I — Interview Q&A

### Q: What does `dotenv` do and when should you NOT use it?

**A:** `dotenv` reads a `.env` file and populates `process.env` with its key-value pairs. It's used for local development to avoid hardcoding configuration. You should NOT use it in production — in production, environment variables are set by the hosting platform (Vercel, Railway, AWS), the container runtime (Docker, Kubernetes), or a secrets manager. Running `dotenv.config()` in production is harmless if the `.env` file doesn't exist (it silently does nothing), but deploying a `.env` file to a production server is a security risk. The pattern: use dotenv in development, use platform env vars in production.

---

## C — Common Pitfalls + Fix

### ❌ `.env` committed to git — credentials exposed

```bash
# ❌ Forgot to add .env to .gitignore
git add .env
git commit -m "add config"  # API keys now in git history forever ❌

# ✅ .gitignore
.env
.env.local
.env.*.local

# ✅ .env.example — safe to commit, shows structure
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DB
PORT=3000
JWT_SECRET=REPLACE_WITH_SECRET
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `src/config.ts` module that: loads `.env` with dotenv, exports a typed `config` object with `port` (number), `nodeEnv` (string), `databaseUrl` (string — required), and `jwtSecret` (string — required). Log a startup message with `console.log` including the port and environment.

### Solution

```typescript
// src/config.ts
import 'dotenv/config'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`[config] Required env var "${name}" is not set`)
    process.exit(1)
  }
  return value
}

export const config = {
  port:        Number(process.env.PORT) || 3000,
  nodeEnv:     process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret:   requireEnv('JWT_SECRET'),
}

console.log(`[config] Loaded — port=${config.port}, env=${config.nodeEnv}`)
```

---

---
