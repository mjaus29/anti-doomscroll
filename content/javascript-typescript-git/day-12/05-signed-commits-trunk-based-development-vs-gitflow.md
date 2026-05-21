# 5 — Signed Commits + Trunk-based Development vs GitFlow

---

## T — TL;DR

**Signed commits** use GPG or SSH keys to cryptographically prove authorship — GitHub shows a "Verified" badge. **Trunk-based development** keeps everyone committing to `main` via short-lived branches and feature flags — the fastest delivery model. **GitFlow** uses long-lived branches for organized release cycles.

---

## K — Key Concepts

```bash
# ── GPG signed commits ────────────────────────────────────────────────────
gpg --full-generate-key           # generate GPG key (RSA 4096 or Ed25519)
gpg --list-secret-keys --keyid-format=long   # get key ID

# Configure Git to sign with your key
git config --global user.signingkey ABCD1234EFGH5678
git config --global commit.gpgsign true    # sign all commits automatically
git config --global tag.gpgsign true       # sign all tags

# One-off sign
git commit -S -m "feat: signed commit"
git tag -s v1.0.0 -m "signed release"

# Verify signatures
git log --show-signature -1
git verify-commit HEAD
git verify-tag v1.0.0

# Export public key → paste into GitHub Settings → SSH and GPG Keys
gpg --armor --export ABCD1234EFGH5678

# ── SSH signed commits (simpler, Git 2.34+) ──────────────────────────────
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
# Add SSH key to GitHub → Settings → SSH keys → type: Signing Key
```

```
── Trunk-Based Development (TBD) ─────────────────────────────────────────────

Branches:  main (trunk) only + very short-lived feature branches (< 2 days)
Merging:   squash/rebase to main, delete branch immediately
Feature flags: incomplete features hidden behind flags, code still ships to main
CI:        every commit to main triggers full CI + deployment
Goal:      continuous delivery, no integration debt, no merge conflicts

Best for: web apps, SaaS, teams doing continuous deployment

GitFlow ──────────────────────────────────────────────────────────────────────

Branches:  main (releases), develop (integration),
           feature/* (off develop), release/* (prep),
           hotfix/* (off main, emergency)
Merging:   feature → develop → release → main
Goal:      organized release cycles, clear history

Best for: libraries with versioned releases, mobile apps,
          teams with scheduled release windows

──────────────────────────────────────────────────────────────────────────────
              TBD                     GitFlow
Branch count  2 (main + short-lived)  5+ types
Merge freq    Multiple per day        Per release cycle
Conflicts     Rare (small changes)    Common (long-lived branches)
CI feedback   Immediate               Delayed to develop merge
Feature flags Required                Optional
Rollback      Feature flags           Revert or hotfix branch
──────────────────────────────────────────────────────────────────────────────
```

---

## W — Why It Matters

- Signed commits are required by many security-conscious organizations and increasingly by supply chain security standards — if your commit can be spoofed, an attacker could inject malicious code appearing to be from you.
- TBD's core insight is that long-lived branches don't prevent broken code — they delay its discovery. Small, frequent integration exposes problems immediately when context is fresh and the change is small.
- Feature flags (the enabler of TBD) decouple deployment from release — you can ship to 100% of users, but the feature is off for 99%. This eliminates the "we can't deploy because feature X isn't done" blocker.

---

## I — Interview Q&A

### Q: What is trunk-based development and how does it differ from GitFlow?

**A:** Trunk-based development has everyone integrating to a single `main` branch (the trunk) continuously — feature branches exist but are short-lived (hours to 2 days max) and merged daily. Incomplete features are hidden behind feature flags. The goal is eliminating integration debt — conflicts discovered immediately when changes are small. GitFlow uses parallel long-lived branches (`develop`, `release/*`, `feature/*`) with periodic merges, designed for teams with scheduled release cycles. TBD delivers faster, has fewer merge conflicts, and forces better decomposition of work. GitFlow provides explicit release boundaries needed for versioned software. Most modern web teams use TBD; library/mobile teams often use GitFlow.

---

## C — Common Pitfalls + Fix

### ❌ TBD without feature flags — half-finished feature ships to users

```bash
# ❌ Merging half-done auth to main without a flag → users see broken UI
git switch main
git merge feature/new-auth   # incomplete feature visible in production ❌

# ✅ Feature flag pattern
# src/flags.ts
export const FLAGS = {
  NEW_AUTH_FLOW: process.env.NEW_AUTH_FLOW === 'true',
} as const

# In component:
if (FLAGS.NEW_AUTH_FLOW) {
  return <NewAuthForm />   // only shown when flag is on
}
return <OldAuthForm />     // default — safe to ship ✅

# Deploy with flag off → test in production with flag on for 10% → full rollout
```

---

## K — Coding Challenge + Solution

### Challenge

Configure SSH-signed commits globally, verify a commit's signature, and write a feature flag utility in TypeScript.

### Solution

```bash
# SSH signing setup
git config --global gpg.format ssh
git config --global user.signingkey "$(cat ~/.ssh/id_ed25519.pub)"
git config --global commit.gpgsign true
git config --global tag.gpgsign true

# For verification: create allowed_signers file
echo "mark@example.com $(cat ~/.ssh/id_ed25519.pub)" > ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers

# Verify
git commit -m "feat: test signed commit"
git log --show-signature -1   # shows "Good git signature for..."
git verify-commit HEAD
```

```typescript
// src/lib/flags.ts — type-safe feature flags
const FLAGS_CONFIG = {
  NEW_AUTH_FLOW:     process.env.NEXT_PUBLIC_FLAG_NEW_AUTH     === 'true',
  DARK_MODE:         process.env.NEXT_PUBLIC_FLAG_DARK_MODE    === 'true',
  PAYMENT_V2:        process.env.NEXT_PUBLIC_FLAG_PAYMENT_V2   === 'true',
} as const

type FlagName = keyof typeof FLAGS_CONFIG

export function isEnabled(flag: FlagName): boolean {
  return FLAGS_CONFIG[flag]
}

// Usage: gated component
export function AuthForm() {
  return isEnabled('NEW_AUTH_FLOW') ? <NewAuth /> : <LegacyAuth />
}
```

---

---
