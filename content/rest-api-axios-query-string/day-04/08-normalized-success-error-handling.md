# 8 — Normalized Success & Error Handling

---

## T — TL;DR

Normalized handling means every response — success or failure — comes back in a **predictable, consistent shape**. You define that shape once in your API layer so components never need to handle raw Axios objects.

---

## K — Key Concepts

### The Problem Without Normalization

```js
// Component A — raw Axios pattern
try {
  const res = await api.get("/users/1");
  setUser(res.data.data.user); // envelope structure varies by endpoint
} catch (err) {
  setError(err.response?.data?.error?.message ?? err.message ?? "Unknown");
}

// Component B — slightly different endpoint shape
try {
  const res = await api.get("/products");
  setProducts(res.data.items); // different key: "items" not "data"
} catch (err) {
  setError(err.response?.data?.msg ?? err.message ?? "Unknown"); // different key: "msg"
}
```

Every component does its own defensive unpacking. Shape inconsistencies cause bugs. Error messages use different key names.

### The Normalized Pattern — `{ data, error, meta }`

Define a consistent return type from your request helper:

```js
// src/lib/request.js
import axios from "axios";
import api from "./api";

/**
 * Normalized return: always { data, error, meta }
 * data  = payload on success, null on failure
 * error = { message, code, status, details } on failure, null on success
 * meta  = pagination, headers, timing — always available
 */
export async function request(
  method,
  url,
  body = null,
  params = null,
  config = {}
) {
  const startTime = Date.now();

  try {
    const res = await api({
      method,
      url,
      data: body,
      params,
      ...config,
    });

    return {
      data: res.data,
      error: null,
      meta: {
        status: res.status,
        headers: res.headers,
        duration: Date.now() - startTime,
      },
    };
  } catch (err) {
    return {
      data: null,
      error: buildError(err),
      meta: {
        status: err.response?.status ?? null,
        headers: err.response?.headers ?? {},
        duration: Date.now() - startTime,
      },
    };
  }
}

function buildError(err) {
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message,
      code: "UNEXPECTED",
      status: null,
      details: [],
    };
  }

  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out",
      code: "TIMEOUT",
      status: null,
      details: [],
    };
  }

  if (!err.response) {
    return {
      message: "Network error",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
    };
  }

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details: err.response.data?.error?.details ?? [],
  };
}
```

### Using Normalized Responses in Components

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await request("GET", `/users/${userId}`);

      if (error) {
        setError(error.message);
      } else {
        setUser(data);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <p className="error">{error}</p>;
  return <h1>{user.name}</h1>;
}
```

No try/catch in the component. No defensive optional chaining. Clean.

### Typed Normalized Response (TypeScript)

```ts
interface ApiError {
  message: string
  code: string
  status: number | null
  details: Array<{ field: string; message: string }>
}

interface ApiMeta {
  status: number | null
  headers: Record<string, string>
  duration: number
}

interface ApiResult<T> {
  data: T | null
  error: ApiError | null
  meta: ApiMeta
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<ApiResult<T>> { ... }

// Usage — fully typed
const { data, error } = await request<User>('GET', '/users/1')
if (data) console.log(data.name)  // TypeScript knows data is User
```

---

## W — Why It Matters

- Inconsistent response shapes are the #1 source of defensive `?.` chains and `?? 'Unknown'` fallbacks in production codebases — normalization eliminates them.
- The `{ data, error }` pattern (inspired by Go) is growing rapidly in modern React — React Query, SWR, and TanStack Query all return a similar shape.
- Typed normalized responses give you full autocomplete and type safety across your entire data layer — no more guessing field names.
- This pattern makes API calls trivially testable — mock `request()` to return `{ data: fakeUser, error: null }` and test the component without any HTTP.

---

## I — Interview Q&A

### Q1: What is a normalized API response pattern?

**A:** A consistent return shape from every API call regardless of the endpoint — typically `{ data, error, meta }`. Success returns data and null error. Failure returns null data and a structured error. Components always destructure the same shape and never deal with raw Axios objects.

### Q2: Why return `{ data, error }` instead of throwing errors?

**A:** Throwing forces every call site to use `try/catch`. Returning `{ data, error }` makes both paths explicit, readable, and inline. Components check `if (error)` without exception handling syntax. It also prevents unhandled promise rejection warnings and makes testing simpler — just return a mock `{ data, error }` object.

### Q3: Where should the normalization logic live?

**A:** In the API layer — a shared `request()` helper or response interceptor. Never in individual components. This is the Single Responsibility Principle applied to API architecture — components handle UI, the API layer handles data transformation.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Different error shapes across endpoints

```js
// Endpoint A returns: { error: { message: "..." } }
// Endpoint B returns: { msg: "..." }
// Endpoint C returns: { errors: [{ detail: "..." }] }
```

**Fix:** Normalize in the response interceptor or `buildError()` — map all shapes to one canonical structure regardless of what the server sends.

### ❌ Pitfall: Returning `undefined` instead of `null` on success

```js
return { data: res.data, error: undefined };
// Component checks: if (error) ← undefined is falsy, works
// But: if (error !== null) ← undefined !== null is true! Bug
```

**Fix:** Use explicit `null`:

```js
return { data: res.data, error: null };
```

### ❌ Pitfall: Swallowing the error and returning `{ data: null, error: null }`

```js
catch (err) {
  console.log(err)
  return { data: null, error: null }  // ← component thinks it succeeded with no data
}
```

**Fix:** Always return a meaningful error object:

```js
catch (err) {
  return { data: null, error: buildError(err) }  // ✅
}
```

---

## K — Coding Challenge + Solution

### Challenge

Extend the `request()` helper to support form field errors. When the API returns a `422` with `error.details` (array of `{ field, message }`), the returned error should also have a `fieldErrors` object for easy form mapping:

```js
const { error } = await request("POST", "/register", formData);
// error.fieldErrors = { email: "Already taken", password: "Too short" }
```

### Solution

```js
function buildError(err) {
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message,
      code: "UNEXPECTED",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out",
      code: "TIMEOUT",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  if (!err.response) {
    return {
      message: "Network error",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  const details = err.response.data?.error?.details ?? [];

  // Build fieldErrors map from details array
  const fieldErrors = Object.fromEntries(
    details.filter((d) => d.field).map(({ field, message }) => [field, message])
  );

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details,
    fieldErrors, // ← { email: "Already taken", password: "Too short" }
  };
}
```

---

---
