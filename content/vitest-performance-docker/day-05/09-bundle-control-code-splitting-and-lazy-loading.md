# 9 — Bundle Control — Code Splitting and Lazy Loading

---

## T — TL;DR

Every byte of JavaScript the browser downloads, parses, and executes costs time. Code splitting breaks one large bundle into smaller chunks loaded on demand. Lazy loading defers non-critical code until it's needed. Together they reduce initial bundle size — the biggest single lever for improving TBT, TTI, and INP on load.

---

## K — Key Concepts

```typescript
// ── Dynamic import — the foundation of code splitting ──────────────────
// Static import: bundled into the initial chunk (always loaded)
import { heavyChart } from './heavy-chart'  // ← in initial bundle ❌

// Dynamic import: separate chunk, loaded on demand
const { heavyChart } = await import('./heavy-chart')  // ← separate chunk ✅
// Browser only downloads heavy-chart.js when this line executes
```

```tsx
// ── Next.js dynamic() — lazy load React components ───────────────────────
import dynamic from 'next/dynamic'

// Basic lazy load — component loads when it first renders
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <div>Loading chart...</div>,  // show while downloading
  ssr:     false,   // skip SSR — component only makes sense client-side
})

// Lazy load behind user interaction — ideal for modals, drawers
const [showModal, setShowModal] = useState(false)
const Modal = dynamic(() => import('./Modal'))  // preloads when imported is called

// On button click:
// 1. User clicks
// 2. Modal chunk downloads (~50KB)
// 3. Modal renders
// Better UX: prefetch on hover/focus, render on click
```

```tsx
// ── Route-based code splitting — automatic in Next.js App Router ──────────
// app/dashboard/page.tsx  → only loaded when user navigates to /dashboard
// app/settings/page.tsx   → only loaded when user navigates to /settings
// Each page is automatically a separate chunk — nothing to configure ✅

// Manual route splitting for heavy pages
// app/analytics/page.tsx
import dynamic from 'next/dynamic'

// These components are only needed on the analytics page
const DataGrid  = dynamic(() => import('@/components/DataGrid'))
const ChartLib  = dynamic(() => import('@/components/ChartLib'))
// Both download in parallel when /analytics is visited ✅
```

```tsx
// ── Barrel file anti-pattern — import cost ────────────────────────────────
// ❌ Importing from barrel re-exports entire module
// index.ts exports 50 components — importing 1 may bundle all 50
import { Button } from '@/components'  // pulls in ALL components ❌

// ✅ Import directly from the source file
import { Button } from '@/components/Button'  // only Button ✅

// Next.js config — enable optimizePackageImports for known barrel packages
// next.config.ts:
const config: NextConfig = {
  experimental: {
    optimizePackageImports: ['@mui/material', '@chakra-ui/react', 'lucide-react'],
    // Auto-transforms barrel imports to direct imports ✅
  },
}
```

```bash
# ── Analysing your bundle — finding what's large ─────────────────────────
npm install -D @next/bundle-analyzer

# next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer'
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})
export default withBundleAnalyzer(config)

# Run:
ANALYZE=true npm run build
# Opens browser with interactive treemap of bundle contents
# Look for: unexpectedly large packages, duplicated packages, unneeded polyfills
```

```typescript
// ── Tree shaking — ensure dead code is eliminated ────────────────────────
// Only works with ES modules (import/export), not CommonJS (require)

// ❌ Importing entire lodash — 70KB
import _ from 'lodash'
const result = _.debounce(fn, 300)

// ✅ Option A: named import (if package uses ESM)
import { debounce } from 'lodash-es'   // ~2KB for debounce only

// ✅ Option B: direct path import
import debounce from 'lodash/debounce' // ~2KB

// ✅ Option C: replace with native
const debounced = (fn: () => void, delay: number) => {
  let t: ReturnType<typeof setTimeout>
  return () => { clearTimeout(t); t = setTimeout(fn, delay) }
}
```

---

## W — Why It Matters

- Initial JavaScript bundle size directly correlates with TBT and INP on load — every extra 100KB of JS adds ~300–500ms of parse/compile time on mid-tier phones. Lighthouse TBT and the overall performance score both improve immediately when the initial bundle shrinks.
- Barrel files are a silent bundle size problem — `import { Icon } from 'lucide-react'` without `optimizePackageImports` bundles all 1000+ Lucide icons. With optimisation, only the used icon is included. This single config change often reduces bundle size by 200–500KB.
- Dynamic imports with Next.js are zero-config route splitting plus manual splitting where needed — the App Router already splits by page, but heavy page-level components (charts, editors, data grids) still need `dynamic()` to avoid bloating the page chunk.

---

## I — Interview Q&A

### Q: What is the difference between code splitting and tree shaking, and when should you use each?

**A:** Tree shaking removes unused exports at build time — if you import `{ debounce }` from a library, the bundler (webpack, esbuild, Rollup) statically analyses the import and includes only `debounce`, not the rest of the library. It works automatically for ES module packages (using `import/export`). Code splitting divides your bundle into separate files loaded on demand — route-based splitting loads only the code for the current page, and dynamic `import()` splits a component or library into a separate chunk fetched only when needed. Use both: tree shaking eliminates unused library code (reducing all chunks), code splitting defers loading of needed-but-not-immediately-required code (reducing the initial chunk). They're complementary, not alternatives.

---

## C — Common Pitfalls + Fix

### ❌ `ssr: false` on a component that should be server-rendered

```tsx
// ❌ Using ssr:false unnecessarily — hurts LCP, causes hydration flicker
const ProductList = dynamic(() => import('./ProductList'), { ssr: false })
// Component renders nothing on server → empty HTML → client JS renders it
// LCP delayed by JS execution time ❌

// ✅ Only use ssr:false for genuinely browser-only components
const MapWidget = dynamic(() => import('./MapWidget'), { ssr: false })
// MapWidget uses window.mapboxgl — can't render on server ✅
// ProductList has no browser-only APIs — render on server ✅
const ProductList = dynamic(() => import('./ProductList'))  // ssr defaults to true
```

---

## K — Coding Challenge + Solution

### Challenge

A Next.js page imports a heavy Markdown editor (300KB) and a chart library (200KB) that are only shown when the user clicks buttons. Implement lazy loading for both with proper loading states. Also fix a barrel import for `lucide-react`.

### Solution

```tsx
// app/editor/page.tsx
'use client'
import { useState }       from 'react'
import dynamic            from 'next/dynamic'
import { PenLine, BarChart2 } from 'lucide-react'  // direct named imports — tree-shaken ✅

// Lazy load heavy components — only download when user requests them
const MarkdownEditor = dynamic(
  () => import('@/components/MarkdownEditor'),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-gray-100 rounded" aria-label="Loading editor..." />
    ),
  }
)

const AnalyticsChart = dynamic(
  () => import('@/components/AnalyticsChart'),
  {
    ssr:     false,   // chart library uses canvas — browser-only
    loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded" />,
  }
)

export default function EditorPage() {
  const [showEditor, setShowEditor] = useState(false)
  const [showChart,  setShowChart]  = useState(false)

  return (
    <main>
      <div className="flex gap-4">
        <button onClick={() => setShowEditor(v => !v)}>
          <PenLine size={16} /> Toggle Editor
        </button>
        <button onClick={() => setShowChart(v => !v)}>
          <BarChart2 size={16} /> Toggle Chart
        </button>
      </div>

      {showEditor && <MarkdownEditor />}  {/* downloads only on first toggle */}
      {showChart  && <AnalyticsChart />}  {/* downloads only on first toggle */}
    </main>
  )
}
```

```typescript
// next.config.ts — optimise lucide-react barrel imports globally
const config: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],  // transforms all lucide imports ✅
  },
}
```

---

---
