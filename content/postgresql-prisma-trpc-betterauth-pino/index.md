# Full Curriculum Overview — PostgreSQL-Prisma-tRPC-BetterAuth-pino

This index was generated from the `PostgreSQL-Prisma-tRPC-BetterAuth-pino` folder.

Day 1

- [Install and Connect — PostgreSQL Setup](day-01/01-install-and-connect-postgresql-setup.md)
- [Databases and Schemas — Logical Organisation](day-01/02-databases-and-schemas-logical-organisation.md)
- [Tables — Structure and Data Types](day-01/03-tables-structure-and-data-types.md)
- [Rows — INSERT, UPDATE, DELETE](day-01/04-rows-insert-update-delete.md)
- [SQL Workflow — Execution Order Mental Model](day-01/05-sql-workflow-execution-order-mental-model.md)
- [Basic SELECT — Columns, Expressions, Literals](day-01/06-basic-select-columns-expressions-literals.md)
- [Filtering with WHERE — Conditions and Operators](day-01/07-filtering-with-where-conditions-and-operators.md)
- [Sorting with ORDER BY](day-01/08-sorting-with-order-by.md)
- [Aliases — AS for Columns and Tables](day-01/09-aliases-as-for-columns-and-tables.md)

Day 2

- [Data Types Deep Dive — Choosing the Right Type](day-02/01-data-types-deep-dive-choosing-the-right-type.md)
- [PRIMARY KEY — Identity, Serial, and Composite Keys](day-02/02-primary-key-identity-serial-and-composite-keys.md)
- [NOT NULL — Preventing Missing Data](day-02/03-not-null-preventing-missing-data.md)
- [UNIQUE Constraints — Column and Multi-Column](day-02/04-unique-constraints-column-and-multi-column.md)
- [CHECK Constraints — Custom Validation Rules](day-02/05-check-constraints-custom-validation-rules.md)
- [FOREIGN KEY — Referential Integrity and Cascade Behaviour](day-02/06-foreign-key-referential-integrity-and-cascade-behaviour.md)
- [Normalization Basics — 1NF, 2NF, 3NF](day-02/07-normalization-basics-1nf-2nf-3nf.md)
- [INSERT Patterns — Single, Bulk, Upsert, RETURNING](day-02/08-insert-patterns-single-bulk-upsert-returning.md)
- [UPDATE Patterns — Safe Updates and Computed Values](day-02/09-update-patterns-safe-updates-and-computed-values.md)
- [DELETE Patterns — Safe Deletes, Cascade, Soft Delete](day-02/10-delete-patterns-safe-deletes-cascade-soft-delete.md)

Day 3

- [INNER JOIN — Matching Rows Between Tables](day-03/01-inner-join-matching-rows-between-tables.md)
- [LEFT, RIGHT, and FULL JOIN — Including Non-Matching Rows](day-03/02-left-right-and-full-join-including-non-matching-rows.md)
- [Join Conditions — ON, USING, Multiple Tables, Self-Join](day-03/03-join-conditions-on-using-multiple-tables-self-join.md)
- [Aggregate Functions — COUNT, SUM, AVG, MIN, MAX](day-03/04-aggregate-functions-count-sum-avg-min-max.md)
- [GROUP BY — Grouping Rows for Aggregation](day-03/05-group-by-grouping-rows-for-aggregation.md)
- [HAVING — Filtering Aggregated Groups](day-03/06-having-filtering-aggregated-groups.md)
- [Subqueries — Scalar, List, EXISTS, Correlated](day-03/07-subqueries-scalar-list-exists-correlated.md)
- [CTEs — WITH Clauses for Readable Multi-Step Queries](day-03/08-ctes-with-clauses-for-readable-multi-step-queries.md)
- [Views — Reusable Query Logic as Named Objects](day-03/09-views-reusable-query-logic-as-named-objects.md)

Day 4

- [Transactions — BEGIN, COMMIT, ROLLBACK, SAVEPOINT](day-04/01-transactions-begin-commit-rollback-savepoint.md)
- [Isolation Levels — Concurrency Anomalies and How to Prevent Them](day-04/02-isolation-levels-concurrency-anomalies-and-how-to-prevent-them.md)
- [Row-Level Locking — SELECT FOR UPDATE and SKIP LOCKED](day-04/03-row-level-locking-select-for-update-and-skip-locked.md)
- [Indexes Deep Dive — B-tree Internals, When They Help, When They Don't](day-04/04-indexes-deep-dive-b-tree-internals-when-they-help-when-they-dont.md)
- [Index Types — Partial, Composite, Expression, GIN, BRIN](day-04/05-index-types-partial-composite-expression-gin-brin.md)
- [EXPLAIN and EXPLAIN ANALYZE — Reading Query Plans](day-04/06-explain-and-explain-analyze-reading-query-plans.md)
- [Query Optimization Patterns — Anti-Patterns and Rewrites](day-04/07-query-optimization-patterns-anti-patterns-and-rewrites.md)
- [Pagination Patterns — OFFSET vs Cursor-Based](day-04/08-pagination-patterns-offset-vs-cursor-based.md)
- [Bulk Write Patterns — COPY, Batch Inserts, Upserts at Scale](day-04/09-bulk-write-patterns-copy-batch-inserts-upserts-at-scale.md)

Day 5

- [schema.prisma — File Structure and the Three Blocks](day-05/01-schema-prisma-file-structure-and-the-three-blocks.md)
- [datasource — Connecting to PostgreSQL](day-05/02-datasource-connecting-to-postgresql.md)
- [generator — Prisma Client Configuration](day-05/03-generator-prisma-client-configuration.md)
- [Models — Declaring Tables and Fields](day-05/04-models-declaring-tables-and-fields.md)
- [Field Types — Scalar Types and the Type Mapping Rules](day-05/05-field-types-scalar-types-and-the-type-mapping-rules.md)
- [Field Modifiers — Optional, List, Default, @id, @unique, @updatedAt](day-05/06-field-modifiers-optional-list-default-id-unique-updatedat.md)
- [Enums — Type-Safe Categorical Values](day-05/07-enums-type-safe-categorical-values.md)
- [Native Type Mapping — Precise PostgreSQL Type Control](day-05/08-native-type-mapping-precise-postgresql-type-control.md)
- [Model-to-Table Mapping — @@map, @map, @@schema, Naming Conventions](day-05/09-model-to-table-mapping-map-map-schema-naming-conventions.md)
- [Prisma Client Generation — prisma generate, Output, and Usage](day-05/10-prisma-client-generation-prisma-generate-output-and-usage.md)

Day 6

- [Relations — Core Concepts and How Prisma Models Them](day-06/01-relations-core-concepts-and-how-prisma-models-them.md)
- [One-to-Many Relations — The Most Common Relation](day-06/02-one-to-many-relations-the-most-common-relation.md)
- [One-to-One Relations — Exclusive Ownership](day-06/03-one-to-one-relations-exclusive-ownership.md)
- [Explicit Many-to-Many — Junction Tables with Extra Fields](day-06/04-explicit-many-to-many-junction-tables-with-extra-fields.md)
- [Implicit Many-to-Many — Prisma-Managed Join Tables](day-06/05-implicit-many-to-many-prisma-managed-join-tables.md)
- [@relation — Deep Dive on the Relation Attribute](day-06/06-relation-deep-dive-on-the-relation-attribute.md)
- [Relation Modes — foreignKeys vs prisma](day-06/07-relation-modes-foreignkeys-vs-prisma.md)
- [Initial Migration — prisma migrate dev from Zero](day-06/08-initial-migration-prisma-migrate-dev-from-zero.md)
- [Iterative Migration Workflow — Evolving the Schema Safely](day-06/09-iterative-migration-workflow-evolving-the-schema-safely.md)
- [Migration History, Squashing, and Production Deploy](day-06/10-migration-history-squashing-and-production-deploy.md)

Day 7

- [Introspection — `prisma db pull` and Reading Existing Databases](day-07/01-introspection-prisma-db-pull-and-reading-existing-databases.md)
- [Working with an Existing Database — Full Adoption Workflow](day-07/02-working-with-an-existing-database-full-adoption-workflow.md)
- [Baseline Migration Mindset — Starting Migrations Mid-Project](day-07/03-baseline-migration-mindset-starting-migrations-mid-project.md)
- [Schema Evolution — Safe Patterns for Changing Live Data](day-07/04-schema-evolution-safe-patterns-for-changing-live-data.md)
- [Unsupported Feature Awareness — What Prisma Can't Do (Yet)](day-07/05-unsupported-feature-awareness-what-prisma-cant-do-yet.md)
- [`prisma migrate diff` — Generating and Auditing SQL Diffs](day-07/06-prisma-migrate-diff-generating-and-auditing-sql-diffs.md)
- [Raw SQL with `$queryRaw` and `$executeRaw`](day-07/07-raw-sql-with-queryraw-and-executeraw.md)
- [Custom SQL in Migrations — Triggers, Views, Functions](day-07/08-custom-sql-in-migrations-triggers-views-functions.md)
- [`prisma db seed` — Seeding and Test Data Workflows](day-07/09-prisma-db-seed-seeding-and-test-data-workflows.md)
- [Prisma Studio and Introspection Debugging](day-07/10-prisma-studio-and-introspection-debugging.md)

Day 8

- [CRUD — create, findUnique, update, delete, upsert](day-08/01-crud-create-findunique-update-delete-upsert.md)
- [select — Field Selection and Partial Return Types](day-08/02-select-field-selection-and-partial-return-types.md)
- [include — Loading Relations Eagerly](day-08/03-include-loading-relations-eagerly.md)
- [Filtering — where, Operators, and Field Filters](day-08/04-filtering-where-operators-and-field-filters.md)
- [Sorting — orderBy, Multi-field, Relation Sorting](day-08/05-sorting-orderby-multi-field-relation-sorting.md)
- [Pagination — take/skip and Cursor-Based](day-08/06-pagination-take-skip-and-cursor-based.md)
- [Nested Reads — Deep select, include, and Combining Both](day-08/07-nested-reads-deep-select-include-and-combining-both.md)
- [Nested Writes — Creating and Updating Across Relations](day-08/08-nested-writes-creating-and-updating-across-relations.md)
- [Relation Queries — Filtering, some/every/none, \_count](day-08/09-relation-queries-filtering-some-every-none-count.md)
- [Aggregation — count, sum, avg, min, max, groupBy](day-08/10-aggregation-count-sum-avg-min-max-groupby.md)

Day 9

- [Transactions — Interactive and Batch](day-09/01-transactions-interactive-and-batch.md)
- [Batching Mindset — Promise.all, Avoiding N+1, Query Counting](day-09/02-batching-mindset-promise-all-avoiding-n-1-query-counting.md)
- [Raw SQL — $queryRaw, $executeRaw, Safety Rules](day-09/03-raw-sql-queryraw-executeraw-safety-rules.md)
- [Consistency Patterns — Optimistic Locking, Idempotency, Retry](day-09/04-consistency-patterns-optimistic-locking-idempotency-retry.md)
- [Data-Layer Organization — Services, Repositories, Procedures](day-09/05-data-layer-organization-services-repositories-procedures.md)

Day 10

- [BetterAuth Overview — What It Is and How It Fits](day-10/01-betterauth-overview-what-it-is-and-how-it-fits.md)
- [Auth Instance Setup — `auth.ts` and Core Config](day-10/02-auth-instance-setup-auth-ts-and-core-config.md)
- [Prisma Adapter — Schema, Migration, DB Persistence](day-10/03-prisma-adapter-schema-migration-db-persistence.md)
- [Session Basics — Storage, Cookies, the Session Object](day-10/04-session-basics-storage-cookies-the-session-object.md)
- [Sign Up — Email & Password Registration Flow](day-10/05-sign-up-email-password-registration-flow.md)
- [Sign In — Email & Password Authentication Flow](day-10/06-sign-in-email-password-authentication-flow.md)
- [Sign Out — Session Invalidation and Cleanup](day-10/07-sign-out-session-invalidation-and-cleanup.md)
- [Client-Side Usage — `createAuthClient`, React Hooks](day-10/08-client-side-usage-createauthclient-react-hooks.md)
- [Server-Side Usage — `auth.api`, `getSession`, Route Protection](day-10/09-server-side-usage-auth-api-getsession-route-protection.md)
- [Trusted Origins, CORS, and Environment Config](day-10/10-trusted-origins-cors-and-environment-config.md)

Day 11

- [Email/Password Options — Rules, Auto Sign-In, Custom Hashing](day-11/01-email-password-options-rules-auto-sign-in-custom-hashing.md)
- [Email Verification — Flow, Sending, Enforcing](day-11/02-email-verification-flow-sending-enforcing.md)
- [Password Reset — Flow, Token Lifecycle, Sending](day-11/03-password-reset-flow-token-lifecycle-sending.md)
- [Session Control — Listing, Revoking, Rotating, Force Sign-Out](day-11/04-session-control-listing-revoking-rotating-force-sign-out.md)
- [OAuth Providers — Google and GitHub Setup](day-11/05-oauth-providers-google-and-github-setup.md)
- [Plugins — What They Are, Built-In Options, Wiring](day-11/06-plugins-what-they-are-built-in-options-wiring.md)
- [Extra User Fields — additionalFields, Input Control, Server-Side Setting](day-11/07-extra-user-fields-additionalfields-input-control-server-side-setting.md)
- [Schema Generation and Migration Options](day-11/08-schema-generation-and-migration-options.md)

Day 12

- [What Is tRPC and How It Fits](day-12/01-what-is-trpc-and-how-it-fits.md)
- [Routers — createTRPCRouter, Sub-Routers, appRouter](day-12/02-routers-createtrpcrouter-sub-routers-approuter.md)
- [Procedures — publicProcedure and the Procedure Builder](day-12/03-procedures-publicprocedure-and-the-procedure-builder.md)
- [Queries — Defining and Calling](day-12/04-queries-defining-and-calling.md)
- [Mutations — Defining and Calling](day-12/05-mutations-defining-and-calling.md)
- [Context — createTRPCContext, Request Data](day-12/06-context-createtrpccontext-request-data.md)
- [Input Validators — Zod Integration](day-12/07-input-validators-zod-integration.md)
- [Output Validators — Return Type Safety](day-12/08-output-validators-return-type-safety.md)
- [Type Inference — Types Across Client and Server](day-12/09-type-inference-types-across-client-and-server.md)
- [Client Setup — createTRPCClient, Next.js App Router](day-12/10-client-setup-createtrpcclient-next-js-app-router.md)

Day 13

- [Middleware — t.middleware, next(), Context Transformation](day-13/01-middleware-t-middleware-next-context-transformation.md)
- [Stacked .input() — Chaining and Middleware Input](day-13/02-stacked-input-chaining-and-middleware-input.md)
- [Authorization Patterns — Ownership and RBAC](day-13/03-authorization-patterns-ownership-and-rbac.md)
- [Protected Procedures — Typed Procedure Hierarchy](day-13/04-protected-procedures-typed-procedure-hierarchy.md)
- [Auth-Aware Context — BetterAuth Session, User Typing](day-13/05-auth-aware-context-betterauth-session-user-typing.md)
- [Error Formatting — Custom Shapes, Client Handling](day-13/06-error-formatting-custom-shapes-client-handling.md)
- [Prisma Integration — Transactions, Error Codes](day-13/07-prisma-integration-transactions-error-codes.md)
- [BetterAuth Session-Based Access Control — Full Patterns](day-13/08-betterauth-session-based-access-control-full-patterns.md)

Day 14

- [Structured Logging with Pino — Why JSON Logs Win](day-14/01-structured-logging-with-pino-why-json-logs-win.md)
- [Log Levels — When to Use Each](day-14/02-log-levels-when-to-use-each.md)
- [Child Loggers — Context Propagation](day-14/03-child-loggers-context-propagation.md)
- [pino-http — Request Logging Middleware](day-14/04-pino-http-request-logging-middleware.md)
- [Request IDs — Correlation Across Layers](day-14/05-request-ids-correlation-across-layers.md)
- [Serializers — Shaping Log Output](day-14/06-serializers-shaping-log-output.md)
- [Redaction — Scrubbing Secrets from Logs](day-14/07-redaction-scrubbing-secrets-from-logs.md)
- [Secure Log Hygiene — What Never Goes in Logs](day-14/08-secure-log-hygiene-what-never-goes-in-logs.md)
- [End-to-End Backend Flow — Composition](day-14/09-end-to-end-backend-flow-composition.md)
- [Migration Discipline — Safe Schema Evolution](day-14/10-migration-discipline-safe-schema-evolution.md)
- [Auth Hardening — BetterAuth Production Checklist](day-14/11-auth-hardening-betterauth-production-checklist.md)
