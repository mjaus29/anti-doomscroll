# 4 — Explicit Many-to-Many — Junction Tables with Extra Fields

---

## T — TL;DR

An explicit many-to-many relation uses a **junction model** (join table) that you declare yourself in the schema. Use explicit M:N when the junction table needs extra fields beyond the two FKs (e.g. `enrolledAt`, `role`, `quantity`). The junction model has two FK fields pointing to the two related models, a composite `@@id`, and any additional data fields you need.

---

## K — Key Concepts

```prisma
// ── When to use explicit vs implicit M:N ──────────────────────────────────
// Implicit M:N: no extra data on the join → let Prisma manage the join table
// Explicit M:N: need extra data on the join → declare the junction model yourself

// Example: course enrollment
// Just "student is enrolled in course" → implicit (no extra data needed)
// "student enrolled on DATE with GRADE and STATUS" → explicit (extra fields needed)
```

```prisma
// ── Basic explicit many-to-many ────────────────────────────────────────────
model Student {
  id          Int          @id @default(autoincrement())
  name        String
  enrollments Enrollment[] // back-relation to junction
}

model Course {
  id          Int          @id @default(autoincrement())
  title       String
  enrollments Enrollment[] // back-relation to junction
}

// Junction model — the explicit join table
model Enrollment {
  // Extra fields on the join (this is why explicit is needed)
  enrolledAt DateTime @default(now()) @map("enrolled_at")
  grade      String?
  status     String   @default("active")

  // FK to Student
  studentId  Int      @map("student_id")
  student    Student  @relation(fields: [studentId], references: [id])

  // FK to Course
  courseId   Int      @map("course_id")
  course     Course   @relation(fields: [courseId], references: [id])

  // Composite PK — one enrollment per student per course
  @@id([studentId, courseId])

  @@index([courseId])   // index the second FK (first is part of PK = indexed automatically)
  @@map("enrollments")
}
```

```prisma
// ── Composite PK vs separate ID in junction model ─────────────────────────

// Option A: composite @@id — natural, no extra column (preferred for pure junctions)
model Enrollment {
  studentId Int
  courseId  Int
  @@id([studentId, courseId])
}

// Option B: separate ID — allows multiple enrollments for same pair (re-enrollment)
model Enrollment {
  id        Int      @id @default(autoincrement())
  studentId Int
  courseId  Int
  // @@unique([studentId, courseId]) // optional uniqueness constraint
}
// Use Option B when: re-enrollment is allowed, or you need to reference
// individual enrollment records via a single ID (easier for REST APIs)
```

```prisma
// ── Full explicit M:N with cascade rules ──────────────────────────────────
model Post {
  id          Int         @id @default(autoincrement())
  title       String
  postAuthors PostAuthor[] // junction back-relation
  @@map("posts")
}

model Author {
  id          Int         @id @default(autoincrement())
  name        String
  postAuthors PostAuthor[] // junction back-relation
  @@map("authors")
}

model PostAuthor {
  // Extra fields on the join
  role        String   @default("primary")  // primary / contributor / editor
  addedAt     DateTime @default(now()) @map("added_at")

  // FKs
  postId      Int      @map("post_id")
  post        Post     @relation(
    fields: [postId],
    references: [id],
    onDelete: Cascade   // delete post → remove PostAuthor rows
  )

  authorId    Int      @map("author_id")
  author      Author   @relation(
    fields: [authorId],
    references: [id],
    onDelete: Cascade   // delete author → remove PostAuthor rows
  )

  @@id([postId, authorId])
  @@index([authorId])   // index second FK (postId covered by PK)
  @@map("post_authors")
}
```

```typescript
// ── Querying explicit M:N in Prisma Client ────────────────────────────────

// Enroll a student in a course
await prisma.enrollment.create({
  data: {
    studentId: 1,
    courseId: 5,
    status: "active",
  },
});

// Or via nested write from student:
await prisma.student.update({
  where: { id: 1 },
  data: {
    enrollments: {
      create: {
        courseId: 5,
        status: "active",
      },
    },
  },
});

// Fetch student with enrolled courses + enrollment metadata
const student = await prisma.student.findUnique({
  where: { id: 1 },
  include: {
    enrollments: {
      include: { course: true }, // include the full course data
      where: { status: "active" },
    },
  },
});
// student.enrollments[0].course.title
// student.enrollments[0].enrolledAt

// Fetch course with enrolled students
const course = await prisma.course.findUnique({
  where: { id: 5 },
  select: {
    title: true,
    enrollments: {
      select: {
        enrolledAt: true,
        grade: true,
        student: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: "asc" },
    },
    _count: { select: { enrollments: true } },
  },
});

// Update enrollment (e.g. update grade)
await prisma.enrollment.update({
  where: { studentId_courseId: { studentId: 1, courseId: 5 } },
  //       ↑ Prisma generates this composite unique identifier automatically
  data: { grade: "A" },
});

// Remove enrollment
await prisma.enrollment.delete({
  where: { studentId_courseId: { studentId: 1, courseId: 5 } },
});
```

---

## W — Why It Matters

- Explicit M:N is almost always the right choice for production applications — you almost always end up needing extra metadata on the join (created_at timestamp, status, role, ordering). Starting with implicit M:N and migrating to explicit later requires a migration that changes the join table structure, which is painful. Defaulting to explicit is safer.
- The composite `@@id([a, b])` vs a separate surrogate `@id` affects how you reference individual junction records — composite `@@id` means Prisma generates a `studentId_courseId` where-clause compound type; a separate `id` means you reference records by single integer. REST APIs typically prefer a separate `id` for simplicity.
- The `@index([courseId])` on the second FK is important — the composite `@@id([studentId, courseId])` creates a B-tree index with `studentId` as the leading column. Queries filtering by `courseId` alone (e.g. "all students in course 5") won't use this index efficiently. A separate index on `courseId` is necessary.

---

## I — Interview Q&A

### Q: When should you use an explicit many-to-many junction model instead of Prisma's implicit M:N?

**A:** Use explicit many-to-many whenever the relationship itself carries data beyond the two foreign keys. Examples: a `PostTag` relation that's just "this post has this tag" can be implicit — there's no extra data. A `ProjectMember` relation that stores `role`, `joinedAt`, and `permissions` must be explicit — the junction table needs those extra columns. Additionally, use explicit when: you need to reference individual junction records by ID (REST APIs returning `/enrollments/123`); you need to cascade deletes with specific rules; you need to query junction records directly (e.g. "all active enrollments this month"). In practice, default to explicit in production schemas — adding extra fields to an implicit join table later requires converting it to explicit, which is a more disruptive migration than starting explicit.

---

## C — Common Pitfalls + Fix

### ❌ Not indexing the second FK in an explicit M:N junction table

```prisma
// ❌ Composite @@id covers studentId first — courseId queries are sequential scans
model Enrollment {
  studentId  Int
  courseId   Int
  // No @@index([courseId]) ← every "SELECT * WHERE course_id = ?" is a seq scan ❌
  @@id([studentId, courseId])
}
```

**Fix:** Add an index on the non-leading FK:

```prisma
// ✅
model Enrollment {
  studentId  Int      @map("student_id")
  courseId   Int      @map("course_id")
  enrolledAt DateTime @default(now()) @map("enrolled_at")

  @@id([studentId, courseId])
  @@index([courseId])  // ← enables fast "all students in course X" queries ✅
  @@map("enrollments")
}
```

---

## K — Coding Challenge + Solution

### Challenge

Design a `User ↔ Project` many-to-many for a project management app where: (1) a `ProjectMembership` junction model stores `role` (enum: OWNER, ADMIN, MEMBER, VIEWER), `joinedAt`, and `invitedById`; (2) both FKs cascade on delete; (3) a user can only have one membership per project (composite `@@id`); (4) include a separate `@@index` on `projectId`; (5) show TypeScript: invite a user to a project, list a project's members with roles, change a user's role, remove a member.

### Solution

```prisma
enum MemberRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER

  @@map("member_role")
}

model User {
  id          Int                @id @default(autoincrement())
  email       String             @unique
  name        String?
  memberships ProjectMembership[] // back-relation
  invitedMembers ProjectMembership[] @relation("inviter") // back-relation for invited

  @@map("users")
}

model Project {
  id          Int                @id @default(autoincrement())
  name        String
  slug        String             @unique
  memberships ProjectMembership[] // back-relation

  @@map("projects")
}

model ProjectMembership {
  role        MemberRole @default(MEMBER)
  joinedAt    DateTime   @default(now()) @map("joined_at") @db.Timestamptz

  // FK to User (the member)
  userId      Int        @map("user_id")
  user        User       @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  // FK to Project
  projectId   Int        @map("project_id")
  project     Project    @relation(
    fields: [projectId],
    references: [id],
    onDelete: Cascade
  )

  // FK to User (who invited — optional, nullable)
  invitedById Int?       @map("invited_by_id")
  invitedBy   User?      @relation(
    "inviter",
    fields: [invitedById],
    references: [id],
    onDelete: SetNull
  )

  @@id([userId, projectId])
  @@index([projectId])     // fast "all members of project X"
  @@index([invitedById])   // fast "all members invited by user X"
  @@map("project_memberships")
}
```

```typescript
import { MemberRole } from "@prisma/client";

// Invite a user to a project
await prisma.projectMembership.create({
  data: {
    userId: 5, // the invitee
    projectId: 2,
    role: MemberRole.MEMBER,
    invitedById: 1, // the inviter
  },
});

// List a project's members with their roles
const project = await prisma.project.findUnique({
  where: { id: 2 },
  select: {
    name: true,
    memberships: {
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    },
    _count: { select: { memberships: true } },
  },
});

// Change a user's role
await prisma.projectMembership.update({
  where: { userId_projectId: { userId: 5, projectId: 2 } },
  data: { role: MemberRole.ADMIN },
});

// Remove a member
await prisma.projectMembership.delete({
  where: { userId_projectId: { userId: 5, projectId: 2 } },
});
```

---

---
