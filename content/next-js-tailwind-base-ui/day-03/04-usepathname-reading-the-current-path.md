# 4 — `usePathname` — Reading the Current Path

---

## T — TL;DR

`usePathname` returns the **current URL pathname as a string** — everything before the `?`. It's a Client Component hook used for active link detection, conditional rendering based on route, and breadcrumb generation. It updates automatically on every navigation.

---

## K — Key Concepts

### Basic Usage

```tsx
"use client";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      className={isActive ? "text-blue-600 font-semibold" : "text-gray-600"}
    >
      {children}
    </a>
  );
}
```

### What `usePathname` Returns

```tsx
// URL: https://myapp.com/products/42?sort=price#reviews
// pathname → '/products/42'
//            ← no protocol, no domain, no query string, no hash

// URL: https://myapp.com/
// pathname → '/'

// URL: https://myapp.com/dashboard/settings
// pathname → '/dashboard/settings'
```

### Exact Match vs Starts-With Match

```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean; // true = exact match, false = startsWith
}

export function NavItem({ href, children, exact = false }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
  // startsWith check: /dashboard is active on /dashboard/orders too

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

// Usage:
// <NavItem href="/dashboard" exact>Overview</NavItem>
//   → active on: /dashboard only
//
// <NavItem href="/dashboard/orders">Orders</NavItem>
//   → active on: /dashboard/orders AND /dashboard/orders/42
```

### Conditional Rendering Based on Route

```tsx
"use client";
import { usePathname } from "next/navigation";

export function PageHeader() {
  const pathname = usePathname();

  // Hide header on fullscreen pages
  const isFullscreen = ["/onboarding", "/checkout/payment"].includes(pathname);
  if (isFullscreen) return null;

  // Show different titles per section
  const title = pathname.startsWith("/dashboard")
    ? "Dashboard"
    : pathname.startsWith("/store")
      ? "Store"
      : pathname.startsWith("/account")
        ? "Account"
        : "MyApp";

  return (
    <header className="h-16 border-b flex items-center px-6">
      <h1 className="font-semibold">{title}</h1>
    </header>
  );
}
```

### Building Breadcrumbs from Pathname

```tsx
"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

function capitalize(str: string) {
  return str.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // '/dashboard/orders/42' → ['dashboard', 'orders', '42']

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, i) => ({
    label: capitalize(segment),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            Home
          </Link>
        </li>
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1">
            <span className="text-gray-400">/</span>
            {i === crumbs.length - 1 ? (
              <span className="text-gray-900 font-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-500 hover:text-gray-700"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Server Component Alternative

```tsx
// In Server Components — use headers() to read the pathname
// (usePathname is a Client-only hook)

import { headers } from "next/headers";

export default async function ServerNav() {
  const headersList = await headers();
  const pathname = headersList.get("x-current-path") ?? "/";
  // ← Only works if middleware sets this header

  // Better: pass pathname as a prop from a Client Component parent
  // OR: use usePathname in a 'use client' component
}
```

---

## W — Why It Matters

- `usePathname` is the foundation of active navigation states — without it, nav links can't know which route is "current." This is the most common use case in the entire codebase.
- The `startsWith` vs exact match distinction is critical for nested routes: `/dashboard` should be active in the nav when viewing `/dashboard/orders`, but the exact `/dashboard` link should only be active on the overview page.
- `aria-current="page"` on active nav links is an accessibility requirement — screen readers use it to announce the current page in navigation. `usePathname` is the enabler.
- `usePathname` is reactive — it subscribes to route changes and re-renders the component whenever the pathname changes. This makes it perfect for any UI that needs to respond to navigation events.

---

## I — Interview Q&A

### Q1: What does `usePathname` return and what does it not include?

**A:** `usePathname` returns the pathname portion of the URL — the path segments starting with `/`, not including the query string (`?key=value`) or the hash fragment (`#section`). For `https://myapp.com/products/42?sort=price#reviews`, it returns `/products/42`. If you need query params, use `useSearchParams`. If you need the full URL, use `window.location.href` or construct it from both hooks.

### Q2: How do you implement an active link that is also active on child routes?

**A:** Use `pathname.startsWith(href + '/')` combined with an exact match check. For a nav item with `href="/dashboard"`, the condition `pathname === href || pathname.startsWith(href + '/')` returns true for both `/dashboard` (exact) and `/dashboard/orders` (child). The `/` suffix in `startsWith` prevents `/dashboard-settings` from incorrectly matching `/dashboard`.

### Q3: Can you use `usePathname` in Server Components?

**A:** No — `usePathname` is a React hook and hooks only work in Client Components. For Server Components that need the current path, options are: read the `x-pathname` header (if set by middleware), accept the path as a prop passed down from a Client Component ancestor, or restructure so that the route-aware logic lives in a `'use client'` component.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Using `usePathname` in a Server Component

```tsx
// ❌ usePathname is a hook — can't use in Server Components
import { usePathname } from "next/navigation";

export default async function Layout({ children }) {
  const pathname = usePathname(); // Error: hooks in Server Components
}
```

**Fix:** Move route-aware logic to a Client Component:

```tsx
// 'use client' component
"use client";
import { usePathname } from "next/navigation";
export function ActiveNav() {
  const pathname = usePathname();
  return <nav>{/* active states based on pathname */}</nav>;
}
```

### ❌ Pitfall: Exact match fails on child routes

```tsx
// ❌ Nav item for /dashboard is NOT highlighted on /dashboard/orders
const isActive = pathname === "/dashboard";
// /dashboard/orders → pathname !== '/dashboard' → not active
```

**Fix:**

```tsx
// ✅ Active on exact match AND all child routes
const isActive =
  pathname === "/dashboard" || pathname.startsWith("/dashboard/");
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `Sidebar` component with navigation items. Each item must:

1. Be active on exact match for top-level items (`/dashboard`)
2. Be active on child routes for section items (`/dashboard/orders` active for `/dashboard/orders/42`)
3. Show a different icon color when active
4. Include `aria-current="page"` for accessibility
5. Collapse all items not in the active section

### Solution

```tsx
// src/app/(dashboard)/_components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: string; // emoji for simplicity
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  {
    label: "Orders",
    href: "/dashboard/orders",
    icon: "📦",
    children: [
      { label: "All Orders", href: "/dashboard/orders" },
      { label: "Pending", href: "/dashboard/orders/pending" },
      { label: "Completed", href: "/dashboard/orders/completed" },
    ],
  },
  { label: "Products", href: "/dashboard/products", icon: "🛍️" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

function isPathActive(href: string, pathname: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <span className="font-bold text-lg">MyApp</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = isPathActive(item.href, pathname, !item.children);
          const showChildren =
            item.children && isPathActive(item.href, pathname);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive && !showChildren ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>

              {/* Child nav items — only show when section is active */}
              {showChildren && item.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-lg transition-colors",
                          childActive
                            ? "text-white font-medium"
                            : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

---
