# JavaScript / TypeScript / Git Cheat Sheet

A one-page reference of the JavaScript, TypeScript and Git facts worth memorizing from this group.

## JS: Runtime, Node and Tooling

| Concept | Syntax / example | Note |
|---|---|---|
| Global object | `globalThis` | works in browser (`window`) and Node (`global`) |
| Env vars | `process.env.PORT ?? '3000'` | always strings or `undefined` |
| CLI args | `process.argv.slice(2)` | `[0]` node path, `[1]` script path |
| Exit | `process.exit(1)` / `process.exitCode = 1` | non-zero = failure |
| Load `.env` | `import 'dotenv/config'` | commit `.env.example`, never `.env` |
| semver `^1.2.3` | `>=1.2.3 <2.0.0` | minor + patch updates |
| semver `~1.2.3` | `>=1.2.3 <1.3.0` | patch updates only |
| Lockfile | `package-lock.json` | commit it, never delete it; `npm ci` in CI |
| One-off binary | `npx create-vite@latest` | runs without global install |

Lessons: [Runtime Context](/group/javascript-typescript-git/day/01/01-runtime-context-node-js-vs-browser-globalthis) · [process](/group/javascript-typescript-git/day/01/02-node-js-process-env-argv-exit) · [Package Managers](/group/javascript-typescript-git/day/01/03-package-managers-package-json-semver-lockfiles-npm-scripts-npx)

## JS: Values, Types and Operators

| Concept | Remember |
|---|---|
| Declarations | `const` by default, `let` to reassign, never `var` |
| TDZ | `let`/`const` are hoisted but unusable before their line |
| 7 primitives | string, number, bigint, boolean, undefined, null, symbol |
| `typeof null` | `'object'` (historic bug) |
| `==` vs `===` | `==` coerces; always use `===` (`== null` is the one idiom) |
| Falsy values | `false 0 -0 0n '' null undefined NaN` |
| Floats | `0.1 + 0.2 !== 0.3`; compare with `Number.EPSILON` |
| NaN check | `Number.isNaN(x)` (global `isNaN` coerces) |
| Date months | `new Date(2025, 0, 15)` is **January** (0-indexed) |

| Operator | Example | Falls back when left side is |
|---|---|---|
| `??` | `count ?? 10` | `null` / `undefined` only |
| `\|\|` | `name \|\| 'Anon'` | any falsy (`0`, `''` too) |
| `?.` | `user?.address?.city` | short-circuits to `undefined` |
| `??=` / `\|\|=` / `&&=` | `opts.retries ??= 3` | assign only if needed |
| `**`, `1_000_000` | `2 ** 10` | exponent, numeric separator |

Lessons: [var/let/const](/group/javascript-typescript-git/day/01/05-var-vs-let-vs-const-scope-hoisting-tdz) · [Types & Coercion](/group/javascript-typescript-git/day/01/06-primitive-types-typeof-coercion-double-equals-vs-triple-equals) · [Numbers](/group/javascript-typescript-git/day/01/08-number-methods-math-nan-infinity-epsilon) · [Modern Operators](/group/javascript-typescript-git/day/06/10-modern-js-operators)

## JS: Functions, Scope, Closures, this

| Form | Hoisted? | Own `this`/`arguments`? |
|---|---|---|
| `function f() {}` | fully | yes |
| `const f = function () {}` | no (TDZ) | yes |
| `const f = () => {}` | no (TDZ) | no, lexical `this` |

| Call style | `this` is |
|---|---|
| `obj.method()` | `obj` |
| `fn()` plain call | `undefined` in strict mode / modules |
| `new Fn()` | the new object |
| arrow function | `this` of the enclosing scope |
| `fn.call(o, a, b)` / `fn.apply(o, [a, b])` | `o`, invoked now |
| `fn.bind(o)` | `o`, returns a new function |

```js
function createCounter() {
  let count = 0 // private: only the closure sees it
  return { inc: () => ++count, get: () => count }
}
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x)
const add = (a) => (b) => a + b // curried; add(1) is partial
```

| Tool | Behavior | Use for |
|---|---|---|
| Memoize | cache result by input | expensive pure functions |
| Debounce | run N ms after the **last** call | search input |
| Throttle | at most once per N ms | scroll, resize |
| Recursion | base case + smaller step | trees; deep input can overflow the stack |

Lessons: [Closures](/group/javascript-typescript-git/day/02/04-closures-and-private-state) · [this, call/apply/bind](/group/javascript-typescript-git/day/02/08-this-in-all-contexts-call-apply-bind) · [Composition & Currying](/group/javascript-typescript-git/day/02/09-composition-pipe-currying-partial-application) · [Debounce & Throttle](/group/javascript-typescript-git/day/02/10-memoization-debounce-throttle)

## JS: Arrays, Objects, Copying, JSON, Regex

| Mutating | Non-mutating alternative |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `[...arr, x]`, `arr.slice(1)` |
| `splice` | `slice`, `toSpliced` |
| `sort`, `reverse` | `toSorted`, `toReversed`, `[...arr].sort()` |
| `fill`, `arr[i] = x` | `arr.with(i, x)`, `map` |

| Method | Returns |
|---|---|
| `map` / `filter` | new array |
| `reduce(fn, init)` | single value (always pass `init`) |
| `find` / `findIndex` | item or `undefined` / index or `-1` |
| `some` / `every` | boolean |
| `forEach` | `undefined` (side effects only) |

```js
nums.sort((a, b) => a - b) // default sort compares as STRINGS
const { name, role = 'user', ...rest } = user // default + rest
const merged = { ...defaults, ...overrides } // shallow, right wins
const deep = structuredClone(obj) // deep, handles cycles, Map, Date
Object.fromEntries(Object.entries(o).filter(([, v]) => v != null))
Object.hasOwn(o, 'key') // safer than o.hasOwnProperty
```

- JSON: `stringify` drops functions/`undefined`, turns `Date` into a string and `Map`/`Set` into `{}`, throws on `BigInt` and cycles. Extras: `stringify(v, replacer, 2)`, `parse(text, reviver)`.
- Regex: flags `g i m s`; named groups `/(?<year>\d{4})/.exec(s).groups.year`; `matchAll` needs `g`; a `g` regex keeps `lastIndex` between `test()` calls.

Lessons: [Core Array HOFs](/group/javascript-typescript-git/day/03/02-core-array-hofs-map-filter-reduce-find-findindex-some-every) · [Destructuring & Spread](/group/javascript-typescript-git/day/03/07-destructuring-and-spread-rest) · [Shallow vs Deep Copy](/group/javascript-typescript-git/day/03/08-shallow-copy-vs-deep-copy-structuredclone-circular-references) · [JSON](/group/javascript-typescript-git/day/03/09-json-parse-and-json-stringify-replacer-reviver-gotchas)

## JS: Prototypes, Classes, Proxy, Symbols

| Concept | Remember |
|---|---|
| Prototype lookup | own props, then `[[Prototype]]` chain, until `null` |
| Read prototype | `Object.getPrototypeOf(o)` (`__proto__` is legacy) |
| `new Fn()` does | create object, link prototype, run with `this`, return it |
| `class` | sugar over constructor functions + prototypes |
| `super()` | must run before `this` in a subclass constructor |
| `#private` | engine-enforced privacy; `static {}` runs once |
| Proxy | `new Proxy(target, handler)`; traps: `get`, `set`, `has`... |
| `Symbol('x')` | always unique; `Symbol.for('x')` is a global registry |

```js
class Account {
  #balance = 0 // private field
  get balance() { return this.#balance }
  deposit(n) { this.#balance += n }
}
class Savings extends Account {
  constructor() { super(); this.rate = 0.02 } // super() first
}
```

Lessons: [Prototype Chain](/group/javascript-typescript-git/day/04/01-prototype-chain) · [new Internals](/group/javascript-typescript-git/day/04/02-constructor-functions-and-the-new-keyword-internals) · [Private Fields](/group/javascript-typescript-git/day/04/05-getters-setters-public-fields-private-fields-private-methods) · [Proxy](/group/javascript-typescript-git/day/04/07-proxy-traps-and-use-cases)

## JS: Async and the Event Loop

Order: synchronous code, then **all** microtasks, then one macrotask, repeat.

```js
console.log(1)
setTimeout(() => console.log(4)) // macrotask
Promise.resolve().then(() => console.log(3)) // microtask
console.log(2) // prints 1 2 3 4
```

- Microtasks: `.then/.catch/.finally`, `await` continuations, `queueMicrotask`. Macrotasks: `setTimeout`, `setInterval`, I/O.

| Combinator | Resolves when | Rejects when |
|---|---|---|
| `Promise.all` | all fulfil | first rejection (fail fast) |
| `Promise.allSettled` | all settle | never |
| `Promise.race` | first settles | first settles with rejection |
| `Promise.any` | first fulfils | all reject (`AggregateError`) |

```js
for (const id of ids) await save(id) // sequential
await Promise.all(ids.map((id) => save(id))) // parallel
ids.forEach(async (id) => await save(id)) // BUG: not awaited

const ctrl = new AbortController()
const res = await fetch(url, { signal: ctrl.signal })
if (!res.ok) throw new Error(`HTTP ${res.status}`) // fetch won't throw
const data = await res.json()
```

- `new URL(href).searchParams.get('q')`; `localStorage` is per origin, ~5MB, strings only, never secrets; `sessionStorage` dies with the tab.
- Cookies: `HttpOnly` (no JS access), `Secure` (HTTPS only), `SameSite` (CSRF). Async streams: `async function*` + `for await...of`.

Lessons: [Event Loop](/group/javascript-typescript-git/day/05/01-async-mental-model-event-loop-call-stack-web-apis-queues) · [Micro vs Macro](/group/javascript-typescript-git/day/05/02-macrotasks-vs-microtasks-execution-order) · [Combinators](/group/javascript-typescript-git/day/05/05-promise-combinators-all-allsettled-race-any-aggregateerror) · [Sequential vs Parallel](/group/javascript-typescript-git/day/05/07-sequential-vs-parallel-execution-await-in-foreach-pitfall)

## JS: Modules, Errors, Iterators, Collections

| CommonJS | ES Modules |
|---|---|
| `require` / `module.exports` | `import` / `export` |
| synchronous, dynamic | static, async-capable, tree-shakeable |
| default for `.js` without `"type"` | `"type": "module"` or `.mjs` |
| `__dirname` | `import.meta.dirname` / `import.meta.url` |

- Lazy load: `const { fn } = await import('./heavy.js')`. Top-level `await` works in ESM only.
- Prefer named exports; a module is evaluated once, then cached.

```js
class NotFoundError extends Error {
  constructor(resource, options) {
    super(`${resource} not found`, options) // options = { cause }
    this.name = 'NotFoundError'
  }
}
try { await load() } catch (err) {
  if (err instanceof NotFoundError) return null // handle what you can
  throw new Error('load failed', { cause: err }) // rethrow the rest
}
```

- Iterable: has `[Symbol.iterator]()`. Iterator: `next()` returns `{ value, done }`, optional `return()` for cleanup. Generator (`function*`): lazy, `yield*` delegates.

| Collection | Use for |
|---|---|
| `Map` | any key type, insertion order, `.size` |
| `Set` | unique values: `[...new Set(arr)]` |
| `WeakMap` / `WeakSet` | object keys, GC-friendly metadata, not iterable |
| `WeakRef` | weak pointer to a single object |

Lessons: [CJS vs ESM](/group/javascript-typescript-git/day/06/01-commonjs-vs-es-modules) · [Custom Errors](/group/javascript-typescript-git/day/06/04-error-fields-custom-error-classes-aggregateerror) · [Generators](/group/javascript-typescript-git/day/06/08-generators-yield-yield-lazy-evaluation) · [Map/Set/Weak](/group/javascript-typescript-git/day/06/09-map-set-weakmap-weakset-weakref)

## TS: Setup and Core Types

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext", "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true, // arr[0] is T | undefined
    "verbatimModuleSyntax": true, // forces `import type`
    "isolatedModules": true, "skipLibCheck": true
  }
}
```

Match `module` and `moduleResolution`: `NodeNext`/`NodeNext` for Node ESM, `ESNext`/`Bundler` for Vite or Next.

| Type | Meaning |
|---|---|
| `unknown` | safe top type; must narrow before use (prefer over `any`) |
| `any` | turns checking off; avoid |
| `never` | impossible value; exhaustiveness checks |
| `void` | no meaningful return |
| `object` | any non-primitive (avoid `Object` and `{}`) |

- `tsc --noEmit` type-checks only (CI); `tsx file.ts` runs TS fast (esbuild) without type-checking; production runs compiled `.js`.
- ESLint 9 flat config (`eslint.config.mjs`) + typescript-eslint for correctness; Prettier + `eslint-config-prettier` for formatting.

Lessons: [tsconfig](/group/javascript-typescript-git/day/07/02-tsc-and-tsconfig-json-core-compiler-options) · [Strict Options](/group/javascript-typescript-git/day/07/03-strict-mode-options) · [any/unknown/never](/group/javascript-typescript-git/day/07/04-primitive-types-any-unknown-never-void-object) · [ESLint & Prettier](/group/javascript-typescript-git/day/07/10-eslint-typescript-eslint-prettier)

## TS: Shapes, Literals, keyof/typeof

| `type` | `interface` |
|---|---|
| unions, tuples, primitives, mapped/conditional | object shapes |
| cannot be reopened | declaration merging, `extends` |

```ts
type Status = 'idle' | 'loading' | 'error' // literal union
type Point = readonly [x: number, y: number] // tuple
interface User { id: number; name: string; email?: string }

const ROLES = { admin: 'ADMIN', user: 'USER' } as const
type Role = (typeof ROLES)[keyof typeof ROLES] // 'ADMIN' | 'USER'

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

- Annotate parameters and public return types; let inference handle locals.
- `as const` makes values literal and `readonly`. Prefer const objects over `enum`.

Lessons: [type vs interface](/group/javascript-typescript-git/day/07/06-type-alias-vs-interface-unions-intersections) · [Literals & as const](/group/javascript-typescript-git/day/07/07-optional-readonly-properties-literal-types-const-assertions) · [keyof & typeof](/group/javascript-typescript-git/day/07/08-keyof-typeof-in-type-position-tuples) · [Enums vs Const Objects](/group/javascript-typescript-git/day/09/08-enums-vs-const-objects)

## TS: Generics and Type-Level Tools

| Utility | Result |
|---|---|
| `Partial<T>` / `Required<T>` / `Readonly<T>` | all optional / required / readonly |
| `Pick<T, 'a' \| 'b'>` / `Omit<T, 'a'>` | keep / drop keys |
| `Record<K, V>` | object type with keys `K` |
| `Exclude<U, X>` / `Extract<U, X>` | filter union members |
| `NonNullable<T>` | strip `null` / `undefined` |
| `ReturnType<F>` / `Parameters<F>` | function parts |
| `Awaited<T>` | unwrap promises |

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}
type ElementOf<T> = T extends readonly (infer E)[] ? E : never
type ToArray<T> = T extends any ? T[] : never // distributes over unions
type NoDist<T> = [T] extends [any] ? T[] : never // wrap to stop it
```

- Constraints: `<T extends { id: string }>`; defaults: `<T = string>`.
- `const` type parameters (TS 5.0+) keep literal types: `<const T>`.
- Overloads: several signatures, one implementation that handles all.

Lessons: [Generics](/group/javascript-typescript-git/day/08/01-generics-fundamentals) · [Utility Types 1](/group/javascript-typescript-git/day/08/03-utility-types-part-1-partial-required-readonly-record-pick-omit) · [Conditional Types](/group/javascript-typescript-git/day/08/07-conditional-types-distributive-conditional-types) · [Template Literals & infer](/group/javascript-typescript-git/day/08/08-template-literal-types-infer)

## TS: Narrowing and Type Safety

| Narrowing tool | Example |
|---|---|
| `typeof` / `instanceof` / `in` | `if ('email' in u)` |
| Discriminant | `switch (shape.kind)` |
| Type guard | `function isUser(x: unknown): x is User` |
| Assertion fn | `function assertUser(x: unknown): asserts x is User` |
| `satisfies` | check a value against a type, keep the narrow type |

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; side: number }
function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2
    case 'square': return s.side ** 2
    default: { const _never: never = s; return _never } // exhaustive
  }
}
```

| Escape hatch | Prefer |
|---|---|
| `as User` (no runtime check) | validate `unknown` with a guard or Zod |
| `as unknown as T` | red flag: fix the types |
| `@ts-ignore` | `@ts-expect-error` (fails when the error goes away) |
| `value!` | real null check or `?.` |

- External data (`JSON.parse`, `fetch`, `localStorage`) is `unknown` until validated.
- `catch (err)` is `unknown` with `useUnknownInCatchVariables`: check `err instanceof Error`.
- Branded types stop mixing IDs: `type UserId = number & { __brand: 'UserId' }`.
- `.d.ts` = types only; `declare global {}` and module augmentation extend libraries.

Lessons: [Discriminated Unions](/group/javascript-typescript-git/day/09/02-discriminated-unions-exhaustiveness-checking-with-never) · [Type Guards](/group/javascript-typescript-git/day/09/03-user-defined-type-guards-assertion-functions) · [satisfies & Assertions](/group/javascript-typescript-git/day/09/04-satisfies-operator-type-assertions-double-casting-risks) · [Safe JSON Parse](/group/javascript-typescript-git/day/08/10-safe-json-parse-unknown-first-narrowing-runtime-validation)

## Git: Local Basics

Git stores **snapshots**. Objects: blob (file), tree (folder), commit, tag. A branch is a movable pointer; `HEAD` points at your current branch.

| Task | Command |
|---|---|
| Compact history | `git log --oneline --graph --all` |
| Stage hunks | `git add -p` |
| Fix last commit | `git commit --amend` (only if not pushed) |
| Untrack, keep file | `git rm --cached file` |
| Remove untracked | `git clean -n` (dry run) then `git clean -fd` |
| New branch | `git switch -c feature/x` |
| Previous branch | `git switch -` |
| Discard file changes | `git restore file` |
| Unstage | `git restore --staged file` |

| Diff | Compares |
|---|---|
| `git diff` | working tree vs index (unstaged) |
| `git diff --staged` | index vs `HEAD` (what will commit) |
| `git diff HEAD` | everything vs `HEAD` |
| `git diff main...feature` | from common ancestor to `feature` |

Lessons: [Git Mental Model](/group/javascript-typescript-git/day/10/01-git-mental-model) · [Staging Area](/group/javascript-typescript-git/day/10/04-staging-area-add-add-p-commit-amend-no-verify) · [Branch & Switch](/group/javascript-typescript-git/day/10/07-branch-checkout-switch) · [Diff Modes](/group/javascript-typescript-git/day/11/09-diff-modes-shortlog)

## Git: Merge, Rebase, Undo, Recover

| Merge type | History |
|---|---|
| Fast-forward | pointer moves, no merge commit (linear) |
| Three-way | merge commit with two parents |
| Squash (`--squash`) | one new commit, branch commits not kept |
| Rebase | replays commits on a new base; new SHAs, linear |

Golden rule: never rebase (or force-push) commits others already have.

```bash
git rebase -i HEAD~3     # pick, reword, squash, fixup, drop
git reset --soft HEAD~1  # undo commit, keep changes staged
git reset HEAD~1         # --mixed (default): keep changes unstaged
git reset --hard HEAD~1  # discard commit AND uncommitted work
git revert <sha>         # new commit that undoes <sha> (shared branches)
git cherry-pick <sha>    # copy one commit onto current branch
git reflog               # where HEAD has been: recover lost commits
git switch -c rescue <sha-from-reflog>
```

- Conflicts: edit out `<<<<<<<` / `=======` / `>>>>>>>`, `git add`, then `--continue`; `git merge --abort` / `git rebase --abort` to bail out.
- Stash: `git stash push -u -m "wip"` (with untracked); `pop` restores and drops, `apply` keeps it; `git stash branch name` is the safest restore.

Lessons: [Merge Types](/group/javascript-typescript-git/day/10/08-merge-fast-forward-three-way-squash-merge) · [Rebase](/group/javascript-typescript-git/day/10/09-rebase-interactive-rebase) · [Reflog](/group/javascript-typescript-git/day/10/10-head-detached-head-reflog-recovering-lost-commits) · [Reset/Revert/Cherry-pick](/group/javascript-typescript-git/day/11/07-reset-soft-mixed-hard-revert-cherry-pick)

## Git: Remotes and Team Workflow

| Task | Command |
|---|---|
| Download only | `git fetch --prune` (updates `origin/*`, removes stale) |
| Pull style | `git config --global pull.rebase true` |
| First push | `git push -u origin feature/x` |
| Safe force | `git push --force-with-lease` |
| Annotated tag | `git tag -a v1.2.0 -m "Release"` then `git push origin v1.2.0` |
| Find bad commit | `git bisect start`, `bad`, `good <sha>`, `reset` |
| Line history | `git blame file`, `git log --follow file` |
| Second checkout | `git worktree add ../hotfix main` |

| Conventional Commit | Version bump |
|---|---|
| `fix:` / `perf:` | PATCH |
| `feat:` | MINOR |
| `feat!:` or `BREAKING CHANGE:` footer | MAJOR |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:` | none |

- PR merge buttons: squash (one commit per PR), merge commit (all commits + merge), rebase (linear replay).
- GitHub Flow: `main` always deployable, short branches, PR + review + green checks.
- CODEOWNERS auto-requests reviewers; rulesets/branch protection enforce gates.
- Hooks: Husky + lint-staged (pre-commit), commitlint (commit-msg).

Lessons: [Fetch & Prune](/group/javascript-typescript-git/day/11/02-fetch-fetch-prune-tracking-branches) · [force-with-lease](/group/javascript-typescript-git/day/11/04-push-force-with-lease-push-tracking) · [Conventional Commits](/group/javascript-typescript-git/day/12/01-conventional-commits-semantic-versioning-automated-releases) · [Hooks](/group/javascript-typescript-git/day/12/04-git-hooks-husky-lint-staged-commitlint)

## Git: GitHub Actions

```yaml
on: { push: { branches: [main] }, pull_request: {} }
permissions: { contents: read } # least privilege
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<full-commit-sha> # pin 3rd-party actions
      - uses: actions/setup-node@<full-commit-sha>
        with: { node-version: '22', cache: 'npm' } # caches ~/.npm
      - run: npm ci && npm run typecheck && npm run lint && npm test
```

| Concept | Remember |
|---|---|
| Structure | workflow, jobs (parallel by default), steps (sequential) |
| Order between jobs | `needs: [build]` |
| Matrix | `strategy.matrix.node: [20, 22]` |
| Secrets | `${{ secrets.NAME }}`; never echo them |
| Conditions | `if: github.ref == 'refs/heads/main'` |

Lessons: [Actions Structure](/group/javascript-typescript-git/day/12/07-github-actions-structure-triggers-jobs-steps-reusable-workflows) · [Secrets, Matrix, Cache](/group/javascript-typescript-git/day/12/08-github-actions-secrets-env-matrices-cache-concurrency-conditions) · [Full CI Pipeline](/group/javascript-typescript-git/day/12/09-github-actions-full-ci-pipeline-permissions-pinning-actions)

## Gotchas

| ❌ Mistake | ✅ Fix |
|---|---|
| `x == y` comparisons | `===` (except `x == null`) |
| `count \|\| 10` when `0` is valid | `count ?? 10` |
| `[10, 2, 1].sort()` gives `[1, 10, 2]` | `sort((a, b) => a - b)` |
| `{ ...obj }` as a deep copy | `structuredClone(obj)` |
| `arr.forEach(async ...)` expecting to wait | `for...of` + `await` or `Promise.all` |
| `fetch` without checking `res.ok` | `if (!res.ok) throw ...` |
| Passing `obj.method` as a callback loses `this` | arrow wrapper or `.bind(obj)` |
| `throw 'oops'` | `throw new Error('oops', { cause })` |
| Empty `catch {}` swallowing errors | handle known cases, rethrow the rest |
| `JSON.parse(x) as User` | parse to `unknown`, then validate |
| `any` for unknown data | `unknown` + narrowing |
| Missing case in a union `switch` | `never` exhaustiveness check |
| `git push --force` on a shared branch | `--force-with-lease`, or `git revert` |
| `git reset --hard` with uncommitted work | `git stash` first; reflog only saves commits |
| Rebasing a pushed, shared branch | rebase only local work; merge shared work |

## Interview quick answers

**Q:** `var` vs `let` vs `const`?
`var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped with a TDZ; `const` blocks reassignment, not mutation.

**Q:** What is a closure?
A function that keeps access to the variables of the scope it was created in, even after that scope returned.

**Q:** How is `this` decided?
By how the function is called (method, plain, `new`, `call/apply/bind`); arrows take `this` from the enclosing scope.

**Q:** Microtask vs macrotask?
After each macrotask the whole microtask queue (promises) drains, so `.then` runs before `setTimeout(fn, 0)`.

**Q:** `Promise.all` vs `allSettled` vs `any` vs `race`?
All fails fast; allSettled never rejects; any takes the first fulfilment; race takes the first settlement.

**Q:** CommonJS vs ES Modules?
CJS `require` is synchronous and dynamic; ESM `import` is static, tree-shakeable and supports top-level `await`.

**Q:** `unknown` vs `any`?
Both accept anything, but `unknown` forces narrowing before use; `any` disables checking.

**Q:** `type` vs `interface`?
Interfaces describe objects and can merge; type aliases also cover unions, tuples, mapped and conditional types.

**Q:** What are generics for?
Reusable code that keeps the caller's type instead of falling back to `any`.

**Q:** What does `satisfies` do?
Checks a value against a type without widening it, so you keep the precise inferred type.

**Q:** Merge vs rebase?
Merge keeps true history with a merge commit; rebase rewrites your commits onto a new base for a linear history.

**Q:** `reset` vs `revert`?
`reset` moves the branch pointer (rewrites history); `revert` adds an undo commit (safe for shared branches).

**Q:** How do you recover a "lost" commit?
`git reflog`, find the SHA, then `git switch -c rescue <sha>` or `git reset --hard <sha>`.
