# Vitest / Performance / Docker Cheat Sheet

A one-page refresher for the three halves of this group: testing with Vitest, measuring and fixing web performance, and running apps and tests in Docker.

## Vitest setup and test structure

| Concept | Syntax / example | Note |
| :------ | :--------------- | :--- |
| Install | `npm i -D vitest` (+ `@vitest/coverage-v8`, `@vitest/ui`) | Uses Vite's pipeline: TS, ESM, aliases work out of the box |
| Watch mode | `vitest` | Re-runs affected tests on save |
| Single run (CI) | `vitest run` | Exits with a non-zero code on failure |
| Filter by file / name | `vitest run auth` · `vitest -t "returns null"` | In watch mode: `p` file, `t` name, `f` failed only |
| Config | `vitest.config.ts` with `defineConfig({ test: {...} })` | Or a `test` key inside an existing `vite.config.ts` |
| Environment | `environment: 'node'` (default) / `'jsdom'` / `'happy-dom'` | Per file: `// @vitest-environment jsdom` at the top |
| Globals | `globals: true` | Lets you skip `import { describe, it, expect }`; add `vitest/globals` to tsconfig `types` |
| Path aliases | `plugins: [tsconfigPaths()]` | From `vite-tsconfig-paths` |
| File naming | `x.test.ts` next to `x.ts` | `.spec.ts` for integration/feature specs; shared helpers in `src/test/` |

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],   // runs before EACH test file
    globalSetup: './src/test/global-setup.ts', // runs ONCE per run
    coverage: { provider: 'v8', reporter: ['text', 'html', 'lcov'] },
  },
})
```

| Hook | Runs | Use for |
| :--- | :--- | :------ |
| `globalSetup` | once, before any worker starts | start a test DB, one-time migrations |
| `setupFiles` | before each test file | matchers, polyfills, global cleanup hooks |
| `beforeAll` / `afterAll` | once per `describe` (or file) | open/close a connection |
| `beforeEach` / `afterEach` | around every test | reset state, `vi.clearAllMocks()` |

A clean unit test: one behaviour, a name that reads as a spec, Arrange-Act-Assert, independent, fast (< 5 ms), deterministic.

```ts
describe('formatPrice', () => {
  it('formats cents as dollars', () => {
    const cents = 1999                      // Arrange
    const result = formatPrice(cents)       // Act
    expect(result).toBe('$19.99')           // Assert
  })
})
```

Lessons: [Config File Basics](/group/vitest-performance-docker/day/01/03-config-file-basics-vitest-config-ts) · [describe → it → expect](/group/vitest-performance-docker/day/01/05-describe-it-test-expect-flow) · [Setup Files and Global Hooks](/group/vitest-performance-docker/day/01/08-setup-files-and-global-hooks) · [Writing First Clean Unit Tests](/group/vitest-performance-docker/day/01/12-writing-first-clean-unit-tests)

## Matchers, errors, and async

| Want to check | Matcher | Note |
| :------------ | :------ | :--- |
| Primitive equality | `toBe(3)` | `Object.is`; never for objects |
| Deep equality | `toEqual({ a: 1 })` | Ignores `undefined` properties |
| Deep + strict | `toStrictEqual(obj)` | `undefined` props and class types count |
| Partial object | `toMatchObject({ id: 'u1' })` | Extra keys allowed |
| Floats | `toBeCloseTo(0.3, 5)` | `0.1 + 0.2 !== 0.3` |
| Array / string contains | `toContain('x')` · `toHaveLength(2)` | `toContainEqual` for objects |
| Sync throw | `expect(() => fn()).toThrow(RangeError)` | Wrap in an arrow function |
| Async reject | `await expect(fn()).rejects.toThrow('msg')` | Always `await` |
| Async resolve | `await expect(fn()).resolves.toMatchObject({...})` | |
| Wait for async UI | `await vi.waitFor(() => expect(x).toBe(true))` | Polls instead of `setTimeout` sleeps |

`toThrow()` with no argument passes for any error. Assert the class, a message substring, or a regex.

Lessons: [Assertion Patterns](/group/vitest-performance-docker/day/01/06-assertion-patterns-expect-matchers) · [Error Assertions](/group/vitest-performance-docker/day/02/02-error-assertions-sync-and-async) · [Async Tests and Promise Patterns](/group/vitest-performance-docker/day/02/03-async-tests-and-promise-patterns)

## Mocks, spies, timers, and globals

| Tool | Syntax | Use for |
| :--- | :----- | :------ |
| Mock function | `const fn = vi.fn().mockReturnValue(42)` | Replace a callback or injected dependency |
| Async mock | `fn.mockResolvedValue(user)` / `mockRejectedValue(err)` | |
| Custom behaviour | `fn.mockImplementation((x) => x * 2)` | `mockReturnValueOnce` for one call |
| Call asserts | `toHaveBeenCalledWith(a, b)` · `toHaveBeenCalledTimes(2)` · `toHaveBeenCalledOnce()` | |
| Spy | `vi.spyOn(obj, 'method')` | Records calls, runs the original unless overridden |
| Module mock | `vi.mock('./db', () => ({ query: vi.fn() }))` | Hoisted above imports automatically |
| Typed mock | `vi.mocked(db.query).mockResolvedValue([])` | TypeScript cast helper |
| Partial module mock | `vi.mock('./utils', async (importActual) => ({ ...await importActual(), slow: vi.fn() }))` | Keep the rest real |
| Global | `vi.stubGlobal('fetch', vi.fn())` | Undo: `vi.unstubAllGlobals()` |
| Env var | `vi.stubEnv('API_URL', 'http://test')` | Undo: `vi.unstubAllEnvs()`; never assign `process.env` directly |
| Fake timers | `vi.useFakeTimers()` → `vi.advanceTimersByTime(300)` | Async code: `await vi.advanceTimersByTimeAsync(300)` |
| Run pending timers | `vi.runAllTimers()` / `vi.runOnlyPendingTimers()` | Use `runOnlyPendingTimers` for `setInterval` |
| Fixed "now" | `vi.setSystemTime(new Date('2025-01-01'))` | Restore with `vi.useRealTimers()` |

```ts
it('debounces calls', async () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const debounced = debounce(fn, 300)
  debounced(); debounced()
  await vi.advanceTimersByTimeAsync(299)
  expect(fn).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(fn).toHaveBeenCalledOnce()
  vi.useRealTimers()
})
```

| Cleanup | What it does | Where |
| :------ | :----------- | :---- |
| `vi.clearAllMocks()` | Clears `mock.calls` / results; keeps implementations | `beforeEach` |
| `vi.resetAllMocks()` | Clears calls and drops `mockReturnValue` / `mockImplementation` | When each test sets its own behaviour |
| `vi.restoreAllMocks()` | Puts `vi.spyOn` originals back | `afterEach` whenever you spy |

Lessons: [Fake Timers](/group/vitest-performance-docker/day/02/04-fake-timers-settimeout-setinterval-debounce) · [Module Mocking](/group/vitest-performance-docker/day/02/08-module-mocking-vi-mock) · [Global Mocking](/group/vitest-performance-docker/day/02/09-global-mocking-vi-stubglobal-and-vi-stubenv) · [Reset vs Clear vs Restore](/group/vitest-performance-docker/day/02/10-reset-vs-clear-vs-restore-and-test-isolation)

## DOM and browser testing

| Environment | Speed | Pick it for |
| :---------- | :---- | :---------- |
| `jsdom` | fast | Logic, DOM structure, events; widest API coverage of the simulators |
| `happy-dom` | about 2–4x faster than jsdom | Large suites when you don't hit API gaps |
| Browser Mode (Playwright / WebdriverIO) | slowest | Real layout, CSS, Web APIs, cross-browser checks |

Pattern: **query → act → assert**. Query by role, label, or text rather than internal IDs, then assert on what the user sees.

```ts
// @vitest-environment jsdom
it('shows an error for an empty email', () => {
  document.body.innerHTML = renderSignupForm()
  const form = document.querySelector('form')!
  form.dispatchEvent(new Event('submit', { cancelable: true }))
  expect(document.querySelector('[role="alert"]')?.textContent)
    .toContain('Email is required')
})
```

| Browser Mode fact | Detail |
| :---------------- | :------ |
| Enable | `browser: { enabled: true, provider: ... }` + `npm i -D @vitest/browser playwright` |
| Isolation | Fresh browser context (like incognito) per test **file**; clean the DOM between tests in a file |
| Real input | `await userEvent.type(input, 'Mark')` · `await userEvent.click(button)` (always `await`) |
| Version note | Lessons show `provider: 'playwright'` and imports from `@vitest/browser/context`. Vitest 4 uses `provider: playwright()` from `@vitest/browser-playwright`, `instances: [{ browser: 'chromium' }]`, and imports from `vitest/browser` |
| Mixed suites | Keep most tests in jsdom; run `*.browser.test.ts` in a separate project (`test.projects`, which replaced `vitest.workspace.ts` in Vitest 3.2+) |

Lessons: [jsdom Fundamentals](/group/vitest-performance-docker/day/03/01-jsdom-fundamentals-what-it-is-and-how-vitest-uses-it) · [DOM Interaction Testing](/group/vitest-performance-docker/day/03/03-dom-interaction-testing-query-fire-assert) · [Browser Mode Setup](/group/vitest-performance-docker/day/03/06-browser-mode-setup-vitest-real-browser) · [Simulated vs Real Browser](/group/vitest-performance-docker/day/03/08-simulated-vs-real-browser-choosing-the-right-environment)

## Coverage, speed, and CI

| Goal | How | Note |
| :--- | :-- | :--- |
| Coverage report | `vitest run --coverage` | `v8` = fast, built in; `istanbul` = instrumented |
| Enforce minimums | `coverage.thresholds: { lines: 80, branches: 75 }` | Fails the run below the floor |
| Reporters | `text` (terminal), `html` (local browsing), `lcov` (CI tools) | |
| Include untested files | `coverage.include: ['src/**']` | Older lessons use `all: true` (removed in Vitest 4) |
| Find slow tests | `--reporter=verbose`, `slowTestThreshold` | Usually heavy `beforeAll`/`beforeEach`, real timers, real network |
| Pool | `pool: 'threads'` (fast) / `'forks'` (isolated, native addons) / `'vmThreads'` | |
| Workers | `maxWorkers: 4` | Run serially: `fileParallelism: false` |
| Module isolation | `isolate: true` (default) | `false` only after profiling, and only for stateless tests |
| Shard across CI | `vitest run --shard=2/3` | Splits by file count, not time; merge coverage afterwards |
| Only affected tests | `vitest run --changed=origin/main` | Needs full history: `fetch-depth: 0` in checkout |
| Find order bugs | `--sequence.shuffle --sequence.seed=123` | Same seed reproduces the order |

**Deterministic CI checklist:** pinned Node version, lockfile + `npm ci`, seeded fake data (`faker.seed(42)`), fake timers and `vi.setSystemTime`, no shared state between tests, no real external services. `--retry` hides flakiness; fix the cause.

**Speed vs confidence:** most tests are unit tests, fewer are integration tests, only a few are browser/E2E tests. Aim for a CI suite under about 5 minutes.

Lessons: [Coverage Thresholds](/group/vitest-performance-docker/day/04/01-coverage-thresholds-reporters-and-enforcing-minimums) · [Worker Pools](/group/vitest-performance-docker/day/04/03-worker-pools-and-parallel-execution) · [Changed-Test Workflows](/group/vitest-performance-docker/day/04/05-changed-test-workflows-running-only-what-matters) · [Flaky Test Prevention](/group/vitest-performance-docker/day/04/08-flaky-test-prevention)

## Web performance: the model and Core Web Vitals

Critical rendering path: HTML → DOM, CSS → CSSOM → render tree → layout → paint → composite. Anything render-blocking (sync `<script>`, CSS `@import`, slow HTML) delays the first pixel.

| Metric | Measures | Good | Poor |
| :----- | :------- | :--- | :--- |
| **LCP** Largest Contentful Paint | loading: largest image/text block shown | ≤ 2.5 s | > 4.0 s |
| **INP** Interaction to Next Paint | responsiveness: worst input → next frame | ≤ 200 ms | > 500 ms |
| **CLS** Cumulative Layout Shift | visual stability: sum of unexpected shifts | ≤ 0.1 | > 0.25 |

Pass = "good" at the **75th percentile** of real users (CrUX). INP replaced FID in March 2024.

| Metric | Main causes | Fixes |
| :----- | :---------- | :---- |
| LCP | Slow TTFB, render-blocking resources, big/lazy hero image, client-side rendering | Fix the server first; preload the hero; `fetchpriority="high"`; never `loading="lazy"` on the LCP image; SSR the LCP element |
| INP | Long tasks (> 50 ms) on the main thread, heavy handlers, third-party scripts | Break up work with `await scheduler.yield()`; Web Workers; `startTransition`; batch DOM reads before writes |
| CLS | Images without size, late-injected content, web font swaps | `width`/`height` or `aspect-ratio`; reserve space for ads/embeds; `font-display: optional` or `next/font` |

```html
<link rel="preconnect" href="https://cdn.example.com" />
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high" />
<script src="/app.js" defer></script>
<img src="/hero.webp" width="1200" height="600" fetchpriority="high" alt="" />
```

Lessons: [Browser Performance Model](/group/vitest-performance-docker/day/05/01-the-browser-performance-model-critical-path-to-first-pixel) · [Core Web Vitals](/group/vitest-performance-docker/day/05/02-core-web-vitals-the-three-metrics-that-matter) · [LCP](/group/vitest-performance-docker/day/05/03-lcp-largest-contentful-paint) · [INP](/group/vitest-performance-docker/day/05/04-inp-interaction-to-next-paint)

## Measuring, budgets, bundles, and Next.js

| Tool | Data type | Use for |
| :--- | :-------- | :------ |
| Lighthouse / DevTools | Lab (synthetic, repeatable) | Diagnosing a problem |
| CrUX / Search Console | Field (real users) | What Google ranks on; confirming a fix |
| PageSpeed Insights | Both | Side-by-side check of one URL |
| `web-vitals` library | Field, your own analytics | `onLCP`, `onINP`, `onCLS` |
| DevTools Performance panel | Trace | Long tasks (red corners), Bottom-Up for self time, layout thrashing |

```js
// lighthouserc.js (run with: npx lhci autorun)
module.exports = { ci: { assert: { assertions: {
  'categories:performance': ['error', { minScore: 0.8 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'total-blocking-time': ['error', { maxNumericValue: 200 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
  'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
} } } }
```

| Lever | Example | Note |
| :---- | :------ | :--- |
| Code split | `const Chart = await import('./Chart')` | Load on demand |
| Lazy component (Next.js) | `dynamic(() => import('./Modal'))` | Keeps it out of the first bundle |
| Image | `<Image src=... width height sizes="100vw" priority />` | `priority` = preload + high fetch priority, only for the LCP image (Next.js 16 renames it `preload`) |
| Font | `Inter({ subsets: ['latin'], display: 'swap' })` | Self-hosted, size-adjusted fallback → near-zero CLS |
| Third-party script | `<Script strategy="afterInteractive" />` | `lazyOnload` for chat widgets; `beforeInteractive` only for must-run-first scripts |
| Data cache | `fetch(url, { next: { revalidate: 3600, tags: ['products'] } })` | `revalidateTag('products')` busts it on demand |

Lessons: [Lab vs Field Data](/group/vitest-performance-docker/day/05/06-lab-vs-field-data-pagespeed-insights-and-lighthouse) · [Performance Budgets and Lighthouse CI](/group/vitest-performance-docker/day/05/08-performance-budgets-and-lighthouse-ci) · [Bundle Control](/group/vitest-performance-docker/day/05/09-bundle-control-code-splitting-and-lazy-loading) · [Next.js Optimization](/group/vitest-performance-docker/day/05/10-next-js-optimization-image-font-script-and-caching)

## Docker: images, Dockerfiles, and data

| Term | Meaning |
| :--- | :------ |
| Image | Read-only, layered snapshot of the app and its dependencies |
| Container | A running (or stopped) instance of an image, isolated process + filesystem |
| Registry | Where images are stored: Docker Hub, GHCR, ECR |

| Command | Does |
| :------ | :--- |
| `docker build -t myapp:dev .` | Build an image from `./Dockerfile` |
| `docker run -d --name app -p 3000:3000 myapp:dev` | Run detached, map host:container port |
| `docker run -it node:22-alpine sh` | Interactive shell in a new container |
| `docker ps` / `docker ps -a` | Running / all containers |
| `docker logs app -f` · `docker exec -it app sh` | Follow logs · shell in a running container |

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                 # cached until dependencies change
COPY . .                   # source changes only rebuild from here
RUN npm run build
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

**Layer cache rule:** a changed instruction or input file rebuilds that layer and every layer after it. Put rarely-changing steps first, add a `.dockerignore` (`node_modules`, `.git`, `.env`, `.next`), and chain related `RUN` steps with `&&`.

| Storage | Syntax | Use for |
| :------ | :----- | :------ |
| Named volume | `-v pgdata:/var/lib/postgresql/data` | Database data; survives `docker rm` |
| Bind mount | `-v $(pwd)/src:/app/src` | Live-reload source in development |
| Anonymous volume | `-v /app/node_modules` | Stop the host's `node_modules` hiding the container's |
| tmpfs | `tmpfs: [/var/lib/postgresql/data]` | RAM-only; fast, throwaway test databases |

Lessons: [Docker Architecture](/group/vitest-performance-docker/day/06/01-docker-architecture-images-containers-registries) · [Dockerfile Syntax and Layer Cache](/group/vitest-performance-docker/day/06/02-dockerfile-syntax-and-layer-cache) · [Bind Mounts vs Volumes](/group/vitest-performance-docker/day/06/03-bind-mounts-vs-volumes-data-persistence)

## Docker: Compose, networking, env, and CI

```yaml
services:
  app:
    build: { context: ., target: runner }
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/app  # "db" = service name
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:18-alpine
    healthcheck: { test: ["CMD", "pg_isready"], interval: 5s, retries: 5 }
```

| Concept | Rule |
| :------ | :--- |
| Networking | Services on the same Compose network reach each other by service name (`db:5432`); `ports` is only for the host |
| `depends_on` | Default only waits for "started"; add `condition: service_healthy` + a `healthcheck` to wait for "ready" |
| Profiles | `profiles: [tools]` services start only with `docker compose --profile tools up` |
| `ARG` vs `ENV` | `ARG` = build time only; `ENV` = baked into the image and visible at runtime |
| Secrets | Never in `ARG`/`ENV` (`docker history`, `docker inspect` show them). Inject at runtime (`-e`, `env_file` not in git) or mount Docker secrets at `/run/secrets/` |
| `.env` | Compose reads it for `${VAR}` substitution; commit `.env.example`, not `.env` |

| Command | Does |
| :------ | :--- |
| `docker compose up -d --build` | Rebuild and start in the background |
| `docker compose run --rm app npm test` | One-off test run, container removed after |
| `docker compose down -v` | Stop, remove containers **and volumes** |
| `docker build --target test .` | Build only up to the `test` stage |

**Multi-stage build:** `deps` (install) → `builder` (`npm run build`) → `runner` (copy only the build output, non-root user). With Next.js `output: 'standalone'`, the image drops from about 1.2 GB to about 150 MB, and no build tools ship to production.

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER node
CMD ["node", "server.js"]
```

**Integration-test DB pattern:** Postgres container on `tmpfs`, migrations once in `beforeAll`/`globalSetup`, each test in a transaction rolled back in `afterEach`.

**CI image pattern:** Buildx with registry cache (`cache-from` / `cache-to: type=registry`), tag with the git SHA (`myapp:$(git rev-parse --short HEAD)`), push, then deploy by pulling that exact tag.

Lessons: [Docker Compose](/group/vitest-performance-docker/day/06/05-docker-compose-services-dependencies-profiles) · [Environment Variables and Secrets](/group/vitest-performance-docker/day/06/06-environment-variables-env-arg-env-secrets) · [Database Containers for Integration Tests](/group/vitest-performance-docker/day/06/08-database-containers-for-integration-tests) · [Multi-Stage Builds](/group/vitest-performance-docker/day/06/09-multi-stage-builds-smaller-safer-production-images)

## Gotchas

| ❌ Mistake | ✅ Fix |
| :-------- | :---- |
| `expect(fn()).toThrow()` | `expect(() => fn()).toThrow()`: the call must happen inside a function |
| Forgetting `await` on `expect(...).rejects` / `.resolves` | `await expect(p).rejects.toThrow()`; a floating promise passes vacuously |
| `toBe` on objects or floats | `toEqual` / `toStrictEqual`; `toBeCloseTo` for floats |
| Bare `toThrow()` | Assert the error class or message |
| Debounce test waits real time | `vi.useFakeTimers()` + `advanceTimersByTimeAsync` |
| `vi.spyOn` leaks into the next test | `vi.restoreAllMocks()` in `afterEach` |
| `process.env.X = 'y'` in a test | `vi.stubEnv('X', 'y')` + `vi.unstubAllEnvs()` |
| `setTimeout` sleeps to wait for the DOM | `await vi.waitFor(() => expect(...))` |
| `--changed` runs everything in CI | Checkout with `fetch-depth: 0` |
| `--retry=3` to make CI green | Find the shared state or timing assumption and fix it |
| `loading="lazy"` on the hero image | Eager + `fetchpriority="high"` (Next.js: `priority`) |
| Images with no `width`/`height` | Set dimensions or `aspect-ratio` to stop layout shift |
| `COPY . .` before `npm ci` | Copy `package*.json`, install, then copy the source |
| Connecting to `localhost:5432` from another container | Use the service name: `db:5432` |
| `depends_on` alone and the app races the DB | `condition: service_healthy` + a `healthcheck` |
| Secrets in `ARG`/`ENV` or a committed `.env` | Inject at runtime or use Docker secrets |

## Interview quick answers

**Q:** Why the test pyramid?
Unit tests are fast and cheap, so most tests go there; integration tests check real connections; a few E2E tests cover full flows. An inverted pyramid gives slow, flaky CI.

**Q:** `vi.fn` vs `vi.spyOn` vs `vi.mock`?
`vi.fn` makes a new fake function; `vi.spyOn` wraps an existing method and runs the original by default; `vi.mock` replaces a whole module and is hoisted above imports.

**Q:** clear vs reset vs restore?
Clear wipes call history; reset also drops fake implementations; restore puts `spyOn` originals back.

**Q:** How do you test a debounce or retry with delays?
Fake timers: `vi.useFakeTimers()`, trigger, `advanceTimersByTime`, assert, then `vi.useRealTimers()`.

**Q:** jsdom or Browser Mode?
jsdom for logic, DOM structure, and events (fast). Browser Mode only when you need real layout, CSS, real Web APIs, or cross-browser checks.

**Q:** What causes flaky tests?
Timing assumptions, shared global state, test order dependencies, and real external services. Fix them with fake timers, proper awaiting, isolation, and mocks.

**Q:** How do you speed up a slow suite in CI?
Profile first, move heavy setup to `globalSetup`, mock the network, tune the pool and workers, shard across machines, and run `--changed` on PRs with the full suite on `main`.

**Q:** What are the Core Web Vitals and their targets?
LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, measured at the 75th percentile of real users.

**Q:** Lab vs field data?
Lab (Lighthouse) is repeatable and good for diagnosis; field (CrUX) is real users and is what Google ranks on.

**Q:** How do you fix poor INP?
Find long tasks in the Performance panel, then split them (`scheduler.yield()`), move work to a Web Worker, or defer non-urgent updates.

**Q:** How do you prevent performance regressions?
A performance budget enforced by Lighthouse CI on every PR (score, LCP, TBT, CLS, bundle size).

**Q:** Image vs container?
An image is a read-only layered template; a container is a running instance of it with its own writable layer.

**Q:** Why order Dockerfile instructions carefully?
Each layer is cached; a change rebuilds that layer and everything after it, so dependency installs go before copying the source.

**Q:** Volume vs bind mount?
Volumes are Docker-managed and persistent (databases); bind mounts map a host folder (live code in development).

**Q:** Why multi-stage builds?
Build tools and dev dependencies stay in earlier stages; the final image holds only runtime files, so it is smaller and has less attack surface.
