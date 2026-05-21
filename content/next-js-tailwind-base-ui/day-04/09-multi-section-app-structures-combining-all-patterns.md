# 9 — Multi-Section App Structures — Combining All Patterns

---

## T — TL;DR

Real production apps combine every routing pattern at once: route groups for layout isolation, dynamic segments for entities, catch-all routes for content, nested layouts for context, and `generateStaticParams` for performance. This subtopic assembles them all into a complete, real-world app structure.

---

## K — Key Concepts

### The Reference App — "SaaSHub" Route Map

```
SaaSHub: a SaaS product with a public site, auth, app, admin, and docs

PUBLIC SECTION:
  /                         → Landing page
  /pricing                  → Pricing page
  /blog                     → Blog home
  /blog/[slug]              → Blog post
  /changelog                → Changelog

AUTH SECTION:
  /login                    → Login
  /register                 → Register
  /forgot-password          → Forgot password
  /verify-email             → Email verification

ONBOARDING SECTION:
  /onboarding               → Welcome step
  /onboarding/workspace     → Create workspace step
  /onboarding/invite        → Invite team step
  /onboarding/done          → Completion step

APP SECTION (authenticated):
  /app                      → App home / redirect
  /app/[workspaceId]                → Workspace overview
  /app/[workspaceId]/projects       → Project list
  /app/[workspaceId]/projects/[id]  → Project detail
  /app/[workspaceId]/members        → Member management
  /app/[workspaceId]/settings       → Workspace settings

ACCOUNT SECTION:
  /account                  → Account overview
  /account/profile          → Profile settings
  /account/security         → Security settings
  /account/billing          → Billing / subscription

DOCS SECTION:
  /docs                     → Docs home
  /docs/[[...path]]         → All doc pages

ADMIN SECTION (admin role required):
  /admin                    → Admin overview
  /admin/users              → User management
  /admin/workspaces         → Workspace management
  /admin/billing            → Billing overview
  /admin/logs               → Audit logs

API ROUTES:
  /api/auth/[...nextauth]   → Auth callbacks
  /api/workspaces           → Workspace CRUD
  /api/projects             → Project CRUD
  /api/webhooks/stripe      → Stripe webhooks
```

### Complete Directory Structure

```
src/app/
│
├── layout.tsx                              ← ROOT (html, body, providers, fonts)
├── globals.css
├── _providers.tsx                          ← 'use client' — QueryClient, ThemeProvider
│
├── (public)/                               ← top nav + footer
│   ├── layout.tsx
│   ├── page.tsx                            → /
│   ├── pricing/page.tsx                    → /pricing
│   ├── changelog/page.tsx                  → /changelog
│   └── blog/
│       ├── layout.tsx                      ← blog shell layout
│       ├── page.tsx                        → /blog
│       ├── [slug]/
│       │   ├── page.tsx                    → /blog/:slug
│       │   ├── loading.tsx
│       │   ├── not-found.tsx
│       │   └── opengraph-image.tsx
│       └── feed.xml/route.ts              → /blog/feed.xml
│
├── (auth)/                                 ← centered card, no nav
│   ├── layout.tsx
│   ├── login/page.tsx                      → /login
│   ├── register/page.tsx                   → /register
│   ├── forgot-password/page.tsx            → /forgot-password
│   └── verify-email/page.tsx              → /verify-email
│
├── (onboarding)/                           ← full-screen stepper
│   ├── layout.tsx
│   └── onboarding/
│       ├── page.tsx                        → /onboarding
│       ├── workspace/page.tsx              → /onboarding/workspace
│       ├── invite/page.tsx                 → /onboarding/invite
│       └── done/page.tsx                   → /onboarding/done
│
├── (app)/                                  ← sidebar, auth required
│   ├── layout.tsx                          ← auth guard + shell
│   └── app/
│       ├── page.tsx                        → /app (redirect to last workspace)
│       └── [workspaceId]/
│           ├── layout.tsx                  ← fetch workspace, workspace nav
│           ├── page.tsx                    → /app/:workspaceId
│           ├── projects/
│           │   ├── page.tsx                → /app/:workspaceId/projects
│           │   ├── new/page.tsx            → /app/:workspaceId/projects/new (STATIC)
│           │   └── [projectId]/
│           │       ├── layout.tsx          ← fetch project, project tabs
│           │       ├── page.tsx            → /app/:workspaceId/projects/:projectId
│           │       └── settings/page.tsx   → /app/:workspaceId/projects/:projectId/settings
│           ├── members/page.tsx            → /app/:workspaceId/members
│           └── settings/
│               ├── layout.tsx              ← settings tabs nav
│               ├── page.tsx                → /app/:workspaceId/settings
│               └── billing/page.tsx        → /app/:workspaceId/settings/billing
│
├── (account)/                              ← account settings, auth required
│   ├── layout.tsx
│   └── account/
│       ├── layout.tsx                      ← account tabs nav
│       ├── page.tsx                        → /account
│       ├── profile/page.tsx                → /account/profile
│       ├── security/page.tsx               → /account/security
│       └── billing/page.tsx                → /account/billing
│
├── (docs)/                                 ← docs sidebar
│   ├── layout.tsx
│   └── docs/
│       └── [[...path]]/
│           └── page.tsx                    → /docs AND /docs/*
│
├── (admin)/                                ← admin sidebar, admin role required
│   ├── layout.tsx
│   └── admin/
│       ├── page.tsx                        → /admin
│       ├── users/page.tsx                  → /admin/users
│       ├── workspaces/page.tsx             → /admin/workspaces
│       ├── billing/page.tsx                → /admin/billing
│       └── logs/page.tsx                   → /admin/logs
│
├── sitemap.ts                              → /sitemap.xml
├── robots.ts                               → /robots.txt
├── favicon.ico
├── opengraph-image.png
│
└── api/
    ├── auth/
    │   └── [...nextauth]/route.ts          → /api/auth/*
    ├── workspaces/
    │   └── route.ts                        → /api/workspaces
    ├── projects/
    │   └── route.ts                        → /api/projects
    └── webhooks/
        └── stripe/route.ts                 → /api/webhooks/stripe
```

### The Root Layout — Ties It All Together

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./_providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://saashub.com"
  ),
  title: {
    template: "%s | SaaSHub",
    default: "SaaSHub — Build Better Products",
  },
  description: "The all-in-one workspace for modern teams.",
  openGraph: {
    type: "website",
    siteName: "SaaSHub",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", creator: "@saashub" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Layout Decision Matrix — Which Pattern for Each Section

```
Section         Route Group    Layout Type          Auth Required   Dynamic?
─────────────   ───────────    ─────────────────    ─────────────   ────────
Public          (public)       top nav + footer      No             blog [slug]
Auth            (auth)         centered card          No             No
Onboarding      (onboarding)   full-screen stepper    Yes (user)     No
App             (app)          sidebar                Yes (user)     [workspaceId]
Account         (account)      settings tabs          Yes (user)     No
Docs            (docs)         sidebar + TOC          No             [[...path]]
Admin           (admin)        admin sidebar          Yes (admin)    No
```

### Workspace Layout — Entity-Scoped with Sub-Nav

```tsx
// src/app/(app)/app/[workspaceId]/layout.tsx
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

async function getWorkspace(userId: string, workspaceId: string) {
  // In production: verify user has access to this workspace
  return { id: workspaceId, name: "Acme Corp", plan: "pro" };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspace(user.id, workspaceId);
  if (!workspace) notFound();

  const NAV = [
    { label: "Overview", href: `/app/${workspaceId}` },
    { label: "Projects", href: `/app/${workspaceId}/projects` },
    { label: "Members", href: `/app/${workspaceId}/members` },
    { label: "Settings", href: `/app/${workspaceId}/settings` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <div className="h-12 bg-white border-b flex items-center px-6 gap-4 shrink-0">
        <span className="font-semibold text-gray-900">{workspace.name}</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
          {workspace.plan}
        </span>
        <nav className="flex gap-1 ml-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-md text-sm text-gray-500
                         hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {/* Page content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
```

### Render Trees for Key Routes

```
Route: / (landing page)
  <RootLayout>
    <PublicLayout>           ← top nav + footer
      <LandingPage />
    </PublicLayout>
  </RootLayout>

Route: /login
  <RootLayout>
    <AuthLayout>             ← centered card, no nav
      <LoginPage />
    </AuthLayout>
  </RootLayout>

Route: /app/acme/projects/proj-1
  <RootLayout>
    <AppLayout>              ← auth guard + sidebar (user fetched)
      <WorkspaceLayout>      ← workspace top bar (workspace fetched)
        <ProjectLayout>      ← project tabs (project fetched)
          <ProjectPage />    ← project content
        </ProjectLayout>
      </WorkspaceLayout>
    </AppLayout>
  </RootLayout>

Route: /docs/api/authentication
  <RootLayout>
    <DocsLayout>             ← docs sidebar + TOC
      <DocsPage />           ← [[...path]] catches /api/authentication
    </DocsLayout>
  </RootLayout>

Route: /admin/users
  <RootLayout>
    <AdminLayout>            ← admin sidebar (admin role check)
      <AdminUsersPage />
    </AdminLayout>
  </RootLayout>
```

---

## W — Why It Matters

- Real apps are never a single section — they combine public marketing, auth flows, onboarding, app shell, settings, and admin. Understanding how route groups isolate each section cleanly is what separates a messy monolith from a well-architected app.
- The workspace-scoped URL pattern (`/app/[workspaceId]/projects`) is the industry standard for multi-tenant SaaS — the workspaceId in the URL makes deep linking work, allows multiple workspaces in separate tabs, and enables permission checks at the layout level.
- The layout decision matrix (which auth, which layout type, which group) is the architectural thinking you need before starting any Next.js project — getting this wrong at the start means painful refactoring later.
- Knowing which data to fetch at which layout level (user in `(app)/layout.tsx`, workspace in `[workspaceId]/layout.tsx`, project in `[projectId]/layout.tsx`) ensures data is fetched at the highest point it's needed, never re-fetched unnecessarily, and scoped correctly.

---

## I — Interview Q&A

### Q1: How do you handle multiple workspaces for a user in the URL structure?

**A:** Use a dynamic segment `[workspaceId]` as the top-level segment of the app section — `/app/[workspaceId]/...`. Each workspace has its own URL namespace. Users can have multiple workspace tabs open simultaneously (`/app/acme/projects` and `/app/beta-corp/projects`). The workspace layout fetches and validates workspace membership — if the user doesn't have access to a workspace, they get a 404 or redirect. The workspaceId makes deep links work: share `/app/acme/projects/proj-1` and the recipient goes directly to that project in that workspace.

### Q2: How do you prevent someone from accessing `/app/other-company/projects`?

**A:** At the workspace layout level (`[workspaceId]/layout.tsx`), after confirming the user is authenticated, fetch the workspace AND verify the user has access to it. If `getWorkspace(user.id, workspaceId)` returns null (no access), call `notFound()`. This is a server-side check that runs before any page content renders. Middleware can add a first layer of auth, but the workspace-level authorization must happen in the layout where you know both the user and the workspace.

### Q3: How do you share the user object across all authenticated sections without re-fetching?

**A:** Use React's `cache()` to wrap the `getCurrentUser()` function. The first call to `getCurrentUser()` in `(app)/layout.tsx` hits the database. Any subsequent call within the same request — in a deeper layout, a page, or a Server Component — returns the cached result. This means the user is fetched exactly once per request regardless of how many layouts call it. For the app-wide provider pattern (making user available to Client Components), pass the user as a prop to a client-side context provider inside the root layout.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Putting everything in one giant layout with conditional rendering

```tsx
// ❌ One layout trying to be all things
export default function RootLayout({ children }) {
  const pathname = usePathname(); // ← hooks in Server Component = error
  const showSidebar = pathname.startsWith("/app");
  const showNav = pathname.startsWith("/blog");
  // Grows to hundreds of lines, impossible to maintain
}
```

**Fix:** Use route groups — each section has its own focused layout:

```
(public)/layout.tsx   → 20 lines (nav + footer)
(auth)/layout.tsx     → 10 lines (centered card)
(app)/layout.tsx      → 30 lines (sidebar + auth)
(admin)/layout.tsx    → 25 lines (admin sidebar + role check)
```

### ❌ Pitfall: Forgetting workspace authorization — only checking authentication

```tsx
// ❌ Only checks if user is logged in — not if they have workspace access
export default async function WorkspaceLayout({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ← Missing: does this user have access to this workspaceId?
  return <>{children}</>;
}
```

**Fix:**

```tsx
export default async function WorkspaceLayout({ children, params }) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getUserWorkspace(user.id, workspaceId); // ← authorization check
  if (!workspace) notFound(); // ← user doesn't have access

  return <>{children}</>;
}
```

### ❌ Pitfall: Duplicating the docs catch-all across multiple files

```
src/app/(docs)/docs/
├── page.tsx                    ← home
├── getting-started/page.tsx    ← manually created
├── api/page.tsx                ← manually created
├── api/auth/page.tsx           ← manually created
// 50 more manual files...
```

**Fix:** Use `[[...path]]` with one file and dynamic content loading:

```
src/app/(docs)/docs/
└── [[...path]]/
    └── page.tsx    ← handles ALL docs routes including home
```

---

## K — Coding Challenge + Solution

### Challenge

Build the core of the `(app)` section with:

1. `(app)/layout.tsx` — auth guard, sidebar with workspace switcher, user menu
2. `app/[workspaceId]/layout.tsx` — workspace nav bar with 4 tabs
3. `app/[workspaceId]/page.tsx` — workspace overview with 3 stat cards
4. Rendered tree documented in comments
5. All params typed and awaited

### Solution

```tsx
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

async function getCurrentUser() {
  // Mock — replace with real auth
  return {
    id: "u1",
    name: "Mark Austin",
    email: "mark@example.com",
    avatarInitial: "M",
  };
}

async function getUserWorkspaces(userId: string) {
  return [
    { id: "acme", name: "Acme Corp" },
    { id: "beta-co", name: "Beta Co" },
  ];
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Rendered tree: <RootLayout> → <AppLayout> → [WorkspaceLayout] → [Page]
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/app");

  const workspaces = await getUserWorkspaces(user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* ─── Global sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        {/* App logo */}
        <div className="p-4 border-b border-slate-700">
          <Link href="/app" className="font-bold text-lg text-white">
            SaaSHub
          </Link>
        </div>

        {/* Workspace list */}
        <div className="p-3 flex-1 overflow-auto">
          <p className="text-xs text-slate-500 font-semibold uppercase px-2 mb-2">
            Workspaces
          </p>
          <ul className="space-y-0.5">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/app/${ws.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                             text-slate-400 hover:text-white hover:bg-slate-800
                             transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded bg-blue-600 flex items-center
                                   justify-center text-xs font-bold shrink-0"
                  >
                    {ws.name[0]}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-700 pt-3">
            <Link
              href="/account"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                         text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Account
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                         text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Docs
            </Link>
          </div>
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-7 h-7 rounded-full bg-blue-500 flex items-center
                            justify-center text-xs font-bold shrink-0"
            >
              {user.avatarInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main content area — workspace layout renders here */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/layout.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

async function getWorkspace(workspaceId: string) {
  const workspaces: Record<
    string,
    { name: string; plan: "free" | "pro" | "enterprise" }
  > = {
    acme: { name: "Acme Corp", plan: "pro" },
    "beta-co": { name: "Beta Co", plan: "enterprise" },
  };
  return workspaces[workspaceId] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);
  return {
    title: {
      template: `%s — ${workspace?.name ?? "Workspace"}`,
      default: workspace?.name ?? "Workspace",
    },
  };
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  // Rendered tree: <AppLayout> → <WorkspaceLayout> → [Page]
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) notFound();

  const PLAN_STYLE: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    pro: "bg-blue-100 text-blue-700",
    enterprise: "bg-purple-100 text-purple-700",
  };

  const TABS = [
    { label: "Overview", href: `/app/${workspaceId}` },
    { label: "Projects", href: `/app/${workspaceId}/projects` },
    { label: "Members", href: `/app/${workspaceId}/members` },
    { label: "Settings", href: `/app/${workspaceId}/settings` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Workspace top bar */}
      <header className="h-14 bg-white border-b flex items-center px-6 gap-3 shrink-0">
        <h1 className="font-semibold text-gray-900">{workspace.name}</h1>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PLAN_STYLE[workspace.plan]}`}
        >
          {workspace.plan}
        </span>

        {/* Tab navigation */}
        <nav className="flex gap-0.5 ml-4" aria-label="Workspace navigation">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-3 py-1.5 rounded-md text-sm text-gray-500
                         hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
```

```tsx
// src/app/(app)/app/[workspaceId]/page.tsx
// Rendered tree: <RootLayout> → <AppLayout> → <WorkspaceLayout> → <WorkspaceOverviewPage>
import type { Metadata } from "next";
import Link from "next/link";

type Params = Promise<{ workspaceId: string }>;

export const metadata: Metadata = { title: "Overview" };

const STATS = [
  {
    label: "Active Projects",
    value: "12",
    change: "+2 this month",
    positive: true,
  },
  { label: "Team Members", value: "8", change: "+1 this week", positive: true },
  { label: "Open Tasks", value: "47", change: "-5 this week", positive: true },
];

const RECENT_PROJECTS = [
  { id: "proj-1", name: "Website Redesign", status: "active", progress: 72 },
  { id: "proj-2", name: "Mobile App v2", status: "active", progress: 38 },
  { id: "proj-3", name: "API Integration", status: "paused", progress: 55 },
];

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Params;
}) {
  const { workspaceId } = await params;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Overview</h2>
        <Link
          href={`/app/${workspaceId}/projects/new`}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                     rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* ─── Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p
              className={`text-xs mt-1 font-medium ${
                stat.positive ? "text-green-600" : "text-red-500"
              }`}
            >
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Recent projects */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Recent Projects</h3>
          <Link
            href={`/app/${workspaceId}/projects`}
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        <ul className="divide-y divide-gray-100">
          {RECENT_PROJECTS.map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/${workspaceId}/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4
                           hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      project.status === "active"
                        ? "bg-green-500"
                        : "bg-yellow-400"
                    }`}
                  />
                  <span className="font-medium text-sm text-gray-900">
                    {project.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {/* Progress bar */}
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {project.progress}%
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

---
