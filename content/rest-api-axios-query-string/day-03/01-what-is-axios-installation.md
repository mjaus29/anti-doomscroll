# 1 — What Is Axios & Installation

---

## T — TL;DR

Axios is a **promise-based HTTP client** for the browser and Node.js. It wraps `fetch` with a cleaner API, automatic JSON handling, better error detection, and built-in features like interceptors and timeouts.

---

## K — Key Concepts

### What Is Axios?

Axios is the most widely used HTTP library in JavaScript projects. It works in both the **browser** and **Node.js**, which is why it's the default choice across React, Vue, Next.js, and backend Node services.

```
fetch (built-in)    → manual JSON stringify/parse, manual error checking, verbose
axios (library)     → automatic JSON, cleaner API, better error handling, more features
```

### Axios vs Fetch — Key Differences

| Feature | Fetch | Axios |
|---|---|---|
| Built-in | ✅ | ❌ (npm install) |
| Auto JSON parse | ❌ (need `.json()`) | ✅ |
| Auto JSON stringify | ❌ (need `JSON.stringify`) | ✅ |
| Throws on 4xx/5xx | ❌ | ✅ |
| Request timeout | ❌ (manual AbortController) | ✅ (`timeout` option) |
| Request/Response interceptors | ❌ | ✅ |
| Upload progress | ❌ | ✅ |
| Request cancellation | Manual | Built-in |
| Node.js support | Node 18+ only | ✅ All versions |

### Installation

#### npm / yarn / pnpm

```bash
# npm
npm install axios

# yarn
yarn add axios

# pnpm
pnpm add axios
```

#### CDN (for quick testing or plain HTML projects)

```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

#### Verify Installation

```bash
# Check installed version
npm list axios
# or
cat node_modules/axios/package.json | grep '"version"'
```

### Import in Your Project

```js
// ES Modules (React, Vue, modern JS)
import axios from 'axios'

// CommonJS (Node.js)
const axios = require('axios')
```

### Current Version Note

As of 2025, Axios v1.x is stable. Check `package.json` after install:

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

---

## W — Why It Matters

- Axios is in the majority of professional React codebases — you'll use it or maintain it in almost every job.
- The automatic JSON handling and error throwing eliminates the two most common `fetch` bugs (forgetting `.json()` and forgetting to check `response.ok`).
- Understanding WHY you choose Axios over `fetch` is a question in frontend interviews.
- It works identically in Next.js API routes (server) and React components (client), which reduces cognitive switching.

---

## I — Interview Q&A

### Q1: Why would you choose Axios over the native Fetch API?

**A:** Axios automatically parses JSON responses and stringifies request bodies. It throws errors on 4xx/5xx responses (unlike `fetch` which only rejects on network failure). It also has built-in timeout support, request/response interceptors, and consistent behavior across all Node.js versions. For anything beyond simple one-off requests, Axios reduces boilerplate significantly.

### Q2: Does Axios work in Node.js?

**A:** Yes. Axios works in both the browser and Node.js. In the browser it uses `XMLHttpRequest`, in Node it uses the `http`/`https` modules. This makes it the same API surface on both client and server.

### Q3: Is Axios still relevant with modern Fetch?

**A:** Yes. Modern `fetch` in Node 18+ has closed the gap, but Axios still wins on: automatic JSON handling, throwing on HTTP errors, interceptors, upload progress, and request cancellation ergonomics. For small projects, `fetch` is fine. For production apps with auth, error handling, and retry logic, Axios is cleaner.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Installing and then not importing

```js
// Installed axios but forgot to import
const res = await axios.get('/api/users')
// ReferenceError: axios is not defined
```

**Fix:**

```js
import axios from 'axios'  // at the top of every file that uses it
```

### ❌ Pitfall: Using an outdated v0.x version

```json
"axios": "^0.27.2"   ← old API, missing features
```

**Fix:** Upgrade to v1.x:

```bash
npm install axios@latest
```

### ❌ Pitfall: Mixing `require` and `import` in the same project

```js
const axios = require('axios')  // CommonJS
import axios from 'axios'       // ESM
// Cannot mix — causes SyntaxError
```

**Fix:** Use one module system consistently. Modern React/Vite/Next.js projects use ESM (`import`).

---

## K — Coding Challenge + Solution

### Challenge

Set up a new project with Axios and verify it's working:

```
1. Create a new directory and initialize a package.json
2. Install Axios
3. Create index.js that imports Axios
4. Make it log the Axios version to the console
```

### Solution

```bash
mkdir axios-practice && cd axios-practice
npm init -y
npm install axios
```

```js
// index.js
import axios from 'axios'
console.log('Axios version:', axios.VERSION)
// Output: Axios version: 1.x.x
```

```json
// package.json — add "type": "module" for ESM
{
  "type": "module",
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

---

---
