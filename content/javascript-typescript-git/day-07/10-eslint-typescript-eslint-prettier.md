# 10 — ESLint, @typescript-eslint, Prettier

---

## T — TL;DR

**ESLint** catches code quality issues. **`@typescript-eslint`** adds TypeScript-aware rules that use the type checker. **Prettier** enforces consistent formatting (automatically — no debates). They serve different roles: ESLint = correctness and code smells; Prettier = formatting. Run them together in pre-commit hooks and CI.

---

## K — Key Concepts

```bash
# ── Installation ──────────────────────────────────────────────────────────
npm install --save-dev \
  eslint \
  @eslint/js \
  typescript-eslint \
  prettier \
  eslint-config-prettier \
  @types/eslint__js
```

```javascript
// eslint.config.mjs — flat config (ESLint 9+, TypeScript-eslint v8)
import eslint      from '@eslint/js'
import tseslint    from 'typescript-eslint'
import prettier    from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,   // strictest TS rules
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,              // use tsconfig.json for type info
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-explicit-any':          'error',
      '@typescript-eslint/no-floating-promises':     'error',  // await all promises
      '@typescript-eslint/no-misused-promises':      'error',  // no async in wrong places
      '@typescript-eslint/consistent-type-imports':  ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',  // ?? over ||

      // General rules
      'no-console':          ['warn', { allow: ['warn', 'error'] }],
      'prefer-const':        'error',
      'no-var':              'error',
      'eqeqeq':             ['error', 'always'],
      'no-unused-vars':      'off',   // use @typescript-eslint version instead
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Disable formatting rules — Prettier handles those
  prettier,

  // Ignore patterns
  { ignores: ['dist/**', 'node_modules/**', '**/*.js'] }
)
```

```json
// .prettierrc
{
  "semi":          false,
  "singleQuote":   true,
  "trailingComma": "all",
  "printWidth":    100,
  "tabWidth":      2,
  "arrowParens":   "avoid",
  "endOfLine":     "lf"
}
```

```json
// package.json scripts
{
  "scripts": {
    "lint":         "eslint src --max-warnings 0",
    "lint:fix":     "eslint src --fix",
    "format":       "prettier --write src",
    "format:check": "prettier --check src",
    "typecheck":    "tsc --noEmit"
  }
}
```

```bash
# ── lint-staged + husky — pre-commit hook ────────────────────────────────
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json — lint-staged config
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```
// .husky/pre-commit
npx lint-staged
```

```typescript
// ── Key rules explained ────────────────────────────────────────────────────

// no-floating-promises — forget await → silent failures
async function saveUser() { ... }
saveUser()          // ❌ floating promise — error goes unhandled
await saveUser()    // ✅

// no-misused-promises — async in event handler without await
button.addEventListener('click', async () => {
  await saveUser()  // ✅ ESLint warns if the return Promise is mishandled
})

// consistent-type-imports — enforce import type
import { User } from './types'       // ❌ if User is type-only
import type { User } from './types'  // ✅ erased at compile time, safer with bundlers

// switch-exhaustiveness-check — enforces all union cases are handled
type Color = 'red' | 'green' | 'blue'
function handle(c: Color) {
  switch (c) {
    case 'red':   return 1
    case 'green': return 2
    // ❌ ESLint error: switch is not exhaustive — 'blue' not handled ✅
  }
}
```

---

## W — Why It Matters

- `@typescript-eslint/no-floating-promises` catches one of the most dangerous async bugs — `saveUser()` without `await` means the promise rejection is never caught, errors disappear silently. This rule makes it a lint error.
- Prettier eliminates all formatting debates — it's opinionated and non-configurable about most things. Teams stop wasting time on code review comments about semicolons, trailing commas, and indentation.
- `eslint-config-prettier` disables ESLint formatting rules that conflict with Prettier — without this, ESLint and Prettier fight each other in pre-commit hooks and CI.

---

## I — Interview Q&A

### Q: What is the difference between ESLint and Prettier, and how do they work together?

**A:** ESLint is a linter — it analyses code for correctness issues, potential bugs, and code smells. With `@typescript-eslint`, it can use type information to catch issues like floating promises, misused async functions, and type inconsistencies. Prettier is a code formatter — it rewrites code to a consistent style (indentation, quotes, trailing commas, line length) without any logic about correctness. They complement each other: ESLint for "is this code correct and consistent with team conventions?"; Prettier for "does this code look the same regardless of who wrote it?" They work together via `eslint-config-prettier`, which disables ESLint's formatting rules so only Prettier handles formatting.

---

## C — Common Pitfalls + Fix

### ❌ ESLint and Prettier fighting — conflicting rules

```javascript
// ❌ ESLint wants double quotes; Prettier wants single quotes
// Both run on save — infinite loop of changes

// ✅ Add eslint-config-prettier — disables all ESLint formatting rules
// eslint.config.mjs:
import prettier from 'eslint-config-prettier'
export default [
  ...tseslint.configs.recommended,
  prettier,   // ← must be LAST — overrides formatting rules ✅
]

// Now: ESLint handles correctness, Prettier handles formatting
// No more conflicts ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete lint + format + typecheck pipeline in `package.json`. Write an ESLint rule configuration that enforces: no `any`, no floating promises, consistent type imports, `??` over `||` for nullish values, and switch exhaustiveness.

### Solution

```javascript
// eslint.config.mjs — complete setup
import eslint   from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any':             'error',
      '@typescript-eslint/no-floating-promises':        'error',
      '@typescript-eslint/no-misused-promises':         'error',
      '@typescript-eslint/consistent-type-imports':     ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/prefer-nullish-coalescing':   'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars':              ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var':       'error',
    },
  },
  prettier,
  { ignores: ['dist/**', '*.js', '*.mjs'] }
)
```

```json
// package.json — full pipeline
{
  "scripts": {
    "dev":          "tsx watch src/index.ts",
    "build":        "tsc --project tsconfig.build.json",
    "start":        "node dist/index.js",
    "typecheck":    "tsc --noEmit",
    "lint":         "eslint src --max-warnings 0",
    "lint:fix":     "eslint src --fix",
    "format":       "prettier --write src",
    "format:check": "prettier --check src",
    "check":        "npm run typecheck && npm run lint && npm run format:check"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings 0"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## ✅ Day 7 Complete — TypeScript Foundations & Project Setup

| # | Subtopic | Status |
|---|----------|--------|
| 1 | TypeScript Purpose — Static Checking, Tooling, Gradual Adoption | ☐ |
| 2 | tsc and tsconfig.json — Core Options | ☐ |
| 3 | Strict Mode Options | ☐ |
| 4 | Primitive Types, any, unknown, never, void | ☐ |
| 5 | Annotations and Inference, Promise\<T\> | ☐ |
| 6 | Type Alias vs Interface, Unions, Intersections | ☐ |
| 7 | Optional/Readonly, Literal Types, const assertions | ☐ |
| 8 | keyof, typeof in Type Position, Tuples | ☐ |
| 9 | ts-node, tsx, Running TypeScript Directly | ☐ |
| 10 | ESLint, @typescript-eslint, Prettier | ☐ |

---

## 🗺️ One-Page Mental Model — Day 7

```
TYPESCRIPT PURPOSE
  Superset of JS → all JS is valid TS | types erased at compile time
  Catches: wrong types, missing props, null dereference, bad calls
  Does NOT catch: wrong API shapes, runtime data, logic bugs
  Value: editor autocomplete + refactoring + living documentation
  Gradual: rename .js → .ts | use // @ts-check for light checking

TSCONFIG ESSENTIALS
  strict: true          → enable ALL safety checks (required)
  target: ES2022        → output JS version
  module: NodeNext      → ESM for Node.js (pair with moduleResolution)
  moduleResolution: NodeNext | Bundler | node (must match module)
  esModuleInterop: true → default imports from CJS modules
  noEmit: true          → type-check only (for bundler projects)
  noEmitOnError: true   → don't emit broken JS
  skipLibCheck: true    → skip d.ts in node_modules (faster)
  verbatimModuleSyntax  → enforce import type for type-only imports
  noUncheckedIndexedAccess → arr[0] is T | undefined (not T)

STRICT FLAGS
  strictNullChecks         → null/undefined not assignable (most important)
  noImplicitAny            → must annotate untyped params
  strictPropertyInitialization → class props must be set in constructor
  noImplicitReturns        → all code paths must return
  noFallthroughCasesInSwitch → no accidental fall-through
  useUnknownInCatchVariables → catch err is unknown, not any
  noUncheckedIndexedAccess → array/record access returns T | undefined

TYPE SYSTEM
  Primitives: string number boolean bigint symbol undefined null
  Use LOWERCASE (string, not String)
  any:     escape hatch — avoid, propagates, disables checking
  unknown: safe top type — must narrow before using
  never:   impossible type — exhaustiveness, always-throw functions
  void:    no meaningful return — callbacks can still return values
  object:  non-primitive — avoid, too broad | use {} = any non-null

ANNOTATIONS vs INFERENCE
  Infer:  local variables, array method callbacks, obvious assignments
  Annotate: function params (always), public return types, empty arrays
  async fn: Promise<T> | top-level await in ESM modules ✅

TYPE ALIAS vs INTERFACE
  type:      unions, computed, tuples, mapped, conditional types
  interface: object shapes, class implements, declaration merging
  Both work for object shapes; use type for most, interface for class contracts

UNIONS + INTERSECTIONS
  T | U   → one of T or U | discriminated union: narrow via switch(tag)
  T & U   → all of T and U | composing types without conflicts
  Discriminated union: common 'kind'/'status' field for type narrowing

MODIFIERS + LITERALS
  optional ?: property may be absent (T | undefined)
  readonly:   prevents reassignment after init (shallow)
  'literal':  exact string/number type (not string/number)
  as const:   makes all values literals + deeply readonly
  typeof OBJ[keyof typeof OBJ] → derive union from const object ✅

KEYOF + TYPEOF
  keyof T:      'prop1' | 'prop2' | ... (union of all keys)
  T[K]:         type of T's property K (indexed access)
  typeof value: extract type from a value (DRY — no separate interface)
  <T, K extends keyof T>(obj: T, key: K): T[K] → type-safe property access
  Tuple: [T1, T2] fixed-length, fixed-type | named: [a: T1, b: T2]

RUNNING TS
  tsx src/index.ts      → fast (esbuild), no type-check — for dev/scripts
  ts-node src/index.ts  → slow (tsc), type-checks — for strict execution
  tsc --noEmit          → type-check only (CI) — always run in CI pipeline
  tsc outDir/           → production build → node dist/index.js

TOOLING
  ESLint:           code quality + correctness
  @typescript-eslint: TS-aware rules (no-floating-promises, no-any, etc.)
  Prettier:         formatting only — no debates
  eslint-config-prettier: disable ESLint formatting rules ← must be last
  lint-staged + husky: run lint+format on commit only on changed files
  Key rules: no-floating-promises | no-misused-promises | consistent-type-imports
             switch-exhaustiveness-check | prefer-nullish-coalescing
```

> **Your next action:** Run `npx tsc --init` in any JavaScript project folder, open the generated `tsconfig.json`, uncomment `"strict": true`, rename one `.js` file to `.ts`, and see what errors appear. Five minutes of live errors teaches more than rereading this page.

> "Doing one small thing beats opening a feed."
