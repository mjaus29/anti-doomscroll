# 7 — Template Literals and String Methods

---

## T — TL;DR

Template literals (backtick strings) enable multi-line strings, expression interpolation, and tagged templates. JavaScript strings are immutable — every method returns a new string. Know the ten most useful string methods: `trim`, `split`, `includes`, `startsWith`, `endsWith`, `replace`, `replaceAll`, `slice`, `padStart`, `repeat`.

---

## K — Key Concepts

```javascript
// ── Template literals ─────────────────────────────────────────────────────
const name = 'Mark'
const age  = 28

// Expression interpolation
const msg = `Hello, ${name}! You are ${age} years old.`
// 'Hello, Mark! You are 28 years old.'

// Any expression inside ${}
const result = `${2 + 2}`           // '4'
const upper  = `${name.toUpperCase()}`  // 'MARK'
const cond   = `Status: ${age >= 18 ? 'adult' : 'minor'}`

// Multi-line strings (no \n needed)
const html = `
  <div>
    <h1>${name}</h1>
  </div>
`.trim()

// Nested template literals
const items = ['a', 'b', 'c']
const list  = `Items: ${items.map(i => `[${i}]`).join(', ')}`
// 'Items: [a], [b], [c]'
```

```javascript
// ── Essential string methods ──────────────────────────────────────────────
const str = '  Hello, World!  '

// Whitespace
str.trim()             // 'Hello, World!'
str.trimStart()        // 'Hello, World!  '
str.trimEnd()          // '  Hello, World!'

// Case
'hello'.toUpperCase()  // 'HELLO'
'WORLD'.toLowerCase()  // 'world'

// Search
'hello'.includes('ell')       // true
'hello'.startsWith('hel')     // true
'hello'.endsWith('llo')       // true
'hello'.indexOf('l')          // 2 (first occurrence)
'hello'.lastIndexOf('l')      // 3 (last occurrence)
'hello'.indexOf('z')          // -1 (not found)

// Extract
'hello world'.slice(6)        // 'world'
'hello world'.slice(0, 5)     // 'hello'
'hello world'.slice(-5)       // 'world' (from end)
'hello'.at(-1)                // 'o' (last character, ES2022)

// Replace
'hello world'.replace('world', 'JS')         // 'hello JS' (first match only)
'aababc'.replaceAll('a', 'x')               // 'xxbxbc' (all matches)
'hello'.replace(/[aeiou]/g, '*')            // 'h*ll*' (regex replace)

// Split and join
'a,b,c'.split(',')             // ['a', 'b', 'c']
'hello'.split('')              // ['h', 'e', 'l', 'l', 'o']
['a', 'b', 'c'].join('-')      // 'a-b-c'

// Pad and repeat
'5'.padStart(3, '0')           // '005' (useful for zero-padding IDs)
'5'.padEnd(3, '0')             // '500'
'ab'.repeat(3)                 // 'ababab'

// Match with regex
'2025-06-15'.match(/(\d{4})-(\d{2})-(\d{2})/)
// ['2025-06-15', '2025', '06', '15', index: 0, ...]
```

```javascript
// ── String immutability ───────────────────────────────────────────────────
const s = 'hello'
s[0] = 'H'          // silently fails — strings are immutable
console.log(s)      // still 'hello'

// Every method returns a NEW string:
const original = 'hello'
const upper    = original.toUpperCase()
console.log(original)  // 'hello' — unchanged
console.log(upper)     // 'HELLO' — new string
```

---

## W — Why It Matters

- Template literals replace string concatenation — `'Hello, ' + name + '!'` is harder to read and easier to mess up than `` `Hello, ${name}!` ``. Always prefer template literals for strings with variables.
- `replace` without `g` flag only replaces the first match — `'aaa'.replace('a', 'x')` gives `'xaa'`, not `'xxx'`. Use `replaceAll` or `/pattern/g` regex for all matches.
- `padStart(2, '0')` is the clean way to format dates and times — `String(hours).padStart(2, '0')` gives `'09'` for `9`, `'12'` for `12`.

---

## I — Interview Q&A

### Q: How do you reverse a string in JavaScript?

**A:** Split into an array, reverse the array, join back:

```javascript
const reversed = str.split('').reverse().join('')
```

This works for ASCII strings. For strings with Unicode characters or emoji, use:

```javascript
const reversed = [...str].reverse().join('')
// Spread operator respects Unicode code points (emoji, accented chars)
```

---

## C — Common Pitfalls + Fix

### ❌ `replace` only replaces the first match

```javascript
// ❌ Only replaces first 'world'
'world world'.replace('world', 'JS')       // 'JS world'

// ✅ replaceAll replaces all matches
'world world'.replaceAll('world', 'JS')    // 'JS JS'

// ✅ regex with g flag
'world world'.replace(/world/g, 'JS')     // 'JS JS'
```

---

## K — Coding Challenge + Solution

### Challenge

Write a `formatSlug(text)` function that: lowercases the text, trims whitespace, replaces all spaces with `-`, removes any character that is not a letter, digit, or hyphen, and collapses multiple consecutive hyphens into one.

### Solution

```javascript
function formatSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(' ', '-')
    .replace(/[^a-z0-9-]/g, '')  // remove invalid chars
    .replace(/-{2,}/g, '-')       // collapse multiple hyphens
}

console.log(formatSlug('  Hello, World!  '))  // 'hello-world'
console.log(formatSlug('Node.js & TypeScript'))  // 'nodejs-typescript'
console.log(formatSlug('My  Post  Title'))    // 'my-post-title'
```

---

---
