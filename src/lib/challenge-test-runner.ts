import type { ChallengeTestCase } from "./challenge-lab";

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestRunResult {
  status: "passed" | "failed" | "error";
  results: TestCaseResult[];
  /** Compile, load or timeout problem that stopped the whole run. */
  error?: string;
  logs: string[];
}

const RUN_TIMEOUT_MS = 8000;
const PER_TEST_TIMEOUT_MS = 2000;

/**
 * Test harness evaluated inside the sandbox. Kept as a plain string (not a
 * function) so bundler transforms can never inject helpers it can't see.
 * `runTests(code, tests, perTestTimeoutMs)` resolves to { results, logs } or
 * { loadError, logs }.
 */
export const TEST_HARNESS_SOURCE = String.raw`
const logs = [];
const format = (value) => {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return "[Function " + (value.name || "anonymous") + "]";
  if (value instanceof Map) return "Map(" + format([...value.entries()]) + ")";
  if (value instanceof Set) return "Set(" + format([...value]) + ")";
  if (Number.isNaN(value)) return "NaN";
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  } catch {
    return String(value);
  }
};
for (const level of ["log", "info", "warn", "error"]) {
  console[level] = (...args) => {
    if (logs.length < 100) logs.push(args.map((arg) => typeof arg === "string" ? arg : format(arg)).join(" "));
  };
}
const isEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [key, value] of a) if (!b.has(key) || !isEqual(value, b.get(key))) return false;
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && isEqual(a[key], b[key]));
};
const expectEqual = (actual, expected) => {
  if (!isEqual(actual, expected)) throw new Error("Expected " + format(expected) + " but got " + format(actual));
};
const expectTrue = (value, message) => {
  if (!value) throw new Error(message || "Expected a truthy value but got " + format(value));
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const spy = (impl) => {
  const fn = (...args) => { fn.calls.push(args); return impl ? impl(...args) : undefined; };
  fn.calls = [];
  return fn;
};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runTests = async (code, tests, perTestTimeoutMs) => {
  let solution;
  try {
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    solution = await import(url);
  } catch (error) {
    return { loadError: "Your code failed to load: " + (error && error.message ? error.message : String(error)), logs };
  }
  const results = [];
  for (const test of tests) {
    const started = Date.now();
    let timer;
    try {
      const body = new AsyncFunction("solution", "expectEqual", "expectTrue", "sleep", "spy", test.code);
      await Promise.race([
        body(solution, expectEqual, expectTrue, sleep, spy),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Timed out after " + perTestTimeoutMs + "ms (a promise never settled?)")), perTestTimeoutMs); }),
      ]);
      results.push({ name: test.name, passed: true, durationMs: Date.now() - started });
    } catch (error) {
      results.push({ name: test.name, passed: false, error: error && error.message ? error.message : String(error), durationMs: Date.now() - started });
    } finally {
      clearTimeout(timer);
    }
  }
  return { results, logs };
};
`;

// Runs inside the sandboxed iframe: prefer a Worker so a runaway loop can be
// killed with the iframe; fall back to running in the iframe itself.
const SANDBOX_DOCUMENT = String.raw`<!doctype html><html><body><script>
const harness = HARNESS_JSON;
const reply = (data) => parent.postMessage({ channel: "challenge-tests", ...data }, "*");
window.addEventListener("message", async (event) => {
  const { code, tests, perTestTimeoutMs } = event.data || {};
  if (typeof code !== "string") return;
  try {
    const workerSource = harness + "\nself.onmessage = async (e) => { self.postMessage(await runTests(e.data.code, e.data.tests, e.data.perTestTimeoutMs)); };";
    const worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })));
    worker.onmessage = (e) => reply(e.data);
    worker.onerror = (e) => { e.preventDefault(); reply({ loadError: "Your code threw while loading: " + e.message, logs: [] }); };
    worker.postMessage({ code, tests, perTestTimeoutMs });
  } catch {
    const runTests = new Function(harness + "\nreturn runTests;")();
    reply(await runTests(code, tests, perTestTimeoutMs));
  }
});
parent.postMessage({ channel: "challenge-tests", ready: true }, "*");
</script></body></html>`;

async function compileSolution(source: string, language: string): Promise<string> {
  const response = await fetch("/api/challenges/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, language: language === "js" ? "js" : "ts" }),
  });
  const payload = (await response.json()) as { code?: string; error?: string };

  if (!response.ok || typeof payload.code !== "string") {
    throw new Error(payload.error || "Could not compile your code.");
  }

  return payload.code;
}

type SandboxReply = {
  channel?: string;
  ready?: boolean;
  results?: TestCaseResult[];
  loadError?: string;
  logs?: string[];
};

function runInSandbox(code: string, tests: ChallengeTestCase[]): Promise<TestRunResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    // allow-scripts without allow-same-origin: an opaque origin with no
    // access to this app's cookies, storage or DOM.
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.display = "none";
    iframe.srcdoc = SANDBOX_DOCUMENT.replace("HARNESS_JSON", JSON.stringify(TEST_HARNESS_SOURCE));

    const finish = (result: TestRunResult) => {
      globalThis.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.remove(); // also terminates the worker
      resolve(result);
    };

    const timeout = globalThis.setTimeout(() => {
      finish({
        status: "error",
        results: [],
        error: `Tests stopped after ${RUN_TIMEOUT_MS / 1000}s. Look for an infinite loop or a promise that never resolves.`,
        logs: [],
      });
    }, RUN_TIMEOUT_MS);

    const onMessage = (event: MessageEvent<SandboxReply>) => {
      if (event.source !== iframe.contentWindow || event.data?.channel !== "challenge-tests") {
        return;
      }

      if (event.data.ready) {
        iframe.contentWindow?.postMessage(
          { code, tests, perTestTimeoutMs: PER_TEST_TIMEOUT_MS },
          "*"
        );
        return;
      }

      const logs = Array.isArray(event.data.logs) ? event.data.logs : [];
      if (event.data.loadError) {
        finish({ status: "error", results: [], error: event.data.loadError, logs });
        return;
      }

      const results = Array.isArray(event.data.results) ? event.data.results : [];
      finish({
        status: results.length > 0 && results.every((result) => result.passed) ? "passed" : "failed",
        results,
        logs,
      });
    };

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

/** Compile `source` on the server, then run `tests` against it in the browser sandbox. */
export async function runChallengeTests({
  source,
  language,
  tests,
}: {
  source: string;
  language: string;
  tests: ChallengeTestCase[];
}): Promise<TestRunResult> {
  if (tests.length === 0) {
    return { status: "error", results: [], error: "This challenge has no automatic tests.", logs: [] };
  }

  try {
    const code = await compileSolution(source, language);
    return await runInSandbox(code, tests);
  } catch (error) {
    return {
      status: "error",
      results: [],
      error: error instanceof Error ? error.message : "Could not run the tests.",
      logs: [],
    };
  }
}
