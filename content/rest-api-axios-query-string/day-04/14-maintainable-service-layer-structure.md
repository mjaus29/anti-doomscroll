# 14 — Maintainable Service-Layer Structure

> Picking up from **I — Interview Q&A**, Q3 onward.

---

## I — Interview Q&A _(continued)_

### Q3: What naming conventions should service methods follow and why?

**A:** Use consistent CRUD names across all services: `list`, `getById`, `create`, `update`, `replace`, `remove`. This means any developer can use `orderService`, `userService`, or `postService` without reading the implementation — the method names are predictable by convention. Inconsistent names like `fetchUsers`, `getUser`, `loadUserById` across different services add unnecessary cognitive overhead.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Importing raw `axios` or the `api` instance directly in components

```jsx
// UserProfile.jsx
import axios from "axios"; // ❌ raw axios in a component
import api from "@/lib/api"; // ❌ instance in a component

function UserProfile({ userId }) {
  useEffect(() => {
    axios.get(`https://api.example.com/users/${userId}`); // tightly coupled
  }, [userId]);
}
```

**Fix:** Components only import from services:

```jsx
import userService from "@/services/userService"; // ✅

function UserProfile({ userId }) {
  useEffect(() => {
    userService.getById(userId).then(({ data }) => setUser(data));
  }, [userId]);
}
```

Now switching from Axios to `fetch` or any other client requires editing exactly ONE file — the service — not every component.

---

### ❌ Pitfall: Duplicating error handling logic in every service method

```js
// userService.js
const userService = {
  getById: async (id) => {
    try {
      const res = await api.get(`/users/${id}`);
      return res.data;
    } catch (err) {
      // 20 lines of error handling
    }
  },
  create: async (data) => {
    try {
      const res = await api.post("/users", data);
      return res.data;
    } catch (err) {
      // Same 20 lines of error handling again
    }
  },
  // Repeated in every method ← maintenance nightmare
};
```

**Fix:** Error handling belongs in the `request()` helper. Services stay thin:

```js
const userService = {
  getById: (id) => request("GET", `/users/${id}`),
  create: (data) => request("POST", "/users", data),
  update: (id, d) => request("PATCH", `/users/${id}`, d),
  remove: (id) => request("DELETE", `/users/${id}`),
};
// Each method is one line. Error handling lives in request() ✅
```

---

### ❌ Pitfall: Inconsistent method names across services

```js
// userService.js
userService.fetchAll()     ← "fetchAll"
userService.loadUser(id)   ← "loadUser"

// orderService.js
orderService.getOrders()   ← "getOrders"
orderService.findById(id)  ← "findById"

// postService.js
postService.list()         ← "list"
postService.getPost(id)    ← "getPost"
```

**Fix:** Establish and enforce a naming convention across all services:

```js
// Every service uses the same method names:
service.list(params)       → GET /resources
service.getById(id)        → GET /resources/:id
service.create(data)       → POST /resources
service.update(id, data)   → PATCH /resources/:id
service.replace(id, data)  → PUT /resources/:id
service.remove(id)         → DELETE /resources/:id
```

---

### ❌ Pitfall: Putting business logic inside service methods

```js
// ❌ service doing too much — mixing HTTP and business logic
const orderService = {
  create: async (cart) => {
    // Business logic: calculate total, apply discount, validate stock
    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    const discount = total > 100 ? 0.1 : 0;
    const finalTotal = total * (1 - discount);

    if (cart.items.some((item) => item.qty > item.stock)) {
      throw new Error("Item out of stock");
    }

    return request("POST", "/orders", { ...cart, total: finalTotal });
  },
};
```

**Fix:** Services handle HTTP only. Business logic belongs in a separate layer (hooks, stores, or utility functions):

```js
// ✅ Service — HTTP only
const orderService = {
  create: (orderData) => request("POST", "/orders", orderData),
};

// ✅ Business logic in a hook or utility
function useCreateOrder() {
  async function submitOrder(cart) {
    const processedCart = applyDiscounts(validateCart(cart)); // business logic
    return orderService.create(processedCart); // service handles HTTP
  }
  return { submitOrder };
}
```

---

### ❌ Pitfall: Creating a single `apiService.js` with all endpoints

```js
// ❌ One file with 200 methods — unreadable and unscalable
const apiService = {
  getUsers: () => request("GET", "/users"),
  getUser: (id) => request("GET", `/users/${id}`),
  createUser: (d) => request("POST", "/users", d),
  getPosts: () => request("GET", "/posts"),
  getPost: (id) => request("GET", `/posts/${id}`),
  createPost: (d) => request("POST", "/posts", d),
  getOrders: () => request("GET", "/orders"),
  // ... 194 more methods
};
```

**Fix:** One file per resource. Import only what a component needs:

```js
import userService from "@/services/userService"; // only users
import postService from "@/services/postService"; // only posts
// orderService is not imported — not loaded at all for this component
```

---

## K — Coding Challenge + Solution

### Challenge

Build the **complete service layer** for a blog application from scratch:

**Requirements:**

1. `src/lib/api.js` — Axios instance with:
   - Base URL from environment variable (fallback to `http://localhost:3000`)
   - 10s default timeout
   - Request interceptor: inject Bearer token + stamp `metadata.startTime`
   - Response interceptor: log timing in DEV, redirect on 401

2. `src/lib/request.js` — Normalized `request()` helper returning `{ data, error }`

3. `src/services/authService.js` — methods: `login`, `logout`, `refreshToken`, `getProfile`

4. `src/services/postService.js` — methods: `list`, `getById`, `create`, `update`, `remove`, `getComments`

5. `src/services/commentService.js` — methods: `create`, `update`, `remove`

6. Demonstrate usage in a clean component `PostDetail.jsx`

---

### Solution

```js
// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request interceptor ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    config.headers = config.headers ?? {};
    config.metadata = { startTime: Date.now() };

    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor ────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (response.config.metadata?.startTime ?? 0);
      const method = response.config.method?.toUpperCase();
      const url = response.config.url;
      console.log(`← ${response.status} ${method} ${url} (${ms}ms)`);
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (error.config?.metadata?.startTime ?? 0);
      const method = error.config?.method?.toUpperCase();
      const url = error.config?.url;
      console.error(
        `✗ ${error.response?.status ?? "NET"} ${method} ${url} (${ms}ms)`
      );
    }

    const status = error.response?.status;
    const isRefreshUrl = error.config?.url?.includes("/auth/refresh");

    if (status === 401 && !isRefreshUrl) {
      localStorage.removeItem("access_token");
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

```js
// src/lib/request.js
import axios from "axios";
import api from "./api";

/**
 * Normalized request helper.
 * Always returns { data, error } — never throws.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} url
 * @param {object|null} body        - request body (POST/PUT/PATCH)
 * @param {object|null} params      - query parameters
 * @param {object}      config      - extra Axios config (signal, timeout, etc.)
 * @returns {Promise<{ data: any, error: object|null }>}
 */
export async function request(
  method,
  url,
  body = null,
  params = null,
  config = {}
) {
  try {
    const res = await api({ method, url, data: body, params, ...config });
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: buildError(err) };
  }
}

function buildError(err) {
  // Non-Axios error (programming mistake, etc.)
  if (!axios.isAxiosError(err)) {
    return {
      message: err.message ?? "Unexpected error",
      code: "UNEXPECTED",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Timeout
  if (err.code === "ECONNABORTED") {
    return {
      message: "Request timed out. Please try again.",
      code: "TIMEOUT",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Network error (no response at all)
  if (!err.response) {
    return {
      message: "Network error. Check your connection.",
      code: "NETWORK_ERROR",
      status: null,
      details: [],
      fieldErrors: {},
    };
  }

  // Server responded with 4xx / 5xx
  const details = err.response.data?.error?.details ?? [];
  const fieldErrors = Object.fromEntries(
    details.filter((d) => d.field).map(({ field, message }) => [field, message])
  );

  return {
    message:
      err.response.data?.error?.message ?? `Error ${err.response.status}`,
    code: err.response.data?.error?.code ?? "HTTP_ERROR",
    status: err.response.status,
    details,
    fieldErrors,
  };
}
```

---

```js
// src/services/authService.js
import { request } from "@/lib/request";
import { setToken, clearToken } from "@/lib/api";

const authService = {
  /**
   * POST /auth/login
   * Stores token automatically on success.
   */
  login: async (email, password) => {
    const result = await request("POST", "/auth/login", { email, password });

    if (!result.error && result.data?.accessToken) {
      localStorage.setItem("access_token", result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem("refresh_token", result.data.refreshToken);
      }
    }

    return result;
    // { data: { accessToken, refreshToken, user }, error: null }
    // or { data: null, error: { message, code, ... } }
  },

  /**
   * POST /auth/logout
   * Clears tokens regardless of API response.
   */
  logout: async () => {
    const result = await request("POST", "/auth/logout");
    // Always clear — even if server-side logout fails
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return result;
  },

  /**
   * POST /auth/refresh
   * Exchanges refresh token for a new access token.
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      return {
        data: null,
        error: { message: "No refresh token", code: "NO_REFRESH_TOKEN" },
      };
    }

    const result = await request("POST", "/auth/refresh", { refreshToken });

    if (!result.error && result.data?.accessToken) {
      localStorage.setItem("access_token", result.data.accessToken);
    }

    return result;
  },

  /**
   * GET /auth/me
   * Returns the currently authenticated user's profile.
   */
  getProfile: () => request("GET", "/auth/me"),
};

export default authService;
```

---

```js
// src/services/postService.js
import { request } from "@/lib/request";

const postService = {
  /**
   * GET /posts
   * Supports filtering: { authorId, tag, status, sort, order, page, limit }
   */
  list: (params = {}) => request("GET", "/posts", null, params),

  /**
   * GET /posts/:id
   */
  getById: (id) => request("GET", `/posts/${id}`),

  /**
   * POST /posts
   * body: { title, content, tags?, status? }
   */
  create: (postData) => request("POST", "/posts", postData),

  /**
   * PATCH /posts/:id
   * body: partial post fields
   */
  update: (id, updates) => request("PATCH", `/posts/${id}`, updates),

  /**
   * DELETE /posts/:id
   */
  remove: (id) => request("DELETE", `/posts/${id}`),

  /**
   * GET /posts/:id/comments
   * Supports pagination: { page, limit }
   */
  getComments: (postId, params = {}) =>
    request("GET", `/posts/${postId}/comments`, null, params),

  /**
   * PATCH /posts/:id — publish a draft post
   */
  publish: (id) => request("PATCH", `/posts/${id}`, { status: "published" }),

  /**
   * GET /posts/:id/related
   * Returns related posts based on tags.
   */
  getRelated: (id, limit = 5) =>
    request("GET", `/posts/${id}/related`, null, { limit }),
};

export default postService;
```

---

```js
// src/services/commentService.js
import { request } from "@/lib/request";

const commentService = {
  /**
   * POST /posts/:postId/comments
   * body: { text }
   */
  create: (postId, text) =>
    request("POST", `/posts/${postId}/comments`, { text }),

  /**
   * PATCH /comments/:id
   * body: { text }
   */
  update: (id, text) => request("PATCH", `/comments/${id}`, { text }),

  /**
   * DELETE /comments/:id
   */
  remove: (id) => request("DELETE", `/comments/${id}`),

  /**
   * POST /comments/:id/likes
   */
  like: (id) => request("POST", `/comments/${id}/likes`),

  /**
   * DELETE /comments/:id/likes
   */
  unlike: (id) => request("DELETE", `/comments/${id}/likes`),
};

export default commentService;
```

---

```jsx
// src/components/PostDetail.jsx
// ✅ Clean component — zero Axios imports, zero raw HTTP calls
import { useEffect, useState } from "react";
import postService from "@/services/postService";
import commentService from "@/services/commentService";

function PostDetail({ postId }) {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ─── Load post + comments concurrently ───────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [postResult, commentsResult] = await Promise.all([
        postService.getById(postId),
        postService.getComments(postId, { limit: 20 }),
      ]);

      if (cancelled) return;

      if (postResult.error) {
        setError(postResult.error.message);
      } else {
        setPost(postResult.data);
        setComments(commentsResult.data ?? []);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  // ─── Submit a new comment ─────────────────────────────
  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);

    const { data, error } = await commentService.create(postId, newComment);

    if (error) {
      alert(error.message);
    } else {
      setComments((prev) => [...prev, data]);
      setNewComment("");
    }

    setSubmitting(false);
  }

  // ─── Delete a comment ─────────────────────────────────
  async function handleDeleteComment(commentId) {
    const { error } = await commentService.remove(commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  // ─── Render ───────────────────────────────────────────
  if (loading) return <div className="spinner">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!post) return null;

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>

      <section>
        <h2>Comments ({comments.length})</h2>

        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <p>{comment.text}</p>
            <button onClick={() => handleDeleteComment(comment.id)}>
              Delete
            </button>
          </div>
        ))}

        <form onSubmit={handleAddComment}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      </section>
    </article>
  );
}

export default PostDetail;
```

---

### What This Architecture Gives You

```
PostDetail.jsx knows:
  ✅ WHAT data it needs (post, comments)
  ✅ HOW to display it (JSX)
  ❌ NOT how HTTP works (zero Axios)
  ❌ NOT what URL is called
  ❌ NOT how errors are structured

postService.js knows:
  ✅ All post-related URLs
  ✅ What params each endpoint takes
  ❌ NOT how auth headers are injected (api.js does that)
  ❌ NOT how errors are normalized (request.js does that)
  ❌ NOT any UI concerns

api.js knows:
  ✅ The base URL
  ✅ Auth header injection
  ✅ Global error flows (401 redirect)
  ❌ NOT any specific resource or UI
```

**Each layer has one job. One file changes when one thing changes.**

---

---

## ✅ Day 4 Complete — Axios Client Architecture

| #   | Subtopic                                               | Status |
| --- | ------------------------------------------------------ | ------ |
| 1   | Axios Instances — Why One Global `axios` Is Not Enough | ☐      |
| 2   | `baseURL` & Config Defaults                            | ☐      |
| 3   | Auth Token Injection                                   | ☐      |
| 4   | Request Interceptors — Before Every Request            | ☐      |
| 5   | Response Interceptors — After Every Response           | ☐      |
| 6   | Interceptor Execution Order — Request Before Response  | ☐      |
| 7   | Interceptor Ejection & Cleanup                         | ☐      |
| 8   | Normalized Success & Error Handling                    | ☐      |
| 9   | Handling 401 / 403 / 404 / 5xx Flows                   | ☐      |
| 10  | Timeout vs Cancellation                                | ☐      |
| 11  | AbortController-Based Cancellation                     | ☐      |
| 12  | Concurrent Requests                                    | ☐      |
| 13  | Upload & Download Patterns                             | ☐      |
| 14  | Maintainable Service-Layer Structure                   | ☐      |

---

> **The entire Day 4 architecture fits in 4 files:**
> `api.js` → `request.js` → `*Service.js` → `Component.jsx`
> Set it up once. Every future feature slots in cleanly.
>
> _Doing one small thing beats opening a feed._
