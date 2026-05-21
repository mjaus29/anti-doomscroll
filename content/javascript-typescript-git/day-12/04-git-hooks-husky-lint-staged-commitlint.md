# 4 — Git Hooks + Husky + lint-staged + commitlint

---

## T — TL;DR

**Git hooks** run scripts at specific Git events (pre-commit, commit-msg, pre-push). **Husky** manages hooks as project config (committed, shared across team). **lint-staged** runs linters only on staged files (fast). **commitlint** enforces Conventional Commit format. Together they prevent bad code and bad commits from entering the repo.

---

## K — Key Concepts

```bash
# ── Native git hooks ──────────────────────────────────────────────────────
# Hooks live in .git/hooks/ — not committed, not shared
ls .git/hooks/
# pre-commit, commit-msg, pre-push, post-commit, post-merge...

# Example: .git/hooks/pre-commit (must be executable: chmod +x)
#!/bin/sh
npm run lint && npm run typecheck
# Runs on every commit — if exits non-zero, commit aborted

# ── Husky — shared hooks as project config ────────────────────────────────
npm install --save-dev husky
npx husky init           # creates .husky/ directory + adds prepare script

# .husky/pre-commit:
npm run lint-staged

# .husky/commit-msg:
npx --no -- commitlint --edit $1

# .husky/pre-push:
npm run typecheck

# package.json prepare script (runs on npm install):
{
  "scripts": {
    "prepare": "husky"   # installs hooks automatically for new team members
  }
}
```

```json
// ── lint-staged — run linters only on staged files ────────────────────────
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{js,mjs,cjs}": [
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.ts": [
      "bash -c 'tsc --noEmit'"
    ]
  }
}
```

```js
// ── commitlint — enforce Conventional Commits ────────────────────────────
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'perf', 'ci', 'build', 'revert'
    ]],
    'scope-enum': [1, 'always', [    // 1 = warning (not error)
      'auth', 'api', 'db', 'ui', 'deps', 'config'
    ]],
    'subject-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 200],
  }
}
```

```bash
# ── Installation in one go ────────────────────────────────────────────────
npm install --save-dev husky lint-staged commitlint @commitlint/config-conventional
npx husky init

# .husky/pre-commit (auto-created by husky init — modify it):
echo "npx lint-staged" > .husky/pre-commit

# .husky/commit-msg:
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg

# Test commitlint:
echo "bad commit message" | npx commitlint   # exits 1 — invalid ✅
echo "feat(auth): add login" | npx commitlint  # exits 0 — valid ✅
```

---

## W — Why It Matters

- `lint-staged` is what makes pre-commit hooks fast enough to be practical — running ESLint + Prettier on all 10,000 files takes 30 seconds; running it only on 3 staged files takes 0.3 seconds. Without it, developers disable hooks.
- `commitlint` enables `semantic-release` to work correctly — if commits aren't in Conventional format, the automated release tool can't determine version bumps. Enforcing at commit time prevents broken release pipelines.
- Husky's `prepare` script means every developer who runs `npm install` automatically gets the hooks — no "but I don't have the hooks" exceptions on the team.

---

## I — Interview Q&A

### Q: What is the purpose of `lint-staged` and why use it over running the full linter in a hook?

**A:** `lint-staged` runs configured linters/formatters only on files that are currently staged for commit (tracked by `git add`). Running the full linter on every pre-commit hook is slow on large codebases — it processes every file in the project even when only 1-2 files changed. `lint-staged` narrows the scope to only staged files, making hooks run in under a second instead of tens of seconds. This speed difference is critical — slow hooks get disabled by developers under pressure. `lint-staged` also automatically passes only the staged file paths to tools like Prettier, so they only modify relevant files.

---

## C — Common Pitfalls + Fix

### ❌ Hooks not running for new team members

```bash
# ❌ Hooks are in .git/hooks/ which isn't committed
# New team member: git clone → npm install → no hooks
git commit -m "bad format"   # passes — hooks missing ❌

# ✅ Use Husky with prepare script
# package.json:
# "scripts": { "prepare": "husky" }
# npm install → runs prepare → installs Husky hooks ✅

# ✅ Verify hooks are installed
ls .husky/          # pre-commit, commit-msg, pre-push
cat .husky/pre-commit  # npx lint-staged

# ✅ Skip hooks when needed (with justification)
git commit --no-verify -m "chore: emergency deploy"
# Document WHY you skipped in commit body
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a complete Husky + lint-staged + commitlint stack for a TypeScript project. Include pre-commit (format + lint), commit-msg (conventional), and pre-push (typecheck + test).

### Solution

```bash
# Install
npm install --save-dev husky lint-staged commitlint @commitlint/config-conventional
npx husky init
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --max-warnings 0",
    "test": "vitest run"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
npx lint-staged

# .husky/commit-msg
#!/bin/sh
npx --no -- commitlint --edit $1

# .husky/pre-push
#!/bin/sh
echo "Running pre-push checks..."
npm run typecheck && npm test -- --run
```

```js
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat','fix','docs','style','refactor','test','chore','perf','ci','build','revert'
    ]],
    'subject-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', 'lower-case'],
  }
}
```

---

---
