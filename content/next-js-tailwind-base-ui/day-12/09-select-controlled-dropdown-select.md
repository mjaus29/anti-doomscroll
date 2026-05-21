# 9 — Select — Controlled Dropdown Select

---

## T — TL;DR

`Select` renders an accessible dropdown for choosing a value — like a native `<select>` but fully styleable. Anatomy: `Root → Trigger → Value → Portal → Positioner → Popup → (Arrow) → Option | Group | GroupLabel | Separator`.

---

## K — Key Concepts

### Reusable Select Wrapper

```tsx
// src/components/ui/select.tsx
"use client";

import * as SelectPrimitive from "@base-ui/react/select";
import { cn } from "@/lib/cn";

interface SelectRootProps extends SelectPrimitive.Root.Props {}
const SelectRoot = SelectPrimitive.Root;

function SelectTrigger({
  className,
  children,
  placeholder,
  ...props
}: SelectPrimitive.Trigger.Props & { placeholder?: string }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex items-center justify-between gap-2",
        "w-full px-3 py-2.5 rounded-xl border text-sm",
        "bg-white dark:bg-gray-900",
        "border-gray-300 dark:border-gray-600",
        "text-gray-900 dark:text-white",
        "hover:border-gray-400 dark:hover:border-gray-500",
        "transition-colors cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-500 focus-visible:border-transparent",
        "data-[popup-open]:border-blue-500 data-[popup-open]:ring-2",
        "data-[popup-open]:ring-blue-500/20",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Value
        placeholder={placeholder ?? "Select…"}
        className="data-[placeholder]:text-gray-400 dark:data-[placeholder]:text-gray-500 truncate"
      />
      <span
        className="shrink-0 text-gray-400 text-xs
                        transition-transform data-[popup-open]:rotate-180"
      >
        ▾
      </span>
    </SelectPrimitive.Trigger>
  );
}

function SelectPopup({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={6}>
        <SelectPrimitive.Popup
          className={cn(
            "min-w-[--anchor-width] max-h-64 overflow-y-auto p-1.5",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-2xl shadow-xl z-50 outline-none",
            "transition-all duration-150 ease-out origin-[--transform-origin]",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0   data-[ending-style]:scale-95",
            className
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectOption({
  className,
  children,
  icon,
  ...props
}: SelectPrimitive.Option.Props & { icon?: React.ReactNode }) {
  return (
    <SelectPrimitive.Option
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl",
        "text-sm text-gray-700 dark:text-gray-300",
        "cursor-pointer select-none outline-none",
        "transition-colors duration-100",
        "data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/20",
        "data-[highlighted]:text-blue-700 dark:data-[highlighted]:text-blue-300",
        "data-[selected]:font-semibold",
        "data-[selected]:text-blue-700 dark:data-[selected]:text-blue-300",
        "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none",
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 text-base">{icon}</span>}
      <span className="flex-1 min-w-0 truncate">{children}</span>
      <span
        className="shrink-0 text-blue-500 text-sm
                        opacity-0 data-[selected]:opacity-100"
      >
        ✓
      </span>
    </SelectPrimitive.Option>
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn("my-1 h-px bg-gray-100 dark:bg-gray-700", className)}
      {...props}
    />
  );
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <SelectPrimitive.Group>{children}</SelectPrimitive.Group>;
}

function SelectGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(
        "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
        "text-gray-400 dark:text-gray-500",
        className
      )}
    >
      {children}
    </SelectPrimitive.GroupLabel>
  );
}

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Popup: SelectPopup,
  Option: SelectOption,
  Separator: SelectSeparator,
  Group: SelectGroup,
  GroupLabel: SelectGroupLabel,
};
```

### Usage

```tsx
// src/components/country-select.tsx
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

const COUNTRIES = [
  { value: "us", label: "United States", icon: "🇺🇸" },
  { value: "gb", label: "United Kingdom", icon: "🇬🇧" },
  { value: "ca", label: "Canada", icon: "🇨🇦" },
  { value: "au", label: "Australia", icon: "🇦🇺" },
  { value: "de", label: "Germany", icon: "🇩🇪" },
  { value: "fr", label: "France", icon: "🇫🇷" },
];

export function CountrySelect() {
  const [value, setValue] = useState<string>("");

  return (
    <div className="space-y-1.5 max-w-xs">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Country
      </label>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.Trigger placeholder="Select a country…" />
        <Select.Popup>
          {COUNTRIES.map((country) => (
            <Select.Option
              key={country.value}
              value={country.value}
              icon={country.icon}
            >
              {country.label}
            </Select.Option>
          ))}
        </Select.Popup>
      </Select.Root>
    </div>
  );
}
```

---

## W — Why It Matters

- Native `<select>` is impossible to style consistently across browsers — especially on iOS, Windows, and macOS. Base UI's Select gives you full CSS control while maintaining all the accessibility and keyboard behaviour of native select.
- `min-w-[--anchor-width]` is the key trick for matching the popup width to the trigger — Base UI exposes `--anchor-width` as a CSS variable on the Positioner so the dropdown automatically matches its trigger's width without JavaScript measurement.
- Typeahead search (type letters to jump to options) is built in — this is expected behaviour for accessibility and power users.

---

## I — Interview Q&A

### Q1: Why use Base UI's Select instead of a native HTML `<select>` element?

**A:** Native `<select>` cannot be styled reliably across platforms — iOS renders it as a native picker wheel, Windows shows a system-styled dropdown, and macOS has its own appearance. There's no way to add icons, custom option layouts, option groups with custom headers, search filtering, or multi-select with custom checkboxes. Base UI's Select provides the same keyboard navigation (arrow keys, typeahead), ARIA attributes (`role="listbox"`, `aria-selected`), and form integration as a native select, while being fully styleable with Tailwind. The trade-off is that it requires JavaScript — for form fields in an email or print context, a native `<select>` hidden with CSS and a Base UI Select shown for sighted users can provide both accessibility and style.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Popup width not matching trigger width

```tsx
{/* ❌ Popup uses default min-width — narrower than the trigger */}
<SelectPrimitive.Popup className="min-w-[200px]">
```

**Fix:** Use `--anchor-width` CSS variable:

```tsx
{/* ✅ Popup is at least as wide as the trigger */}
<SelectPrimitive.Popup className="min-w-[--anchor-width]">
```

---

## K — Coding Challenge + Solution

### Challenge

Build a `<TimeZoneSelect>` with grouped options — "Americas", "Europe", "Asia Pacific" — each with city name and UTC offset. Show the selected value in the trigger with the UTC offset.

### Solution

```tsx
// src/components/timezone-select.tsx
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";

const TIMEZONES = {
  Americas: [
    { value: "America/New_York", label: "New York", offset: "UTC-5" },
    { value: "America/Chicago", label: "Chicago", offset: "UTC-6" },
    { value: "America/Denver", label: "Denver", offset: "UTC-7" },
    { value: "America/Los_Angeles", label: "Los Angeles", offset: "UTC-8" },
    { value: "America/Sao_Paulo", label: "São Paulo", offset: "UTC-3" },
  ],
  Europe: [
    { value: "Europe/London", label: "London", offset: "UTC+0" },
    { value: "Europe/Paris", label: "Paris", offset: "UTC+1" },
    { value: "Europe/Berlin", label: "Berlin", offset: "UTC+1" },
    { value: "Europe/Moscow", label: "Moscow", offset: "UTC+3" },
  ],
  "Asia Pacific": [
    { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+9" },
    { value: "Asia/Shanghai", label: "Shanghai", offset: "UTC+8" },
    { value: "Australia/Sydney", label: "Sydney", offset: "UTC+11" },
  ],
};

export function TimeZoneSelect() {
  const [value, setValue] = useState("");

  const allTz = Object.values(TIMEZONES).flat();
  const selected = allTz.find((tz) => tz.value === value);

  return (
    <div className="space-y-1.5 max-w-sm">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Time zone
      </label>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.Trigger placeholder="Select time zone…" className="min-w-0" />
        <Select.Popup className="max-h-72">
          {Object.entries(TIMEZONES).map(([region, zones], i) => (
            <Select.Group key={region}>
              <Select.GroupLabel>{region}</Select.GroupLabel>
              {zones.map((tz) => (
                <Select.Option key={tz.value} value={tz.value}>
                  <span className="flex-1">{tz.label}</span>
                  <span
                    className="shrink-0 text-xs font-mono text-gray-400
                                    data-[highlighted]:text-blue-400
                                    data-[selected]:text-blue-400"
                  >
                    {tz.offset}
                  </span>
                </Select.Option>
              ))}
              {i < Object.keys(TIMEZONES).length - 1 && <Select.Separator />}
            </Select.Group>
          ))}
        </Select.Popup>
      </Select.Root>

      {selected && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Selected: {selected.label} ({selected.offset})
        </p>
      )}
    </div>
  );
}
```

---

---
