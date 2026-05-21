# Full Curriculum Overview — Next.js-Tailwind-BaseUI

This index was generated from the `Next.js-Tailwind-BaseUI` folder.

Day 1

- [`create-next-app` — Scaffolding the Project](day-01/01-create-next-app-scaffolding-the-project.md)
- [TypeScript in Next.js 16](day-01/02-typescript-in-next-js-16.md)
- [ESLint — Configuration & Rules](day-01/03-eslint-configuration-rules.md)
- [Tailwind CSS Integration](day-01/04-tailwind-css-integration.md)
- [App Router Mental Model](day-01/05-app-router-mental-model.md)
- [The `app/` Directory — Structure & Conventions](day-01/06-the-app-directory-structure-conventions.md)
- [The `src/` Directory — Why and When](day-01/07-the-src-directory-why-and-when.md)
- [The `public/` Directory](day-01/08-the-public-directory.md)
- [Top-Level Config Files](day-01/09-top-level-config-files.md)
- [Local Development Flow](day-01/10-local-development-flow.md)
- [Project Structure Overview — Putting It All Together](day-01/11-project-structure-overview-putting-it-all-together.md)

Day 2

- [`page.tsx` — The Route File](day-02/01-page-tsx-the-route-file.md)
- [`layout.tsx` — Persistent Wrappers](day-02/02-layout-tsx-persistent-wrappers.md)
- [`template.tsx` — Remounting Layouts](day-02/03-template-tsx-remounting-layouts.md)
- [Route Exposure Rules — What Makes a URL Accessible](day-02/04-route-exposure-rules-what-makes-a-url-accessible.md)
- [Private Folders — The Underscore Convention](day-02/05-private-folders-the-underscore-convention.md)
- [Co-located Files — Keeping Code Close](day-02/06-co-located-files-keeping-code-close.md)
- [Metadata Files — Convention-Based Static Assets](day-02/07-metadata-files-convention-based-static-assets.md)
- [Root Layout — The Required Foundation](day-02/08-root-layout-the-required-foundation.md)
- [Nested Layouts — Segment-Based Layout Inheritance](day-02/09-nested-layouts-segment-based-layout-inheritance.md)
- [Segment-Based Organization — Route Groups, Dynamic Segments, Catch-All Routes](day-02/10-segment-based-organization-route-groups-dynamic-segments-catch-all-routes.md)

Day 3

- [`<Link>` — Client-Side Navigation](day-03/01-link-client-side-navigation.md)
- [Prefetching — How Next.js Preloads Routes](day-03/02-prefetching-how-next-js-preloads-routes.md)
- [`useRouter` — Programmatic Navigation](day-03/03-userouter-programmatic-navigation.md)
- [`usePathname` — Reading the Current Path](day-03/04-usepathname-reading-the-current-path.md)
- [`useParams` — Reading Dynamic Route Params Client-Side](day-03/05-useparams-reading-dynamic-route-params-client-side.md)
- [`useSearchParams` — Reading Query Parameters](day-03/06-usesearchparams-reading-query-parameters.md)
- [Search Param Patterns — Filter, Sort, Pagination via URL](day-03/07-search-param-patterns-filter-sort-pagination-via-url.md)
- [Route-Aware Navigation — Active Links and Breadcrumbs](day-03/08-route-aware-navigation-active-links-and-breadcrumbs.md)
- [URL-Driven UI State — The Complete Pattern](day-03/09-url-driven-ui-state-the-complete-pattern.md)
- [Navigation UX — Loading States, Transitions, Scroll Behavior](day-03/10-navigation-ux-loading-states-transitions-scroll-behavior.md)

Day 4

- [Dynamic Segments — `[param]` Deep Dive](day-04/01-dynamic-segments-param-deep-dive.md)
- [Catch-All Routes — `[...slug]`](day-04/02-catch-all-routes-slug.md)
- [Optional Catch-All Routes — `[[...slug]]`](day-04/03-optional-catch-all-routes-slug.md)
- [Route Groups — `(group)` Organization and Layout Isolation](day-04/04-route-groups-group-organization-and-layout-isolation.md)
- [Nested Segments — Depth, Inheritance, and Composition](day-04/05-nested-segments-depth-inheritance-and-composition.md)
- [`generateStaticParams` — Static Generation for Dynamic Routes](day-04/06-generatestaticparams-static-generation-for-dynamic-routes.md)
- [Designing Blog Routes — Complete Route Architecture](day-04/07-designing-blog-routes-complete-route-architecture.md)
- [Designing Dashboard Routes — Multi-Level Navigation](day-04/08-designing-dashboard-routes-multi-level-navigation.md)
- [Multi-Section App Structures — Combining All Patterns](day-04/09-multi-section-app-structures-combining-all-patterns.md)
- [Route Conflicts, Priority, and Edge Cases](day-04/10-route-conflicts-priority-and-edge-cases.md)

Day 5

- [`loading.tsx` — Streaming and Suspense Boundaries](day-05/01-loading-tsx-streaming-and-suspense-boundaries.md)
- [`error.tsx` — Error Boundaries and Recovery](day-05/02-error-tsx-error-boundaries-and-recovery.md)
- [`not-found.tsx` — 404 Handling and `notFound()`](day-05/03-not-found-tsx-404-handling-and-notfound.md)
- [`default.tsx` — Parallel Route Fallbacks](day-05/04-default-tsx-parallel-route-fallbacks.md)
- [`forbidden.tsx` — 403 Authorization Errors](day-05/05-forbidden-tsx-403-authorization-errors.md)
- [`unauthorized.tsx` — 401 Authentication Errors](day-05/06-unauthorized-tsx-401-authentication-errors.md)
- [Parallel Routes — `@slot` Architecture](day-05/07-parallel-routes-slot-architecture.md)
- [Intercepting Routes — Modal Patterns](day-05/08-intercepting-routes-modal-patterns.md)
- [Resilient Navigation and Recovery Flows](day-05/09-resilient-navigation-and-recovery-flows.md)
- [Combining All Special Files — Complete Route Boundary Architecture](day-05/10-combining-all-special-files-complete-route-boundary-architecture.md)

Day 6

- [Server Components — Default Rendering Model](day-06/01-server-components-default-rendering-model.md)
- [Client Components — `'use client'` and the Client Boundary](day-06/02-client-components-use-client-and-the-client-boundary.md)
- [`'use server'` — Server Actions](day-06/03-use-server-server-actions.md)
- [Suspense and Streaming — Progressive Rendering](day-06/04-suspense-and-streaming-progressive-rendering.md)
- [Lazy Loading — `next/dynamic` and Code Splitting](day-06/05-lazy-loading-next-dynamic-and-code-splitting.md)
- [Composition Patterns — Server Inside Client, Client Inside Server](day-06/06-composition-patterns-server-inside-client-client-inside-server.md)
- [Choosing Server-Client Boundaries — Decision Framework](day-06/07-choosing-server-client-boundaries-decision-framework.md)
- [Data Fetching Patterns — Where Data Lives](day-06/08-data-fetching-patterns-where-data-lives.md)
- [Rendering Strategies — Static, Dynamic, Streaming](day-06/09-rendering-strategies-static-dynamic-streaming.md)
- [Performance Patterns — Bundle Size, Hydration, and Optimization](day-06/10-performance-patterns-bundle-size-hydration-and-optimization.md)

Day 7

- [`fetch` in Server Components — Basics and Cache Options](day-07/01-fetch-in-server-components-basics-and-cache-options.md)
- [Sequential vs Parallel Data Fetching](day-07/02-sequential-vs-parallel-data-fetching.md)
- [Static vs Dynamic Rendering — How Fetching Drives It](day-07/03-static-vs-dynamic-rendering-how-fetching-drives-it.md)
- [The Next.js Cache Layers — Full Mental Model](day-07/04-the-next-js-cache-layers-full-mental-model.md)
- [Time-Based Revalidation — `revalidate` and ISR](day-07/05-time-based-revalidation-revalidate-and-isr.md)
- [`revalidatePath` — On-Demand Path Invalidation](day-07/06-revalidatepath-on-demand-path-invalidation.md)
- [`revalidateTag` and `unstable_cache` — Tag-Based Invalidation](day-07/07-revalidatetag-and-unstable-cache-tag-based-invalidation.md)
- [Opting Out of Cache — `cache: 'no-store'` and `connection()`](day-07/08-opting-out-of-cache-cache-no-store-and-connection.md)
- [Route Segment Config — `dynamic`, `revalidate`, `fetchCache`, `runtime`](day-07/09-route-segment-config-dynamic-revalidate-fetchcache-runtime.md)
- [`generateStaticParams` — Static Path Generation](day-07/10-generatestaticparams-static-path-generation.md)

Day 8

- [Server Actions — Fundamentals and the Execution Model](day-08/01-server-actions-fundamentals-and-the-execution-model.md)
- [App Router Forms — `useActionState`, Progressive Enhancement](day-08/02-app-router-forms-useactionstate-progressive-enhancement.md)
- [Updating Data — Mutations, Optimistic Updates, Error Handling](day-08/03-updating-data-mutations-optimistic-updates-error-handling.md)
- [Route Handlers — `route.ts`, GET and POST Handlers](day-08/04-route-handlers-route-ts-get-and-post-handlers.md)
- [`NextRequest` and `NextResponse` — The Request/Response API](day-08/05-nextrequest-and-nextresponse-the-request-response-api.md)
- [Cookies — Reading, Setting, Deleting](day-08/06-cookies-reading-setting-deleting.md)
- [Headers — Request Headers, Response Headers, Custom Headers](day-08/07-headers-request-headers-response-headers-custom-headers.md)
- [Redirects — Server-Side, Client-Side, Middleware](day-08/08-redirects-server-side-client-side-middleware.md)
- [Proxy and Backend-for-Frontend (BFF) Patterns](day-08/09-proxy-and-backend-for-frontend-bff-patterns.md)
- [Error Handling in Mutations and Route Handlers](day-08/10-error-handling-in-mutations-and-route-handlers.md)

Day 9

- [Global CSS Entry Points — `globals.css`, CSS Modules, Tailwind v4](day-09/01-global-css-entry-points-globals-css-css-modules-tailwind-v4.md)
- [`next/font` — Google Fonts, Local Fonts, Font Optimization](day-09/02-next-font-google-fonts-local-fonts-font-optimization.md)
- [`next/image` — Image Optimization, `sizes`, `priority`, `fill`](day-09/03-next-image-image-optimization-sizes-priority-fill.md)
- [Metadata API — Static, Dynamic, `generateMetadata`](day-09/04-metadata-api-static-dynamic-generatemetadata.md)
- [Open Graph Images — `opengraph-image.tsx`, Dynamic OG Images](day-09/05-open-graph-images-opengraph-image-tsx-dynamic-og-images.md)
- [Twitter Card Images — `twitter-image.tsx`, Card Types](day-09/06-twitter-card-images-twitter-image-tsx-card-types.md)
- [`robots.txt` — Static and Dynamic Generation](day-09/07-robots-txt-static-and-dynamic-generation.md)
- [`sitemap.xml` — Static and Dynamic Sitemap Generation](day-09/08-sitemap-xml-static-and-dynamic-sitemap-generation.md)
- [JSON-LD — Structured Data for SEO](day-09/09-json-ld-structured-data-for-seo.md)
- [Environment Variables — `.env` Files, `NEXT_PUBLIC_`, Validation](day-09/10-environment-variables-env-files-next-public-validation.md)
- [Deployment-Ready Setup — `next.config.ts`, Health Checks, Output Modes](day-09/11-deployment-ready-setup-next-config-ts-health-checks-output-modes.md)

Day 10

- [Utility-First Workflow — Mental Model, Setup, `@apply`](day-10/01-utility-first-workflow-mental-model-setup-apply.md)
- [Layout — Flexbox, Grid, Positioning, z-index, overflow](day-10/02-layout-flexbox-grid-positioning-z-index-overflow.md)
- [Spacing — Padding, Margin, Gap, Space Between](day-10/03-spacing-padding-margin-gap-space-between.md)
- [Sizing — Width, Height, Min/Max, Aspect Ratio](day-10/04-sizing-width-height-min-max-aspect-ratio.md)
- [Typography — Font Size, Weight, Line Height, Tracking, Alignment](day-10/05-typography-font-size-weight-line-height-tracking-alignment.md)
- [Colors — Text, Background, Border, Opacity, CSS Variables](day-10/06-colors-text-background-border-opacity-css-variables.md)
- [Borders, Shadows, and Visual Effects](day-10/07-borders-shadows-and-visual-effects.md)
- [Hover, Focus, and Interactive States](day-10/08-hover-focus-and-interactive-states.md)
- [Responsive Variants — Mobile-First Breakpoints](day-10/09-responsive-variants-mobile-first-breakpoints.md)
- [Dark Mode — `dark:` Variant, CSS Variable Strategy](day-10/10-dark-mode-dark-variant-css-variable-strategy.md)
- [Composing Interfaces — Building Real UI from Utility Primitives](day-10/11-composing-interfaces-building-real-ui-from-utility-primitives.md)

Day 11

- [Arbitrary Values — `[value]` Syntax, CSS Variables, Calc](day-11/01-arbitrary-values-value-syntax-css-variables-calc.md)
- [Arbitrary Properties — `[property:value]` for Any CSS](day-11/02-arbitrary-properties-property-value-for-any-css.md)
- [Complex Selectors — `&`, `*`, `has-*`, `not-*`, `is-*`](day-11/03-complex-selectors-has-not-is.md)
- [Named Groups and Nested `group-*` Patterns](day-11/04-named-groups-and-nested-group-patterns.md)
- [Data-Attribute Styling — `data-*` Variants](day-11/05-data-attribute-styling-data-variants.md)
- [Theme Extension Mindset — When to Extend vs Override vs Use Arbitrary](day-11/06-theme-extension-mindset-when-to-extend-vs-override-vs-use-arbitrary.md)
- [Duplication Control — Recognising and Taming Repeated Utilities](day-11/07-duplication-control-recognising-and-taming-repeated-utilities.md)
- [Component Extraction — When, How, and What NOT to Extract](day-11/08-component-extraction-when-how-and-what-not-to-extract.md)
- [Style Conflict Handling — Specificity, Merging, `cn()`, `twMerge`](day-11/09-style-conflict-handling-specificity-merging-cn-twmerge.md)
- [`!important` — Forced Overrides and When They Are Justified](day-11/10-important-forced-overrides-and-when-they-are-justified.md)
- [Prefixing — Namespace Isolation for Third-Party and Embedded Tailwind](day-11/11-prefixing-namespace-isolation-for-third-party-and-embedded-tailwind.md)

Day 12

- [Installing @base-ui/react — Setup, Peer Deps, CSS Strategy](day-12/01-installing-base-ui-react-setup-peer-deps-css-strategy.md)
- [Headless Component Philosophy — What It Means and Why It Matters](day-12/02-headless-component-philosophy-what-it-means-and-why-it-matters.md)
- [Accessibility-First Composition — ARIA, Focus, Keyboard Nav](day-12/03-accessibility-first-composition-aria-focus-keyboard-nav.md)
- [Anatomy-Based Assembly — Root, Trigger, Portal, Positioner, Popup](day-12/04-anatomy-based-assembly-root-trigger-portal-positioner-popup.md)
- [Tailwind Styling for Primitives — `data-[state]`, `cn()`, Base UI](day-12/05-tailwind-styling-for-primitives-data-state-cn-base-ui.md)
- [Popover — Full Implementation with Tailwind](day-12/06-popover-full-implementation-with-tailwind.md)
- [Dialog — Modal with Overlay, Focus Trap, Accessible Anatomy](day-12/07-dialog-modal-with-overlay-focus-trap-accessible-anatomy.md)
- [Menu — Dropdown with Items, Groups, Separator](day-12/08-menu-dropdown-with-items-groups-separator.md)
- [Select — Controlled Dropdown Select](day-12/09-select-controlled-dropdown-select.md)
- [Tabs — Tab List, Panels, Keyboard Navigation](day-12/10-tabs-tab-list-panels-keyboard-navigation.md)
- [Tooltip — Hover/Focus Tooltip with Delay and Positioning](day-12/11-tooltip-hover-focus-tooltip-with-delay-and-positioning.md)
- [Toast / Notifications — Toast Pattern with Base UI Primitives](day-12/12-toast-notifications-toast-pattern-with-base-ui-primitives.md)
- [Transitions — CSS Open/Close Animations with `data-[state]`](day-12/13-transitions-css-open-close-animations-with-data-state.md)
- [Final Audit — Group 4 Complete; Optional Extensions Overview](day-12/14-final-audit-group-4-complete-optional-extensions-overview.md)
