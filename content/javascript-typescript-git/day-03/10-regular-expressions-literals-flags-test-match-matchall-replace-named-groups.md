# 10 — Regular Expressions — Literals, Flags, test/match/matchAll/replace, Named Groups

---

## T — TL;DR

Regular expressions match patterns in strings. Create with `/pattern/flags` (literal) or `new RegExp(pattern, flags)` (dynamic). `test` checks existence. `match`/`matchAll` extract matches. `replace`/`replaceAll` substitute. Named capture groups (`(?<name>...)`) make matches readable. Flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotAll).

---

## K — Key Concepts

```javascript
// ── Creating regex ────────────────────────────────────────────────────────
const re1 = /hello/i                     // literal: case-insensitive
const re2 = new RegExp('hello', 'i')     // constructor: same result
const dynamic = new RegExp(userInput, 'gi')  // runtime pattern — sanitise first!

// ── Flags ──────────────────────────────────────────────────────────────────
// g — global: find ALL matches (without g, stop at first)
// i — case-insensitive
// m — multiline: ^ and $ match line boundaries, not just string
// s — dotAll: . matches \n (by default . doesn't match newlines)
// u — unicode: full Unicode support
// d — indices: provide match index ranges

'Hello HELLO hello'.match(/hello/g)    // ['Hello','HELLO','hello'] ← no, case matters
'Hello HELLO hello'.match(/hello/gi)   // ['Hello','HELLO','hello'] ✅
```

```javascript
// ── test — returns boolean ─────────────────────────────────────────────────
/^\d{4}-\d{2}-\d{2}$/.test('2025-06-15')    // true  — valid date format
/^\d{4}-\d{2}-\d{2}$/.test('2025-6-15')     // false — month must be 2 digits
/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test('mark@example.com')  // true

// ⚠️ Don't use test() with /g flag and reuse the regex — stateful lastIndex
const re = /a/g
re.test('a')   // true  — lastIndex moves to 1
re.test('a')   // false — starts from lastIndex=1, misses it!
re.lastIndex = 0  // reset before reuse, or use a fresh regex
```

```javascript
// ── match — extract matches ────────────────────────────────────────────────
// Without g: returns first match with capture groups + index
'2025-06-15'.match(/(\d{4})-(\d{2})-(\d{2})/)
// ['2025-06-15', '2025', '06', '15', index: 0, input: '2025-06-15', groups: undefined]

// With g: returns array of all matches (no capture groups)
'cat bat hat'.match(/[cbh]at/g)   // ['cat', 'bat', 'hat']

// If no match: returns null
'hello'.match(/\d+/)  // null — check before accessing!
const m = 'hello'.match(/\d+/)
const digits = m?.[0] ?? 'none'   // safe with optional chaining
```

```javascript
// ── Named capture groups — (?<name>...) ──────────────────────────────────
const dateRe = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
const result = '2025-06-15'.match(dateRe)

result.groups.year    // '2025'
result.groups.month   // '06'
result.groups.day     // '15'

// Named groups in replace
'2025-06-15'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<day>/$<month>/$<year>'   // use named groups in replacement
)
// '15/06/2025'
```

```javascript
// ── matchAll — iterate all matches WITH capture groups ────────────────────
// Requires /g flag, returns iterator
const text = 'Jane: 25, John: 30, Bob: 22'
const re = /(?<name>[A-Z][a-z]+): (?<age>\d+)/g

for (const match of text.matchAll(re)) {
  console.log(`${match.groups.name} is ${match.groups.age}`)
}
// Jane is 25 | John is 30 | Bob is 22

// Collect into array
const people = [...text.matchAll(re)].map(m => ({
  name: m.groups.name,
  age:  Number(m.groups.age),
}))
// [{ name:'Jane', age:25 }, { name:'John', age:30 }, { name:'Bob', age:22 }]
```

```javascript
// ── replace / replaceAll with regex ───────────────────────────────────────
// replace with function callback
'hello world foo'.replace(/\b\w/g, c => c.toUpperCase())
// 'Hello World Foo'  — capitalise first letter of each word

// Replace captures
'John Smith'.replace(/(\w+)\s(\w+)/, '$2, $1')   // 'Smith, John'

// Replace with function for complex logic
const template = 'Hello {{name}}, your score is {{score}}.'
const data = { name: 'Mark', score: 95 }
const filled = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '')
// 'Hello Mark, your score is 95.'

// replaceAll with string (no regex needed for literal replacement)
'aababc'.replaceAll('a', 'x')   // 'xxbxbc' ✅
// replaceAll with regex (must have g flag)
'aababc'.replaceAll(/a/g, 'x')  // 'xxbxbc'
```

```javascript
// ── Common regex patterns ──────────────────────────────────────────────────
const patterns = {
  email:    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  uuid:     /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  isoDate:  /^\d{4}-\d{2}-\d{2}$/,
  integer:  /^-?\d+$/,
  decimal:  /^-?\d+(\.\d+)?$/,
  url:      /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  phone_ph: /^(09|\+639)\d{9}$/,  // Philippine mobile
  slug:     /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
}

// Usage
patterns.email.test('mark@example.com')   // true
patterns.slug.test('my-blog-post')        // true
patterns.slug.test('My Blog Post')        // false
```

---

## W — Why It Matters

- `matchAll` over `match` with `/g` is the correct choice when you need both all matches AND their capture groups — `match` with `/g` returns only the full matches, not the groups. `matchAll` returns each match as a full match object with `.groups`.
- Named capture groups make regex readable and maintainable — `match.groups.year` vs `match[1]` is self-documenting. When the regex changes and group order shifts, named groups are unaffected.
- The stateful `/g` flag with `test()` is a classic bug — reusing a regex literal with `/g` maintains `lastIndex` between calls. Either reset `re.lastIndex = 0` or create a new regex each time. Better: use `test()` only with non-`g` regexes.

---

## I — Interview Q&A

### Q: What is the difference between `match` and `matchAll`?

**A:** `match` without the `/g` flag returns the first match as an array including capture groups, `index`, and `groups`. With `/g`, it returns an array of all matched strings but drops capture group information. `matchAll` always requires the `/g` flag and returns an iterator of all matches, each as a full match object with `index`, `groups`, and capture groups. Use `match` for a single match or when you don't need capture groups from multiple matches. Use `matchAll` when you need to iterate all matches and access their named or numbered capture groups.

---

## C — Common Pitfalls + Fix

### ❌ Reusing `/g` regex across `test()` calls — alternating results

```javascript
// ❌ lastIndex persists between calls
const re = /\d+/g
re.test('abc 123')   // true  (lastIndex → 7)
re.test('abc 456')   // false (starts from index 7 — past end) ❌
re.test('abc 789')   // true  (lastIndex reset to 0 after failure)

// ✅ Option 1: no g flag for test
const re2 = /\d+/
re2.test('abc 123')  // true  ✅
re2.test('abc 456')  // true  ✅

// ✅ Option 2: reset lastIndex
re.lastIndex = 0
re.test('abc 456')   // true ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `parseLogLine(line)` function that uses a named capture group regex to parse log lines in the format `[2025-06-15 14:30:00] ERROR: Database connection failed`. Return `{ date, level, message }` or `null` if the format doesn't match.

### Solution

```javascript
const LOG_RE = /^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<level>[A-Z]+): (?<message>.+)$/

function parseLogLine(line) {
  const match = line.match(LOG_RE)
  if (!match) return null
  const { date, level, message } = match.groups
  return { date: new Date(date), level, message }
}

console.log(parseLogLine('[2025-06-15 14:30:00] ERROR: Database connection failed'))
// { date: Date..., level: 'ERROR', message: 'Database connection failed' }

console.log(parseLogLine('[2025-06-15 14:31:05] INFO: Server started on port 3000'))
// { date: Date..., level: 'INFO', message: 'Server started on port 3000' }

console.log(parseLogLine('not a log line'))
// null

// Parse multiple lines with matchAll
function parseLogFile(content) {
  const lineRe = /^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<level>[A-Z]+): (?<message>.+)$/gm
  return [...content.matchAll(lineRe)].map(m => ({
    date:    new Date(m.groups.date),
    level:   m.groups.level,
    message: m.groups.message,
  }))
}
```

---

## ✅ Day 3 Complete — Arrays, Objects, Serialization & Regex

| # | Subtopic | Status |
|---|----------|--------|
| 1 | Array Creation, Indexing, Mutation vs Immutability | ☐ |
| 2 | Core Array HOFs — map, filter, reduce, find, some, every | ☐ |
| 3 | flat, flatMap, forEach, slice, splice, concat, join, includes, fill, at | ☐ |
| 4 | Array Utilities — from, of, isArray, keys/values/entries, Sorting | ☐ |
| 5 | Object Literals — Shorthand, Computed Properties, Methods | ☐ |
| 6 | Object Static Methods — keys/values/entries/assign/freeze/fromEntries | ☐ |
| 7 | Destructuring and Spread / Rest | ☐ |
| 8 | Shallow vs Deep Copy, structuredClone, Circular References | ☐ |
| 9 | JSON.parse / JSON.stringify — replacer, reviver, gotchas | ☐ |
| 10 | Regular Expressions — flags, test/match/matchAll/replace, named groups | ☐ |

---

## 🗺️ One-Page Mental Model — Day 3

```
ARRAYS
  Creation: [] literal | Array.from({length:n}, fn) | Array.of(...)
  new Array(n) → sparse (avoid) | new Array(n).fill(v) → filled ✅
  .at(-1) → last element | .at(-2) → second-to-last
  Mutating:     push/pop/shift/unshift/splice/sort/reverse/fill
  Non-mutating: map/filter/reduce/slice/concat/flat/flatMap/find/includes
  ES2023:       toSorted/toReversed/toSpliced/with → always non-mutating

CORE ARRAY HOFs
  map(fn)         → transform, same length, new array
  filter(fn)      → keep matching, new array, length ≤ original
  reduce(fn, init) → fold to single value — ALWAYS provide initial value
  find(fn)        → first match or undefined (stops early)
  findIndex(fn)   → first match index or -1
  some(fn)        → true if ANY match (short-circuits)
  every(fn)       → true if ALL match (short-circuits)

MORE ARRAY METHODS
  flat(depth)     → flatten nested arrays (Infinity = fully flat)
  flatMap(fn)     → map then flat(1) — more efficient than two passes
  forEach(fn)     → side effects only, returns undefined, not chainable
  slice(s,e)      → copy portion [s, e), negative indexing supported
  splice(s,n,...) → mutate in place: remove n items, insert rest
  concat(...)     → merge arrays → prefer [...a, ...b]
  join(sep)       → array to string
  includes(v)     → boolean, handles NaN (unlike indexOf)
  fill(v,s,e)     → fill range with value (mutating)

ARRAY UTILITIES
  Array.isArray(v)    → only correct array check (typeof gives 'object')
  Array.from(iter,fn) → any iterable/array-like → real array
  Array.from({length:n}, (_,i) => ...) → create computed array
  keys/values/entries → iterators for index / value / [index,value]
  sort comparator: (a,b) => a-b (asc) | b-a (desc) | localeCompare (strings)

OBJECT LITERALS
  { name, age }              → shorthand (key = variable name)
  { method() {} }            → shorthand method
  { [expr]: value }          → computed property name
  obj.key vs obj['key']      → dot=static, bracket=dynamic
  Object.hasOwn(obj, key)    → safe own-property check (prefer over hasOwnProperty)

OBJECT STATIC METHODS
  keys/values/entries(obj)   → own enumerable properties
  fromEntries(pairs)         → [[k,v]] → object
  assign({}, a, b)           → shallow merge → prefer { ...a, ...b }
  freeze(obj)                → no add/modify/delete (SHALLOW only)
  seal(obj)                  → no add/delete, modify allowed
  create(proto)              → set prototype | create(null) → pure dict
  defineProperty(obj,k,desc) → writable/enumerable/configurable control

DESTRUCTURING + SPREAD/REST
  const [a, ,c]  = arr       → array destructure, skip with comma
  const {a:x=5}  = obj       → rename + default
  const {a,...r} = obj       → rest = remaining properties
  [...arr]                   → shallow copy
  {...obj, key:v}            → merge + override
  Spread = unpack | Rest = collect
  Function params: ({a,b}={}) → object params with fallback

COPY PATTERNS
  Shallow: {...obj} or Object.assign({},{}) → top level only
  Deep:    structuredClone(obj) → best (handles Date,Set,Map,circular)
  JSON.parse(JSON.stringify()) → lossy (loses Date,Map,Set,undefined,fn)
  Circular refs → crash JSON.stringify, fine with structuredClone
  structuredClone limits: no functions, no class methods, no DOM nodes

JSON
  stringify(v, replacer, space) → JS → string
  parse(s, reviver)             → string → JS
  Silently drops: undefined, functions, Symbol (as object keys)
  Converts: NaN→null, Infinity→null, Date→ISO string
  Map/Set → {} (empty!) BigInt → throws TypeError
  replacer: array = whitelist keys | fn = transform each key/value
  reviver: fn to restore types (especially Date) during parse
  toJSON() method on class → custom serialisation
  safeParseJSON: always try/catch JSON.parse

REGEX
  /pattern/flags → literal | new RegExp(str, flags) → dynamic
  Flags: g=global, i=case-insensitive, m=multiline, s=dotAll
  test(str)          → boolean | ⚠️ stateful with /g — reset lastIndex
  match(re)          → first match + groups | with /g → all strings, no groups
  matchAll(re)       → iterator of ALL matches WITH groups (requires /g)
  replace(re, str|fn)→ first match | with /g → all
  replaceAll(str,rep)→ all literal matches
  Named groups: (?<name>...)  → match.groups.name
  Replace with named: '$<name>' in replacement string
  ⚠️ /g + test() alternates true/false — use without g for pure test
```

> **Your next action:** Open a REPL, type `[1,2,3,4,5].reduce((acc,n) => ({ ...acc, [n]: n*n }), {})` and see reduce build an object. One live experiment beats a paragraph of reading.

> "Doing one small thing beats opening a feed."
