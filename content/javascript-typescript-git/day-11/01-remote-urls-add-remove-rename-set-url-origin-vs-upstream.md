# 1 — Remote URLs — add, remove, rename, set-url, origin vs upstream

---

## T — TL;DR

A **remote** is a named pointer to another repository's URL. `origin` is the repo you cloned. `upstream` is the original repo you forked from. Remotes have no special powers — they're just named shortcuts. You can add, rename, remove, and change their URLs freely.

---

## K — Key Concepts

```bash
# ── View remotes ──────────────────────────────────────────────────────────
git remote                   # list remote names
git remote -v                # list names + URLs (fetch and push)
git remote show origin       # detailed info: branches, tracking, status

# ── add ──────────────────────────────────────────────────────────────────
git remote add origin git@github.com:you/repo.git
git remote add upstream git@github.com:original/repo.git
git remote add staging git@heroku.com:myapp.git   # deploy remote

# ── rename ────────────────────────────────────────────────────────────────
git remote rename origin github     # rename for clarity
git remote rename upstream source

# ── remove ────────────────────────────────────────────────────────────────
git remote remove upstream          # removes remote + its tracking branches

# ── set-url ───────────────────────────────────────────────────────────────
# Change HTTPS → SSH (common after initial clone)
git remote set-url origin git@github.com:you/repo.git
# Change repo name after renaming on GitHub
git remote set-url origin git@github.com:you/new-name.git
# Verify
git remote get-url origin
```

```
── origin vs upstream ────────────────────────────────────────────────────────

origin   = your fork or the repo you cloned
           You have WRITE access — push here
           git@github.com:YOUR-USERNAME/repo.git

upstream = the original repo you forked from
           Usually READ-ONLY for you (submit PRs)
           git@github.com:ORIGINAL-OWNER/repo.git

Typical fork workflow:
  clone → sets origin = your fork
  manually add upstream → the original
  fetch upstream → get latest changes
  rebase feature on upstream/main → up to date
  push to origin → your fork
  open PR: origin/feature → upstream/main
```

---

## W — Why It Matters

- Switching from HTTPS to SSH (`set-url`) is a one-time fix that eliminates password prompts forever. Many developers clone with HTTPS then wonder why push asks for credentials.
- Multiple remotes (`origin` + `upstream` + `staging`) are a standard pattern for fork-based open source AND deploying to staging/production via `git push staging main`.
- `git remote show origin` before a major operation shows exactly which local branches track which remotes — prevents confusion about where `git pull` will merge from.

---

## I — Interview Q&A

### Q: What is the difference between `origin` and `upstream` in a fork-based workflow?

**A:** Both are just names for remotes — Git gives them no special meaning. By convention, `origin` is the remote you cloned from (your fork, where you have write access and push to), and `upstream` is the original repository you forked from (where you read changes from via `fetch` and submit PRs to). After `git clone`, only `origin` exists. You manually add `upstream` with `git remote add upstream <url>`. Then the workflow is: `git fetch upstream`, `git rebase upstream/main`, push to `origin`, open PR from `origin/feature` to `upstream/main`.

---

## C — Common Pitfalls + Fix

### ❌ Cloning via HTTPS then pushing requires credentials every time

```bash
# ❌ Cloned with HTTPS — push prompts for username/token every time
git remote -v
# origin  https://github.com/you/repo.git (fetch)
# origin  https://github.com/you/repo.git (push)

# ✅ Switch to SSH — one-time fix
git remote set-url origin git@github.com:you/repo.git
git remote -v
# origin  git@github.com:you/repo.git (fetch)
# origin  git@github.com:you/repo.git (push)
git push   # ✅ uses SSH key, no password prompt
```

---

## K — Coding Challenge + Solution

### Challenge

Set up the full fork workflow: convert HTTPS to SSH, add upstream, verify both remotes, and show the commands to sync with upstream.

### Solution

```bash
# 1. Convert to SSH
git remote set-url origin git@github.com:markaustr/awesome-project.git

# 2. Add upstream
git remote add upstream git@github.com:original-owner/awesome-project.git

# 3. Verify
git remote -v
# origin    git@github.com:markaustr/awesome-project.git (fetch/push)
# upstream  git@github.com:original-owner/awesome-project.git (fetch/push)

# 4. Sync with upstream
git fetch upstream                    # download upstream changes
git switch main
git rebase upstream/main              # update local main
git push origin main                  # sync your fork's main

# 5. Update a feature branch with upstream changes
git switch feature/my-change
git rebase upstream/main              # replay your commits on latest upstream
git push --force-with-lease origin feature/my-change
```

---

---
