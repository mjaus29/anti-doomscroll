# 3 — git bisect + git blame + log --follow + git grep

---

## T — TL;DR

**`git bisect`** binary-searches history to find the commit that introduced a bug. **`git blame`** shows who last modified each line and when. **`log --follow`** tracks a file through renames. **`git grep`** searches the contents of tracked files. Together they answer "who changed what, when, and why."

---

## K — Key Concepts

```bash
# ── git bisect ────────────────────────────────────────────────────────────
git bisect start
git bisect bad                    # current commit is bad (has the bug)
git bisect good v1.2.0            # this tag/SHA was good

# Git checks out the midpoint — test your code
# If bug present:
git bisect bad
# If bug absent:
git bisect good
# Repeat until Git identifies the exact commit:
# abc1234 is the first bad commit

git bisect reset                  # return to original HEAD

# ── Automated bisect ──────────────────────────────────────────────────────
git bisect start HEAD v1.0.0      # bad=HEAD good=v1.0.0
git bisect run npm test           # run test suite automatically each step
# Git runs npm test at each midpoint:
#   exit 0 = good, exit 1-127 = bad, exit 125 = skip (untestable)
git bisect log                    # view bisect session log
git bisect reset
```

```bash
# ── git blame ─────────────────────────────────────────────────────────────
git blame src/auth/login.ts           # show each line with last commit + author
git blame -L 40,60 src/auth/login.ts  # only lines 40-60
git blame -w src/auth/login.ts         # ignore whitespace changes
git blame --since="6 months ago" src/auth/login.ts
git blame -C src/auth/login.ts         # detect moved/copied lines

# Output format:
# abc1234 (Mark Austria 2024-03-15 14:22:01 +0800 42) export function login() {
# ^= first commit  person  date+time  timezone  line  code

# ── log --follow ──────────────────────────────────────────────────────────
git log --follow src/auth/login.ts   # history even through renames
git log --follow -p src/auth/login.ts  # with full diff at each commit
# Without --follow: stops when file was renamed
# With --follow: continues back through rename history

# ── git grep ──────────────────────────────────────────────────────────────
git grep "getUser"                     # search tracked files for string
git grep -n "getUser"                  # with line numbers
git grep -l "getUser"                  # list files only (not the lines)
git grep -i "getuser"                  # case-insensitive
git grep "function.*Auth" --and        # regex
git grep "TODO" -- '*.ts'              # only .ts files
git grep "getUser" HEAD~5              # search at a specific commit
git grep "getUser" main feature/auth   # search across multiple branches/commits
```

---

## W — Why It Matters

- `git bisect run npm test` on a 1000-commit history finds the bad commit in ~10 steps — binary search reduces O(n) manual search to O(log n). On a large repo, this is hours vs minutes.
- `git blame` before deleting or changing code shows the last person to touch it and the original commit message — the PR link in the message usually explains the context better than the code itself.
- `git grep` searches only tracked files (skipping `node_modules`, `dist`, `.git`) — faster and more precise than `grep -r` or IDE search which includes everything.

---

## I — Interview Q&A

### Q: How does `git bisect` work and when would you use it?

**A:** `git bisect` performs a binary search through commit history to find the exact commit that introduced a regression. You mark the current state as `bad` (bug present) and an older known-good state as `good`. Git checks out the midpoint commit — you test whether the bug exists and mark it `bad` or `good`. Git bisects again from the new midpoint. After ~log₂(N) steps, Git identifies the exact first-bad commit. Use it when: a bug exists now but didn't exist in a previous version, you don't know which commit caused it, and the history between good and bad is too large to inspect manually. `git bisect run <test-script>` automates the process entirely.

---

## C — Common Pitfalls + Fix

### ❌ `git blame` misleads — shows last trivial change, not original author

```bash
# ❌ Blame shows a whitespace cleanup commit — not the original logic author
git blame src/user.ts   # every line: "formatting: run prettier" — unhelpful

# ✅ Ignore whitespace commits
git blame -w src/user.ts   # -w ignores whitespace-only changes

# ✅ Check the actual commit content
git show abc1234   # always verify blame's commit is meaningful

# ✅ Use git log for fuller picture
git log --follow -p -- src/user.ts  # full history with diffs per commit
```

---

## K — Coding Challenge + Solution

### Challenge

Use `git bisect run` to find which commit broke a test. Then use `git blame` + `git show` to understand the context of the buggy line.

### Solution

```bash
# 1. Automated bisect with test runner
git bisect start
git bisect bad HEAD          # current: test fails
git bisect good v2.0.0       # v2.0.0: test passed

# Automated: run test for each midpoint
git bisect run sh -c "npm test -- --testNamePattern='auth login' --silent 2>/dev/null"
# Git binary searches ~6-8 rounds across hundreds of commits
# Output: abc1234 is the first bad commit

git bisect reset             # return to HEAD

# 2. Inspect the bad commit
git show abc1234             # read the full diff + message
git show abc1234 --stat      # just files changed

# 3. Blame the specific failing line
git blame -L 45,55 src/auth/login.ts
# def5678 (Alice Chen 2024-09-01 10:14:22 +0800 48)   if (user.active) {

# 4. Read Alice's commit for context
git show def5678
# "refactor(auth): use user.active flag instead of status === 'active'"
# → Found it: user.active was added in def5678 but the field doesn't exist
#   in the test's mock user object

# 5. Search for all usages of the new field
git grep -n "user\.active" -- '*.ts'
```

---

---
