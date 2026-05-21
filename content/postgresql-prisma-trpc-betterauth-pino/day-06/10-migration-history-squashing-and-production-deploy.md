# 10 — Migration History, Squashing, and Production Deploy

---

## T — TL;DR

Prisma maintains a complete migration history in `prisma/migrations/`. `prisma migrate deploy` applies all unapplied migrations in a production environment — it never generates new migrations, it only applies existing ones. `prisma migrate status` checks what's applied. `prisma migrate resolve` marks a failed migration as resolved. Migration squashing (combining many migrations into one baseline) is done with `prisma migrate diff` + `baseline` for existing databases.

---

## K — Key Concepts

```bash
# ── prisma migrate status — check migration state ─────────────────────────
npx prisma migrate status

# Outputs one of three states:
# ✅ "Database schema is up to date!" — all migrations applied
# ⚠️ "N migrations found that have not yet been applied"
# ❌ "Some migrations are applied but not included in the migration folder"
#     (migration in DB but file is missing — dangerous)
```

```bash
# ── prisma migrate deploy — production deployments ────────────────────────
npx prisma migrate deploy

# What it does:
# 1. Connects to the database (uses DATABASE_URL)
# 2. Reads all .sql files in prisma/migrations/
# 3. Checks _prisma_migrations table for already-applied migrations
# 4. Applies ONLY the unapplied migrations in chronological order
# 5. Records each applied migration in _prisma_migrations

# What it does NOT do:
# ❌ Does NOT generate new migration files
# ❌ Does NOT create a shadow database
# ❌ Does NOT run prisma generate (do this separately)
# ❌ Does NOT prompt interactively (safe for CI/CD)

# Production deployment script:
# npx prisma migrate deploy && node dist/server.js
```

```bash
# ── CI/CD migration deployment pattern ───────────────────────────────────
# package.json scripts:
# "db:deploy": "prisma migrate deploy",
# "db:generate": "prisma generate",
# "build": "prisma generate && tsc",
# "start:migrate": "prisma migrate deploy && node dist/server.js"

# Vercel (in vercel.json or dashboard):
# Build Command: npx prisma generate && npm run build
# Deploy with migrate: add a pre-build script or use Vercel deploy hooks
```

```bash
# ── prisma migrate resolve — handling failed migrations ────────────────────
# If a migration fails halfway, it's marked as failed in _prisma_migrations
# Other commands refuse to run until the failure is resolved

# Option A: the migration was actually applied successfully (false failure)
npx prisma migrate resolve --applied "20250615143022_init"
# Marks the migration as successfully applied in _prisma_migrations

# Option B: the migration should be rolled back / re-run
npx prisma migrate resolve --rolled-back "20250615143022_init"
# Marks the migration as rolled back (allows re-running it)

# After resolving, run migrate deploy to continue
npx prisma migrate deploy
```

```bash
# ── prisma migrate diff — generate SQL diffs without migrating ────────────
# Useful for: reviewing what SQL would be generated, creating custom migrations,
# baselining existing databases

# Diff between schema and empty database:
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/baseline.sql

# Diff between two schema states:
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema_old.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# Diff between database and schema:
npx prisma migrate diff \
  --from-url $DATABASE_URL \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

```bash
# ── Baselining an existing database (not created by Prisma) ─────────────────
# Scenario: you have an existing PostgreSQL database and want to start using Prisma migrations
# without recreating the database from scratch

# Step 1: introspect the existing database (generate schema.prisma from DB)
npx prisma db pull
# Creates/updates schema.prisma to match the existing DB

# Step 2: create the migrations directory and an initial migration file
mkdir -p prisma/migrations/20250615000000_baseline

# Step 3: create an EMPTY migration.sql (the DB already has the schema)
touch prisma/migrations/20250615000000_baseline/migration.sql
# Empty file = "this migration was already applied by other means"

# Step 4: mark the baseline migration as applied (without running it)
npx prisma migrate resolve --applied "20250615000000_baseline"
# _prisma_migrations now records this as applied ✅

# Step 5: from now on, use normal migrate dev workflow for schema changes
npx prisma migrate dev --name add_new_feature
```

```bash
# ── Migration squashing — consolidating many migrations into one ──────────
# Use case: 50+ migration files, want to clean up migration history for new deploys

# ⚠️ Only squash when:
# ✅ All environments (prod, staging) have the current schema applied
# ✅ The team agrees on the squash point
# ✅ You don't need the individual migration history for rollback

# Step 1: generate the consolidated SQL from the current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/consolidated.sql

# Step 2: archive old migrations (don't delete — just for reference)
mv prisma/migrations prisma/migrations_archive

# Step 3: create new baseline migration
mkdir -p prisma/migrations/20250615000000_squashed_baseline
cp /tmp/consolidated.sql prisma/migrations/20250615000000_squashed_baseline/migration.sql

# Step 4: on all environments, mark the squashed baseline as applied
npx prisma migrate resolve --applied "20250615000000_squashed_baseline"

# Step 5: from now on, all new migrations build on the squashed baseline
npx prisma migrate dev --name first_after_squash
```

```
── _prisma_migrations table — what Prisma tracks ────────────────────────────

Column              │ Description
────────────────────┼──────────────────────────────────────────────────
id                  │ UUID — unique identifier for each migration record
checksum            │ SHA-256 of the migration.sql content
migration_name      │ timestamp + name (20250615143022_init)
started_at          │ when apply started
finished_at         │ when apply finished (NULL if failed)
logs                │ any output from the migration
rolled_back_at      │ if rolled back (via migrate resolve --rolled-back)
applied_steps_count │ number of SQL statements applied

Key behaviors:
- Prisma checks checksum on every deploy — if migration.sql is edited after apply, deploy fails
- Never edit applied migration files — create a new migration instead
- The checksum guard prevents silent divergence between file and DB state
```

---

## W — Why It Matters

- `prisma migrate deploy` is the only safe production migration command — it applies existing files without generating new ones, making it safe for automated CI/CD pipelines. It also validates checksums — if someone edited a migration file after it was applied, deploy refuses to run. This prevents drift between the code and database.
- The baselining workflow is essential for teams adopting Prisma on an existing codebase — without it, the first `migrate dev` would try to create all tables that already exist, failing with "table already exists" errors. The empty baseline file + `migrate resolve --applied` tells Prisma "we're starting from here."
- Never edit an already-applied migration file — Prisma computes and stores a checksum of each migration file when it's applied. If you edit the file later, `migrate deploy` on the next environment will fail with a checksum mismatch. Always create a new migration to fix mistakes in applied migrations.

---

## I — Interview Q&A

### Q: How does `prisma migrate deploy` differ from `prisma migrate dev`, and why do you use different commands for development and production?

**A:** `prisma migrate dev` is an interactive development tool — it generates new migration files by comparing the current schema to the database, creates a shadow database to compute diffs, applies the migrations, and regenerates the Prisma Client. It's designed for iterative schema development. `prisma migrate deploy` is a production deployment tool — it reads the existing migration files in `prisma/migrations/`, checks `_prisma_migrations` to see which have been applied, and applies only the unapplied ones in order. It never generates new files, never creates a shadow database, and never prompts interactively. The separation matters because: in production, you want deterministic, auditable deployments of pre-reviewed SQL — not auto-generated migrations from a live comparison. The migration files in `prisma/migrations/` are the source of truth for what runs in production, and they go through review (git, pull requests, staging) before reaching production.

### Q: What is the purpose of the `_prisma_migrations` table and what happens if a migration fails?

**A:** The `_prisma_migrations` table is Prisma's migration history ledger — it records every migration that has been applied, including its name, checksum, start time, finish time, and any error logs. Prisma reads this table on every `migrate dev` or `migrate deploy` to determine which migrations are pending. If a migration fails halfway through, the row in `_prisma_migrations` has `finished_at = NULL` and `logs` containing the error. Subsequent migration commands refuse to run until the failure is resolved. You resolve it with `prisma migrate resolve --applied` (if the migration actually succeeded despite the error) or `--rolled-back` (to mark it as rolled back and re-run it). A checksum is also stored — if a migration file is modified after being applied, Prisma detects the mismatch and refuses to deploy.

---

## C — Common Pitfalls + Fix

### ❌ Editing an already-applied migration file — checksum mismatch on next deploy

```bash
# ❌ Developer edits migration.sql after it's been applied to dev database
# (to fix a typo or add a missed index)
vim prisma/migrations/20250615143022_init/migration.sql

# Later: deploy to staging
npx prisma migrate deploy
# ERROR: "The migration `20250615143022_init` was modified after it was applied."
# "Expected checksum: abc123, got: def456"
# Deploy blocked ❌
```

**Fix:** Never edit applied migrations — always create a new one:

```bash
# ✅ Fix the missed index by creating a new migration
npx prisma migrate dev --name add_missing_index_on_posts
# prisma/migrations/20250616_add_missing_index_on_posts/migration.sql:
# CREATE INDEX "posts_title_idx" ON "posts"("title");

# Commit both files and deploy normally
git add prisma/migrations/
git commit -m "fix: add missing index on posts.title"
npx prisma migrate deploy  # applies only the new migration ✅
```

---

## ✅ Day 6 Complete — Prisma Relations and Migrations

| #   | Subtopic                                                  | Status |
| --- | --------------------------------------------------------- | ------ |
| 1   | Relations — Core Concepts and How Prisma Models Them      | ☐      |
| 2   | One-to-Many Relations — The Most Common Relation          | ☐      |
| 3   | One-to-One Relations — Exclusive Ownership                | ☐      |
| 4   | Explicit Many-to-Many — Junction Tables with Extra Fields | ☐      |
| 5   | Implicit Many-to-Many — Prisma-Managed Join Tables        | ☐      |
| 6   | @relation — Deep Dive on the Relation Attribute           | ☐      |
| 7   | Relation Modes — foreignKeys vs prisma                    | ☐      |
| 8   | Initial Migration — prisma migrate dev from Zero          | ☐      |
| 9   | Iterative Migration Workflow — Evolving the Schema Safely | ☐      |
| 10  | Migration History, Squashing, and Production Deploy       | ☐      |

---

## 🗺️ One-Page Mental Model — Day 6

```
RELATIONS — CORE ANATOMY
  Every relation has two sides:
    FK side (child):    userId Int          ← REAL column in DB
                        user   User @relation(fields: [userId], references: [id])  ← virtual
    Back-relation side: posts  Post[]       ← virtual, no DB column
  Rule: the scalar FK field (userId) is always real; the relation field (user) is always virtual
  Rule: relation fields are navigation helpers — Prisma uses them to build JOINs at query time
  Self-relation: requires named @relation("name") on both sides
  Multi-relation: same two models, multiple links → named @relation required on both sides

ONE-TO-MANY (1:N)
  FK lives on the "many" (child) side
  Parent: posts Post[]       ← virtual back-relation, no column
  Child:  userId Int         ← REAL FK column
          user   User @relation(fields: [userId], references: [id])
  Always: @@index([userId])  ← PostgreSQL does NOT auto-index FK columns
  onDelete: Cascade          → delete parent → delete children
  onDelete: Restrict         → delete parent → error if children exist (default for required)
  onDelete: SetNull          → delete parent → set FK to NULL (FK must be Int?)
  Required relation: userId Int   (NOT NULL)
  Optional relation: userId Int?  (NULL allowed) — relation field must also be User?

ONE-TO-ONE (1:1)
  FK lives on the "dependent/extension" side (Profile, Settings, Identity)
  CRITICAL: FK field must have @unique — without it, it's silently a 1:N
  model Profile {
    userId Int  @unique   ← @unique = enforces 1:1 at DB level
    user   User @relation(...)
  }
  model User {
    profile Profile?      ← singular optional back-relation (not an array)
  }
  onDelete: Cascade almost always correct for extension models
  Missing @unique = most common 1:1 bug

EXPLICIT MANY-TO-MANY (M:N with extra data)
  You declare the junction model yourself
  Junction has: two FK fields + @@id([fkA, fkB]) + any extra fields
  model Enrollment {
    studentId  Int  @map("student_id")
    courseId   Int  @map("course_id")
    enrolledAt DateTime @default(now())   ← extra field — why explicit is needed
    grade      String?
    @@id([studentId, courseId])           ← composite PK
    @@index([courseId])                   ← index second FK (first is covered by PK)
  }
  Both parent models: enrollments Enrollment[]  ← back-relations to junction
  Query junction directly: prisma.enrollment.update({ where: { studentId_courseId: {...} } })
  Composite @@id generates: { studentId_courseId: { studentId: x, courseId: y } } where clause
  Use explicit when: extra fields needed, individual junction records referenced by ID,
                     specific cascade rules, direct junction queries

IMPLICIT MANY-TO-MANY (M:N, no extra data)
  Prisma creates and manages the join table — no junction model in schema
  model Post { tags Tag[] }    model Tag { posts Post[] }
  Join table auto-named: _PostToTag (alphabetical)  columns: A, B
  Constraints: UNIQUE(A,B), INDEX(B), CASCADE on both FKs
  CANNOT add extra fields to implicit join table
  CANNOT query join table directly through Prisma Client
  connect:    { connect: { id: 3 } }        → ADD tag, keep existing ✅
  disconnect: { disconnect: { id: 2 } }     → REMOVE one tag
  set:        { set: [{ id: 1 }, { id: 4 }] } → REPLACE ALL existing (destructive!)
  connectOrCreate: create if not exists, connect if exists
  Requires: both models have single @id (not @@id composite), same type
  Use implicit when: purely "A associated with B", no extra data, simple use case

@RELATION ATTRIBUTE
  fields:     [userId]      ← FK scalar field(s) on this model
  references: [id]          ← referenced field(s) on the other model
  onDelete:   Cascade | Restrict | SetNull | SetDefault | NoAction
  onUpdate:   Cascade (default) | Restrict | SetNull | SetDefault | NoAction
  map:        "fk_name"     ← custom FK constraint name in PostgreSQL
  name:       "RelationName" ← disambiguation for multiple relations between same models
  Default onDelete: Restrict (required FK) or SetNull (nullable FK)
  Default onUpdate: Cascade
  Named relation: must EXACTLY match on both sides → common validation error source

RELATION MODES
  foreignKeys (default):
    PostgreSQL enforces FK constraints at DB level
    ON DELETE / ON UPDATE handled by PostgreSQL
    Raw SQL also respects FK rules ✅
    @@index on FK columns: recommended (performance)
    Use for: PostgreSQL, MySQL, SQL Server, SQLite

  prisma:
    No FK constraints in the database
    Prisma Client emulates referential actions in application code
    Raw SQL bypasses all referential integrity ❌
    @@index on FK columns: REQUIRED (no FK constraint = no implicit index)
    Use for: PlanetScale (Vitess/MySQL without FK support) ONLY
    NEVER use prisma mode with PostgreSQL

MIGRATIONS — CORE COMMANDS
  prisma migrate dev --name <name>      dev: generate SQL + apply + regenerate client
  prisma migrate dev --create-only      generate SQL file only, don't apply
  prisma migrate deploy                 prod: apply pending files, never generate new ones
  prisma migrate status                 check which migrations are applied / pending
  prisma migrate resolve --applied      mark failed/missing migration as applied
  prisma migrate resolve --rolled-back  mark migration as rolled back (re-run it)
  prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script
                                        generate SQL diff without migrating
  prisma db push                        sync schema to DB without migration files (dev/proto only)

MIGRATION FILES
  prisma/migrations/{timestamp}_{name}/migration.sql
  prisma/migrations/migration_lock.toml  ← locks the provider (postgresql)
  _prisma_migrations table in DB         ← tracks applied migrations + checksums
  Checksum guard: editing an applied migration.sql → deploy fails with checksum mismatch
  NEVER edit applied migration files — create a new migration to fix mistakes

MIGRATION SCENARIOS
  Add nullable column:    safe — ALTER TABLE ADD COLUMN ... NULL
  Add required column:    two steps: add nullable → backfill → SET NOT NULL
  Add index:              safe — CREATE INDEX
  Add unique constraint:  fails if duplicates exist — check data first
  Add enum value:         safe — ALTER TYPE ... ADD VALUE
  Rename column:          DANGER — Prisma generates DROP+ADD (data loss)
                          Fix: --create-only → edit to RENAME COLUMN → apply
  Remove column:          DANGER — DROP COLUMN (data loss) → review carefully
  Rename model:           DANGER — Prisma generates DROP TABLE + CREATE TABLE
                          Fix: --create-only → edit to RENAME TABLE → apply

ITERATIVE WORKFLOW
  1. Edit schema.prisma
  2. npx prisma migrate dev --name descriptive_name
  3. Review prisma/migrations/{timestamp}_{name}/migration.sql
  4. git add prisma/schema.prisma prisma/migrations/
  5. git commit -m "feat/fix: describe the schema change"
  Repeat for every change
  For renames/complex changes: add --create-only → edit SQL → re-run migrate dev

PRODUCTION DEPLOY PATTERN
  CI/CD pipeline:
    npx prisma generate          ← regenerate client from schema
    npx prisma migrate deploy    ← apply pending migrations (never generates)
    node dist/server.js          ← start app
  package.json postinstall: "prisma generate"  ← ensures client exists after npm install
  prisma migrate deploy: idempotent, safe to run on startup, validates checksums

BASELINING EXISTING DATABASE
  1. npx prisma db pull                                   ← generate schema from DB
  2. mkdir -p prisma/migrations/20250615000000_baseline
  3. touch prisma/migrations/20250615000000_baseline/migration.sql  ← empty file
  4. npx prisma migrate resolve --applied "20250615000000_baseline"
  5. Use normal migrate dev workflow from now on

SQUASHING MIGRATIONS
  Only when: all envs have current schema applied, team agrees
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > consolidated.sql
  Archive old migrations folder
  Create new baseline migration with consolidated.sql
  Mark baseline as applied on all environments with migrate resolve --applied

KEY RULES — RELATIONS
  Always @@index([fkField])           FK columns are NOT auto-indexed in PostgreSQL
  Always @unique on 1:1 FK            without it, it's silently a 1:N
  Named @relation must match exactly  on both sides — common validation error
  Explicit M:N by default             you almost always need extra join data eventually
  foreignKeys mode for PostgreSQL     never use prisma mode with PostgreSQL
  onDelete: choose intentionally      Cascade = convenient but deletes child data
                                      Restrict = safe but requires explicit cleanup

KEY RULES — MIGRATIONS
  Never edit applied migrations       checksum mismatch blocks future deploys
  Always --create-only for renames    Prisma generates DROP+ADD → data loss without review
  migrate dev for development         generates + applies + regenerates client
  migrate deploy for production       applies existing files only, safe for CI/CD
  Commit migrations to git            migration files are the source of truth for schema history
  db push is prototyping only         no history, no rollback, never for shared environments
```

> **Your next action:** Open your current `schema.prisma` and find one relation. Identify the FK side (the model with the scalar `Int` or `String` FK field) and confirm it has a `@@index` on that FK column. If it doesn't — add one now.
