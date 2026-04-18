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

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Generates a static export in `out/` with PWA service worker.

## Adding New Content

Drop markdown files into `javascript-typescript-mentor/day-XX/` directories. The app automatically discovers all day folders and their topics at build time.