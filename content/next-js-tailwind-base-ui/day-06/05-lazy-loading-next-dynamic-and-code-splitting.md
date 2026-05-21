# 5 — Lazy Loading — `next/dynamic` and Code Splitting

---

## T — TL;DR

`next/dynamic` lazily loads a component — its JavaScript is only downloaded when the component is about to render. It reduces the initial bundle size by splitting rarely-used or large components into separate chunks, loaded on demand.

---

## K — Key Concepts

### Basic `next/dynamic`

```tsx
import dynamic from "next/dynamic";

// ─── 1. Basic lazy load
const HeavyChart = dynamic(() => import("./heavy-chart"));
// HeavyChart.js is NOT in the initial bundle
// It's downloaded only when <HeavyChart /> is rendered

// ─── 2. With a loading fallback
const HeavyChart = dynamic(() => import("./heavy-chart"), {
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />,
});

// ─── 3. Disable SSR (browser-only components)
const MapComponent = dynamic(
  () => import("./map-component"),
  { ssr: false } // ← component only renders in browser, never on server
);
// Use for: components that use window, document, or browser-only libraries
// (e.g., Leaflet, Three.js, rich text editors)

// ─── 4. Named exports
const { Editor } = dynamic(() =>
  import("./rich-text-editor").then((mod) => mod.Editor)
);
```

### When to Use `next/dynamic`

```
Use dynamic() for:
  ✅ Large third-party libraries (chart libraries, map libraries, editors)
  ✅ Components only used on user interaction (modals, drawers, tooltips)
  ✅ Browser-only components (uses window/document)
  ✅ Admin-only features loaded conditionally
  ✅ Code-split heavy features behind feature flags

Don't use dynamic() for:
  ❌ Small components (adds more overhead than it saves)
  ❌ Components needed for initial render above the fold
  ❌ Components that are always visible on page load
  ❌ Simple UI components (buttons, inputs, text)
```

### Real-World Patterns

```tsx
// src/app/dashboard/analytics/page.tsx
import dynamic from "next/dynamic";

// Chart library is large (~200kb) — only load when needed
const RevenueChart = dynamic(() => import("./_components/revenue-chart"), {
  loading: () => (
    <div
      className="h-64 bg-gray-100 rounded-xl animate-pulse
                      flex items-center justify-center text-gray-400 text-sm"
    >
      Loading chart...
    </div>
  ),
  ssr: false, // chart library uses browser canvas APIs
});

// Map only loads when user clicks "View on Map"
const LocationMap = dynamic(() => import("./_components/location-map"), {
  ssr: false,
});

export default function AnalyticsPage() {
  return (
    <div>
      {/* Chart loads immediately but browser-only */}
      <RevenueChart />

      {/* Map loads on demand — conditionally rendered */}
      <LocationMapSection MapComponent={LocationMap} />
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/location-map-section.tsx
"use client";

import { useState } from "react";
import type { ComponentType } from "react";

export function LocationMapSection({
  MapComponent,
}: {
  MapComponent: ComponentType;
}) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div>
      {!showMap ? (
        <button
          onClick={() => setShowMap(true)}
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Show on Map
        </button>
      ) : (
        <div className="h-64 rounded-xl overflow-hidden border">
          <MapComponent />
          {/* MapComponent JS only downloaded when showMap becomes true */}
        </div>
      )}
    </div>
  );
}
```

### `next/dynamic` vs `React.lazy`

```
next/dynamic:
  ✅ Works with SSR (can control ssr: true/false)
  ✅ Integrated loading state (loading option)
  ✅ Works in Server Components context
  ✅ Handles named exports cleanly
  Use in: Next.js App Router

React.lazy:
  ✅ Standard React API
  ✅ Works with <Suspense> fallback
  ❌ Client-only (no SSR support)
  ❌ No built-in loading option (need Suspense)
  Use in: Client-only React apps, CRA

In Next.js App Router: prefer next/dynamic for Client Component lazy loading
```

---

## W — Why It Matters

- Large chart libraries (Chart.js, Recharts, D3) can add 200–500kb to the initial JS bundle — lazily loading them with `ssr: false` means the first page load is instant and the chart library loads in the background.
- The `ssr: false` option is essential for browser-only libraries — attempting to run Leaflet maps or rich text editors on the server causes hydration errors because `window` doesn't exist on the server.
- Conditional lazy loading (only download the modal JS when the user clicks "open") is a significant optimization for dashboards with many features — users who never open a specific modal never download its code.

---

## I — Interview Q&A

### Q1: What is the difference between `next/dynamic` and a regular import?

**A:** A regular `import` is static — the module is included in the initial JavaScript bundle and downloaded with the page. `next/dynamic` creates a dynamic import that is code-split into a separate chunk — that chunk is only downloaded when the component is actually about to render. For large components or libraries, this reduces the initial bundle size and speeds up the first page load. The tradeoff: the component has a loading state while its chunk downloads.

### Q2: When should you use `ssr: false`?

**A:** Use `ssr: false` for components that rely on browser-only APIs: `window`, `document`, `navigator`, `localStorage`, or libraries that use these internally — like Leaflet maps, Three.js, rich text editors (TipTap, Quill), or canvas-based chart libraries. On the server, these APIs don't exist — importing them causes errors. `ssr: false` tells Next.js to skip server rendering for that component entirely; it only renders in the browser after hydration.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `dynamic` with `ssr: false` in a Server Component

```tsx
// src/app/page.tsx — Server Component
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
// ❌ ssr: false in a Server Component is contradictory and may cause issues
```

**Fix:** Use `dynamic` with `ssr: false` inside Client Components only:

```tsx
"use client";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./chart"), { ssr: false });
```

### ❌ Pitfall: Lazy loading tiny components

```tsx
// ❌ Button is 2kb — dynamic import overhead > savings
const Button = dynamic(() => import("./button"));
```

**Fix:** Only use `dynamic` for genuinely large components (>30kb min):

```tsx
import { Button } from "./button"; // ← regular import for small components
const RichEditor = dynamic(() => import("./rich-editor")); // ← heavy (150kb)
```

---

## K — Coding Challenge + Solution

### Challenge

Build a dashboard page that:

1. Lazily loads a `RevenueChart` with `ssr: false` and a skeleton loading state
2. Lazily loads an `ExportModal` that only loads its JS when the user clicks "Export"
3. Shows both components with proper loading states

### Solution

```tsx
// src/app/dashboard/_components/revenue-chart.tsx
"use client";
// Simulate a heavy chart library
export default function RevenueChart() {
  const data = [42, 58, 47, 73, 65, 89, 76];
  const max = Math.max(...data);
  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold mb-4">Revenue (Last 7 days)</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{ height: `${(val / max) * 100}px` }}
            />
            <span className="text-xs text-gray-400">D{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/_components/export-modal.tsx
"use client";
interface Props {
  onClose: () => void;
}
export default function ExportModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
        <h2 className="font-bold text-lg mb-4">Export Data</h2>
        <div className="space-y-2 mb-6">
          {["CSV", "Excel", "PDF"].map((fmt) => (
            <button
              key={fmt}
              className="w-full py-2.5 border rounded-lg text-sm
                               hover:bg-gray-50 text-left px-4"
            >
              Export as {fmt}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

```tsx
// src/app/dashboard/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Lazy: loads only in browser, shows skeleton while loading
const RevenueChart = dynamic(() => import("./_components/revenue-chart"), {
  ssr: false,
  loading: () => (
    <div className="bg-white border rounded-xl p-5 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
      <div className="flex items-end gap-2 h-32">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${40 + i * 10}px` }}
          />
        ))}
      </div>
    </div>
  ),
});

// Lazy: only downloads ExportModal JS when showExport becomes true
const ExportModal = dynamic(() => import("./_components/export-modal"), {
  ssr: false,
});

export default function DashboardPage() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600
                     hover:bg-gray-50"
        >
          Export
        </button>
      </div>

      {/* Chart: downloads its JS bundle immediately (but only in browser) */}
      <RevenueChart />

      {/* Modal: JS only downloads when showExport = true */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
```

---

---
