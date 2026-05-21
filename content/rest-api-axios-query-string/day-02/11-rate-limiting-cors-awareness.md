# 11 — Rate Limiting & CORS Awareness

---

## T — TL;DR

**Rate limiting** prevents API abuse by capping how many requests a client can make. **CORS** is a browser security mechanism that controls which frontend origins can call which APIs. Both cause confusing errors if you don't understand them.

---

## K — Key Concepts

### Rate Limiting

Rate limiting caps requests per time window:

```
100 requests per minute per IP
1000 requests per day per API key
10 requests per second per user
```

#### Rate Limit Response Headers

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716123600
Retry-After: 60
```

| Header                  | Meaning                          |
| ----------------------- | -------------------------------- |
| `X-RateLimit-Limit`     | Max requests allowed per window  |
| `X-RateLimit-Remaining` | Requests left in current window  |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets |
| `Retry-After`           | Seconds to wait before retrying  |

#### Handling 429 on the Frontend

```js
async function apiFetch(url, options, retries = 3) {
  const res = await fetch(url, options);

  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
    console.warn(`Rate limited. Retrying in ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return apiFetch(url, options, retries - 1); // retry
  }

  return res;
}
```

### CORS — Cross-Origin Resource Sharing

#### The Same-Origin Policy

Browsers block JS from making requests to a different origin than the page:

```
Origin = protocol + domain + port

https://myapp.com               ← your frontend
https://api.myapp.com           ← DIFFERENT origin (different subdomain) ← CORS required
https://api.other.com           ← DIFFERENT origin ← CORS required
http://myapp.com                ← DIFFERENT origin (different protocol) ← CORS required
https://myapp.com:3001          ← DIFFERENT origin (different port) ← CORS required
```

#### How CORS Works

```
1. Browser sends request with:
   Origin: https://myapp.com

2. Server must respond with:
   Access-Control-Allow-Origin: https://myapp.com
   (or * for public APIs)

3. If header is missing → browser BLOCKS the response (request DID go through to server)
```

> ⚠️ **CORS errors are browser-enforced, not server errors.** The request reaches the server — the browser just refuses to give your JS the response.

#### Preflight Requests

For non-simple requests (POST with JSON, custom headers), the browser sends a preflight `OPTIONS` request first:

```http
OPTIONS /api/users HTTP/1.1
Origin: https://myapp.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Server must respond:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

#### Common CORS Headers

| Header                             | Direction | Meaning                       |
| ---------------------------------- | --------- | ----------------------------- |
| `Access-Control-Allow-Origin`      | Response  | Which origins are allowed     |
| `Access-Control-Allow-Methods`     | Response  | Which methods are allowed     |
| `Access-Control-Allow-Headers`     | Response  | Which headers are allowed     |
| `Access-Control-Allow-Credentials` | Response  | Allow cookies/auth            |
| `Access-Control-Max-Age`           | Response  | Cache preflight for N seconds |

#### The Frontend Fix for CORS Errors

```
CORS errors are ALWAYS a server configuration issue.
You cannot fix CORS from the frontend in production.
```

In development, you can proxy:

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
    ];
  },
};
// Now /api/users proxies to localhost:3001/users — same origin, no CORS
```

---

## W — Why It Matters

- You WILL hit rate limits when building apps that call external APIs (GitHub, OpenAI, Stripe).
- CORS errors are one of the most common and confusing errors for new frontend developers — understanding the mechanism makes debugging instant.
- Knowing that CORS is server-side lets you correctly escalate to the backend team instead of spinning on the frontend.
- Rate limit headers let you build respectful clients that back off instead of hammering and getting banned.

---

## I — Interview Q&A

### Q1: What is CORS and why does it exist?

**A:** CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts JS from making requests to origins different from the page's origin. It exists to prevent malicious sites from making requests to other services on behalf of a logged-in user (CSRF protection). Servers opt into cross-origin access by sending `Access-Control-Allow-Origin` headers.

### Q2: Can you fix a CORS error from the frontend?

**A:** No. CORS is enforced by the browser based on server response headers. The fix is always on the server — adding the correct `Access-Control-Allow-Origin` header. In development, a proxy can work around it.

### Q3: What is a preflight request?

**A:** An automatic `OPTIONS` request the browser sends before non-simple requests (like POST with JSON or with custom headers). It checks if the server permits the actual request. If the server doesn't respond correctly to the preflight, the browser blocks the real request.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Thinking CORS means the request was blocked

```
"I'm getting CORS error — the server rejected my request"
```

**Fix:** The request REACHED the server. CORS means the browser blocked your JS from reading the response. Check the server's response headers, not the request.

### ❌ Pitfall: Using `Access-Control-Allow-Origin: *` with credentials

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Fix:** Wildcard origin + credentials is invalid and browsers reject it. You must specify the exact origin:

```http
Access-Control-Allow-Origin: https://myapp.com
Access-Control-Allow-Credentials: true
```

### ❌ Pitfall: Not handling 429 responses

```js
// Blindly retrying immediately after 429 → hits rate limit again → 429 again → infinite loop
```

**Fix:** Read `Retry-After`, wait the specified time, then retry with exponential backoff.

---

## K — Coding Challenge + Solution

### Challenge

You're making API calls to a third-party service and occasionally getting 429. Write a `fetchWithRetry` function that:

1. Retries up to 3 times on 429
2. Reads `Retry-After` header and waits that many seconds
3. Defaults to 60 seconds if `Retry-After` is absent
4. Throws on other errors

### Solution

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429) {
      if (attempt === maxRetries)
        throw new Error("Rate limit exceeded. Max retries reached.");
      const retryAfter = parseInt(res.headers.get("Retry-After") || "60");
      console.warn(
        `429 Rate Limited. Waiting ${retryAfter}s before retry ${attempt}/${maxRetries}...`
      );
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return res.json();
  }
}
```

---

---
