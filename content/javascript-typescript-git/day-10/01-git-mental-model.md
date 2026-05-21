# 1 — Git Mental Model

---

## T — TL;DR

Git stores **snapshots**, not diffs. Every commit points to a complete picture of your project at that moment — implemented as a tree of immutable content-addressed objects. Understanding the four object types (blob, tree, commit, tag) makes every Git command predictable.

---

## K — Key Concepts

```
── The four Git objects ───────────────────────────────────────────────────────

blob     → stores raw file content (no filename, no metadata)
tree     → stores a directory listing: names + permissions + pointers to blobs/trees
commit   → stores: tree pointer, parent(s), author, timestamp, message
tag      → stores: pointer to a commit, tagger, message (annotated tags only)

All objects are identified by their SHA-1 hash (40 hex chars)
Content-addressed: same content = same hash, always
Immutable: you never modify an object — you create new ones
```

```bash
# ── Look at the raw objects ─────────────────────────────────────────────────
git cat-file -t abc1234    # print the type of object abc1234
git cat-file -p abc1234    # print the content of object abc1234

# A commit object looks like:
# tree   a1b2c3...           ← root tree SHA
# parent f9e8d7...           ← parent commit SHA (none for first commit)
# author Mark <m@ex.com> 1700000000 +0000
# committer Mark <m@ex.com> 1700000000 +0000
#
# feat: add user login

# A tree object looks like:
# 100644 blob a9b8c7...  README.md
# 040000 tree d1e2f3...  src
# 100644 blob e5f6g7...  package.json
```

```
── Snapshot model vs diff model ──────────────────────────────────────────────

Other VCS (SVN, early CVS): store base + series of diffs
Git: stores full snapshots — each commit = complete file tree

When a file doesn't change between commits:
  → Git doesn't duplicate it. The new commit's tree points to the SAME blob.
  → Storage efficiency via sharing, not diffs (though pack files compress later)

Why this matters:
  - Switching branches is fast: just swap which commit HEAD points to
  - History is reliable: every commit is self-contained
  - Branching is cheap: a branch is just a file containing a SHA
```

```
── Distributed version control ───────────────────────────────────────────────

Every clone is a full copy of the repository (all objects, all history)
No single server is "the truth" — origin is convention, not architecture
You can commit, branch, merge, log — all OFFLINE
Push/pull synchronise object databases between repos

origin = the remote you cloned from (just a name — can be renamed)
upstream = the original repo you forked from (another remote name)
```

---

## W — Why It Matters

- Once you know a branch is just a file containing a 40-char SHA, every branch operation becomes trivial to understand — creating a branch copies one file, deleting a branch deletes one file, the commits are unchanged.
- The content-addressed store means `git status` is just comparing your working tree against the tree object the current commit points to — there's no magic.
- Distributed means `git reflog` and local recovery tools work even when the remote is unavailable — your full history is local.

---

## I — Interview Q&A

### Q: How does Git store files, and what is the difference between a blob and a commit?

**A:** Git stores file content as **blob** objects — raw bytes identified by a SHA hash of the content. No filename or metadata is stored in the blob. A **tree** object stores the directory structure: it maps filenames and permissions to blob (file) or tree (subdirectory) SHAs. A **commit** object stores: a pointer to the root tree, zero or more parent commit SHAs, author/committer information, a timestamp, and a message. When you make a commit, Git snapshots the entire working tree as a tree of blobs, then creates a commit pointing to it. Unchanged files reuse existing blobs — Git doesn't duplicate content.

---

## C — Common Pitfalls + Fix

### ❌ Thinking branches are containers for commits

```
❌ Mental model: "commits belong to a branch"
   → leads to confusion when commits appear on multiple branches

✅ Correct mental model:
   - A branch is a POINTER (a file in .git/refs/heads/) to one commit
   - A commit knows its PARENT — not which branch it's on
   - "A commit is on branch X" means: X's pointer, or some ancestor of it,
     is that commit

.git/refs/heads/main     → contains: abc1234  (the current tip commit SHA)
.git/refs/heads/feature  → contains: def5678  (another tip commit SHA)
Both may share ancestor commits — those commits are "on both branches"
```

---

## K — Coding Challenge + Solution

### Challenge

Inspect a real Git repo's objects manually: find the HEAD commit SHA, print the commit object, find its tree, and list the files.

### Solution

```bash
# Find current HEAD commit
cat .git/HEAD              # ref: refs/heads/main
cat .git/refs/heads/main   # abc1234...  (the SHA)

# Or: shortcut
git rev-parse HEAD         # abc1234...

# Inspect the commit object
git cat-file -p HEAD
# tree   f1e2d3...
# parent a9b8c7...
# author Mark <m@ex.com> 1700000000 +0000
# ...
# feat: add login

# Inspect the root tree
git cat-file -p HEAD^{tree}
# 100644 blob e5f6...  .gitignore
# 100644 blob a1b2...  package.json
# 040000 tree c3d4...  src

# Inspect a subdirectory tree
git cat-file -p c3d4
# 100644 blob f7g8...  index.ts
# 040000 tree h9i0...  utils

# Count all objects in the repo
git count-objects -v
```

---

---
