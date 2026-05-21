# 8 — Tags — lightweight, annotated, push, delete

---

## T — TL;DR

**Tags** mark specific commits permanently — typically for releases. **Lightweight tags** are just a pointer (like a branch that doesn't move). **Annotated tags** store tagger name, date, message, and can be signed — use these for releases. Tags are not pushed by default.

---

## K — Key Concepts

```bash
# ── Lightweight tag ───────────────────────────────────────────────────────
git tag v1.0.0              # tag current commit
git tag v1.0.0 abc1234      # tag specific commit

# ── Annotated tag ─────────────────────────────────────────────────────────
git tag -a v1.0.0 -m "Release version 1.0.0 — stable"
git tag -a v1.0.0 abc1234 -m "Release 1.0.0"   # tag specific commit
git tag -s v1.0.0 -m "Signed release"           # GPG signed tag

# ── List tags ─────────────────────────────────────────────────────────────
git tag                     # list all tags
git tag -l "v1.*"           # filter by pattern
git tag -n                  # list with tag messages
git show v1.0.0             # show tag details + commit it points to

# ── Push tags ─────────────────────────────────────────────────────────────
git push origin v1.0.0       # push specific tag
git push origin --tags       # push all tags
git push origin --follow-tags  # push commits + annotated tags that go with them

# ── Delete tags ───────────────────────────────────────────────────────────
git tag -d v1.0.0-beta       # delete local tag
git push origin --delete v1.0.0-beta   # delete remote tag
git push origin :v1.0.0-beta           # same: empty = delete

# ── Checkout a tag (detached HEAD) ────────────────────────────────────────
git checkout v1.0.0            # inspect code at tag — detached HEAD
git switch --detach v1.0.0     # same, explicit
git switch -c hotfix/v1.0.1 v1.0.0  # create branch from tag ✅
```

---

## W — Why It Matters

- Annotated tags (`-a`) are the standard for releases — they store who tagged, when, and why. Lightweight tags lose this metadata. Most CI/CD pipelines (`semantic-release`, GitHub Actions release trigger) use annotated tags.
- Tags are not pushed by default — `git push origin --tags` or `--follow-tags` is needed. Missing this step means CI never sees the tag, and GitHub releases aren't created.
- `git switch -c hotfix/v1.0.1 v1.0.0` creates a branch from a tag for hotfixing — the correct way to patch an old release without touching the current development branch.

---

## I — Interview Q&A

### Q: What is the difference between a lightweight and an annotated tag?

**A:** A lightweight tag is just a named pointer to a commit — stored as a simple ref file containing the commit SHA. It has no additional metadata. An annotated tag is a full Git object — it stores the tagger's name, email, the tagging date, and a message. It can also be GPG-signed for verification. Annotated tags show up in `git describe` and are the type expected by most release tools. Use annotated tags for releases (`git tag -a v1.0.0 -m "..."`) and lightweight tags for temporary private marks. GitHub's release creation from tags works best with annotated tags.

---

## C — Common Pitfalls + Fix

### ❌ Tagging and forgetting to push the tag

```bash
# ❌ Tag created locally, CI never triggers release because tag not pushed
git tag -a v1.2.0 -m "Release 1.2.0"
git push origin main   # pushes commits but NOT the tag
# GitHub Actions release trigger: tags/v* → never fires ❌

# ✅ Always push tag explicitly
git push origin v1.2.0
# Or push all at once:
git push origin main --follow-tags   # pushes commits + annotated tags ✅

# ✅ Alias for release
git config --global alias.release '!git push origin $(git describe --tags)'
```

---

## K — Coding Challenge + Solution

### Challenge

Create a full release tagging workflow: tag, push, then create a hotfix branch from the tag, and create a patch release tag.

### Solution

```bash
# Release v1.0.0
git switch main
git pull origin main
git log --oneline -3   # verify last commit is release-ready

# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0
- User authentication with JWT
- Profile management endpoint
- Rate limiting middleware"

git show v1.0.0        # verify tag content
git push origin main --follow-tags  # push commits + tag ✅

# ── Bug found in v1.0.0 — hotfix needed ──────────────────────────────────
git switch -c hotfix/v1.0.1 v1.0.0   # branch from release tag
# ... fix the bug ...
git add src/auth/login.ts
git commit -m "fix: prevent crash on empty password field"

# Patch release
git tag -a v1.0.1 -m "Release v1.0.1 — hotfix for login crash"
git push origin hotfix/v1.0.1 --follow-tags

# Also apply fix to main
git switch main
git cherry-pick hotfix/v1.0.1   # backport the fix ✅
git push origin main
```

---

---
