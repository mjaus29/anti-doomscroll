# 10 — Tabs — Tab List, Panels, Keyboard Navigation

---

## T — TL;DR

`Tabs` manages tab selection state, keyboard navigation (arrow keys), and `aria-selected`/`role="tabpanel"` ARIA automatically. Anatomy: `Root → List → Tab → Panel`. Simpler than floating components — no Portal or Positioner needed.

---

## K — Key Concepts

### Reusable Tabs Wrapper

```tsx
// src/components/ui/tabs.tsx
"use client";

import * as TabsPrimitive from "@base-ui/react/tabs";
import { cn } from "@/lib/cn";
import { cva } from "class-variance-authority";

const tabsVariants = cva("", {
  variants: {
    variant: {
      default: "",
      pills: "",
      underline: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const TabsRoot = TabsPrimitive.Root;

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & { variant?: "default" | "pills" | "underline" }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center gap-1",
        variant === "default" && "bg-gray-100 dark:bg-gray-800 p-1 rounded-xl",
        variant === "pills" && "gap-2",
        variant === "underline" &&
          "border-b border-gray-200 dark:border-gray-700 gap-0",
        className
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.Tab.Props & { variant?: "default" | "pills" | "underline" }) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex items-center justify-center font-medium text-sm",
        "transition-all duration-150 cursor-pointer select-none outline-none",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        // Default pill in container
        variant === "default" &&
          cn(
            "px-4 py-1.5 rounded-lg",
            "text-gray-600 dark:text-gray-400",
            "hover:text-gray-900 dark:hover:text-white",
            "data-[selected]:bg-white dark:data-[selected]:bg-gray-700",
            "data-[selected]:text-gray-900 dark:data-[selected]:text-white",
            "data-[selected]:shadow-sm"
          ),
        // Standalone pills
        variant === "pills" &&
          cn(
            "px-4 py-2 rounded-xl",
            "text-gray-600 dark:text-gray-400",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "data-[selected]:bg-blue-600 data-[selected]:text-white",
            "data-[selected]:shadow-sm data-[selected]:hover:bg-blue-700"
          ),
        // Underline
        variant === "underline" &&
          cn(
            "px-4 py-2.5 rounded-none border-b-2 border-transparent -mb-px",
            "text-gray-500 dark:text-gray-400",
            "hover:text-gray-900 dark:hover:text-white",
            "hover:border-gray-300 dark:hover:border-gray-600",
            "data-[selected]:border-blue-600 data-[selected]:text-blue-600",
            "dark:data-[selected]:border-blue-400 dark:data-[selected]:text-blue-400"
          ),
        className
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("outline-none mt-4", "data-[hidden]:hidden", className)}
      {...props}
    />
  );
}

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
};
```

### Usage — All Three Variants

```tsx
// src/components/tabs-demo.tsx
import { Tabs } from "@/components/ui/tabs";

export function TabsDemo() {
  return (
    <div className="space-y-10 p-6">
      {/* Default — pills in container */}
      <Tabs.Root defaultValue="overview">
        <Tabs.List variant="default">
          <Tabs.Tab variant="default" value="overview">
            Overview
          </Tabs.Tab>
          <Tabs.Tab variant="default" value="analytics">
            Analytics
          </Tabs.Tab>
          <Tabs.Tab variant="default" value="settings">
            Settings
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">
          <div
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border
                           border-gray-200 dark:border-gray-700 text-sm text-gray-600"
          >
            Overview panel content
          </div>
        </Tabs.Panel>
        <Tabs.Panel value="analytics">Analytics panel</Tabs.Panel>
        <Tabs.Panel value="settings">Settings panel</Tabs.Panel>
      </Tabs.Root>

      {/* Underline variant */}
      <Tabs.Root defaultValue="month">
        <Tabs.List variant="underline">
          {["day", "week", "month", "year"].map((period) => (
            <Tabs.Tab
              key={period}
              variant="underline"
              value={period}
              className="capitalize"
            >
              {period}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="month">
          <p className="text-sm text-gray-600 mt-2">Monthly data</p>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
```

---

## W — Why It Matters

- Tabs keyboard navigation (arrow keys to move between tabs) is mandated by the WAI-ARIA Tabs pattern — Base UI implements it correctly. A custom tab implementation using `onClick` only fails keyboard users who expect arrow key navigation.
- `data-[hidden]:hidden` on `Tabs.Panel` ensures inactive panels are hidden from both display and accessibility tree — Base UI sets the `hidden` attribute, but you must apply the CSS to visually hide it.
- `data-[selected]:` on `Tabs.Tab` drives the active tab styling — no `isActive` prop or conditional class needed.

---

## I — Interview Q&A

### Q1: How does Base UI's Tabs handle keyboard navigation and what does this mean for your implementation?

**A:** Base UI's Tabs implements the WAI-ARIA Tabs pattern — arrow keys navigate between tabs in the Tab List, activating a tab with Enter or Space (or automatically on arrow key, depending on `activateOnFocus` prop) shows the corresponding panel. Home/End keys jump to first/last tab. Tab key moves focus from the Tab List to the active panel's content. This means you don't add any keyboard event handlers — Base UI handles all of it. Your only responsibility is to style `data-[selected]:` on `Tabs.Tab` for the active visual state and ensure the `Tabs.Panel` value attributes match the `Tabs.Tab` value attributes.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Forgetting `data-[hidden]:hidden` on `Tabs.Panel` — all panels show at once

```tsx
{
  /* ❌ No hidden style — all panels render visibly */
}
<Tabs.Panel value="analytics">Analytics</Tabs.Panel>;

{
  /* Base UI sets hidden attribute on inactive panels,
    but without CSS, hidden attribute doesn't visually hide the element
    in all browsers/contexts */
}
```

**Fix:**

```tsx
{
  /* ✅ data-[hidden]:hidden — or use the built-in hidden CSS behaviour */
}
<Tabs.Panel value="analytics" className="data-[hidden]:hidden">
  Analytics
</Tabs.Panel>;
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<SettingsTabs>` component with `Profile`, `Security`, and `Notifications` tabs. Each panel has a distinct form-like content area. Uses underline variant, starts on Security tab, and has a badge showing a notification count on the Notifications tab.

### Solution

```tsx
// src/components/settings-tabs.tsx
import { Tabs } from "@/components/ui/tabs";

const UNREAD_NOTIFICATIONS = 3;

export function SettingsTabs() {
  return (
    <div
      className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl
                     border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <Tabs.Root defaultValue="security">
        {/* Header with underline tab list */}
        <div className="px-6 pt-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Settings
          </h2>
          <Tabs.List variant="underline">
            <Tabs.Tab variant="underline" value="profile">
              Profile
            </Tabs.Tab>
            <Tabs.Tab variant="underline" value="security">
              Security
            </Tabs.Tab>
            <Tabs.Tab variant="underline" value="notifications">
              <span className="flex items-center gap-2">
                Notifications
                {UNREAD_NOTIFICATIONS > 0 && (
                  <span
                    className="inline-flex items-center justify-center
                                    size-4 rounded-full bg-red-500 text-white
                                    text-[10px] font-bold leading-none"
                  >
                    {UNREAD_NOTIFICATIONS}
                  </span>
                )}
              </span>
            </Tabs.Tab>
          </Tabs.List>
        </div>

        {/* Profile panel */}
        <Tabs.Panel
          value="profile"
          className="data-[hidden]:hidden p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div
              className="size-16 rounded-full bg-gradient-to-br
                              from-blue-500 to-purple-600
                              flex items-center justify-center
                              text-white text-xl font-bold shrink-0"
            >
              M
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Mark Austin
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                mark@example.com
              </p>
            </div>
            <button
              className="ml-auto text-sm font-medium text-blue-600
                                 hover:text-blue-700 dark:text-blue-400
                                 transition-colors"
            >
              Change avatar
            </button>
          </div>
          {[
            { label: "Full name", placeholder: "Mark Austin", type: "text" },
            {
              label: "Email address",
              placeholder: "mark@example.com",
              type: "email",
            },
            { label: "Username", placeholder: "markaustria97", type: "text" },
          ].map((field) => (
            <div key={field.label}>
              <label
                className="block text-sm font-medium text-gray-700
                                  dark:text-gray-300 mb-1.5"
              >
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                defaultValue={field.placeholder}
                className="w-full px-3 py-2.5 text-sm rounded-xl border
                             border-gray-300 dark:border-gray-600
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition-colors"
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Save changes
            </button>
          </div>
        </Tabs.Panel>

        {/* Security panel */}
        <Tabs.Panel
          value="security"
          className="data-[hidden]:hidden p-6 space-y-5"
        >
          <div className="space-y-3">
            {[
              { label: "Current password", placeholder: "••••••••" },
              { label: "New password", placeholder: "At least 8 characters" },
              { label: "Confirm password", placeholder: "Repeat new password" },
            ].map((field) => (
              <div key={field.label}>
                <label
                  className="block text-sm font-medium text-gray-700
                                    dark:text-gray-300 mb-1.5"
                >
                  {field.label}
                </label>
                <input
                  type="password"
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border
                               border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               focus:border-transparent transition-colors"
                />
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between p-4
                            bg-amber-50 dark:bg-amber-900/20 rounded-xl
                            border border-amber-200 dark:border-amber-800"
          >
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Two-factor authentication
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Not enabled — your account is less secure
              </p>
            </div>
            <button
              className="text-sm font-semibold text-amber-700
                                 dark:text-amber-300 hover:text-amber-900
                                 dark:hover:text-amber-100 transition-colors"
            >
              Enable →
            </button>
          </div>
          <div className="flex justify-end">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Update password
            </button>
          </div>
        </Tabs.Panel>

        {/* Notifications panel */}
        <Tabs.Panel
          value="notifications"
          className="data-[hidden]:hidden p-6 space-y-4"
        >
          {[
            {
              id: "email-all",
              label: "Email notifications",
              desc: "All activity in your workspaces",
              defaultChecked: true,
            },
            {
              id: "email-mnt",
              label: "Mentions only",
              desc: "Only when you are @mentioned",
              defaultChecked: false,
            },
            {
              id: "push-deploy",
              label: "Deployment alerts",
              desc: "Success, failure, and rollback",
              defaultChecked: true,
            },
            {
              id: "push-weekly",
              label: "Weekly digest",
              desc: "Summary every Monday morning",
              defaultChecked: false,
            },
          ].map((item) => (
            <label
              key={item.id}
              htmlFor={item.id}
              className="flex items-start gap-3 cursor-pointer
                                group hover:bg-gray-50 dark:hover:bg-gray-700/50
                                p-3 rounded-xl transition-colors -mx-3"
            >
              <input
                id={item.id}
                type="checkbox"
                defaultChecked={item.defaultChecked}
                className="mt-0.5 size-4 rounded border-gray-300
                             text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </label>
          ))}
          <div className="flex justify-end pt-2">
            <button
              className="px-5 py-2.5 bg-blue-600 text-white text-sm
                                 font-semibold rounded-xl hover:bg-blue-700
                                 transition-colors"
            >
              Save preferences
            </button>
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
```

---

---
