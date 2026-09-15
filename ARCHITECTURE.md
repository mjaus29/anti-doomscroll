# Anti-Doom Scroll — Architecture Document

## Overview

Anti-Doom Scroll is a **Next.js 16 (App Router)** learning platform that replaces passive feed-scrolling with structured, daily tech-track lessons. Users study curated content across 8 topic groups (82 days), take on AI-generated coding challenges, and get real-time feedback from GitHub Copilot.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │  Lesson UI   │  │  Challenge Lab   │  │  Monaco Code Editor   │  │
│  │  (MD render) │  │  (AI streaming)  │  │  (user code input)    │  │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬───────────┘  │
│         │                   │                        │              │
│         └───────────────────┼────────────────────────┘              │
│                             │  fetch() / NDJSON streams             │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js 16 Server (Node.js)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  App Router Pages  src/app/                                  │   │
│  │  ├── /                      → Home (group catalog)           │   │
│  │  ├── /group/[groupId]       → Group overview                 │   │
│  │  ├── /group/[groupId]/day/[dayId]/[topicId]  → Lesson       │   │
│  │  ├── /challenges            → Challenge Lab page             │   │
│  │  └── /api/...               → REST endpoints                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │  Server Lib               │                                   │  │
│  │  ├── content.ts           ← FS-based markdown curriculum      │  │
│  │  ├── challenge-lab.ts     ← Challenge types, validation      │  │
│  │  ├── challenge-lab-stream.ts ← NDJSON stream client          │  │
│  │  ├── copilot.ts           ← GitHub Copilot SDK wrapper       │  │
│  │  ├── app-state.ts         ← Key-value state types            │  │
│  │  ├── app-state-server.ts  ← Cookie/session resolution        │  │
│  │  └── prisma.ts            ← PrismaClient singleton           │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │  REST API Routes  src/app/api/                                │  │
│  │  ├── app-state        GET/PUT/DELETE  → CRUD app state       │  │
│  │  ├── auth/github/*    GET/POST        → OAuth flow           │  │
│  │  ├── copilot/challenge POST           → AI hints (stream)    │  │
│  │  ├── copilot/challenges/generate POST → AI gen (stream)      │  │
│  │  ├── copilot/challenges/review POST   → AI review (stream)   │  │
│  │  ├── challenges/preview POST          → esbuild transform    │  │
│  │  └── search           GET             → Content search       │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
     │  PostgreSQL  │ │  GitHub API  │ │  Service Worker  │
     │  (Prisma)    │ │  (Copilot)   │ │  (Serwist/PWA)   │
     └──────────────┘ └──────────────┘ └──────────────────┘
```

---

## Data Flow

### 1. Content Loading (Lessons)

```
content/                    src/lib/content.ts              Client
  group-N/                  ┌─────────────────┐             ┌──────────┐
    index.md   ──read──►   │  getAllGroups()  │  ──SSR──►   │  React   │
    day-MM/                 │  (cached in prod)│             │  pages   │
      topic.md ──read──►   └─────────────────┘             └──────────┘
```

- **Content lives as markdown files** on disk under `content/`
- `scripts/split-markdown-topics.js` splits raw `.md` files into per-topic files
- `content.ts` reads them at request time (dev) or caches in production (memoized)
- Each topic has `lessonContent` + optional embedded `challenge` (Challenge/Solution sections)
- 8 groups × 6–14 days × multiple topics = ~210+ lessons

### 2. App State (Progress / Preferences)

```
Client                    API Route              Database
┌──────────────┐          ┌─────────────┐        ┌──────────┐
│ app-state-   │  fetch   │ /api/app-   │        │PostgreSQL│
│ client.ts    │ ──────►  │ state       │ ─────► │ AppState │
│              │ ◄──────  │ GET/PUT/DEL │ ◄───── │ table    │
│ readAppState │  JSON    │             │  SQL   │          │
│ writeAppState│          │             │        │          │
└──────────────┘          └─────────────┘        └──────────┘
                            │
                            ▼
                     resolveAppStateScope()
                     (cookie-based session)
```

- **Cookie-scoped**: `anti_doomscroll_session` + `anti_doomscroll_user` cookies
- **Global scope**: currently hardcoded to `"global"` (all anonymous users share state)
- **Legacy promotion**: migrates entries from old session IDs to current
- **Prisma model**: `AppState { id, sessionId, key, value(Json) }` with `@@unique([sessionId, key])`

### 3. AI Challenge Generation (Streaming)

```
Client (ChallengeLab.tsx)         Server                      GitHub Copilot
┌──────────────────┐              ┌─────────────────┐        ┌──────────┐
│ readGenerated    │  POST /api/  │ challenge-lab-  │        │          │
│ ChallengeStream  │  copilot/    │ stream.ts       │        │ Copilot  │
│                  │  challenges/ │        │        │ SDK      │
│ onStatus()  ◄────┤  generate    │ runCopilotPrompt│ ─────► │ API      │
│                  │  ───────►    │        │        │        │          │
│ NDJSON parse ◄───┤  NDJSON     │ createSession() │        │          │
│                  │  stream      │ sendAndWait()   │        │          │
└──────────────────┘              └─────────────────┘        └──────────┘
```

- **Streaming protocol**: Server sends NDJSON (`{type:"status"}\n{type:"delta"}\n{type:"complete"}\n`)
- **Client parses** via `readGeneratedChallengeStream()` / `readReviewStream()` in `challenge-lab-stream.ts`
- **Copilot SDK**: `@github/copilot-sdk` spawns the Copilot CLI binary per request
- **Auth**: GitHub OAuth token stored in httpOnly cookie (`copilot_github_token`)
- **Plan engine**: `createChallengeGenerationPlan()` rotates tracks (javascript → algorithmic → ui) and increases difficulty based on challenge count

### 4. AI Challenge Review (Code Feedback)

```
User code + challenge  ──►  /api/copilot/challenges/review
                            │
                            ├─ buildReviewPrompt()
                            ├─ runCopilotPrompt() → Copilot SDK
                            ├─ extractJsonPayload() → parse JSON from response
                            └─ normalizeReviewResult()
                            │
                            ▼
                   NDJSON stream back:
                   {type:"status", message:"Reviewing attempt 1..."}
                   {type:"delta", delta:"## Feedback\n..."}
                   {type:"complete", review:{passed, summary, ...}}
```

---

## Route Map

| Route                                    | Type          | Purpose                                                    |
| ---------------------------------------- | ------------- | ---------------------------------------------------------- |
| `/`                                      | SSR           | Home — lists all 7 tech groups                             |
| `/group/[groupId]`                       | SSR           | Group overview — days + topics                             |
| `/group/[groupId]/day/[dayId]`           | SSR           | Day view — all topics in a day                             |
| `/group/[groupId]/day/[dayId]/[topicId]` | SSR           | **Lesson viewer** — markdown + embedded challenge          |
| `/day/[dayId]/[topicId]`                 | SSR           | Legacy topic redirect                                      |
| `/challenges`                            | CSR           | **Challenge Lab** — full client-side SPA for AI challenges |
| `/api/app-state`                         | REST          | CRUD app state (GET/PUT/DELETE)                            |
| `/api/auth/github/login`                 | REST          | OAuth redirect to GitHub                                   |
| `/api/auth/github/callback`              | REST          | OAuth token exchange                                       |
| `/api/auth/github/logout`                | REST          | Clear auth cookie                                          |
| `/api/copilot/challenge`                 | REST (stream) | AI hints / lesson Q&A                                      |
| `/api/copilot/challenges/generate`       | REST (stream) | Generate new challenge                                     |
| `/api/copilot/challenges/review`         | REST (stream) | Review user code                                           |
| `/api/challenges/preview`                | REST          | esbuild transform for live preview                         |
| `/api/search`                            | REST          | Full-text content search                                   |

---

## Component Tree

```
RootLayout (src/app/layout.tsx)
├── SerwistProvider (PWA / service worker)
├── SearchBox + SearchButton
└── {children} — renders the matched route page

Pages:
├── Home (page.tsx)
│   └── ResumeButton, Link to /challenges
│
├── GroupPage (group/[groupId]/page.tsx)
│   └── Sidebar (navigation)
│
├── TopicPage (group/[groupId]/day/[dayId]/[topicId]/page.tsx)
│   ├── MarkdownRenderer (lesson content)
│   ├── TopicView (embedded challenge display)
│   ├── ChallengeAssistant (AI hints for this topic)
│   ├── ChallengePreview (live code preview)
│   ├── SwipeNavigator (prev/next topic)
│   └── Sidebar
│
└── ChallengesPage (challenges/page.tsx)
    └── ChallengeLab (full challenge workflow)
        ├── MonacoCodeEditor (user writes code)
        ├── ChallengePreview (live preview)
        ├── ChallengeAssistant (AI review)
        └── SearchButton/SearchBox
```

---

## Data Model

### Database (PostgreSQL via Prisma)

```prisma
model AppState {
  id        String   @id @default(cuid())
  sessionId String
  key       String
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([sessionId, key])
  @@index([sessionId])
}
```

### Key Types (TypeScript)

| Type                      | Location           | Purpose                                                 |
| ------------------------- | ------------------ | ------------------------------------------------------- |
| `TechGroup`               | `content.ts`       | Top-level group (e.g., "JavaScript / TypeScript / Git") |
| `Day`                     | `content.ts`       | A day within a group                                    |
| `Topic`                   | `content.ts`       | A single lesson with content + optional challenge       |
| `GeneratedChallenge`      | `challenge-lab.ts` | AI-generated challenge with starter/reference code      |
| `ChallengeReviewResult`   | `challenge-lab.ts` | AI review: passed, feedback, next steps                 |
| `AppStateEntry`           | `app-state.ts`     | Key-value pair for persistence                          |
| `ChallengeGenerationPlan` | `challenge-lab.ts` | Determines track/starter mode/scope for generation      |

---

## External Integrations

| Service                | Purpose                                       | Auth                                                       |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| **GitHub OAuth**       | Sign-in for Copilot access                    | Client ID/Secret → httpOnly cookie                         |
| **GitHub Copilot SDK** | AI code generation/review                     | `copilot_github_token` cookie → `COPILOT_GITHUB_TOKEN` env |
| **PostgreSQL**         | App state persistence                         | `DATABASE_URL` env                                         |
| **Serwist (PWA)**      | Offline service worker                        | N/A                                                        |
| **esbuild**            | Client-side TSX→JS transform for live preview | N/A                                                        |

---

## Infrastructure & Deployment

```
┌─────────────────────────────────────────┐
│              Deployment Target          │
│         (Vercel / Node.js server)       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Next.js 16 (Turbopack dev)     │    │
│  │  Runtime: Node.js >= 20         │    │
│  │  Bundler: Turbopack             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Env Vars Required:                     │
│  ├── DATABASE_URL                       │
│  ├── GITHUB_CLIENT_ID                   │
│  ├── GITHUB_CLIENT_SECRET               │
│  ├── NEXT_PUBLIC_APP_URL                │
│  ├── COPILOT_CHALLENGE_MODEL (optional) │
│  └── COPILOT_CLI_PATH (optional)        │
│                                         │
│  Copilot CLI binaries needed:           │
│  ├── @github/copilot-linux-x64          │
│  ├── @github/copilot-darwin-arm64       │
│  └── (per platform)                     │
└─────────────────────────────────────────┘
```

---

## Key Design Decisions

| Decision                         | Rationale                                                    |
| -------------------------------- | ------------------------------------------------------------ |
| **Markdown-on-disk** for content | No CMS, no DB for lessons — easy to version, edit, and split |
| **NDJSON streaming** for AI      | Real-time feedback; Copilot SDK streams tokens               |
| **Cookie-based auth**            | No user accounts; GitHub token in httpOnly cookie            |
| **Global scope for app state**   | Anonymous-first; no login required for progress tracking     |
| **Prisma + PostgreSQL**          | Typed queries, JSON column for flexible values               |
| **Serwist PWA**                  | Offline access to cached lessons                             |
| **Monaco Editor**                | VS Code-quality editing in-browser                           |
| **esbuild transform**            | Safe client-side TSX compilation for live preview            |
| **Challenge progression engine** | Auto-difficulty: foundation→core→stretch based on count      |

---

## tRPC Migration Map

The current REST API has well-defined procedures that map cleanly:

| Current REST                   | tRPC Procedure                                  |
| ------------------------------ | ----------------------------------------------- |
| `GET /api/app-state`           | `appState.get`                                  |
| `PUT /api/app-state`           | `appState.set`                                  |
| `DELETE /api/app-state`        | `appState.delete`                               |
| `POST /api/challenges/preview` | `challenges.preview`                            |
| `GET /api/search?q=`           | `search.query`                                  |
| `POST /api/copilot/challenge`  | `copilot.challenge` _(keep REST for streaming)_ |
| `POST /api/copilot/generate`   | `copilot.generate` _(keep REST for streaming)_  |
| `POST /api/copilot/review`     | `copilot.review` _(keep REST for streaming)_    |

The 3 streaming endpoints should remain REST (raw `ReadableStream` NDJSON), while the 5 non-streaming endpoints are ideal first candidates for tRPC migration.
