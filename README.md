# anti-doomscroll

Interactive JavaScript & TypeScript learning companion — installable, offline-capable PWA.

## Features

- 📱 **Installable PWA** — Add to home screen on mobile devices
- 📶 **Offline capable** — Works without internet using service workers
- 🌙 **Dark theme** — Minimalist modern dark UI
- 🗂️ **13 days of content** — From JS foundations to advanced TypeScript
- 📖 **Card-based reading** — Each subtopic in its own card
- ⬅️➡️ **Navigation** — Next/prev buttons + keyboard arrows
- 📑 **Sidebar** — Toggle sidebar to browse all days and topics
- 💾 **Persistence** — Resumes where you left off
- 🤖 **Copilot challenge coach** — Streams challenge reviews and hints inside coding challenge topics, remembers the last reply, and supports beginner-to-advanced feedback styles

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Copilot Challenge Assistant

The coding challenge panel uses the GitHub Copilot SDK on the server.

Set one of these before starting the app:

```bash
GITHUB_TOKEN=your_github_token
```

or

```bash
GH_TOKEN=your_github_token
```

Optional model override:

```bash
COPILOT_CHALLENGE_MODEL=gpt-4.1
```

The default is `gpt-4.1`, which is one of Copilot's included `0x` premium-cost models on paid plans.

### Vercel deployment (bundled CLI)

This project uses the bundled Copilot CLI approach with `@github/copilot`.
The API route resolves `node_modules/@github/copilot/npm-loader.js` and passes it
as `cliPath` to the SDK.

Set one of these environment variables in Vercel:

```bash
GITHUB_TOKEN=your_github_token
# or
GH_TOKEN=your_github_token
```

Notes:

- The token's account must have an active GitHub Copilot entitlement.
- `next.config.ts` includes output tracing rules so Copilot CLI runtime files are packaged in serverless output.
- If needed, override CLI resolution with `COPILOT_CLI_PATH`.

## Build

```bash
npm run build
```

Generates a static export in `out/` with PWA service worker.

## Adding New Content

Drop markdown files into `javascript-typescript-mentor/day-XX/` directories. The app automatically discovers all day folders and their topics at build time.
