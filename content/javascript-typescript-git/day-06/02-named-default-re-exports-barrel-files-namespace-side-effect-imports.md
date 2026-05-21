# 2 — Named/Default/Re-exports, Barrel Files, Namespace, Side-effect Imports

---

## T — TL;DR

ESM offers **named exports** (multiple per file), **default exports** (one per file — avoid for libraries), **re-exports** (aggregate and re-expose), **barrel files** (`index.js` aggregating a module's public API), **namespace imports** (`import *`), and **side-effect imports** (run the module, import nothing). Each has a clear use case.

---

## K — Key Concepts

```javascript
// ── Named exports ─────────────────────────────────────────────────────────
// user.js
export const ROLES  = { ADMIN: 'admin', USER: 'user' }
export function createUser(name) { return { name, role: ROLES.USER } }
export class UserError extends Error {}

// Consumer
import { ROLES, createUser, UserError } from './user.js'
import { createUser as makeUser }       from './user.js'   // rename
```

```javascript
// ── Default export ────────────────────────────────────────────────────────
// logger.js
export default class Logger {
  log(msg) { console.log(`[LOG] ${msg}`) }
}

// Consumer — any name works, no braces
import Logger  from './logger.js'
import MyLog   from './logger.js'   // same thing, different local name

// ⚠️ Default exports are harder to refactor — rename doesn't break usage
// ⚠️ Hard to search for usage in codebases
// ✅ Prefer named exports for libraries and shared utilities
```

```javascript
// ── Re-exports ────────────────────────────────────────────────────────────
// Re-export named from another module
export { createUser, UserError }  from './user.js'
export { default as Logger }      from './logger.js'  // re-export default as named
export * from './utils.js'                            // re-export all named
export * as utils from './utils.js'                   // re-export as namespace

// ── Barrel file (index.js) — aggregate module's public API ───────────────
// src/users/index.js
export { createUser, updateUser, deleteUser } from './user.service.js'
export { UserRepository }                     from './user.repository.js'
export { UserError, UserNotFoundError }       from './user.errors.js'
export type { User, CreateUserDto }           from './user.types.js'  // TS

// Consumer — clean import from the barrel
import { createUser, UserError } from './users/index.js'
// or with path alias:
import { createUser, UserError } from '@/users'
```

```javascript
// ── Namespace import ──────────────────────────────────────────────────────
import * as math from './math.js'
math.add(1, 2)         // access as properties
math.PI                // 3.14159
// Useful when: many exports, disambiguate name collisions, dynamic access

// ── Side-effect import — run module, import nothing ────────────────────────
import './polyfills.js'       // run polyfills
import './setup-globals.js'   // configure globals
import 'reflect-metadata'     // TypeScript decorators prerequisite

// The module runs once and is cached — repeated imports don't re-run
import './polyfills.js'  // no-op — already in cache
```

---

## W — Why It Matters

- Barrel files are a double-edged sword — clean imports but can slow bundler startup if the barrel re-exports many unused modules. Modern bundlers with tree-shaking handle this well; older ones don't. Always use `export { specific }` not `export * from` in barrels for best tree-shaking.
- `export default` loses the name at the export site — `export default function() {}` (anonymous) means the imported name is whatever the consumer chooses, making codebase search harder. Prefer `export default function named() {}` or just use named exports.
- Re-exports are how library `index.js` files work — `import { useState } from 'react'` hits React's barrel file which re-exports `useState` from its internal module.

---

## I — Interview Q&A

### Q: When would you use a default export vs a named export?

**A:** Use **named exports** for most things — they're explicit, support auto-rename refactoring, show up in IDE autocomplete from the import source, and enable tree-shaking clearly. Use **default export** for: (1) A module that represents a single primary thing (a React component file, a config object), (2) Interop scenarios where consumers expect a default. Avoid default exports in shared libraries — consumers can name them anything, making codebase-wide search for usage unreliable. TypeScript's `import type` also works cleanly with named exports.

---

## C — Common Pitfalls + Fix

### ❌ Circular imports via barrel files causing `undefined` exports

```javascript
// ❌ a.js imports from index.js which imports b.js which imports a.js
// At the point b.js runs, a.js hasn't finished — exports are undefined

// ✅ Import directly from the source module, not the barrel
import { helper } from './utils.js'     // direct ✅ (not from './index.js')
// Save barrel imports for external consumers, not internal cross-imports
```

---

## K — Coding Challenge + Solution

### Challenge

Create a `src/auth/` module with `auth.service.js` (exports `login`, `logout`), `auth.errors.js` (exports `AuthError`, `TokenExpiredError`), and an `index.js` barrel. Show namespace import and side-effect import usage.

### Solution

```javascript
// src/auth/auth.errors.js
export class AuthError extends Error {
  constructor(message) { super(message); this.name = 'AuthError' }
}
export class TokenExpiredError extends AuthError {
  constructor() { super('Token expired'); this.name = 'TokenExpiredError' }
}

// src/auth/auth.service.js
import { AuthError } from './auth.errors.js'
export async function login(email, pass) {
  if (!email || !pass) throw new AuthError('Credentials required')
  return { token: 'jwt_' + Date.now() }
}
export async function logout(token) { console.log(`Revoked: ${token}`) }

// src/auth/index.js — barrel
export { login, logout }             from './auth.service.js'
export { AuthError, TokenExpiredError } from './auth.errors.js'

// Consumer — named import from barrel
import { login, AuthError } from './auth/index.js'

// Namespace import
import * as auth from './auth/index.js'
auth.login('a@b.com', 'pass')

// Side-effect import (e.g., registers auth middleware globally)
import './auth/register-middleware.js'
```

---

---
