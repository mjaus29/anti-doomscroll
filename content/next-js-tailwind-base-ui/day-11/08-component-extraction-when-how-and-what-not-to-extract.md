# 8 — Component Extraction — When, How, and What NOT to Extract

---

## T — TL;DR

Extract a Tailwind component when the **same structural pattern + class combination** is reused with varying content. Do NOT extract just because the class string is long. The extraction test: if you'd want to change the styling of all instances at once, extract it.

---

## K — Key Concepts

### The Extraction Decision Matrix

```
Extract when:
  ✅ Same structure AND classes appear 3+ times
  ✅ The component has clear variant/size dimensions
  ✅ Styling changes should propagate to all instances
  ✅ The component is a recognisable UI atom (Button, Badge, Card, Input)
  ✅ The component carries behaviour (onClick, onChange, validation)

Do NOT extract when:
  ❌ Classes are long but appear only once or twice
  ❌ The "component" would just be a div with no props
  ❌ Each instance has completely different content/behaviour
  ❌ You're extracting to shorten a className string (not the right reason)
  ❌ It's a layout wrapper with no styling logic
```

### How to Extract — The `cn()` + `className` Prop Pattern

```tsx
// src/lib/cn.ts
// The canonical Tailwind class merging utility
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Why cn() over just clsx()?
// clsx: joins classes and handles conditionals/arrays
// twMerge: resolves Tailwind conflicts (p-4 + px-6 → px-6 only)
// Together: clean conditional classes + correct conflict resolution ✅
```

```tsx
// ─── Base pattern: always accept className prop for extension
interface CardProps {
  children:   React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      // Base styles (always applied)
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-2xl p-6 shadow-sm',
      // Consumer override (applied last, wins conflicts)
      className
    )}>
      {children}
    </div>
  )
}

// Usage — base styles + extension:
<Card>Default card</Card>
<Card className="p-8 shadow-xl">Larger card — p-8 overrides p-6 via twMerge ✅</Card>
<Card className="border-blue-500 shadow-glow-brand">Highlighted card</Card>
```

### Composing Sub-Components vs Monolithic Components

```tsx
// ─── Anti-pattern: monolithic card with too many props
// Every new layout need adds another prop

interface BadCardProps {
  title:         string
  description:   string
  image?:        string
  badge?:        string
  badgeVariant?: 'success' | 'error'
  footer?:       React.ReactNode
  headerAction?: React.ReactNode
  noPadding?:    boolean
  compact?:      boolean
  // ... grows forever
}

// ─── Better pattern: compound component (composable sub-parts)
// Each part is a separate component that composes via children

// Card.Root — container
// Card.Header — top section
// Card.Body — main content
// Card.Footer — bottom section

interface CardHeaderProps {
  children:   React.ReactNode
  className?: string
}

export function CardRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
      'rounded-2xl shadow-sm overflow-hidden',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-4',
      'border-b border-gray-100 dark:border-gray-700',
      className
    )}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-5', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'flex items-center justify-between px-6 py-4',
      'border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50',
      className
    )}>
      {children}
    </div>
  )
}

// Export as namespace
export const Card = {
  Root:   CardRoot,
  Header: CardHeader,
  Body:   CardBody,
  Footer: CardFooter
}

// Usage — infinitely composable:
<Card.Root>
  <Card.Header>
    <h3 className="font-semibold text-gray-900 dark:text-white">Revenue</h3>
    <Badge variant="success" dot>Live</Badge>
  </Card.Header>
  <Card.Body>
    Chart content
  </Card.Body>
  <Card.Footer>
    <span className="text-xs text-gray-500">Updated 2 min ago</span>
    <Button size="sm" variant="ghost">Refresh</Button>
  </Card.Footer>
</Card.Root>
```

### What NOT to Extract — Layout Wrappers

```tsx
{
  /* ─── Don't extract layout-only wrappers — they add abstraction with no value */
}

{
  /* ❌ Pointless extraction */
}
export function PageContainer({ children }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  );
}

{
  /* The caller has to learn and remember <PageContainer> exists,
    but gets zero visual or behavioural benefit.
    The class string is short and self-evident. */
}

{
  /* ✅ Just write the classes inline */
}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">Page content</div>;

{
  /* ─── Exception: if layout wrapper has logic, extract it */
}
export function ProtectedLayout({ children }) {
  const { user } = useAuth();
  if (!user) redirect("/login");
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
  );
}
{
  /* This one has logic (auth check) → extraction is justified */
}
```

---

## W — Why It Matters

- The `className` prop with `cn()` is the standard pattern for Tailwind component extensibility — every extracted component should accept it. Without it, consumers are forced to add wrapper divs or rewrite the component to add a specific override, which defeats the purpose.
- Compound components (`Card.Root`, `Card.Header`, `Card.Body`) scale better than monolithic components with many props — they're more composable, easier to test, and don't accumulate a growing prop interface as the design evolves.
- The most common mistake is extracting too early — a two-instance pattern is almost always better left as inline utilities. The cognitive overhead of finding the component definition, understanding its props, and tracking its variants exceeds the benefit for two uses. Three uses with identical structure and a clear concept is the threshold.

---

## I — Interview Q&A

### Q1: When should you NOT extract a Tailwind utility combination into a component?

**A:** Don't extract when the combination appears only once or twice — the overhead of defining, exporting, importing, and documenting a component exceeds the maintenance benefit for fewer than three uses. Don't extract layout wrappers that have no logic — a `<div className="max-w-7xl mx-auto px-4">` with children is readable inline and creates unnecessary abstraction as a component. Don't extract to shorten a class string — length is not a valid reason. The test is: if you needed to change the styling of all instances at once, would having a component save you time? If yes and there are 3+ instances, extract. If no, leave it inline.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Extracted component doesn't accept `className` — can't be extended

```tsx
{
  /* ❌ No className prop — every override needs a wrapper div */
}
export function Tag({ children }) {
  return (
    <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded-full">
      {children}
    </span>
  );
}

{
  /* Can't override bg-gray-100 for a specific use case without:
    <div className="special-override"><Tag>...</Tag></div> */
}
```

**Fix:** Always accept and merge `className`:

```tsx
{
  /* ✅ className prop with cn() — allows targeted overrides */
}
export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 rounded-full",
        className // ← twMerge resolves conflicts: bg-gray-100 + bg-blue-100 → bg-blue-100
      )}
    >
      {children}
    </span>
  );
}

{
  /* Override cleanly */
}
<Tag className="bg-blue-100 text-blue-700">Custom</Tag>;
```

---

## K — Coding Challenge + Solution

### Challenge

Extract a fully composable `<Alert>` compound component:

1. `Alert.Root` — container with variant colors (info/success/warning/error)
2. `Alert.Icon` — leading icon slot
3. `Alert.Title` — bold heading
4. `Alert.Description` — body text
5. `Alert.Action` — optional CTA link or button
6. All parts accept `className` for extension
7. Root uses `cva` for variant management
8. Demo showing all 4 variants composed with different sub-parts

### Solution

```tsx
// src/components/ui/alert.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("flex gap-3 p-4 rounded-xl border", {
  variants: {
    variant: {
      info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100",
      success:
        "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
      warning:
        "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
      error:
        "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    },
  },
  defaultVariants: { variant: "info" },
});

type AlertRootProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

function AlertRoot({ variant, className, children, ...props }: AlertRootProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

function AlertIcon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("shrink-0 text-lg leading-5 mt-0.5", className)}>
      {children}
    </span>
  );
}

function AlertTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-semibold text-sm leading-5", className)}>
      {children}
    </p>
  );
}

function AlertDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm opacity-80 leading-relaxed mt-0.5", className)}>
      {children}
    </p>
  );
}

function AlertAction({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        "text-xs font-semibold underline underline-offset-2 mt-1.5 inline-block",
        "hover:opacity-70 transition-opacity",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// ─── Namespace export
export const Alert = {
  Root: AlertRoot,
  Icon: AlertIcon,
  Title: AlertTitle,
  Description: AlertDescription,
  Action: AlertAction,
};

// ─── Re-export variants for external use (e.g. className generation elsewhere)
export { alertVariants };

// ─── Demo: all 4 variants composed differently
export function AlertDemo() {
  return (
    <div className="max-w-lg mx-auto space-y-4 p-6">
      {/* Info — icon + title + description + action */}
      <Alert.Root variant="info">
        <Alert.Icon>ℹ️</Alert.Icon>
        <div className="flex-1 min-w-0">
          <Alert.Title>New update available</Alert.Title>
          <Alert.Description>
            Version 2.4.0 is ready. It includes performance improvements and
            security patches.
          </Alert.Description>
          <Alert.Action href="/changelog">View changelog →</Alert.Action>
        </div>
      </Alert.Root>

      {/* Success — icon + title only */}
      <Alert.Root variant="success">
        <Alert.Icon>✅</Alert.Icon>
        <div>
          <Alert.Title>Changes saved successfully.</Alert.Title>
        </div>
      </Alert.Root>

      {/* Warning — title + description, no icon */}
      <Alert.Root variant="warning">
        <div className="flex-1">
          <Alert.Title>Storage almost full</Alert.Title>
          <Alert.Description>
            You are using 92% of your 5GB storage. Upgrade your plan to avoid
            service interruptions.
          </Alert.Description>
          <Alert.Action href="/billing" className="mt-2">
            Upgrade storage →
          </Alert.Action>
        </div>
      </Alert.Root>

      {/* Error — icon + title + description */}
      <Alert.Root variant="error">
        <Alert.Icon>❌</Alert.Icon>
        <div className="flex-1 min-w-0">
          <Alert.Title>Payment failed</Alert.Title>
          <Alert.Description>
            Your card ending in 4242 was declined. Please update your payment
            method to continue.
          </Alert.Description>
          <Alert.Action href="/billing">Update payment method →</Alert.Action>
        </div>
      </Alert.Root>

      {/* Overridden via className — demonstrates extensibility */}
      <Alert.Root variant="info" className="border-2 border-blue-400 shadow-md">
        <Alert.Icon>🚀</Alert.Icon>
        <div>
          <Alert.Title className="text-base">
            Custom override via className
          </Alert.Title>
          <Alert.Description>
            The Root's className merged via twMerge — border-blue-200 was
            replaced by border-blue-400 cleanly. ✅
          </Alert.Description>
        </div>
      </Alert.Root>
    </div>
  );
}
```

---

---
