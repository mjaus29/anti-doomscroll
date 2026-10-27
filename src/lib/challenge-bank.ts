import type { ChallengeDifficulty, ChallengeTrack } from "./challenge-lab";

/**
 * Curated interview questions per tech group. The Challenge Lab picks from
 * this list so learners practise the questions interviews actually ask, in a
 * known order, instead of whatever the model invents. The model only writes
 * each question up (brief, tests, hints, solution).
 */
export interface BankQuestion {
  id: string;
  title: string;
  /** One-line spec the model expands into the full challenge. */
  brief: string;
  difficulty: ChallengeDifficulty;
  track: ChallengeTrack;
  /** Pattern or concept the question exercises, shown to the learner. */
  pattern: string;
  /** Lesson that teaches the idea: `day-XX/topic-id`. */
  lesson?: string;
}

type GroupBank = Readonly<{
  groupId: string;
  questions: readonly BankQuestion[];
}>;

const q = (
  id: string,
  title: string,
  difficulty: ChallengeDifficulty,
  track: ChallengeTrack,
  pattern: string,
  brief: string,
  lesson?: string
): BankQuestion => ({ id, title, difficulty, track, pattern, brief, lesson });

const JS = "javascript" as const;
const UI = "ui" as const;
const ALGO = "algorithmic" as const;

const BANKS: readonly GroupBank[] = [
  {
    groupId: "javascript-typescript-git",
    questions: [
      q("js-once", "once()", "easy", JS, "Closures", "Return a wrapper that calls fn only the first time and caches its result.", "day-02/04-closures-and-private-state"),
      q("js-memoize", "memoize()", "easy", JS, "Closures + Map cache", "Cache results of a pure function keyed by its arguments.", "day-02/10-memoization-debounce-throttle"),
      q("js-debounce", "debounce()", "medium", JS, "Timers + closures", "Delay calls until `wait` ms pass without a new call; support cancel().", "day-02/10-memoization-debounce-throttle"),
      q("js-throttle", "throttle()", "medium", JS, "Timers + closures", "Run at most once per `wait` ms, with a trailing call for the latest arguments.", "day-02/10-memoization-debounce-throttle"),
      q("js-curry", "curry()", "medium", JS, "Closures + fn.length", "Collect arguments across calls until fn.length is reached, then call fn.", "day-02/09-composition-pipe-currying-partial-application"),
      q("js-pipe", "pipe() and compose()", "easy", JS, "Higher-order functions", "Combine unary functions left-to-right (pipe) and right-to-left (compose).", "day-02/09-composition-pipe-currying-partial-application"),
      q("js-flatten", "Flatten a nested array", "easy", JS, "Recursion", "Flatten to a given depth without Array.prototype.flat.", "day-03/03-more-array-methods-flat-flatmap-foreach-slice-splice-concat-join-includes-fill-at"),
      q("js-deep-clone", "deepClone()", "medium", JS, "Recursion + WeakMap", "Deep copy objects, arrays, Dates, Maps and Sets, handling circular references.", "day-03/08-shallow-copy-vs-deep-copy-structuredclone-circular-references"),
      q("js-deep-equal", "deepEqual()", "medium", JS, "Recursion", "Compare two values structurally, including nested objects and arrays.", "day-03/08-shallow-copy-vs-deep-copy-structuredclone-circular-references"),
      q("js-get-path", "get(obj, path)", "easy", JS, "Optional chaining + reduce", "Read a nested value by 'a.b[0].c' path with a default value.", "day-03/02-core-array-hofs-map-filter-reduce-find-findindex-some-every"),
      q("js-group-by", "groupBy()", "easy", JS, "reduce + Map", "Group array items by the key a callback returns.", "day-03/02-core-array-hofs-map-filter-reduce-find-findindex-some-every"),
      q("js-array-map-polyfill", "Array.prototype.map / filter / reduce polyfills", "easy", JS, "Prototypes + this", "Implement myMap, myFilter and myReduce with the same edge cases as the built-ins.", "day-04/01-prototype-chain"),
      q("js-bind-polyfill", "Function.prototype.bind polyfill", "medium", JS, "this + call/apply", "Implement myBind supporting pre-filled arguments.", "day-02/08-this-in-all-contexts-call-apply-bind"),
      q("js-event-emitter", "EventEmitter", "medium", JS, "Classes + Map of Sets", "Support on, off, once and emit with arguments.", "day-04/03-class-syntax-constructor-instance-methods-static-methods-static-blocks"),
      q("js-promise-all", "Promise.all polyfill", "medium", JS, "Promises", "Resolve with results in input order, reject on the first rejection.", "day-05/05-promise-combinators-all-allsettled-race-any-aggregateerror"),
      q("js-promise-allsettled", "Promise.allSettled polyfill", "easy", JS, "Promises", "Resolve with status/value/reason objects for every input.", "day-05/05-promise-combinators-all-allsettled-race-any-aggregateerror"),
      q("js-sleep-timeout", "sleep() and withTimeout()", "easy", JS, "Promises + timers", "sleep(ms) resolves later; withTimeout(promise, ms) rejects if too slow.", "day-05/08-timers-async-iteration-for-await-of-async-generators"),
      q("js-retry", "retry() with exponential backoff", "medium", JS, "async/await", "Retry an async function up to N times, waiting base * 2^attempt between tries.", "day-05/06-async-await-try-catch-finally-unhandled-rejections"),
      q("js-promise-pool", "Run promises with a concurrency limit", "hard", JS, "Promises + queues", "Run async tasks with at most `limit` in flight; return results in input order.", "day-05/07-sequential-vs-parallel-execution-await-in-foreach-pitfall"),
      q("js-lru-cache", "LRU cache", "medium", JS, "Map insertion order", "get/put in O(1), evicting the least recently used key at capacity.", "day-06/09-map-set-weakmap-weakset-weakref"),
      q("js-classnames", "classNames()", "easy", JS, "Type checks + recursion", "Join strings, arrays and { class: boolean } objects into a class string.", "day-01/06-primitive-types-typeof-coercion-double-equals-vs-triple-equals"),
      q("js-deep-partial", "DeepPartial and DeepReadonly types", "hard", JS, "Mapped + conditional types", "Write recursive utility types and a function typed with them.", "day-08/09-overloads-recursive-types"),
      q("js-safe-json", "Safe JSON parse with a type guard", "medium", JS, "unknown + narrowing", "Parse JSON into unknown and validate it into a typed User or return an error.", "day-08/10-safe-json-parse-unknown-first-narrowing-runtime-validation"),
    ],
  },
  {
    groupId: "react-tanstackquery-zustand",
    questions: [
      q("react-counter", "Counter with step and reset", "easy", UI, "useState", "Increment/decrement by a chosen step, with min/max limits and reset.", "day-02/03-usestate"),
      q("react-todo", "Todo list", "easy", UI, "Lists + immutable updates", "Add, toggle, delete and filter (all/active/done) todos.", "day-02/08-updating-objects-and-arrays-immutably"),
      q("react-tabs", "Accessible tabs", "easy", UI, "Derived state + a11y", "Tab list with arrow-key navigation and aria roles.", "day-06/08-accessibility"),
      q("react-accordion", "Accordion", "easy", UI, "Lifting state up", "Panels that open one at a time, with an option to allow many.", "day-03/05-lifting-state-up"),
      q("react-star-rating", "Star rating", "easy", UI, "Controlled component", "Hover preview, click to set, keyboard accessible.", "day-02/07-controlled-inputs"),
      q("react-modal", "Modal dialog", "medium", UI, "Refs + effects", "Open/close, Escape to close, click outside, focus returns to trigger.", "day-05/02-dom-access-with-refs-forwardref"),
      q("react-autocomplete", "Autocomplete search", "medium", UI, "useEffect + debounce", "Debounced input filtering a list, keyboard selection, no stale results.", "day-04/02-useeffect-syntax-purpose-cleanup"),
      q("react-use-debounce", "useDebounce hook", "medium", UI, "Custom hooks", "A hook that returns a debounced value; demo with a search box.", "day-04/07-custom-hooks"),
      q("react-use-local-storage", "useLocalStorage hook", "medium", UI, "Custom hooks + effects", "useState-like hook that persists to localStorage safely.", "day-04/07-custom-hooks"),
      q("react-stopwatch", "Stopwatch", "medium", UI, "useRef + intervals", "Start, pause, reset and lap times without interval leaks.", "day-05/01-useref-mutable-values-without-re-renders"),
      q("react-data-table", "Sortable, filterable table", "medium", UI, "Derived values", "Sort by column, filter by text, paginate — derive, don't duplicate state.", "day-03/04-deriving-values-during-render"),
      q("react-pagination", "Pagination component", "medium", UI, "Props + derived state", "Page buttons with ellipses, prev/next, and a page-size select.", "day-01/06-props"),
      q("react-tic-tac-toe", "Tic-tac-toe", "medium", UI, "State modeling", "Turns, winner detection, draw, and move history.", "day-03/01-choosing-state-structure"),
      q("react-file-tree", "File explorer tree", "medium", UI, "Recursion in components", "Render nested folders, expand/collapse, and add a file.", "day-01/07-rendering-data"),
      q("react-reducer-cart", "Shopping cart with useReducer", "medium", UI, "useReducer", "Add, remove, change quantity, and show totals.", "day-06/02-usereducer"),
      q("react-optimistic-like", "Optimistic like button", "hard", UI, "Optimistic UI + rollback", "Update instantly, call a fake API that sometimes fails, roll back on error.", "day-10/05-optimistic-updates-rollback-mindset"),
      q("react-infinite-list", "Infinite scroll list", "hard", UI, "IntersectionObserver + refs", "Load more items from a fake paginated API when the sentinel is visible.", "day-10/08-useinfinitequery-fetchnextpage-getnextpageparam"),
      q("react-store", "Tiny global store (Zustand-style)", "hard", JS, "Subscriptions", "createStore with getState, setState (shallow merge) and subscribe/unsubscribe.", "day-11/04-subscriptions"),
      q("react-query-cache", "Query cache with stale time", "hard", JS, "Caching + dedupe", "fetchQuery(key, fn, staleMs) that dedupes in-flight requests and serves fresh cache.", "day-08/07-staletime-gctime"),
    ],
  },
  {
    groupId: "rest-api-axios-query-string",
    questions: [
      q("api-build-url", "Build a URL with query params", "easy", JS, "Encoding", "Join base URL, path and params, skipping null/undefined and encoding values.", "day-05/03-stringify-building-query-strings"),
      q("api-parse-query", "Parse a query string", "easy", JS, "Parsing", "Turn '?tag=a&tag=b&page=2' into { tag: ['a','b'], page: '2' }.", "day-05/02-parse-reading-query-strings"),
      q("api-status-handler", "Map HTTP status to a result", "easy", JS, "Status classes", "Normalize responses into { ok, data } | { ok: false, kind: 'auth'|'not-found'|'server'|'client' }.", "day-04/09-handling-401-403-404-5xx-flows"),
      q("api-fetch-json", "Typed fetchJson helper", "medium", JS, "fetch + errors", "Wrap fetch: throw an HttpError with status on non-2xx, parse JSON, support a timeout.", "day-03/12-simple-reusable-request-helper-functions"),
      q("api-retry-backoff", "Retry failed requests with backoff", "medium", JS, "Resilience", "Retry only network errors and 5xx/429, with exponential delay and a max attempts cap.", "day-06/05-resilient-loading-error-ux"),
      q("api-latest-only", "Cancel stale requests (latest wins)", "medium", JS, "AbortController", "A search client where each new call aborts the previous one.", "day-04/11-abortcontroller-based-cancellation"),
      q("api-dedupe", "Deduplicate in-flight requests", "medium", JS, "Promise cache", "Identical concurrent GETs share one request; clear the entry when it settles.", "day-06/08-caching-performance-basics"),
      q("api-paginate-all", "Fetch all pages", "medium", JS, "async loops", "Follow a nextCursor until it is null and return every item.", "day-02/06-pagination-from-day-one"),
      q("api-interceptors", "Request/response interceptors", "hard", JS, "Middleware chain", "A tiny client with use() interceptors that run in Axios order around a fake transport.", "day-04/06-interceptor-execution-order-request-before-response"),
      q("api-token-refresh", "Refresh the token once on 401", "hard", JS, "Shared refresh promise", "On 401, refresh once even if many requests fail together, then replay them.", "day-06/04-auth-token-refresh-concepts"),
    ],
  },
  {
    groupId: "next-js-tailwind-base-ui",
    questions: [
      q("ui-navbar", "Responsive navbar", "easy", UI, "Responsive variants", "Links in a row on desktop, hamburger menu on mobile, active link styling.", "day-10/09-responsive-variants-mobile-first-breakpoints"),
      q("ui-card-grid", "Product card grid", "easy", UI, "Grid + spacing", "Responsive 1/2/3-column grid of cards with image placeholder, title, price.", "day-10/02-layout-flexbox-grid-positioning-z-index-overflow"),
      q("ui-pricing", "Pricing table", "easy", UI, "Composition", "Three tiers, highlighted middle plan, monthly/yearly toggle.", "day-10/11-composing-interfaces-building-real-ui-from-utility-primitives"),
      q("ui-skeleton", "Loading skeletons", "easy", UI, "Loading states", "Show skeleton cards while fake data loads, then the real list.", "day-05/01-loading-tsx-streaming-and-suspense-boundaries"),
      q("ui-dark-toggle", "Dark mode toggle", "medium", UI, "Dark variant + state", "Toggle light/dark themes and remember the choice.", "day-10/10-dark-mode-dark-variant-css-variable-strategy"),
      q("ui-dropdown", "Accessible dropdown menu", "medium", UI, "Keyboard + ARIA", "Opens on click, arrow keys move focus, Escape closes, click outside closes.", "day-12/08-menu-dropdown-with-items-groups-separator"),
      q("ui-dialog", "Accessible dialog", "medium", UI, "Focus trap", "Modal with overlay, focus trap, Escape to close, labelled title.", "day-12/07-dialog-modal-with-overlay-focus-trap-accessible-anatomy"),
      q("ui-toast", "Toast notifications", "medium", UI, "Queues + timers", "Stackable toasts that auto-dismiss and can be closed manually.", "day-12/12-toast-notifications-toast-pattern-with-base-ui-primitives"),
      q("ui-url-filters", "Filter/sort/paginate a list", "medium", UI, "URL-driven state", "Search, sort and page controls whose state could be serialized to the URL.", "day-03/09-url-driven-ui-state-the-complete-pattern"),
      q("ui-carousel", "Image carousel", "hard", UI, "State + transitions", "Prev/next, dots, autoplay that pauses on hover, keyboard support.", "day-12/13-transitions-css-open-close-animations-with-data-state"),
      q("ui-dashboard", "Dashboard layout", "hard", UI, "Layout composition", "Collapsible sidebar, header, stat cards, and a responsive content area.", "day-04/08-designing-dashboard-routes-multi-level-navigation"),
    ],
  },
  {
    groupId: "rhf-zod-date-fns",
    questions: [
      q("form-login", "Login form with validation", "easy", UI, "Controlled inputs + errors", "Email and password with inline errors on blur and a disabled submit while invalid.", "day-01/06-validation-modes-onchange-onblur-onsubmit"),
      q("form-validate-fn", "Schema-style validator", "easy", JS, "Validation", "validate(values, rules) returning field errors, like a tiny Zod safeParse.", "day-03/07-parse-vs-safeparse"),
      q("form-password-strength", "Password strength meter", "easy", UI, "Derived values", "Show rule checklist and a strength bar as the user types.", "day-04/07-cross-field-validation-with-refine-and-superrefine"),
      q("form-signup", "Signup with confirm password", "medium", UI, "Cross-field validation", "Confirm must match, show the error on the confirm field, submit async.", "day-04/07-cross-field-validation-with-refine-and-superrefine"),
      q("form-date-range", "Date range validation", "medium", JS, "Date comparisons", "Validate start/end dates: valid, end after start, max 30 days apart.", "day-08/02-cross-field-and-date-range-validation-patterns"),
      q("form-dynamic-fields", "Dynamic list of fields", "medium", UI, "Field arrays", "Add/remove phone numbers, each validated, with at least one required.", "day-06/01-usefieldarray-setup-and-core-concepts"),
      q("form-multi-step", "Multi-step form", "hard", UI, "Per-step validation", "Three steps with per-step validation, back/next, and a review step.", "day-05/05-formprovider-and-useformcontext"),
      q("form-async-username", "Async username check", "hard", UI, "Debounced async validation", "Check availability against a fake API with debounce and no stale results.", "day-08/03-async-validation-debounced-server-checks"),
      q("form-relative-time", "Relative time formatter", "medium", JS, "Date math", "formatRelative(date, now): 'just now', '5 minutes ago', 'yesterday', 'in 3 days'.", "day-07/07-formatdistance-and-formatrelative"),
    ],
  },
  {
    groupId: "algorithmic-coding-typescript",
    questions: [
      q("algo-two-sum", "Two Sum", "easy", ALGO, "Hash map", "Return indices of two numbers that add to target.", "day-01/01-how-to-approach-a-coding-problem"),
      q("algo-contains-duplicate", "Contains Duplicate", "easy", ALGO, "Set", "Return true if any value appears twice.", "day-01/02-big-o-time-and-space-complexity"),
      q("algo-valid-anagram", "Valid Anagram", "easy", ALGO, "Frequency counting", "Check whether two strings are anagrams.", "day-02/02-frequency-counting"),
      q("algo-group-anagrams", "Group Anagrams", "medium", ALGO, "Frequency counting", "Group words that are anagrams of each other.", "day-02/02-frequency-counting"),
      q("algo-longest-consecutive", "Longest Consecutive Sequence", "medium", ALGO, "Set", "Length of the longest run of consecutive integers in O(n).", "day-02/01-hash-maps-and-sets"),
      q("algo-stock", "Best Time to Buy and Sell Stock", "easy", ALGO, "Running state", "Max profit from one buy then one later sell.", "day-02/03-running-state-and-kadanes-algorithm"),
      q("algo-max-subarray", "Maximum Subarray", "medium", ALGO, "Kadane's algorithm", "Largest sum of a contiguous subarray.", "day-02/03-running-state-and-kadanes-algorithm"),
      q("algo-product-except-self", "Product of Array Except Self", "medium", ALGO, "Prefix/suffix", "Products of all other elements without division.", "day-02/04-prefix-sums"),
      q("algo-subarray-sum-k", "Subarray Sum Equals K", "medium", ALGO, "Prefix sums + map", "Count subarrays that sum to k.", "day-02/04-prefix-sums"),
      q("algo-valid-palindrome", "Valid Palindrome", "easy", ALGO, "Two pointers", "Palindrome check ignoring case and non-alphanumerics.", "day-03/01-two-pointers-opposite-ends"),
      q("algo-container-water", "Container With Most Water", "medium", ALGO, "Two pointers", "Max area between two bars.", "day-03/01-two-pointers-opposite-ends"),
      q("algo-3sum", "3Sum", "medium", ALGO, "Sort + two pointers", "All unique triplets that sum to zero.", "day-03/03-sorting-and-3sum"),
      q("algo-longest-substring", "Longest Substring Without Repeating Characters", "medium", ALGO, "Sliding window", "Length of the longest substring with all-unique characters.", "day-03/04-sliding-window-variable-size"),
      q("algo-find-anagrams", "Find All Anagrams in a String", "medium", ALGO, "Fixed sliding window", "Start indices of p's anagrams in s.", "day-03/05-sliding-window-fixed-size"),
      q("algo-binary-search", "Binary Search", "easy", ALGO, "Binary search", "Index of target in a sorted array, or -1.", "day-04/01-binary-search-basics"),
      q("algo-rotated-search", "Search in Rotated Sorted Array", "medium", ALGO, "Binary search", "Find target in a rotated sorted array in O(log n).", "day-04/03-rotated-sorted-arrays"),
      q("algo-koko", "Koko Eating Bananas", "medium", ALGO, "Binary search on the answer", "Minimum eating speed to finish within h hours.", "day-04/04-binary-search-on-the-answer"),
      q("algo-valid-parentheses", "Valid Parentheses", "easy", ALGO, "Stack", "Check that brackets are balanced and correctly nested.", "day-05/01-stacks-valid-parentheses-and-min-stack"),
      q("algo-daily-temperatures", "Daily Temperatures", "medium", ALGO, "Monotonic stack", "Days until a warmer temperature for each day.", "day-05/02-monotonic-stack"),
      q("algo-lru", "LRU Cache", "medium", ALGO, "Map / linked list design", "get/put in O(1) with least-recently-used eviction.", "day-05/04-design-lru-cache"),
      q("algo-reverse-list", "Reverse Linked List", "easy", ALGO, "Linked list pointers", "Reverse a singly linked list.", "day-06/01-linked-list-basics-and-reversal"),
      q("algo-merge-lists", "Merge Two Sorted Lists", "easy", ALGO, "Dummy node", "Merge two sorted linked lists into one.", "day-06/02-dummy-nodes-and-merging-lists"),
      q("algo-list-cycle", "Linked List Cycle", "easy", ALGO, "Fast and slow pointers", "Detect whether a linked list has a cycle.", "day-06/03-fast-and-slow-pointers"),
      q("algo-max-depth", "Maximum Depth of Binary Tree", "easy", ALGO, "Tree DFS", "Height of a binary tree.", "day-07/01-binary-tree-basics-and-dfs"),
      q("algo-level-order", "Binary Tree Level Order Traversal", "medium", ALGO, "Tree BFS", "Values grouped by level.", "day-07/02-level-order-traversal-bfs"),
      q("algo-validate-bst", "Validate Binary Search Tree", "medium", ALGO, "Bounds recursion", "Check the BST property for every node.", "day-07/04-binary-search-trees"),
      q("algo-kth-largest", "Kth Largest Element in an Array", "medium", ALGO, "Heap", "kth largest value using a size-k min-heap.", "day-08/01-heaps-and-priority-queues"),
      q("algo-top-k", "Top K Frequent Elements", "medium", ALGO, "Heap / bucket sort", "The k most frequent values.", "day-08/02-top-k-problems"),
      q("algo-merge-intervals", "Merge Intervals", "medium", ALGO, "Sort + sweep", "Merge all overlapping intervals.", "day-08/04-merge-and-insert-intervals"),
      q("algo-subsets", "Subsets", "medium", ALGO, "Backtracking", "All subsets of distinct numbers.", "day-09/02-subsets-and-combination-sum"),
      q("algo-permutations", "Permutations", "medium", ALGO, "Backtracking", "All orderings of distinct numbers.", "day-09/03-permutations"),
      q("algo-islands", "Number of Islands", "medium", ALGO, "Grid DFS/BFS", "Count connected groups of '1' cells.", "day-10/03-grid-graphs-number-of-islands"),
      q("algo-course-schedule", "Course Schedule", "medium", ALGO, "Topological sort", "Can all courses be finished given prerequisites?", "day-10/05-topological-sort-course-schedule"),
      q("algo-climbing-stairs", "Climbing Stairs", "easy", ALGO, "1D DP", "Ways to climb n steps taking 1 or 2 at a time.", "day-11/01-dp-fundamentals-climbing-stairs"),
      q("algo-house-robber", "House Robber", "medium", ALGO, "Take or skip DP", "Max sum with no two adjacent houses.", "day-11/02-take-or-skip-house-robber"),
      q("algo-coin-change", "Coin Change", "medium", ALGO, "DP over amounts", "Fewest coins to make an amount, or -1.", "day-11/03-try-every-choice-coin-change-and-word-break"),
      q("algo-lcs", "Longest Common Subsequence", "medium", ALGO, "2D DP", "Length of the longest common subsequence of two strings.", "day-11/06-two-string-dp-lcs-and-edit-distance"),
      q("algo-jump-game", "Jump Game", "medium", ALGO, "Greedy", "Can you reach the last index?", "day-12/01-greedy-jump-game-and-gas-station"),
    ],
  },
];

const BANK_BY_GROUP = new Map(BANKS.map((bank) => [bank.groupId, bank.questions]));

/** Groups the Lab currently supports. Backend and DevOps tracks come later. */
export const CHALLENGE_LAB_GROUP_IDS: readonly string[] = BANKS.map((bank) => bank.groupId);

export function getQuestionBank(groupId: string): readonly BankQuestion[] {
  return BANK_BY_GROUP.get(groupId) ?? [];
}

export function findBankQuestion(groupId: string, questionId: string): BankQuestion | null {
  return getQuestionBank(groupId).find((question) => question.id === questionId) ?? null;
}

export function getLessonHref(groupId: string, lesson: string | undefined): string | null {
  const match = lesson ? /^day-(\d+)\/(.+)$/.exec(lesson) : null;
  return match ? `/group/${groupId}/day/${match[1]}/${match[2]}` : null;
}

/**
 * Pick the next question: unseen first, at the requested difficulty, in bank
 * order so learners meet the most common questions first. Falls back to
 * not-yet-passed, then anything at that difficulty.
 */
export function pickNextQuestion({
  groupId,
  difficulty,
  seenIds,
  passedIds,
}: {
  groupId: string;
  difficulty: ChallengeDifficulty;
  seenIds: ReadonlySet<string>;
  passedIds: ReadonlySet<string>;
}): BankQuestion | null {
  const atLevel = getQuestionBank(groupId).filter((question) => question.difficulty === difficulty);
  return (
    atLevel.find((question) => !seenIds.has(question.id)) ??
    atLevel.find((question) => !passedIds.has(question.id)) ??
    atLevel[0] ??
    null
  );
}
