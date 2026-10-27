# PostgreSQL / Prisma / tRPC / BetterAuth / pino Cheat Sheet

One-page reference for the backend stack in this track: SQL you must know cold, Prisma schema and queries, BetterAuth sessions, tRPC procedures, and pino logging.

## PostgreSQL: SQL basics

Hierarchy: **server > database > schema (`public` by default) > table**. Connect with `psql -U app_user -d myapp`.

**Logical evaluation order:** `FROM` > `WHERE` > `GROUP BY` > `HAVING` > `SELECT` > `ORDER BY` > `LIMIT`. This explains why `WHERE` cannot use a `SELECT` alias or an aggregate, while `ORDER BY` can use aliases.

| Topic | Syntax | Note |
|---|---|---|
| Filter | `WHERE status = 'active' AND price BETWEEN 10 AND 50` | `IN (...)`, `LIKE`, `ILIKE` (case-insensitive) |
| NULL check | `WHERE deleted_at IS NULL` | `= NULL` is never true |
| NULL-safe concat | `COALESCE(first_name, '') \|\| ' ' \|\| last_name` | `\|\|` with NULL gives NULL |
| Sort | `ORDER BY created_at DESC NULLS LAST, id DESC` | Name columns, not positions |
| Alias | `SELECT price * qty AS total FROM order_items AS oi` | Subqueries in `FROM` need an alias |
| Insert | `INSERT INTO users (email, name) VALUES (...) RETURNING id` | Always list columns |
| Update | `UPDATE users SET name = 'A' WHERE id = 1 RETURNING *` | No `WHERE` = every row |
| Delete | `DELETE FROM sessions WHERE expires_at < now()` | `SELECT` the same `WHERE` first |

### Types and constraints

| Need | Use | Avoid |
|---|---|---|
| Surrogate PK | `id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` | `SERIAL` (legacy) |
| Money | `NUMERIC(12,2)` | `FLOAT`, `REAL` |
| Event time | `TIMESTAMPTZ` | `TIMESTAMP` (no time zone) |
| Flexible data | `JSONB` (indexable with GIN) | `JSON` |

```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, created_at)
);
CREATE INDEX orders_user_id_idx ON orders (user_id); -- FKs: no auto index
```

| Constraint | Remember |
|---|---|
| `PRIMARY KEY` | NOT NULL + UNIQUE + index; composite PK for junction tables |
| `UNIQUE` | Creates an index; NULLs are distinct by default |
| `CHECK` | Must be deterministic (no `now()`) |
| `FOREIGN KEY` | `ON DELETE CASCADE / SET NULL / RESTRICT`; index the FK column yourself |
| Normalization | 1NF atomic values (no CSV columns), 2NF no partial-key deps, 3NF no transitive deps |

```sql
-- bulk upsert
INSERT INTO products (sku, name, price) VALUES
  ('A1', 'Pen', 1.50), ('B2', 'Ink', 4.00)
ON CONFLICT (sku) DO UPDATE
  SET price = EXCLUDED.price
RETURNING id, sku;

-- soft delete + unique email that can be reused
CREATE UNIQUE INDEX users_email_live ON users (email)
  WHERE deleted_at IS NULL;
```

Lessons: [Execution order](/group/postgresql-prisma-trpc-betterauth-pino/day/01/05-sql-workflow-execution-order-mental-model) · [WHERE](/group/postgresql-prisma-trpc-betterauth-pino/day/01/07-filtering-with-where-conditions-and-operators) · [Data types](/group/postgresql-prisma-trpc-betterauth-pino/day/02/01-data-types-deep-dive-choosing-the-right-type) · [Foreign keys](/group/postgresql-prisma-trpc-betterauth-pino/day/02/06-foreign-key-referential-integrity-and-cascade-behaviour)

## PostgreSQL: joins, aggregates, CTEs

**Joins:** `INNER JOIN` = matches only; `LEFT JOIN` = all left rows, NULLs when no match; `FULL JOIN` = all rows from both. `USING (col)` when names match. Self-join = same table, two aliases.

```sql
-- customers with no orders (anti-join)
SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

| Topic | Rule |
|---|---|
| Aggregates | `COUNT(*)` counts rows; `COUNT(col)`, `SUM`, `AVG` ignore NULL |
| `GROUP BY` | Every selected non-aggregate column must be grouped |
| `WHERE` vs `HAVING` | `WHERE` filters rows before grouping; `HAVING` filters groups (aggregates) |
| Subqueries | Scalar, list (`IN`), `EXISTS`, correlated |
| `NOT IN` + NULL | Returns no rows: use `NOT EXISTS` |
| CTE | `WITH recent AS (...)`; PG 12+ may inline it (`AS MATERIALIZED` forces); `WITH RECURSIVE` for trees |
| Views | View = stored query; materialized view = stored result, needs `REFRESH MATERIALIZED VIEW` |

Lessons: [LEFT/RIGHT/FULL](/group/postgresql-prisma-trpc-betterauth-pino/day/03/02-left-right-and-full-join-including-non-matching-rows) · [HAVING](/group/postgresql-prisma-trpc-betterauth-pino/day/03/06-having-filtering-aggregated-groups) · [Subqueries](/group/postgresql-prisma-trpc-betterauth-pino/day/03/07-subqueries-scalar-list-exists-correlated) · [CTEs](/group/postgresql-prisma-trpc-betterauth-pino/day/03/08-ctes-with-clauses-for-readable-multi-step-queries)

## PostgreSQL: transactions, locks, indexes

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
SAVEPOINT before_credit;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- ROLLBACK TO SAVEPOINT before_credit;  (partial undo)
COMMIT;   -- or ROLLBACK;
```

| Isolation level | Prevents | Note |
|---|---|---|
| `READ COMMITTED` (default) | Dirty reads | Each statement sees fresh committed data |
| `REPEATABLE READ` | + non-repeatable reads | Snapshot per transaction (MVCC) |
| `SERIALIZABLE` | + serialization anomalies | Can fail: retry the transaction |

**Row locks (inside a transaction):** `SELECT ... FOR UPDATE` for read-modify-write, `FOR UPDATE SKIP LOCKED` for job queues, `NOWAIT` to fail instead of waiting.

| Index | Use for |
|---|---|
| B-tree (default) | `=`, ranges, `ORDER BY` |
| Composite `(a, b)` | Leftmost-prefix rule: helps `a` and `a + b`, not `b` alone |
| Partial `WHERE status = 'pending'` | Hot subset of rows |
| Expression `(lower(email))` | Query must use the same expression |
| GIN | `JSONB`, arrays, full-text |
| BRIN | Huge append-only tables ordered by time |

**EXPLAIN:** `EXPLAIN ANALYZE` runs the query. Look for `Seq Scan` on large tables, estimated vs actual rows far apart (run `ANALYZE`), and expensive sorts.

**Pagination:** `OFFSET` scans and discards rows (slow when deep). Keyset: `WHERE (created_at, id) < (:lastTs, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20` with a unique tie-breaker.

**Bulk writes:** `COPY` is fastest; otherwise multi-row `INSERT` batches + `ON CONFLICT` upserts, inside a transaction.

Lessons: [Transactions](/group/postgresql-prisma-trpc-betterauth-pino/day/04/01-transactions-begin-commit-rollback-savepoint) · [Isolation levels](/group/postgresql-prisma-trpc-betterauth-pino/day/04/02-isolation-levels-concurrency-anomalies-and-how-to-prevent-them) · [Index types](/group/postgresql-prisma-trpc-betterauth-pino/day/04/05-index-types-partial-composite-expression-gin-brin) · [Pagination](/group/postgresql-prisma-trpc-betterauth-pino/day/04/08-pagination-patterns-offset-vs-cursor-based)

## Prisma: schema.prisma

Three block kinds: `datasource` (one), `generator` (one or more), `model` / `enum`. Prisma 7: the connection URL is not in the schema (it is `datasource.url` in `prisma.config.ts`), the generator is `prisma-client` with a required `output`, and `PrismaClient` needs a driver adapter.

```prisma
datasource db {
  provider = "postgresql"
}
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
enum Role {
  USER
  ADMIN
}
```

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  balance   Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  posts     Post[]
  @@map("users")
}
```

| Attribute | Meaning |
|---|---|
| `?` / `[]` | Optional (nullable) / list |
| `@id`, `@@id([a, b])` | Primary key / composite PK |
| `@unique`, `@@unique([a, b])` | Unique constraint |
| `@default(now() / uuid() / cuid() / autoincrement())` | Column default |
| `@updatedAt` | Prisma sets the timestamp on every update |
| `@db.Uuid`, `@db.Timestamptz(6)`, `@db.Decimal(12,2)` | Exact PG native type |
| `@map("col")` / `@@map("table")` | camelCase in TS, snake_case in PG |
| `@@index([userId])` | Index (FKs are not indexed automatically) |
| `@@schema("auth")` | Model in another PG schema (multi-schema) |

**Defaults to override:** `DateTime` is `timestamp(3)` (add `@db.Timestamptz(6)`), `Decimal` is `decimal(65,30)` (add `@db.Decimal(p,s)`), `String` is `text`. Use `Decimal`, never `Float`, for money.

**Client singleton (Next.js):** store one `PrismaClient` on `globalThis` in dev so hot reload does not open new pools. Prisma 7: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`, imported from your generator `output` (e.g. `@/generated/prisma/client`), not `@prisma/client`. Run `prisma generate` yourself after every schema change (`migrate dev` no longer does), and `prisma db seed` yourself (no auto-seed).

Lessons: [Three blocks](/group/postgresql-prisma-trpc-betterauth-pino/day/05/01-schema-prisma-file-structure-and-the-three-blocks) · [Field modifiers](/group/postgresql-prisma-trpc-betterauth-pino/day/05/06-field-modifiers-optional-list-default-id-unique-updatedat) · [Native types](/group/postgresql-prisma-trpc-betterauth-pino/day/05/08-native-type-mapping-precise-postgresql-type-control) · [@map / @@map](/group/postgresql-prisma-trpc-betterauth-pino/day/05/09-model-to-table-mapping-map-map-schema-naming-conventions)

## Prisma: relations and migrations

```prisma
model Post {
  id       Int    @id @default(autoincrement())
  authorId String @db.Uuid
  author   User   @relation(fields: [authorId], references: [id],
                    onDelete: Cascade)
  tags     Tag[]  // implicit M:N
  @@index([authorId])
}
```

| Relation | Rule |
|---|---|
| 1:N | Child holds scalar FK + `@relation`; parent has `Child[]` |
| 1:1 | FK side must be `@unique` |
| Implicit M:N | `Tag[]` on both sides; Prisma creates `_PostToTag` (columns `A`, `B`) |
| Explicit M:N | Junction model with two FKs, `@@id([a, b])`, extra fields, index the second FK |
| Same models twice | Name both sides: `@relation("Author")` / `@relation("Editor")` |
| `relationMode` | `foreignKeys` (default, DB enforces) vs `prisma` (no DB FKs; only for DBs without FKs) |

| Command | Use |
|---|---|
| `prisma migrate dev --name add_x` | Dev: diff schema, write SQL, apply (Prisma 7: does not run generate/seed) |
| `prisma migrate dev --create-only` | Write SQL without applying: edit renames, backfills, triggers |
| `prisma migrate deploy` | Production/CI: apply pending migrations only |
| `prisma migrate status` | What is applied |
| `prisma migrate resolve --applied <name>` | Mark a migration as applied (baselining) |
| `prisma db push` | Prototyping only, no migration history |
| `prisma db pull` | Introspect existing DB into schema.prisma (overwrites) |
| `prisma migrate diff --from-... --to-... --script` | Print SQL between two states (`--from-empty`, `--from-schema`, `--from-migrations`, `--from-config-datasource`; `--from-url` removed in 7) |
| `prisma db seed` | Run seed script (use `upsert` so it can re-run) |

### Adopting an existing database (baseline)

```bash
npx prisma db pull                       # 1. introspect, then clean up
mkdir -p prisma/migrations/0_init        # 2. baseline folder
npx prisma migrate diff --from-empty \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init  # 3. mark, do not run
npx prisma generate                      # 4. then iterate with migrate dev
```

**Expand / migrate / contract:** add the new column (nullable or with default), backfill, deploy code that uses it, then drop the old one in a later release. Never rename/drop in one step while old code runs. Never edit an applied migration.

**Not in the Prisma DSL:** CHECK constraints, triggers, functions, RLS, materialized views. Put them in a `--create-only` migration as raw SQL.

Lessons: [One-to-many](/group/postgresql-prisma-trpc-betterauth-pino/day/06/02-one-to-many-relations-the-most-common-relation) · [Iterative migrations](/group/postgresql-prisma-trpc-betterauth-pino/day/06/09-iterative-migration-workflow-evolving-the-schema-safely) · [Existing database](/group/postgresql-prisma-trpc-betterauth-pino/day/07/02-working-with-an-existing-database-full-adoption-workflow) · [Schema evolution](/group/postgresql-prisma-trpc-betterauth-pino/day/07/04-schema-evolution-safe-patterns-for-changing-live-data)

## Prisma Client: queries

| Method | Note |
|---|---|
| `findUnique({ where: { id } })` | Unique fields only; returns `T \| null` |
| `findUniqueOrThrow` / `findFirstOrThrow` | Throws P2025 when missing |
| `findFirst` / `findMany` | Any filter |
| `create`, `createMany({ data, skipDuplicates })` | |
| `update`, `upsert({ where, create, update })`, `delete`, `*Many` | `update`/`delete` throw P2025 if missing |
| `count`, `aggregate`, `groupBy` | `_sum`, `_avg` can be null on empty sets |

```ts
const posts = await prisma.post.findMany({
  where: {
    published: true,
    title: { contains: q, mode: 'insensitive' },
    author: { is: { role: 'ADMIN' } },
    tags: { some: { name: 'prisma' } },
  },
  select: { id: true, title: true, author: { select: { name: true } } },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  take: 20,
})
```

| Topic | Rule |
|---|---|
| `select` vs `include` | Mutually exclusive at the same level; `select` is an allowlist |
| API responses | `select` the fields you return (never `include: { author: true }` raw) |
| Filters | `equals`, `in`, `notIn`, `lt/lte/gt/gte`, `contains`, `startsWith`, `AND/OR/NOT` |
| Relation filters | `some`, `every`, `none` (lists), `is`, `isNot` (single) |
| `every` | True for records with **no** children: combine with `some` |
| Pages | Offset: `skip` + `take`. Cursor: `cursor: { id }, skip: 1, take: 20` + stable `orderBy` |
| Count relations | `include: { _count: { select: { posts: true } } }` |

```ts
// nested writes (atomic)
await prisma.user.update({
  where: { id },
  data: {
    posts: { create: { title: 'Hi' } },
    tags: {
      connect: [{ id: 1 }],        // add links
      disconnect: [{ id: 2 }],     // remove links
      // set: [...] REPLACES all links
    },
  },
})
```

Operators: `create`, `createMany`, `connect`, `connectOrCreate`, `update`, `upsert`, `disconnect`, `delete`, `set`.

Lessons: [CRUD](/group/postgresql-prisma-trpc-betterauth-pino/day/08/01-crud-create-findunique-update-delete-upsert) · [select](/group/postgresql-prisma-trpc-betterauth-pino/day/08/02-select-field-selection-and-partial-return-types) · [Pagination](/group/postgresql-prisma-trpc-betterauth-pino/day/08/06-pagination-take-skip-and-cursor-based) · [Nested writes](/group/postgresql-prisma-trpc-betterauth-pino/day/08/08-nested-writes-creating-and-updating-across-relations)

## Prisma Client: transactions, raw SQL, consistency

```ts
// batch: independent ops, one round trip, all-or-nothing
await prisma.$transaction([
  prisma.order.create({ data }),
  prisma.stock.update({ where, data: { qty: { decrement: 1 } } }),
])
```

```ts
// interactive: read-modify-write; use tx, never prisma, inside
await prisma.$transaction(async (tx) => {
  const acc = await tx.account.findUniqueOrThrow({ where: { id } })
  if (acc.balance.lt(amount)) throw new Error('Insufficient funds')
  await tx.account.update({
    where: { id },
    data: { balance: { decrement: amount } },
  })
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
```

| Error code | Meaning | Map to |
|---|---|---|
| `P2002` | Unique constraint violation | `CONFLICT` |
| `P2025` | Record not found (update/delete/OrThrow) | `NOT_FOUND` |
| `P2003` | Foreign key violation | `BAD_REQUEST` |
| `P2034` | Write conflict / deadlock (serializable) | Retry with backoff |

| Topic | Rule |
|---|---|
| Raw select | `` prisma.$queryRaw<Row[]>`SELECT ... WHERE id = ${id}` `` (parameterized) |
| Raw write | `` prisma.$executeRaw`UPDATE ...` `` returns affected count |
| Unsafe | Never build SQL strings for `$queryRawUnsafe` or `Prisma.raw()` from user input |
| N+1 | Replace loops of queries with `include`, `in: ids`, or `createMany` |
| Parallel reads | `await Promise.all([a, b])`, not sequential awaits |
| Optimistic lock | `updateMany({ where: { id, version }, data: { version: { increment: 1 } } })`; `count === 0` = stale |
| Idempotency | Client sends an idempotency key, stored with a unique constraint |
| Layers | Repository (Prisma queries) > service (business rules, transactions) > procedure (transport) |

Lessons: [Transactions](/group/postgresql-prisma-trpc-betterauth-pino/day/09/01-transactions-interactive-and-batch) · [Batching / N+1](/group/postgresql-prisma-trpc-betterauth-pino/day/09/02-batching-mindset-promise-all-avoiding-n-1-query-counting) · [Raw SQL safety](/group/postgresql-prisma-trpc-betterauth-pino/day/09/03-raw-sql-queryraw-executeraw-safety-rules) · [Consistency patterns](/group/postgresql-prisma-trpc-betterauth-pino/day/09/04-consistency-patterns-optimistic-locking-idempotency-retry)

## BetterAuth

Self-hosted auth library: runs in your app, stores `user`, `session`, `account`, `verification` in your DB. Sessions are DB rows referenced by an `httpOnly` cookie.

```ts
// src/lib/auth.ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
})
export type Session = typeof auth.$Infer.Session

// src/app/api/auth/[...all]/route.ts
export const { GET, POST } = toNextJsHandler(auth.handler)
```

| Where | How |
|---|---|
| Client setup | `createAuthClient({ baseURL })` from `better-auth/react` |
| Sign up / in | `authClient.signUp.email({ name, email, password })`, `signIn.email(...)` |
| Sign out | `authClient.signOut()` then `router.refresh()` |
| React session | `const { data, isPending } = authClient.useSession()` |
| Server Component / Action | `await auth.api.getSession({ headers: await headers() })` |
| Route handler | `auth.api.getSession({ headers: req.headers })` |
| OAuth | `socialProviders: { github: { clientId, clientSecret } }` + `signIn.social({ provider })` |
| Sessions page | `listSessions()`, `revokeSession({ token })`, `revokeOtherSessions()` |
| Schema | `npx auth@latest generate` , then `prisma migrate dev` |

### Config you must know

| Option | Purpose |
|---|---|
| `emailAndPassword.requireEmailVerification` | Block sign-in until verified (pair with `autoSignIn: false`) |
| `emailVerification.sendVerificationEmail({ user, url })` | You send the email; `sendOnSignUp: true` |
| `emailAndPassword.sendResetPassword({ user, url, token })` | Reset flow: `requestPasswordReset` then `resetPassword({ token, newPassword })` |
| `session.cookieCache` | Fewer DB lookups, but revocation is delayed up to `maxAge` |
| `user.additionalFields.role: { type, defaultValue, input: false }` | Server-only fields (no privilege escalation) |
| `plugins: [admin(), twoFactor()]` | Server (`better-auth/plugins`) **and** client (`better-auth/client/plugins`) |
| `trustedOrigins` | CSRF/origin check; list exact origins, never `*` |

**Protection layers:** middleware redirect is a UX gate only; always re-check the session in the Server Component, route handler, or tRPC procedure that touches data.

Lessons: [Auth instance](/group/postgresql-prisma-trpc-betterauth-pino/day/10/02-auth-instance-setup-auth-ts-and-core-config) · [Server-side session](/group/postgresql-prisma-trpc-betterauth-pino/day/10/09-server-side-usage-auth-api-getsession-route-protection) · [Email verification](/group/postgresql-prisma-trpc-betterauth-pino/day/11/02-email-verification-flow-sending-enforcing) · [additionalFields](/group/postgresql-prisma-trpc-betterauth-pino/day/11/07-extra-user-fields-additionalfields-input-control-server-side-setting)

## tRPC: routers, procedures, client

Types flow from server to client through `export type AppRouter = typeof appRouter`. The client imports the **type only**.

```ts
// src/server/trpc.ts  (call initTRPC once)
const t = initTRPC.context<Context>().create({ transformer: superjson })
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// src/server/routers/post.ts
export const postRouter = createTRPCRouter({
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ ctx, input }) =>
      ctx.prisma.post.findUnique({ where: { id: input.id } })),
})
```

| Piece | Syntax / note |
|---|---|
| Root router | `createTRPCRouter({ post: postRouter, user: userRouter })` |
| Context | `createTRPCContext({ headers })`: session, prisma, logger; once per request |
| Input | `.input(zodSchema)`: invalid input = `BAD_REQUEST` with Zod details |
| Output | `.output(zodSchema)`: enforces shape, strips extra keys |
| Types | `inferRouterInputs<AppRouter>`, `inferRouterOutputs<AppRouter>` |
| HTTP adapter | `fetchRequestHandler({ endpoint: '/api/trpc', req, router, createContext })` |
| React client | `createTRPCReact<AppRouter>()` + `httpBatchStreamLink({ url, transformer: superjson })` |
| Server Components | `createCallerFactory(appRouter)(ctx)`: in-process, no HTTP |
| Invalidate | `const utils = trpc.useUtils()` then `utils.post.list.invalidate()` |

Lessons: [What is tRPC](/group/postgresql-prisma-trpc-betterauth-pino/day/12/01-what-is-trpc-and-how-it-fits) · [Procedures](/group/postgresql-prisma-trpc-betterauth-pino/day/12/03-procedures-publicprocedure-and-the-procedure-builder) · [Context](/group/postgresql-prisma-trpc-betterauth-pino/day/12/06-context-createtrpccontext-request-data) · [Client setup](/group/postgresql-prisma-trpc-betterauth-pino/day/12/10-client-setup-createtrpcclient-next-js-app-router)

## tRPC: middleware, auth, errors

```ts
const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, user: ctx.session.user } }) // user non-null
})
export const protectedProcedure = t.procedure.use(enforceAuth)

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (ctx.user?.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' })
  return next()
})
export const adminProcedure = protectedProcedure.use(enforceAdmin)
```

| Rule | Why |
|---|---|
| Always `return next(...)` | Otherwise the procedure never resolves |
| Hierarchy public > protected > admin | Admin check builds on auth, order matters |
| Session read once in context | Not `getSession` inside every handler |
| RBAC in middleware, ownership in handler | Ownership needs the fetched resource |
| Not owner or missing: `NOT_FOUND` | `FORBIDDEN` leaks that the resource exists |
| Compose inputs with Zod | `.extend()` shared base schemas (`A.extend(B.shape)`; `.merge()` is deprecated in Zod 4) |

**`TRPCError` codes:** `BAD_REQUEST` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `TOO_MANY_REQUESTS` 429, `INTERNAL_SERVER_ERROR` 500.

**errorFormatter:** add `zodError: error.cause instanceof ZodError ? error.cause.flatten() : null` to `shape.data`; read `err.data?.zodError?.fieldErrors` on the client. Map Prisma codes to `TRPCError` in one shared `handlePrismaError` helper; never leak raw messages.

Lessons: [Middleware](/group/postgresql-prisma-trpc-betterauth-pino/day/13/01-middleware-t-middleware-next-context-transformation) · [Authorization](/group/postgresql-prisma-trpc-betterauth-pino/day/13/03-authorization-patterns-ownership-and-rbac) · [Error formatting](/group/postgresql-prisma-trpc-betterauth-pino/day/13/06-error-formatting-custom-shapes-client-handling) · [Prisma integration](/group/postgresql-prisma-trpc-betterauth-pino/day/13/07-prisma-integration-transactions-error-codes)

## pino logging

```ts
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'api', env: process.env.NODE_ENV },
  redact: {
    paths: ['password', '*.password', 'req.headers.authorization',
      'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  serializers: { err: pino.stdSerializers.err },
})
logger.info({ userId, orderId }, 'Order created')  // object first, then msg
```

| Level | Number | Use |
|---|---|---|
| `trace` / `debug` | 10 / 20 | Dev diagnostics (off in prod) |
| `info` | 30 | Business events (prod default) |
| `warn` | 40 | Recoverable or expected problems |
| `error` | 50 | Failure that affected a request |
| `fatal` | 60 | Unrecoverable; exit afterwards |

| Topic | Rule |
|---|---|
| Structured fields | `logger.info({ userId }, 'msg')`, not string interpolation |
| Errors | `logger.error({ err }, 'Payment failed')` (err serializer keeps stack) |
| Child logger | `const log = logger.child({ requestId, userId })` per request, not per loop iteration |
| pino-http | `pinoHttp({ logger, genReqId, autoLogging: { ignore: isHealthCheck } })` |
| Request ID | Create once at the edge (or reuse `x-request-id`), pass into tRPC context, return in response header |
| Hygiene | Log identifiers (userId), not data (email, address, card); never `req.body`, tokens, cookies |

Lessons: [Why JSON logs](/group/postgresql-prisma-trpc-betterauth-pino/day/14/01-structured-logging-with-pino-why-json-logs-win) · [Child loggers](/group/postgresql-prisma-trpc-betterauth-pino/day/14/03-child-loggers-context-propagation) · [Request IDs](/group/postgresql-prisma-trpc-betterauth-pino/day/14/05-request-ids-correlation-across-layers) · [Redaction](/group/postgresql-prisma-trpc-betterauth-pino/day/14/07-redaction-scrubbing-secrets-from-logs)

## Production composition

```
request -> proxy.ts (requestId, optimistic auth redirect)
        -> createTRPCContext (session, prisma, child logger)
        -> tRPC middleware (logging > auth > role)
        -> handler (Zod input, service, Prisma, ownership)
        -> errorFormatter (safe shape) + onError (log once)
        -> response (x-request-id header)
```

- **Migrations:** `migrate dev` locally, `migrate deploy` in CI/prod, files in git, immutable once applied.
- **Auth:** validate the secret at startup, HTTPS-only cookies, session expiry, rate-limited auth routes, validated redirect URLs, exact `trustedOrigins`, audited `input` flags.
- **Errors:** `onError` in the tRPC handler logs internal errors once, with `requestId`.

Lessons: [End-to-end flow](/group/postgresql-prisma-trpc-betterauth-pino/day/14/09-end-to-end-backend-flow-composition) · [Migration discipline](/group/postgresql-prisma-trpc-betterauth-pino/day/14/10-migration-discipline-safe-schema-evolution) · [Auth hardening](/group/postgresql-prisma-trpc-betterauth-pino/day/14/11-auth-hardening-betterauth-production-checklist)

## Gotchas

| ❌ Mistake | ✅ Fix |
|---|---|
| `UPDATE` / `DELETE` without `WHERE` | Run the `SELECT` with the same `WHERE` first; use `RETURNING` |
| `NOT IN (subquery)` that can return NULL | `NOT EXISTS (...)` |
| Filter on the right table in `WHERE` after a `LEFT JOIN` | Move the condition into `ON` |
| `FLOAT` for money, `TIMESTAMP` for events | `NUMERIC(12,2)`, `TIMESTAMPTZ` |
| FK column without an index | Add `CREATE INDEX` / `@@index([fk])` |
| Deep `OFFSET` pagination / cursor without tie-breaker | Keyset with unique `id` tie-breaker; Prisma `skip: 1` |
| `new PrismaClient()` per request / hot reload | Singleton on `globalThis` |
| Outer `prisma` used inside `$transaction(async tx => ...)` | Use `tx` for every query inside |
| String-built SQL in `$queryRawUnsafe` | Tagged template `$queryRaw` |
| `set` when you meant to add a relation | `connect` (set replaces all) |
| `prisma db push` or `migrate dev` in production | `prisma migrate deploy` |
| `role` in `additionalFields` without `input: false` | Server-only fields always `input: false` |
| Server plugin without the matching client plugin | Add both `admin()` and `adminClient()` |
| Server superjson, client link without transformer | Same transformer on both sides |
| Logging `req.body` / string-interpolated logs | Log ids as fields; `redact` secrets at logger level |

## Interview quick answers

**Q:** `WHERE` vs `HAVING`?
`WHERE` filters rows before grouping; `HAVING` filters groups after aggregation and can use aggregates.

**Q:** Why `NOT EXISTS` over `NOT IN`?
If the subquery returns any NULL, `NOT IN` yields no rows; `NOT EXISTS` is NULL-safe.

**Q:** PostgreSQL default isolation level and when to go higher?
`READ COMMITTED`. Use `REPEATABLE READ`/`SERIALIZABLE` (or `SELECT FOR UPDATE`) for read-modify-write consistency, and retry serialization failures.

**Q:** Offset vs cursor pagination?
Offset is simple but scans skipped rows; cursor (keyset) is constant-cost and stable under inserts.

**Q:** `migrate dev` vs `migrate deploy` vs `db push`?
`dev` generates and applies migrations locally; `deploy` only applies existing ones in prod; `db push` syncs without history (prototyping).

**Q:** How do you adopt Prisma on an existing database?
`db pull`, clean up the schema, create a baseline migration and `migrate resolve --applied` it, then use `migrate dev` from there.

**Q:** Batch vs interactive `$transaction`?
Batch takes an array of independent queries; interactive gives a `tx` client for dependent logic (read, check, write).

**Q:** How does BetterAuth keep a user logged in?
A random session token in an `httpOnly` cookie points to a `session` row; each request looks it up (optionally via `cookieCache`).

**Q:** How do you protect a page with BetterAuth in Next.js?
`proxy.ts` (Next 16; `middleware.ts` before) for a fast redirect, plus `auth.api.getSession({ headers: await headers() })` in the server code that reads data.

**Q:** How does tRPC give type safety without codegen?
The client imports `typeof appRouter` as a type; inputs and outputs are inferred from Zod schemas and handler returns.

**Q:** Why structured JSON logs with pino?
Every field is queryable in log platforms, pino is very fast, and child loggers attach `requestId` to every line.

**Q:** What must never be logged?
Passwords, tokens, cookies, secrets, full request bodies, and personal data; log identifiers and use `redact`.
