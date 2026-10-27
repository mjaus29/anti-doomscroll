# Next.js / Tailwind / Base UI Cheat Sheet

A one-page reference for Next.js 16 (App Router), Tailwind CSS v4 and Base UI v1: the conventions, APIs and traps worth memorizing.

## Project setup

| Item | What to know |
| --- | --- |
| Scaffold | `npx create-next-app@latest`: TypeScript, ESLint, Tailwind, App Router, `src/` |
| Dev loop | `pnpm dev` (Turbopack), `pnpm build`, `pnpm start` |
| `src/app/` | routes; any non-route file here is private |
| `public/` | served from `/`: `public/logo.png` is `/logo.png` |
| `next.config.ts` | framework config: images, headers, redirects, `output` |
| `tsconfig.json` | `@/*` path alias to `src/*` |
| Tailwind v4 | configured in `globals.css`; no `tailwind.config.js` needed |
| Lint | `eslint-config-next`; Next 16 runs ESLint directly (`eslint .`), not `next lint` |
| Env vars | `.env.local` for secrets; only `NEXT_PUBLIC_*` reach the browser |

Lessons: [create-next-app](/group/next-js-tailwind-base-ui/day/01/01-create-next-app-scaffolding-the-project) · [App Router mental model](/group/next-js-tailwind-base-ui/day/01/05-app-router-mental-model) · [Env variables](/group/next-js-tailwind-base-ui/day/09/10-environment-variables-env-files-next-public-validation)

## Routing: files and folders

| File / folder | Role |
| --- | --- |
| `page.tsx` | makes a segment publicly routable (the only one that does) |
| `layout.tsx` | wraps children, persists across navigation |
| `template.tsx` | like layout but remounts on every navigation |
| `app/layout.tsx` | required root: must render `<html>` and `<body>` |
| `route.ts` | HTTP endpoint (cannot share a segment with `page.tsx`) |
| `_folder` | private: never a route |
| `(group)` | organizes / gives its own layout, not in the URL |
| `[id]` | dynamic segment |
| `[...slug]` | catch-all, 1+ segments, `string[]` |
| `[[...slug]]` | optional catch-all, also matches the base path |
| `@slot` | parallel route, received as a layout prop |
| `(.)x` `(..)x` `(...)x` | intercept same level / one up / from root |

Matching priority: static beats dynamic beats catch-all.

```tsx
// app/blog/[slug]/page.tsx (Next 16: params is a Promise)
export default async function Post({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <h1>{slug}</h1>
}
```

Lessons: [page.tsx](/group/next-js-tailwind-base-ui/day/02/01-page-tsx-the-route-file) · [layout.tsx](/group/next-js-tailwind-base-ui/day/02/02-layout-tsx-persistent-wrappers) · [Route groups](/group/next-js-tailwind-base-ui/day/04/04-route-groups-group-organization-and-layout-isolation) · [Route conflicts](/group/next-js-tailwind-base-ui/day/04/10-route-conflicts-priority-and-edge-cases)

## Navigation and URL state

| API | Where | Use |
| --- | --- | --- |
| `<Link href="/x">` | anywhere | client navigation, prefetches in viewport |
| `useRouter()` | client (`next/navigation`) | `push`, `replace`, `back`, `refresh` |
| `usePathname()` | client | active links, breadcrumbs |
| `useParams()` | client | dynamic params (string values) |
| `useSearchParams()` | client | read-only query; wrap user in `<Suspense>` |
| `searchParams` prop | server page | `Promise<Record<string, string \| string[]>>` |
| `redirect()` | server | throw-style redirect in components/actions |

```tsx
'use client'
function setParam(key: string, value: string) {
  const params = new URLSearchParams(searchParams.toString())
  params.set(key, value)
  router.replace(`${pathname}?${params}`, { scroll: false })
}
```

Filters, sort, page and tabs belong in the URL: shareable, bookmarkable, back-button safe.

Lessons: [Link](/group/next-js-tailwind-base-ui/day/03/01-link-client-side-navigation) · [useSearchParams](/group/next-js-tailwind-base-ui/day/03/06-usesearchparams-reading-query-parameters) · [Filter/sort/pagination via URL](/group/next-js-tailwind-base-ui/day/03/07-search-param-patterns-filter-sort-pagination-via-url)

## Special files and boundaries

| File | Trigger | Notes |
| --- | --- | --- |
| `loading.tsx` | segment suspends | auto `<Suspense>` around the page |
| `error.tsx` | thrown error below | must be `'use client'`; props `error`, `reset` |
| `global-error.tsx` | error in root layout | renders its own `<html>` / `<body>` |
| `not-found.tsx` | `notFound()` or unmatched URL | 404 |
| `forbidden.tsx` | `forbidden()` | 403, needs `experimental.authInterrupts` |
| `unauthorized.tsx` | `unauthorized()` | 401, needs `experimental.authInterrupts` |
| `default.tsx` | slot has no match (hard refresh) | return `null` to keep the slot empty |

Expected errors (validation, not found) are returned or use `notFound()`; unexpected ones are thrown to `error.tsx`. An `error.tsx` does not catch errors in the layout of the same segment.

Modal pattern: `@modal/(.)photo/[id]/page.tsx` shows a modal on client navigation; a hard load of `/photo/1` renders the full page. Add `@modal/default.tsx`.

Lessons: [loading.tsx](/group/next-js-tailwind-base-ui/day/05/01-loading-tsx-streaming-and-suspense-boundaries) · [error.tsx](/group/next-js-tailwind-base-ui/day/05/02-error-tsx-error-boundaries-and-recovery) · [Parallel routes](/group/next-js-tailwind-base-ui/day/05/07-parallel-routes-slot-architecture) · [Intercepting routes](/group/next-js-tailwind-base-ui/day/05/08-intercepting-routes-modal-patterns)

## Server and Client Components

| | Server Component (default) | Client Component (`'use client'`) |
| --- | --- | --- |
| Runs | server only | server (SSR) + browser |
| JS shipped | none | yes |
| `async` / DB / secrets | yes | no |
| Hooks, events, browser APIs | no | yes |

| Rule | Detail |
| --- | --- |
| Boundary | `'use client'` marks the file and everything it imports |
| Push down | make only the interactive leaf a client component |
| Server inside client | pass as `children` / props, do not import |
| Props across boundary | must be serializable (no functions, except Server Actions) |
| Server-only code | `import 'server-only'` to fail the build if bundled for client |
| Dedupe non-fetch calls | `React.cache(fn)` per request |
| Lazy client code | `next/dynamic(() => import('./Chart'))` |

```tsx
// Server layout composes a client shell around server content
<ClientSidebar>
  <ServerNavLinks />   {/* still rendered on the server */}
</ClientSidebar>
```

Lessons: [Server Components](/group/next-js-tailwind-base-ui/day/06/01-server-components-default-rendering-model) · [use client boundary](/group/next-js-tailwind-base-ui/day/06/02-client-components-use-client-and-the-client-boundary) · [Composition patterns](/group/next-js-tailwind-base-ui/day/06/06-composition-patterns-server-inside-client-client-inside-server) · [Choosing boundaries](/group/next-js-tailwind-base-ui/day/06/07-choosing-server-client-boundaries-decision-framework)

## Data fetching and caching

```tsx
const [user, posts] = await Promise.all([   // parallel, not a waterfall
  getUser(id),
  getPosts(id),
])
```

| Goal | API |
| --- | --- |
| Cache a fetch across requests | `fetch(url, { cache: 'force-cache' })` |
| Time-based revalidation (ISR) | `fetch(url, { next: { revalidate: 3600 } })` |
| Tag for invalidation | `fetch(url, { next: { tags: ['products'] } })` |
| Always fresh fetch | `fetch(url, { cache: 'no-store' })` |
| Force the route dynamic | `await connection()` from `next/server` |
| Purge a path | `revalidatePath('/products')` |
| Purge a tag | `revalidateTag('products', 'max')` |
| Pre-build dynamic routes | `generateStaticParams()` (+ `dynamicParams`) |
| Segment-wide config | `export const revalidate = 60` / `dynamic` |
| Refresh client view | `router.refresh()` |

Since Next 15, `fetch` is not cached by default; opt in explicitly. A route is static unless it uses request APIs: `cookies()`, `headers()`, `searchParams`, `connection()` or uncached data.

Cache layers: request memoization (one render), Data Cache (fetch results), Full Route Cache (HTML + RSC payload), Router Cache (client).

Lessons: [Sequential vs parallel](/group/next-js-tailwind-base-ui/day/07/02-sequential-vs-parallel-data-fetching) · [Static vs dynamic](/group/next-js-tailwind-base-ui/day/07/03-static-vs-dynamic-rendering-how-fetching-drives-it) · [Cache layers](/group/next-js-tailwind-base-ui/day/07/04-the-next-js-cache-layers-full-mental-model) · [revalidateTag](/group/next-js-tailwind-base-ui/day/07/07-revalidatetag-and-unstable-cache-tag-based-invalidation)

## Server Actions and forms

```tsx
// app/actions.ts
'use server'
export async function createPost(prev: State, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input' }   // expected error
  await db.post.create({ data: parsed.data })
  revalidatePath('/posts')
  redirect('/posts')                        // outside try/catch
}
```

```tsx
'use client'
const [state, formAction, isPending] = useActionState(createPost, initial)
return <form action={formAction}>...</form>   // works before JS loads
```

| Concept | Note |
| --- | --- |
| Actions are public endpoints | validate input and check auth in every action |
| `useActionState` | from `react`; returns `[state, action, isPending]` |
| `useFormStatus` | pending state inside a child of the `<form>` |
| `useOptimistic` | show the expected result while the action runs |
| Flow | validate, write, revalidate, return or redirect |

Lessons: [Server Actions](/group/next-js-tailwind-base-ui/day/08/01-server-actions-fundamentals-and-the-execution-model) · [useActionState forms](/group/next-js-tailwind-base-ui/day/08/02-app-router-forms-useactionstate-progressive-enhancement) · [Mutations + optimistic](/group/next-js-tailwind-base-ui/day/08/03-updating-data-mutations-optimistic-updates-error-handling)

## Route Handlers, cookies, headers, redirects

```ts
// app/api/products/[id]/route.ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(product)
}
```

| Task | API |
| --- | --- |
| Read/set cookies | `const jar = await cookies()` then `jar.get/set/delete` |
| Read headers | `const h = await headers()` then `h.get('user-agent')` |
| Set cookies | only in Server Actions, Route Handlers, proxy (not during render) |
| Redirect (server) | `redirect('/x')` / `permanentRedirect('/x')` |
| Redirect (handler) | `NextResponse.redirect(new URL('/x', req.url))` |
| Static redirects | `redirects()` in `next.config.ts` |
| Request interception | `proxy.ts` (Next 16 name for `middleware.ts`) |
| BFF | route handler attaches secrets, calls upstream, trims the response |

Lessons: [Route handlers](/group/next-js-tailwind-base-ui/day/08/04-route-handlers-route-ts-get-and-post-handlers) · [Cookies](/group/next-js-tailwind-base-ui/day/08/06-cookies-reading-setting-deleting) · [Redirects](/group/next-js-tailwind-base-ui/day/08/08-redirects-server-side-client-side-middleware) · [BFF patterns](/group/next-js-tailwind-base-ui/day/08/09-proxy-and-backend-for-frontend-bff-patterns)

## Assets, metadata and SEO

| Feature | Syntax / file | Note |
| --- | --- | --- |
| Fonts | `const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })` | self-hosted at build |
| Images | `<Image src alt width height />` or `fill` + `sizes` | `preload` for the LCP image (Next 16; `priority` is deprecated) |
| Remote images | `images.remotePatterns` in `next.config.ts` | required for external hosts |
| Static metadata | `export const metadata: Metadata = {...}` | layouts merge down |
| Dynamic metadata | `export async function generateMetadata({ params })` | `await params` |
| Title template | `title: { template: '%s · Shop', default: 'Shop' }` | in root layout |
| OG image | `opengraph-image.tsx` with `ImageResponse` | per segment |
| robots / sitemap | `app/robots.ts`, `app/sitemap.ts` | `MetadataRoute.Robots` / `.Sitemap` |
| JSON-LD | `<script type="application/ld+json">` in a server component | escape `<` in the JSON |
| Docker deploy | `output: 'standalone'` | minimal server bundle |

Lessons: [next/font](/group/next-js-tailwind-base-ui/day/09/02-next-font-google-fonts-local-fonts-font-optimization) · [next/image](/group/next-js-tailwind-base-ui/day/09/03-next-image-image-optimization-sizes-priority-fill) · [Metadata API](/group/next-js-tailwind-base-ui/day/09/04-metadata-api-static-dynamic-generatemetadata) · [Deployment setup](/group/next-js-tailwind-base-ui/day/09/11-deployment-ready-setup-next-config-ts-health-checks-output-modes)

## Tailwind v4: core utilities

```css
/* src/app/globals.css (imported once in the root layout) */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 259);  /* -> bg-brand-500 */
  --font-sans: var(--font-inter);           /* -> font-sans */
  --breakpoint-3xl: 120rem;                 /* -> 3xl: */
}
```

| Area | Utilities |
| --- | --- |
| Layout | `flex items-center justify-between`, `grid grid-cols-3 col-span-2` |
| Spacing | 1 unit = 0.25rem (4px): `p-4` = 1rem; prefer `gap-*` to sibling margins |
| Sizing | `w-full max-w-3xl mx-auto`, `min-h-screen`, `size-10`, `aspect-video` |
| Type | `text-sm font-semibold leading-tight tracking-tight` |
| Color + opacity | `bg-blue-600/80`, `text-gray-500` |
| States | `hover:` `focus-visible:` `active:` `disabled:` `group-hover:` `peer-checked:` |
| Responsive | mobile-first: `p-4 md:p-8` means 1rem below md, 2rem from md up |
| Dark | `dark:bg-gray-900` (follows `prefers-color-scheme` by default) |

Class-based dark mode in v4:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Lessons: [Utility-first + setup](/group/next-js-tailwind-base-ui/day/10/01-utility-first-workflow-mental-model-setup-apply) · [Interactive states](/group/next-js-tailwind-base-ui/day/10/08-hover-focus-and-interactive-states) · [Responsive variants](/group/next-js-tailwind-base-ui/day/10/09-responsive-variants-mobile-first-breakpoints) · [Dark mode](/group/next-js-tailwind-base-ui/day/10/10-dark-mode-dark-variant-css-variable-strategy)

## Tailwind v4: advanced patterns

| Pattern | Syntax |
| --- | --- |
| Arbitrary value | `w-[340px]`, `h-[calc(100vh-56px)]`, `bg-[#1a2b3c]` |
| CSS variable | `bg-(--color-surface)` (v4 shorthand) or `bg-[var(--color-surface)]` |
| Arbitrary property | `[content-visibility:auto]` |
| Arbitrary variant | `[&>li]:py-2`, `*:p-2` (direct children) |
| `:has` / `:not` | `has-[input:checked]:ring-2`, `not-last:border-b` |
| Named groups | `group/card` + `group-hover/card:opacity-100` |
| Data attributes | `data-[open]:block`, `data-[side=top]:mb-2` |
| Important | `p-4!` (v4 suffix) |
| Prefix | `@import "tailwindcss" prefix(tw);` then `tw:flex tw:p-4` |
| Custom utility | `@utility content-auto { content-visibility: auto; }` |
| `@apply` in a CSS Module | add `@reference "../app/globals.css";` first |

Extend `@theme` for reusable tokens, use arbitrary values for true one-offs, extract a React component for repeated markup (not `@apply`).

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
// cn('p-4 text-sm', 'p-6') -> 'text-sm p-6'
```

Lessons: [Arbitrary values](/group/next-js-tailwind-base-ui/day/11/01-arbitrary-values-value-syntax-css-variables-calc) · [Data variants](/group/next-js-tailwind-base-ui/day/11/05-data-attribute-styling-data-variants) · [Theme extension](/group/next-js-tailwind-base-ui/day/11/06-theme-extension-mindset-when-to-extend-vs-override-vs-use-arbitrary) · [cn + twMerge](/group/next-js-tailwind-base-ui/day/11/09-style-conflict-handling-specificity-merging-cn-twmerge)

## Base UI: anatomy and styling

`npm install @base-ui/react`. Headless: behavior, ARIA, focus and keyboard handling included; zero CSS. Components are interactive, so the file using them needs `'use client'`.

```tsx
import { Popover } from '@base-ui/react/popover'   // in a 'use client' file
<Popover.Root>
  <Popover.Trigger className="btn">Open</Popover.Trigger>
  <Popover.Portal>
    <Popover.Positioner side="bottom" sideOffset={8}>
      <Popover.Popup className="rounded-xl bg-white p-4 shadow-lg">
        <Popover.Title>Profile</Popover.Title>
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>
```

| Component | Anatomy |
| --- | --- |
| Popover / Tooltip | Root, Trigger, Portal, Positioner, Popup, Arrow |
| Tooltip | wrap the app in `Tooltip.Provider` for shared delay |
| Dialog | Root, Trigger, Portal, Backdrop, Popup, Title, Description, Close |
| Menu | Root, Trigger, Portal, Positioner, Popup, Item, Group, GroupLabel, Separator |
| Select | Root, Trigger, Value, Portal, Positioner, Popup, Item, ItemText |
| Tabs | Root, List, Tab, Indicator, Panel (no portal) |
| Toast | Provider, Viewport, Root, Title, Description, Action, Close |

| Styling hook | Example |
| --- | --- |
| Open state | `data-[open]:`, trigger gets `data-[popup-open]:` |
| Item state | `data-[highlighted]:bg-gray-100`, `data-[selected]:` (Select.Item), `data-[active]:` (Tabs.Tab), `data-[disabled]:` |
| Enter / exit | `data-[starting-style]:opacity-0 data-[ending-style]:opacity-0` + `transition` |
| Placement | `data-[side=top]:`, `origin-(--transform-origin)` |
| Custom element | `render={<a href="/x" />}` instead of a wrapper |
| Controlled | `open` + `onOpenChange`, `value` + `onValueChange` |
| Menu item action | `<Menu.Item onClick={...}>` (there is no `onSelect`) |

Lessons: [Installing Base UI](/group/next-js-tailwind-base-ui/day/12/01-installing-base-ui-react-setup-peer-deps-css-strategy) · [Anatomy](/group/next-js-tailwind-base-ui/day/12/04-anatomy-based-assembly-root-trigger-portal-positioner-popup) · [Dialog](/group/next-js-tailwind-base-ui/day/12/07-dialog-modal-with-overlay-focus-trap-accessible-anatomy) · [Transitions](/group/next-js-tailwind-base-ui/day/12/13-transitions-css-open-close-animations-with-data-state)

## Gotchas

| ❌ Mistake | ✅ Fix |
| --- | --- |
| `params.slug` in Next 16 | `const { slug } = await params` |
| `cookies().get('x')` | `(await cookies()).get('x')` |
| `'use client'` at the top of every page | keep pages server; mark only interactive leaves |
| Importing a Server Component into a client file | pass it as `children` |
| `useSearchParams` without `<Suspense>` | wrap the component in `<Suspense>` |
| `await a(); await b()` for independent data | `await Promise.all([a(), b()])` |
| Expecting `fetch` to be cached by default | `cache: 'force-cache'` or `next: { revalidate }` |
| Mutating in an action without revalidating | `revalidatePath` / `revalidateTag` after the write |
| `redirect()` inside `try/catch` | call it after the `try` (it throws on purpose) |
| Trusting Server Action input | validate (Zod) and check auth in every action |
| Secret used in a client file via `process.env.X` | keep it server-side; only `NEXT_PUBLIC_*` is public |
| Parallel route 404 on refresh | add `default.tsx` to the slot |
| Dynamic classes: `` `bg-${color}-500` `` | map to full class strings Tailwind can scan |
| `className` override conflicts (`p-4` + `p-6`) | `cn()` with `tailwind-merge` |
| Removing Base UI ARIA or focus outline | style with `focus-visible:` rings, keep attributes |

## Interview quick answers

**Q:** What makes a URL exist in the App Router?
A `page.tsx` (or a `route.ts`) at that path. Other files in `app/` are private.

**Q:** `layout.tsx` vs `template.tsx`?
Layouts persist and keep state across navigation; templates remount on every navigation.

**Q:** Server vs Client Components?
Server Components are the default, run only on the server and ship no JS. Client Components (`'use client'`) add state, effects, events and browser APIs.

**Q:** How do you render a Server Component inside a Client Component?
Pass it as `children` or another prop from a server parent; never import it in the client file.

**Q:** What makes a route dynamic?
Request-time APIs such as `cookies()`, `headers()`, `searchParams`, `connection()` or uncached fetches. Otherwise it is prerendered at build.

**Q:** `revalidatePath` vs `revalidateTag`?
`revalidatePath` purges one route; `revalidateTag` purges every cached entry tagged with that string, across routes.

**Q:** What is ISR?
Prebuilt pages regenerated in the background after the `revalidate` period, so users get static speed with fresh content.

**Q:** Server Action vs Route Handler?
Actions are for your own UI's mutations and forms; Route Handlers are HTTP endpoints for webhooks, external clients and BFF proxies.

**Q:** How does `useActionState` give progressive enhancement?
The `<form action>` posts to the server action even before JS loads; once hydrated, React handles it client-side with `isPending` and returned state.

**Q:** How do `loading.tsx` and streaming work?
`loading.tsx` wraps the page in Suspense; the shell streams immediately and content streams in as each boundary resolves.

**Q:** What changed in Tailwind v4 config?
CSS-first: `@import "tailwindcss"` and `@theme` tokens in CSS, automatic content detection, `@custom-variant` and `@utility` instead of JS config and plugins.

**Q:** Why `tailwind-merge`?
All utilities share one specificity, so conflicting classes are decided by CSS order, not class order. `twMerge` drops the losing class.

**Q:** What is a headless component library?
It ships behavior and accessibility (state, ARIA, focus, keyboard) without styles; you add every visual with Tailwind.

**Q:** Why do Base UI popups have Portal and Positioner?
Portal escapes overflow and stacking contexts; Positioner handles collision-aware placement and exposes side/align data attributes.

**Q:** How do Base UI open/close animations work?
`data-starting-style` sets the enter FROM state, `data-ending-style` the exit TO state, and Base UI keeps the element mounted until the transition ends.
