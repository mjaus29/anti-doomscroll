# 10 — Operators and Control Flow

---

## T — TL;DR

JavaScript's operators include standard arithmetic and comparison plus JS-specific ones: `??` (nullish coalescing — default for null/undefined only), `?.` (optional chaining — safe property access), and `||`/`&&` short-circuiting. Control flow: `if/else`, `switch` (with `break`!), ternary, `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue`.

---

## K — Key Concepts

```javascript
// ── Nullish coalescing ?? vs OR || ────────────────────────────────────────
// || uses the right side for any falsy value (0, '', false, null, undefined)
// ?? uses the right side ONLY for null or undefined

const count  = 0
const name   = ''
const active = false

count  || 10    // 10   ← 0 is falsy, uses default ❌ (probably not what you want)
count  ?? 10    // 0    ← 0 is not null/undefined, keeps 0  ✅

name   || 'anon'    // 'anon'  ← '' is falsy ❌
name   ?? 'anon'    // ''      ← '' is not null/undefined ✅

active || true      // true    ← false is falsy ❌
active ?? true      // false   ← false is not null/undefined ✅

// ?? is correct for "provide a default only when the value is absent"
const port = process.env.PORT ?? 3000   // 0 is a valid port — ?? is correct
```

```javascript
// ── Optional chaining ?. ──────────────────────────────────────────────────
const user = null

// ❌ TypeError: Cannot read properties of null
user.profile.avatar

// ✅ Returns undefined if any step is null/undefined
user?.profile?.avatar    // undefined (no error)
user?.profile?.name      // undefined

// Works with methods and brackets
const arr = null
arr?.map(x => x)         // undefined (not TypeError)
arr?.length              // undefined

user?.getAddress?.()     // call only if method exists
obj?.['dynamic-key']     // bracket access

// Nullish assignment — set only if null or undefined
let config = null
config ??= { theme: 'dark' }   // config = { theme: 'dark' }
config ??= { theme: 'light' }  // unchanged — config is already non-null
```

```javascript
// ── Short-circuit evaluation ──────────────────────────────────────────────
// && — returns left side if falsy, right side if truthy
false && doSomething()   // false — doSomething() never called ✅
true  && doSomething()   // result of doSomething()
null  && 'value'         // null (falsy left side returned)
'hi'  && 'value'         // 'value' (truthy left side, returns right)

// Common patterns:
isAdmin && renderAdminPanel()   // render only if admin
user && user.name               // → user?.name (prefer optional chaining)

// || — returns left side if truthy, right side if falsy
'value' || 'default'    // 'value' (truthy left returned)
null    || 'default'    // 'default'
0       || 'default'    // 'default' ← 0 treated as falsy
```

```javascript
// ── if/else, ternary, switch ──────────────────────────────────────────────
// if/else — standard
if (score >= 90) {
  grade = 'A'
} else if (score >= 80) {
  grade = 'B'
} else {
  grade = 'C'
}

// Ternary — for simple two-branch assignments
const label = score >= 60 ? 'pass' : 'fail'
// ❌ Avoid nested ternaries — use if/else
const label2 = a ? 'x' : b ? 'y' : 'z'  // hard to read

// switch — for multiple exact value matches
switch (status) {
  case 'pending':
    handlePending()
    break                // ← REQUIRED — without break, falls through to next case
  case 'active':
  case 'running':       // ← intentional fall-through (two cases, same body)
    handleRunning()
    break
  default:
    handleUnknown()
}
```

```javascript
// ── Loops ─────────────────────────────────────────────────────────────────
// for — classic, use when you need the index
for (let i = 0; i < 5; i++) {
  console.log(i)    // 0 1 2 3 4
}

// for...of — iterate values of iterables (arrays, strings, Sets, Maps)
const fruits = ['apple', 'banana', 'cherry']
for (const fruit of fruits) {
  console.log(fruit)   // 'apple', 'banana', 'cherry'
}

// for...of with index (using entries())
for (const [i, fruit] of fruits.entries()) {
  console.log(i, fruit)   // 0 apple, 1 banana, 2 cherry
}

// for...in — iterate keys of an object (not for arrays)
const obj = { a: 1, b: 2, c: 3 }
for (const key in obj) {
  console.log(key, obj[key])  // 'a' 1, 'b' 2, 'c' 3
}
// ❌ Don't use for...in on arrays — iterates prototype chain too
// ✅ Use for...of or .forEach() for arrays

// while
let n = 0
while (n < 3) {
  console.log(n)
  n++
}

// do...while — runs at least once
do {
  const input = prompt('Enter a number')
  n = Number(input)
} while (Number.isNaN(n))

// break and continue
for (let i = 0; i < 10; i++) {
  if (i === 3) continue   // skip 3
  if (i === 6) break      // stop at 6
  console.log(i)          // 0 1 2 4 5
}
```

```javascript
// ── Arithmetic and comparison operators ───────────────────────────────────
// Arithmetic
5 + 2   // 7
5 - 2   // 3
5 * 2   // 10
5 / 2   // 2.5 (always float division)
5 % 2   // 1 (modulo/remainder)
2 ** 3  // 8 (exponentiation, same as Math.pow)
5 / 0   // Infinity (not an error!)

// Increment/decrement
let x = 5
x++     // post-increment: returns 5, then x = 6
++x     // pre-increment:  x = 7, returns 7
x--     // post-decrement: returns 7, then x = 6

// Comparison
5 >  3    // true
5 >= 5    // true
5 <  3    // false
5 <= 3    // false
5 === 5   // true (strict)
5 !== 4   // true (strict not equal)
```

---

## W — Why It Matters

- `??` vs `||` for defaults is a production bug source — `|| 3000` as a port default means port `0` is impossible (0 is falsy), and an empty string username becomes `'anon'`. Use `??` when 0, `''`, and `false` are valid values.
- Missing `break` in `switch` is a silent bug — JavaScript falls through to the next case and executes it. This is intentional when you want multiple cases to share a body, but accidental fall-through causes hard-to-find bugs. Always add `break` or `return` unless fall-through is intentional.
- `for...in` on arrays iterates inherited enumerable properties too, not just indexes — always use `for...of` or `.forEach()` for arrays. `for...in` is for plain object key enumeration only.

---

## I — Interview Q&A

### Q: What is the difference between `??` and `||` for default values?

**A:** `||` returns the right-hand side if the left is any falsy value — `false`, `0`, `''`, `null`, or `undefined`. `??` returns the right-hand side only if the left is `null` or `undefined`. Use `??` when `0`, `''`, or `false` are valid non-default values. Example: `const port = userInput ?? 3000` correctly keeps port `0` if the user specified it, while `const port = userInput || 3000` would replace `0` with `3000`. In TypeScript this distinction is enforced by the compiler for typed values — `??` is type-safe for `T | null | undefined`.

---

## C — Common Pitfalls + Fix

### ❌ Missing `break` in switch — silent fall-through

```javascript
// ❌ Missing break — falls through to 'active' case
switch (status) {
  case 'pending':
    console.log('pending')    // logs 'pending'
    // forgot break!
  case 'active':
    console.log('active')     // ALSO logs 'active' ❌
    break
}

// ✅ Add break to every intentional non-fall-through case
switch (status) {
  case 'pending':
    console.log('pending')
    break    // ← stops here ✅
  case 'active':
    console.log('active')
    break
}
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `classifyScore(score)` function using a `switch` on grade ranges (A: 90–100, B: 80–89, C: 70–79, F: below 70). Validate the score is a number between 0–100 using `Number.isNaN`, `Number.isFinite`. Use `??` for a default grade. Use `for...of` to classify an array of scores and return only the passing ones (not F).

### Solution

```javascript
function classifyScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return null
  }
  // Derive the tens digit as the switch key
  const band = score === 100 ? 10 : Math.floor(score / 10)
  switch (band) {
    case 10:
    case 9:  return 'A'
    case 8:  return 'B'
    case 7:  return 'C'
    default: return 'F'
  }
}

function passingScores(scores) {
  const passing = []
  for (const score of scores) {
    const grade = classifyScore(score) ?? 'F'
    if (grade !== 'F') {
      passing.push({ score, grade })
    }
  }
  return passing
}

console.log(passingScores([95, 85, 72, 55, 100, -1, NaN]))
// [{ score: 95, grade: 'A' }, { score: 85, grade: 'B' },
//  { score: 72, grade: 'C' }, { score: 100, grade: 'A' }]
```

---

## ✅ Day 1 Complete — JavaScript Foundations

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Runtime Context — Node.js vs Browser, globalThis | ☐ |
| 2 | Node.js process — env, argv, exit | ☐ |
| 3 | Package Managers — package.json, semver, lockfiles | ☐ |
| 4 | dotenv and console Methods | ☐ |
| 5 | var vs let vs const — Scope, Hoisting, TDZ | ☐ |
| 6 | Primitive Types, typeof, Coercion, == vs === | ☐ |
| 7 | Template Literals and String Methods | ☐ |
| 8 | Number Methods, Math, NaN, Infinity | ☐ |
| 9 | Date Basics — Timestamps, Parsing Gotchas | ☐ |
| 10 | Operators and Control Flow | ☐ |

---

## 🗺️ One-Page Mental Model — Day 1

```
RUNTIME ENVIRONMENTS
  Browser:   window, DOM, localStorage, fetch (built-in)
  Node.js:   process, fs, http, global
  Universal: globalThis — correct in all environments
  Detection: typeof window !== 'undefined' → browser
  Module systems: CJS (require/module.exports) vs ESM (import/export)
  ESM lacks __dirname → use fileURLToPath(import.meta.url)

PROCESS (Node.js)
  process.env.VAR     → string or undefined (always string!)
  process.argv        → [node, script, ...userArgs] (slice(2) for user args)
  process.exit(0)     → success | process.exit(1) → failure
  process.cwd()       → working directory
  process.platform    → 'linux' | 'darwin' | 'win32'
  Always convert env vars: Number(process.env.PORT) || 3000

PACKAGE MANAGEMENT
  npm ci              → exact lockfile install (CI/production)
  npm install         → resolves semver ranges, updates lockfile (dev)
  ^1.2.3 = >=1.2.3 <2.0.0 | ~1.2.3 = >=1.2.3 <1.3.0 | 1.2.3 = exact
  devDependencies     → not installed in production (npm ci --omit=dev)
  lockfile            → ALWAYS commit, NEVER delete
  npx                 → runs binary from node_modules or downloads temporarily

DOTENV + CONSOLE
  import 'dotenv/config' → loads .env into process.env at startup
  NEVER commit .env → add to .gitignore, commit .env.example
  console.error/warn → stderr | console.log → stdout
  console.table()    → tabular display | console.time/timeEnd → timing
  console.assert()   → throw if false | console.trace() → stack trace

var / let / const
  var:   function-scoped, hoisted + init to undefined, allows redeclaration
  let:   block-scoped, hoisted but TDZ, allows reassignment
  const: block-scoped, hoisted but TDZ, no reassignment (object mutation ok)
  const ≠ immutable — Object.freeze() for shallow immutability
  var loop bug: var i shared → use let (new binding per iteration)
  Rule: const by default → let when reassignment needed → never var

TYPES + TYPEOF
  7 primitives: string, number, bigint, boolean, undefined, null, symbol
  typeof null === 'object'  ← historic bug, not fixable
  typeof []   === 'object'  ← arrays are objects
  Safe undeclared check: typeof MISSING !== 'undefined' (never throws)
  === never coerces | == coerces (avoid — use === always)
  null == undefined is true (one valid == use)
  Falsy: false 0 -0 0n '' null undefined NaN
  Truthy: everything else — including [] {} '0' -1

STRINGS
  Template literals: `Hello ${name}` — always prefer over concatenation
  Strings are immutable — all methods return new strings
  trim/trimStart/trimEnd | toUpperCase/toLowerCase
  includes/startsWith/endsWith/indexOf
  slice(start, end) | at(-1) = last char
  replace(first) | replaceAll(all) | split/join
  padStart(n, '0') for zero-padding

NUMBERS
  All numbers are IEEE 754 doubles — 0.1 + 0.2 ≠ 0.3
  Fix: Math.abs(a - b) < Number.EPSILON
  NaN: only value not === itself → Number.isNaN() (not global isNaN!)
  Number.isFinite() — no coercion (global isFinite coerces)
  Number.isInteger() | Number.isSafeInteger()
  MAX_SAFE_INTEGER = 9007199254740991 — BigInt for larger
  Math: round/ceil/floor/trunc | abs/min/max | sqrt/pow | random
  randInt(min,max) = Math.floor(Math.random()*(max-min+1))+min

DATES
  Date stores Unix timestamp in milliseconds since 1970 UTC
  Date.now() → fastest timestamp, no object allocation
  Month is 0-indexed: 0=Jan, 11=Dec ← biggest Date gotcha
  new Date('2025-06-15') → midnight UTC (not local!) — timezone trap
  Invalid date check: Number.isNaN(new Date('bad').getTime())
  Compare with getTime(): a.getTime() < b.getTime() ✅
  Never use a === b for Date comparison (object reference check)
  For production date work: use date-fns

OPERATORS + CONTROL FLOW
  ?? (nullish): right side only when left is null/undefined
  || (OR):      right side for any falsy value (0, '', false too!)
  ?. (optional chain): safe navigation, returns undefined not TypeError
  ??= assigns only if null/undefined
  && short-circuits on falsy | || short-circuits on truthy
  switch: ALWAYS add break — fall-through is a common bug
  for...of: arrays, strings, Sets, Maps (values)
  for...in: object keys only (never use on arrays)
  break: exits loop | continue: skips to next iteration
```

> **Your next action:** Open a Node.js REPL (`node`) and type `typeof null`, then `0.1 + 0.2`, then `null == undefined`. See the quirks live — one minute of hands-on beats five minutes of reading.

> "Doing one small thing beats opening a feed."
