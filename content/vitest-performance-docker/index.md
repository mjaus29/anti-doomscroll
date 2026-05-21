# Full Curriculum Overview — Vitest-Performance-Docker

This index was generated from the `Vitest-Performance-Docker` folder.

Day 1

- [Testing Purpose and the Test Pyramid](day-01/01-testing-purpose-and-the-test-pyramid.md)
- [Vitest Setup and Installation](day-01/02-vitest-setup-and-installation.md)
- [Config File Basics — vitest.config.ts](day-01/03-config-file-basics-vitest-config-ts.md)
- [Test File Naming Conventions](day-01/04-test-file-naming-conventions.md)
- [describe → it/test → expect Flow](day-01/05-describe-it-test-expect-flow.md)
- [Assertion Patterns — expect Matchers](day-01/06-assertion-patterns-expect-matchers.md)
- [Watch Mode and Filtering Tests](day-01/07-watch-mode-and-filtering-tests.md)
- [Setup Files and Global Hooks](day-01/08-setup-files-and-global-hooks.md)
- [Project Structure for Tests](day-01/09-project-structure-for-tests.md)
- [Node Environment Configuration](day-01/10-node-environment-configuration.md)
- [Coverage Introduction](day-01/11-coverage-introduction.md)
- [Writing First Clean Unit Tests](day-01/12-writing-first-clean-unit-tests.md)

Day 2

- [Pure Function Testing and Edge Cases](day-02/01-pure-function-testing-and-edge-cases.md)
- [Error Assertions — Sync and Async](day-02/02-error-assertions-sync-and-async.md)
- [Async Tests and Promise Patterns](day-02/03-async-tests-and-promise-patterns.md)
- [Fake Timers — setTimeout, setInterval, Debounce](day-02/04-fake-timers-settimeout-setinterval-debounce.md)
- [System Time Control — vi.setSystemTime](day-02/05-system-time-control-vi-setsystemtime.md)
- [Mock Functions — vi.fn()](day-02/06-mock-functions-vi-fn.md)
- [Spies — vi.spyOn()](day-02/07-spies-vi-spyon.md)
- [Module Mocking — vi.mock()](day-02/08-module-mocking-vi-mock.md)
- [Global Mocking — vi.stubGlobal and vi.stubEnv](day-02/09-global-mocking-vi-stubglobal-and-vi-stubenv.md)
- [Reset vs Clear vs Restore — and Test Isolation](day-02/10-reset-vs-clear-vs-restore-and-test-isolation.md)

Day 3

- [jsdom Fundamentals — What It Is and How Vitest Uses It](day-03/01-jsdom-fundamentals-what-it-is-and-how-vitest-uses-it.md)
- [happy-dom — Tradeoffs vs jsdom](day-03/02-happy-dom-tradeoffs-vs-jsdom.md)
- [DOM Interaction Testing — Query, Fire, Assert](day-03/03-dom-interaction-testing-query-fire-assert.md)
- [Component Behaviour Testing — UI Logic Without a Framework](day-03/04-component-behaviour-testing-ui-logic-without-a-framework.md)
- [Testing Forms — Input, Submit, Validation Feedback](day-03/05-testing-forms-input-submit-validation-feedback.md)
- [Browser Mode Setup — Vitest + Real Browser](day-03/06-browser-mode-setup-vitest-real-browser.md)
- [Real Browser Execution — Playwright Provider Deep Dive](day-03/07-real-browser-execution-playwright-provider-deep-dive.md)
- [Simulated vs Real Browser — Choosing the Right Environment](day-03/08-simulated-vs-real-browser-choosing-the-right-environment.md)
- [Integration-Style Frontend Tests — User Behaviour Flows](day-03/09-integration-style-frontend-tests-user-behaviour-flows.md)

Day 4

- [Coverage — Thresholds, Reporters, and Enforcing Minimums](day-04/01-coverage-thresholds-reporters-and-enforcing-minimums.md)
- [Test Performance Profiling — Finding Slow Tests](day-04/02-test-performance-profiling-finding-slow-tests.md)
- [Worker Pools and Parallel Execution](day-04/03-worker-pools-and-parallel-execution.md)
- [Sharding — Splitting Tests Across CI Nodes](day-04/04-sharding-splitting-tests-across-ci-nodes.md)
- [Changed-Test Workflows — Running Only What Matters](day-04/05-changed-test-workflows-running-only-what-matters.md)
- [Module Cache and Reducing Setup Overhead](day-04/06-module-cache-and-reducing-setup-overhead.md)
- [Deterministic CI Runs](day-04/07-deterministic-ci-runs.md)
- [Flaky Test Prevention](day-04/08-flaky-test-prevention.md)
- [Balancing Speed, Confidence, and Maintainability](day-04/09-balancing-speed-confidence-and-maintainability.md)

Day 5

- [The Browser Performance Model — Critical Path to First Pixel](day-05/01-the-browser-performance-model-critical-path-to-first-pixel.md)
- [Core Web Vitals — The Three Metrics That Matter](day-05/02-core-web-vitals-the-three-metrics-that-matter.md)
- [LCP — Largest Contentful Paint](day-05/03-lcp-largest-contentful-paint.md)
- [INP — Interaction to Next Paint](day-05/04-inp-interaction-to-next-paint.md)
- [CLS — Cumulative Layout Shift](day-05/05-cls-cumulative-layout-shift.md)
- [Lab vs Field Data — PageSpeed Insights and Lighthouse](day-05/06-lab-vs-field-data-pagespeed-insights-and-lighthouse.md)
- [Chrome DevTools Performance Panel — Tracing and Long Tasks](day-05/07-chrome-devtools-performance-panel-tracing-and-long-tasks.md)
- [Performance Budgets and Lighthouse CI](day-05/08-performance-budgets-and-lighthouse-ci.md)
- [Bundle Control — Code Splitting and Lazy Loading](day-05/09-bundle-control-code-splitting-and-lazy-loading.md)
- [Next.js Optimization — Image, Font, Script, and Caching](day-05/10-next-js-optimization-image-font-script-and-caching.md)

Day 6

- [Docker Architecture — Images, Containers, Registries](day-06/01-docker-architecture-images-containers-registries.md)
- [Dockerfile Syntax and Layer Cache](day-06/02-dockerfile-syntax-and-layer-cache.md)
- [Bind Mounts vs Volumes — Data Persistence](day-06/03-bind-mounts-vs-volumes-data-persistence.md)
- [Container Networking — Bridge, DNS, Compose Networks](day-06/04-container-networking-bridge-dns-compose-networks.md)
- [Docker Compose — Services, Dependencies, Profiles](day-06/05-docker-compose-services-dependencies-profiles.md)
- [Environment Variables — .env, ARG, ENV, Secrets](day-06/06-environment-variables-env-arg-env-secrets.md)
- [Test Execution in Containers](day-06/07-test-execution-in-containers.md)
- [Database Containers for Integration Tests](day-06/08-database-containers-for-integration-tests.md)
- [Multi-Stage Builds — Smaller, Safer Production Images](day-06/09-multi-stage-builds-smaller-safer-production-images.md)
- [CI/CD-Ready Reproducible Workflows](day-06/10-ci-cd-ready-reproducible-workflows.md)
