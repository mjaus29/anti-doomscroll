# 2 — Node.js process — env, argv, exit

---

## T — TL;DR

`process` is Node.js's window into the runtime — environment variables, command-line arguments, exit codes, and the working directory. It's a global, available everywhere without importing. `process.env` is how you configure an app per environment. `process.argv` is how CLI tools read arguments. `process.exit(code)` terminates the process.

---

## K — Key Concepts

```javascript
// ── process.env — environment variables ──────────────────────────────────
console.log(process.env.NODE_ENV)        // 'development' | 'production' | 'test'
console.log(process.env.PORT)            // always a string or undefined
console.log(process.env.MISSING_VAR)     // undefined (not an error)

// Safe access with fallback
const port = Number(process.env.PORT) || 3000
const env  = process.env.NODE_ENV ?? 'development'

// Setting in shell:
// NODE_ENV=production node server.js
// PORT=8080 node server.js
```

```javascript
// ── process.argv — command-line arguments ─────────────────────────────────
// node script.js hello --name Mark --count 3
console.log(process.argv)
// [
//   '/usr/bin/node',        // [0] path to node executable
//   '/app/script.js',       // [1] path to script
//   'hello',                // [2] first user argument
//   '--name',               // [3]
//   'Mark',                 // [4]
//   '--count',              // [5]
//   '3'                     // [6] always a string
// ]

const args = process.argv.slice(2)  // user arguments only: ['hello', '--name', ...]

// Simple argument parser (without a library)
function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}
console.log(getArg('name'))   // 'Mark'
console.log(getArg('count'))  // '3' ← always string, convert if needed
```

```javascript
// ── process.exit — terminate with an exit code ────────────────────────────
// Exit code 0  = success (default)
// Exit code 1  = general error (most common for failures)
// Exit code 2  = misuse of shell command / invalid argument

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required')
  process.exit(1)   // signal failure to the shell / CI system ✅
}

// Graceful shutdown pattern
process.on('SIGTERM', () => {
  console.log('Received SIGTERM — shutting down gracefully')
  // close DB connections, finish in-flight requests
  process.exit(0)
})

// ── Other useful process properties ──────────────────────────────────────
console.log(process.cwd())          // current working directory
console.log(process.platform)       // 'linux' | 'darwin' | 'win32'
console.log(process.versions.node)  // '22.x.x'
console.log(process.pid)            // process ID number
console.log(process.uptime())       // seconds since process started
process.stdout.write('no newline')  // write to stdout without \n
process.stderr.write('error msg\n') // write to stderr
```

---

## W — Why It Matters

- `process.env` is the industry-standard way to configure Node.js apps without hardcoding values — database URLs, API keys, feature flags all come from environment variables following the 12-factor app methodology.
- All `process.env` values are strings — `process.env.PORT === '3000'`, not `3000`. Forgetting to convert causes silent bugs (`'3000' + 1 === '30001'`).
- Exit codes matter in CI — a script that `process.exit(0)` on failure will tell GitHub Actions it succeeded. Always exit with a non-zero code on error.

---

## I — Interview Q&A

### Q: How do you safely read a required environment variable and crash clearly if it's missing?

**A:** Check for `undefined` early at startup — fail loudly with a descriptive message before the app initialises any connections, rather than getting a confusing error later when the variable is first used.

```javascript
function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}
const dbUrl = requireEnv('DATABASE_URL')
const port  = Number(requireEnv('PORT'))
```

---

## C — Common Pitfalls + Fix

### ❌ Treating `process.env` values as numbers

```javascript
// ❌ process.env.PORT is a string — arithmetic breaks silently
const port = process.env.PORT || 3000
app.listen(port)   // works accidentally but port is '8080' (string)

// ❌ Worse — concatenation instead of addition
console.log(process.env.PORT + 1)  // '30001' not 3001

// ✅ Always convert explicitly
const port = Number(process.env.PORT) || 3000
const port = parseInt(process.env.PORT ?? '3000', 10)
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `loadConfig()` function that reads `PORT`, `NODE_ENV`, and `DATABASE_URL` from `process.env`, provides defaults for `PORT` (3000) and `NODE_ENV` (`development`), and exits with code 1 if `DATABASE_URL` is missing.

### Solution

```javascript
function loadConfig() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('[config] Missing required DATABASE_URL environment variable')
    process.exit(1)
  }
  return {
    port:        Number(process.env.PORT) || 3000,
    nodeEnv:     process.env.NODE_ENV ?? 'development',
    databaseUrl,
  }
}

const config = loadConfig()
console.log(config)
// { port: 3000, nodeEnv: 'development', databaseUrl: 'postgresql://...' }
```

---

---
