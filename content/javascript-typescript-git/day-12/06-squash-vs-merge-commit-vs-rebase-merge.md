# 6 — Squash vs Merge Commit vs Rebase Merge

---

## T — TL;DR

These are the three ways GitHub merges a PR. **Squash** = all commits combined into one on main. **Merge commit** = preserves all commits + adds a merge commit. **Rebase** = replays all commits linearly on main, no merge commit. Each produces a different history shape — choose based on your team's history philosophy.

---

## K — Key Concepts

```
── Starting state ─────────────────────────────────────────────────────────────
main:    A ← B ← C
feature: A ← B ← C ← D ← E ← F (3 commits: D, E, F)

── 1. Squash and merge ────────────────────────────────────────────────────────
main after: A ← B ← C ← S
                         ↑ S = squash commit containing all of D+E+F changes
                           One commit. Authored by PR author.
                           Feature branch commits D, E, F not in main's history.

Pros:  Clean linear history. Each PR = 1 commit. Easy git bisect.
Cons:  Individual commit messages (D, E, F) lost on main.
       Feature branch becomes "unmerged" — use git branch -D.

── 2. Merge commit ────────────────────────────────────────────────────────────
main after: A ← B ← C ← D ← E ← F ← M
                                        ↑ M = merge commit with 2 parents (C and F)
                           All original commits preserved with original SHAs.

Pros:  Full history preserved. Can see exact work from each commit.
       Standard git merge tracking.
Cons:  History has merge commits ("noise"). git log --graph needed.
       Bisect harder with many feature branches in history.

── 3. Rebase and merge ────────────────────────────────────────────────────────
main after: A ← B ← C ← D' ← E' ← F'
                          New SHAs — replayed on top of C.
                          Linear history. All commits preserved.

Pros:  Linear history AND all individual commits visible.
Cons:  Rebased commits have new SHAs — feature branch diverges.
       Can lose context of which PR commits came from.

── Recommendation matrix ─────────────────────────────────────────────────────
High-velocity team, CI-driven:     Squash → clean, fast to bisect
Open source, preserve attribution: Merge commit → full credit
Library with meaningful commits:   Rebase merge → linear + detailed
```

---

## W — Why It Matters

- Squash merge is the most team-friendly for application code — one commit per feature/fix makes `git log --oneline main` readable and `git bisect` effective. The PR itself preserves the full commit history.
- Rebase merge requires every PR branch to be rebased onto `main` before merging (otherwise replayed commits diverge from intent). Without enforcement via branch protection "require up to date", this causes confusing histories.
- Consistency matters more than which strategy — pick one for `main` and enforce it with branch protection ("allow squash merging only"). Mixed strategies on one branch produce an unreadable history.

---

## I — Interview Q&A

### Q: Why would you choose squash merge over rebase merge for a team GitHub workflow?

**A:** Squash merge creates one commit per PR on `main`, making history scannable — each line in `git log --oneline main` represents one complete feature or fix. This makes `git bisect` effective (test each "feature unit" rather than individual implementation steps) and code review context clear (blame shows the PR-level change, not a specific WIP commit). Rebase merge preserves all individual commits but requires them to be meaningful — it works well when developers write intentional commits throughout, but breaks down when PR histories have "wip:", "fix typo", "address review" commits. Squash merge is forgiving of messy in-PR history while keeping the permanent record clean.

---

## C — Common Pitfalls + Fix

### ❌ Mixing merge strategies on main — unreadable history

```bash
# ❌ Some PRs squashed, some rebased, some merge committed
git log --oneline main
# abc123 Merge pull request #45 from feature/auth    ← merge commit
# def456 feat: add payment endpoint                   ← squash
# ghi789 wip: started something                      ← rebase (bad commit)
# jkl012 fix: typo                                   ← rebase (trivial)
# mno345 feat: add user profile                      ← squash
# pqr678 Merge pull request #38 from feature/ui      ← merge commit
# Completely inconsistent ❌

# ✅ Enforce ONE strategy in branch protection settings:
# Repository → Settings → General → Pull Requests:
#   ✅ Allow squash merging       (check this one)
#   ❌ Allow merge commits        (uncheck)
#   ❌ Allow rebase merging       (uncheck)
```

---

## K — Coding Challenge + Solution

### Challenge

Simulate all three merge strategies on a local repo and compare the resulting histories.

### Solution

```bash
# Setup
git init merge-demo && cd merge-demo
echo "v1" > app.ts && git add . && git commit -m "init: base"

# Branch with 3 commits
git switch -c feature/test
echo "feat1" >> app.ts && git commit -am "feat: step 1"
echo "feat2" >> app.ts && git commit -am "wip: step 2"
echo "feat3" >> app.ts && git commit -am "fix: step 3"

# ── Strategy 1: Squash ────────────────────────────────────────────────────
git switch main
git merge --squash feature/test
git commit -m "feat: complete feature (squash of 3 commits)"
git log --oneline    # 2 commits: init + feat ✅

# Reset main for next demo
git reset --hard HEAD~1

# ── Strategy 2: Merge commit ─────────────────────────────────────────────
git merge --no-ff feature/test -m "merge: feature/test PR"
git log --oneline --graph   # shows merge topology

# Reset main for next demo
git reset --hard HEAD~4  # remove the 3 commits + merge commit

# ── Strategy 3: Rebase merge ─────────────────────────────────────────────
git switch feature/test
git rebase main
git switch main
git merge --ff-only feature/test   # fast-forward (linear = always FF)
git log --oneline    # 4 commits: init + 3 replayed ✅
```

---

---
