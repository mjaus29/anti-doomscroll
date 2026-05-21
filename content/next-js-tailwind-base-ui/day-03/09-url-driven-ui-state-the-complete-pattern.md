# 9 — URL-Driven UI State — The Complete Pattern

---

## T — TL;DR

URL-driven UI state means **every meaningful UI state lives in the URL** — tabs, modals, filters, sidebars, panels, expanded items. The URL becomes the single source of truth. Any UI state a user would want to share, bookmark, or return to via the back button belongs in the URL.

---

## K — Key Concepts

### What Should Live in the URL vs State

```
URL (shareable, persistent):         useState (ephemeral, local):
  ✅ Active tab                         ✅ Hover/focus state
  ✅ Search query                       ✅ Animation state
  ✅ Filters + sort + page              ✅ Dropdown open/closed
  ✅ Selected item ID                   ✅ Form input (before submit)
  ✅ Expanded/collapsed sections        ✅ Tooltip visibility
  ✅ Modal open state (with content)    ✅ Loading spinners
  ✅ View mode (grid/list)              ✅ Error messages
  ✅ Sidebar open (for sharable layout) ✅ Temporary notifications
```

### Pattern 1 — URL-Driven Tabs

```tsx
// src/components/ui/url-tabs.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface UrlTabsProps {
  tabs: Tab[];
  defaultTab: string;
  paramKey?: string; // URL param name, default: 'tab'
}

function UrlTabsInner({ tabs, defaultTab, paramKey = "tab" }: UrlTabsProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get(paramKey) ?? defaultTab;

  const activeContent =
    tabs.find((t) => t.id === activeTab)?.content ??
    tabs.find((t) => t.id === defaultTab)?.content;

  function buildTabUrl(tabId: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === defaultTab) params.delete(paramKey);
    else params.set(paramKey, tabId);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div>
      {/* Tab bar */}
      <div role="tablist" className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive =
            tab.id === activeTab ||
            (tab.id === defaultTab && !searchParams.has(paramKey));

          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              scroll={false}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div role="tabpanel" className="pt-6">
        {activeContent}
      </div>
    </div>
  );
}

export function UrlTabs(props: UrlTabsProps) {
  return (
    <Suspense
      fallback={<div className="h-12 bg-gray-100 animate-pulse rounded" />}
    >
      <UrlTabsInner {...props} />
    </Suspense>
  );
}
```

### Pattern 2 — URL-Driven Modal

```tsx
// Open a modal by setting ?modal=product&id=42 in the URL
// Close by removing those params
// Shareable: user can send the URL and recipient sees the modal

"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function ModalInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const modalType = searchParams.get("modal");
  const modalId = searchParams.get("id");
  const isOpen = Boolean(modalType);

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    params.delete("id");
    const qs = params.toString();
    router.push(`${pathname}${qs ? "?" + qs : ""}`, { scroll: false });
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={closeModal}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close modal"
        >
          ✕
        </button>
        <h2 className="text-lg font-semibold mb-2">
          {modalType === "product" ? "Product Details" : "Details"}
        </h2>
        <p className="text-gray-600">ID: {modalId}</p>
      </div>
    </div>
  );
}

// Trigger: <Link href="?modal=product&id=42" scroll={false}>View</Link>
export function UrlModal() {
  return (
    <Suspense fallback={null}>
      <ModalInner />
    </Suspense>
  );
}
```

### Pattern 3 — URL-Driven View Mode (Grid/List)

```tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

function ViewToggleInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = (searchParams.get("view") ?? "grid") as "grid" | "list";

  function buildViewUrl(v: "grid" | "list"): string {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "grid")
      params.delete("view"); // grid is default — clean URL
    else params.set("view", v);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="flex gap-1 border rounded-lg p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <Link
          key={v}
          href={buildViewUrl(v)}
          scroll={false}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            view === v
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
          aria-label={`${v} view`}
        >
          {v === "grid" ? "⊞" : "≡"}
        </Link>
      ))}
    </div>
  );
}

export function ViewToggle() {
  return (
    <Suspense
      fallback={
        <div className="w-24 h-9 bg-gray-100 animate-pulse rounded-lg" />
      }
    >
      <ViewToggleInner />
    </Suspense>
  );
}
```

---

## W — Why It Matters

- URL-driven tabs and modals are shareable — a customer service rep can send a link that opens the exact tab or modal their customer needs to see. This is impossible with `useState`-based tabs.
- The `defaultTab` omitted from URL pattern keeps URLs clean for the most common state — `/products` instead of `/products?tab=all&view=grid`. Users share the clean URL, and defaults are applied automatically.
- URL-driven modals are the foundation of "intercepting routes" (`@modal` parallel routes) — understanding the basic pattern prepares you for the advanced App Router modal pattern.
- Every `useSearchParams` component needs `<Suspense>` — the URL-driven UI pattern creates multiple components that need the same wrapper. Baking `<Suspense>` into the component export (as shown above) prevents callers from forgetting.

---

## I — Interview Q&A

### Q1: What UI state should live in the URL vs `useState`?

**A:** URL state is for anything the user would want to share, bookmark, or restore via the back button: active tabs, search queries, filter/sort state, selected item IDs, view modes (grid/list), and modal open state with content IDs. `useState` is for ephemeral, non-shareable state: hover/focus states, animation state, dropdown open/closed, tooltip visibility, and form input before submission. The test: "Would a user be surprised if this reset on page refresh?" If yes, use URL state.

### Q2: How does a URL-driven modal differ from a traditional `useState` modal?

**A:** A URL-driven modal stores its open state and content ID in the URL (`?modal=product&id=42`). This means: the modal state survives refresh (users can refresh and the modal stays open), the URL is shareable (users can send a link that opens the modal directly), and the back button closes the modal naturally (navigating back removes the modal params). A `useState` modal loses all these properties.

### Q3: Why do you delete the default tab value from the URL instead of explicitly setting it?

**A:** Clean URLs are more shareable and readable. `/products` is cleaner than `/products?tab=all`. When a user shares the URL, they share the minimal required parameters — the receiver gets the same view via defaults. Keeping defaults out of the URL also makes it easier to change defaults later without breaking existing shared links (the absence of the param means "use the current default," not "use the old default").

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Modal state in useState — breaks sharing

```tsx
const [isOpen, setIsOpen] = useState(false);
const [productId, setProductId] = useState<string | null>(null);
// User opens product modal, copies URL → shares it → recipient gets blank page
```

**Fix:** Use URL params for modal state — `?modal=product&id=42`.

### ❌ Pitfall: Not wrapping URL-driven components in Suspense

```tsx
// ❌ Each component uses useSearchParams — all need Suspense
<ViewToggle />    // no Suspense → build warning
<UrlTabs />       // no Suspense → performance hit
<SortSelector />  // no Suspense → dynamic rendering
```

**Fix:** Bake `<Suspense>` into the component's export function — the consumer never forgets:

```tsx
export function ViewToggle() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ViewToggleInner /> {/* useSearchParams is in here */}
    </Suspense>
  );
}
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `ProductDetailTabs` component with URL-driven tabs: Description, Specifications, Reviews. Requirements:

1. Default tab is `description` — omitted from URL when active
2. Each tab preserves existing query params (e.g., `?color=red` stays)
3. Reviews tab shows a count badge (static number is fine)
4. Proper ARIA roles
5. Built-in Suspense

### Solution

```tsx
// src/app/(store)/store/[category]/product/[id]/_components/product-detail-tabs.tsx
"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "description", label: "Description", badge: null },
  { id: "specifications", label: "Specifications", badge: null },
  { id: "reviews", label: "Reviews", badge: "24" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const DEFAULT_TAB: TabId = "description";

interface Props {
  description: React.ReactNode;
  specifications: React.ReactNode;
  reviews: React.ReactNode;
}

function ProductDetailTabsInner({
  description,
  specifications,
  reviews,
}: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") as TabId | null;
  const activeTab =
    rawTab && TABS.some((t) => t.id === rawTab) ? rawTab : DEFAULT_TAB;

  const contentMap: Record<TabId, React.ReactNode> = {
    description,
    specifications,
    reviews,
  };

  function buildTabUrl(tabId: TabId): string {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === DEFAULT_TAB) params.delete("tab");
    else params.set("tab", tabId);
    const qs = params.toString();
    return `${pathname}${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="mt-10">
      {/* Tab list */}
      <div role="tablist" className="flex border-b border-gray-200 gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={buildTabUrl(tab.id)}
              scroll={false}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium",
                "border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
              {tab.badge && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full font-medium",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab panels */}
      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="pt-8"
        >
          {contentMap[tab.id]}
        </div>
      ))}
    </div>
  );
}

export function ProductDetailTabs(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mt-10">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <div
                key={tab.id}
                className="h-12 w-28 bg-gray-100 animate-pulse rounded-t"
              />
            ))}
          </div>
          <div className="h-48 bg-gray-50 animate-pulse rounded mt-4" />
        </div>
      }
    >
      <ProductDetailTabsInner {...props} />
    </Suspense>
  );
}
```

---

---
