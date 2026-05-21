# 4 — push, --force-with-lease, push tracking

---

## T — TL;DR

`git push` uploads local commits to a remote. **`--force-with-lease`** is the safe force-push: it only overwrites if the remote matches what you last fetched — preventing overwriting teammates' commits. Always prefer it over `--force`.

---

## K — Key Concepts

```bash
# ── git push ──────────────────────────────────────────────────────────────
git push                           # push current branch to its tracking remote
git push origin main               # explicit: push local main to origin/main
git push origin feature/auth       # push a specific branch
git push -u origin feature/auth    # push + set tracking (first push of branch)
git push origin --all              # push all local branches
git push origin --tags             # push all tags (annotated + lightweight)

# Push to a differently-named remote branch
git push origin local-name:remote-name
git push origin feature:main       # push local 'feature' to remote 'main'

# Delete remote branch
git push origin --delete feature/old
git push origin :feature/old       # same: empty local = delete remote

# ── --force vs --force-with-lease ────────────────────────────────────────
git push --force origin main
# Unconditionally overwrites remote — dangerous if teammate pushed since your fetch

git push --force-with-lease origin main
# Overwrites remote ONLY IF remote tip matches your remote-tracking ref
# If someone pushed since you last fetched → rejected with error ✅

# Example of protection:
# Your origin/main: abc123
# Remote main:      abc123 ← def456 (teammate pushed def456 while you rebased)
# --force-with-lease: rejected! Remote has def456 you haven't seen ✅
# --force: overwrites, deletes def456 from remote ❌

# ── push.default ─────────────────────────────────────────────────────────
git config --global push.default current    # push to same-named remote branch
git config --global push.default simple     # push to tracking branch (default in Git 2+)
# 'current' is safest — always pushes to the branch of the same name
```

---

## W — Why It Matters

- `--force-with-lease` over `--force` should be a non-negotiable team rule — one accidental `--force` on a shared branch can silently delete teammates' commits. `--force-with-lease` makes this impossible if you've fetched recently.
- `push.default current` prevents the cryptic "The current branch has no upstream branch" error and always pushes to a sensibly named remote branch without remembering the exact remote name.
- Setting `-u` on the first push of a feature branch means every subsequent `git push` and `git pull` on that branch works without arguments — saves dozens of keystrokes per day.

---

## I — Interview Q&A

### Q: What is the difference between `--force` and `--force-with-lease`?

**A:** `--force` overwrites the remote branch regardless of its current state — it's destructive because if a teammate pushed since your last fetch, their commits are permanently deleted from the remote. `--force-with-lease` checks that the remote branch tip matches your remote-tracking reference before overwriting. If someone else pushed in the meantime, Git rejects the push with an error, prompting you to `git fetch` first and decide how to handle the divergence. In practice: always use `--force-with-lease` for force pushes (typically needed after rebasing a branch that was already pushed). The only case for `--force` is when you specifically want to override even remote changes you haven't fetched.

---

## C — Common Pitfalls + Fix

### ❌ Force push to `main` — deletes teammates' work

```bash
# ❌ Rebased main, now need to force push
git rebase -i HEAD~5   # rewrote history on main
git push --force origin main   # ❌ destroys any commits teammates pushed

# ✅ Never rebase shared branches (main, develop)
# Only rebase your own feature branches

# ✅ If you must force push a feature branch (after rebase):
git push --force-with-lease origin feature/my-branch
# Fails if teammate pushed since your last fetch ✅

# ✅ Add an alias for safety
git config --global alias.fpush "push --force-with-lease"
git fpush origin feature/my-branch
```

---

## K — Coding Challenge + Solution

### Challenge

Write the complete rebase-then-push workflow for a feature branch, using `--force-with-lease`, and show how to push to a GitHub remote with branch protection that requires a PR.

### Solution

```bash
# Feature branch workflow with rebase + safe push

# 1. Start feature
git switch -c feature/payment-api
# ... commits ...
git push -u origin feature/payment-api   # set tracking on first push

# 2. Keep up with main during development
git fetch origin
git rebase origin/main                   # replay feature commits on latest main
git push --force-with-lease origin feature/payment-api  # update remote

# 3. Prepare for PR: clean up history
git rebase -i origin/main   # squash WIP commits, fix messages
git push --force-with-lease origin feature/payment-api

# 4. Branch protection on main (GitHub setting — no direct push allowed)
git push origin main   # rejected: required status checks + PR review ✅
# Must open PR: feature/payment-api → main

# 5. After PR merged on GitHub (squash merge)
git switch main
git pull origin main        # get the squashed commit
git branch -d feature/payment-api
git push origin --delete feature/payment-api   # clean up remote
```

---

---
