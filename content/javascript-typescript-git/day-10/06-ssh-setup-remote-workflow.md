# 6 — SSH Setup + Remote Workflow

---

## T — TL;DR

SSH keys authenticate you to GitHub/GitLab without a password. Generate once, add the public key to your account. Remotes are named pointers to URLs — `origin` is convention. `fetch`, `pull`, and `push` synchronise your local repo with remotes.

---

## K — Key Concepts

```bash
# ── SSH key generation ────────────────────────────────────────────────────
ssh-keygen -t ed25519 -C "mark@example.com"
# Prompts: file location (~/.ssh/id_ed25519), passphrase (use one)
# Creates:
#   ~/.ssh/id_ed25519       (private key — NEVER share)
#   ~/.ssh/id_ed25519.pub   (public key — add to GitHub)

# Add to SSH agent (so passphrase prompt is cached)
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# macOS: persist in keychain
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub   # paste into GitHub → Settings → SSH Keys

# Test connection
ssh -T git@github.com
# Hi username! You've successfully authenticated...

# ~/.ssh/config — multiple keys / hosts
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519

Host github-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_work
# Then: git clone git@github-work:company/repo.git
```

```bash
# ── Remote management ─────────────────────────────────────────────────────
git remote -v                              # list remotes
git remote add origin git@github.com:u/r  # add remote
git remote add upstream git@github.com:original/r  # add upstream (fork workflow)
git remote rename origin github            # rename
git remote remove upstream                 # remove
git remote set-url origin git@github.com:u/new-name.git  # change URL

# ── fetch vs pull ────────────────────────────────────────────────────────
git fetch origin          # download objects from remote, update remote-tracking branches
                          # does NOT change your working tree or local branches
git fetch --all           # fetch all remotes
git fetch --prune         # fetch + remove stale remote-tracking branches

git pull                  # fetch + merge (or rebase, per config)
git pull origin main      # pull specific remote branch
git pull --rebase         # fetch + rebase (cleaner history)

# ── push ─────────────────────────────────────────────────────────────────
git push origin main              # push main to origin
git push origin feature           # push feature branch
git push -u origin feature        # push + set upstream (future: git push works)
git push --force-with-lease       # force push only if remote matches expected ✅
git push --force                  # force push (dangerous — overwrites remote) ❌
git push origin --delete feature  # delete remote branch
```

---

## W — Why It Matters

- SSH over HTTPS is preferred for developer machines — no password per push, works with 2FA without tokens, and the config file enables multiple GitHub accounts (personal + work) cleanly.
- `git fetch` before `git pull` is safer — you can inspect `origin/main` with `git log origin/main` before merging into your local branch. Surprises are prevented.
- `--force-with-lease` instead of `--force` is always the right choice for force pushing — it fails if someone else pushed since your last fetch, preventing accidentally overwriting others' commits.

---

## I — Interview Q&A

### Q: What is the difference between `git fetch` and `git pull`?

**A:** `git fetch` downloads new objects and commits from the remote and updates remote-tracking branches (`origin/main`, `origin/feature`) — but it does NOT change your local branches or working tree. Your local `main` is unchanged after a fetch. `git pull` is `git fetch` followed by a merge (or rebase with `--rebase`) of the remote branch into your current branch. Fetch is safe — inspect before merging. Pull changes your working state immediately. Best practice: `git fetch` + `git log HEAD..origin/main` to see what's new + `git merge origin/main` — same as `git pull` but with visibility into what you're merging.

---

## C — Common Pitfalls + Fix

### ❌ `git push --force` overwrites teammates' commits

```bash
# ❌ --force overwrites the remote branch regardless of state
git push --force origin main   # destroys commits pushed by others ❌

# ✅ --force-with-lease fails if remote has commits you haven't fetched
git push --force-with-lease origin main
# If someone pushed while you were rebasing:
# error: failed to push some refs — rejected (stale info)
# → git fetch, inspect, then push again ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Set up a fork workflow: clone a fork, add the upstream remote, fetch from upstream, rebase your feature branch on `upstream/main`, and push to your fork.

### Solution

```bash
# 1. Clone your fork
git clone git@github.com:markaustr/original-repo.git
cd original-repo

# 2. Add upstream (the original repo)
git remote add upstream git@github.com:original-owner/original-repo.git
git remote -v
# origin    git@github.com:markaustr/original-repo.git (fetch/push)
# upstream  git@github.com:original-owner/original-repo.git (fetch/push)

# 3. Fetch latest from upstream
git fetch upstream

# 4. Create feature branch
git checkout -b feature/add-auth

# ... do work, make commits ...

# 5. Before opening PR: rebase onto latest upstream/main
git fetch upstream
git rebase upstream/main

# Fix any conflicts:
# git add resolved-file.ts
# git rebase --continue

# 6. Push to your fork
git push -u origin feature/add-auth

# If you already pushed and rebased (history changed):
git push --force-with-lease origin feature/add-auth   # ✅ safe force push
```

---

---
