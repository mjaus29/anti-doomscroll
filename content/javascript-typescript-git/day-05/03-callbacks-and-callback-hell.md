# 3 — Callbacks and Callback Hell

---

## T — TL;DR

**Callbacks** are functions passed as arguments to be called later — the original async pattern. They work but create **callback hell** (nested pyramids) when sequencing async operations: hard to read, impossible to handle errors cleanly, no way to use `try/catch`. Promises and `async/await` exist specifically to solve this.

---

## K — Key Concepts

```javascript
// ── Basic callback pattern ────────────────────────────────────────────────
function loadUser(id, callback) {
  setTimeout(() => {
    if (id <= 0) return callback(new Error('Invalid id'), null)
    callback(null, { id, name: 'Mark' })   // Node.js convention: (err, result)
  }, 100)
}

// Error-first callback (Node.js convention)
loadUser(1, (err, user) => {
  if (err) return console.error(err)
  console.log(user)   // { id: 1, name: 'Mark' }
})
```

```javascript
// ── Callback hell — the pyramid of doom ───────────────────────────────────
// ❌ Sequencing three dependent async operations with callbacks
getUser(userId, (err, user) => {
  if (err) return handleError(err)
  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err)
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return handleError(err)
      getShipment(details.shipmentId, (err, shipment) => {
        if (err) return handleError(err)
        // Finally use the data — 4 levels deep ❌
        console.log(shipment)
      })
    })
  })
})

// Problems:
// - Unreadable nesting (pyramid shape)
// - Error handling repeated at every level
// - Impossible to use try/catch
// - Can't return values up the chain
// - Can't easily run operations in parallel
```

```javascript
// ── Partially fixing with named functions ──────────────────────────────────
// ✅ Slightly better — but error handling still scattered
function handleUser(err, user) {
  if (err) return handleError(err)
  getOrders(user.id, handleOrders)
}
function handleOrders(err, orders) {
  if (err) return handleError(err)
  getOrderDetails(orders[0].id, handleDetails)
}

getUser(userId, handleUser)   // reads linearly but still hard to follow ❌
```

```javascript
// ── Converting a callback-based function to a Promise ─────────────────────
// util.promisify (Node.js) does this automatically
import { promisify } from 'util'
const readFile = promisify(fs.readFile)   // now returns a Promise

// Manual promisification
function promisifyCallback(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }
}

const loadUserAsync = promisifyCallback(loadUser)
loadUserAsync(1).then(user => console.log(user))
```

---

## W — Why It Matters

- Callback hell is still in production codebases, third-party SDKs, and legacy Node.js code — recognising the pattern and knowing how to promisify it is an active skill.
- The Node.js error-first convention `(err, result)` is pervasive in `fs`, `crypto`, `http` module callbacks — always check `err` before using `result`.
- `util.promisify` is the correct tool for converting Node.js core callbacks to Promises — don't manually promisify `fs.readFile` when Node.js provides it built-in.

---

## I — Interview Q&A

### Q: What is callback hell and how do you solve it?

**A:** Callback hell is deeply nested callback functions required to sequence async operations — each step depends on the previous, creating a rightward pyramid. Problems: unreadable nesting, error handling repeated at every level, no `try/catch`, no return values. Solutions in order of preference: (1) **Promises** — chain `.then()` calls horizontally instead of nesting; error propagates to one `.catch()`. (2) **async/await** — write async code that looks synchronous, use `try/catch` for errors. (3) **Named functions** — extract each callback to a named function to flatten nesting (workaround, not a fix). (4) **util.promisify** — convert Node.js callbacks to Promises.

---

## C — Common Pitfalls + Fix

### ❌ Calling callback twice — once on error and once on success

```javascript
// ❌ Forgetting return — callback called twice
function loadUser(id, cb) {
  if (id <= 0) {
    cb(new Error('Invalid'))   // called once
    // forgot return — continues to success path!
  }
  cb(null, { id })             // called again ❌
}

// ✅ Always return after calling callback
function loadUser2(id, cb) {
  if (id <= 0) return cb(new Error('Invalid'))  // return stops execution ✅
  cb(null, { id })
}
```

---

## K — Coding Challenge + Solution

### Challenge

Convert this callback-hell chain to use Promises (using `promisifyCallback`): fetch user → fetch user's posts → fetch first post's comments.

### Solution

```javascript
// Simulated callback-based API
const api = {
  getUser:     (id, cb) => setTimeout(() => cb(null, { id, name: 'Mark' }), 50),
  getPosts:    (uid, cb) => setTimeout(() => cb(null, [{ id: 10, title: 'Post 1' }]), 50),
  getComments: (pid, cb) => setTimeout(() => cb(null, [{ id: 100, text: 'Nice!' }]), 50),
}

// Promisify
const getUser     = promisifyCallback(api.getUser.bind(api))
const getPosts    = promisifyCallback(api.getPosts.bind(api))
const getComments = promisifyCallback(api.getComments.bind(api))

// Clean chain — no nesting
getUser(1)
  .then(user    => getPosts(user.id))
  .then(posts   => getComments(posts[0].id))
  .then(comments => console.log(comments))   // [{ id:100, text:'Nice!' }]
  .catch(err    => console.error(err))

function promisifyCallback(fn) {
  return (...args) => new Promise((res, rej) =>
    fn(...args, (err, result) => err ? rej(err) : res(result))
  )
}
```

---

---
