# 12 — API Documentation

---

## T — TL;DR

Good API docs are the **contract between backend and frontend**. Knowing how to read — and write — API docs makes you faster, reduces miscommunication, and elevates your engineering quality.

---

## K — Key Concepts

### The OpenAPI Specification (Swagger)

OpenAPI is the industry standard for describing REST APIs. It's a YAML or JSON file that documents every endpoint:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Blog API
  version: 1.0.0

paths:
  /posts:
    get:
      summary: List all posts
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        "200":
          description: A list of posts
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Post"
    post:
      summary: Create a post
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePost"
      responses:
        "201":
          description: Created
        "422":
          description: Validation error
```

### What Every Endpoint Should Document

| Section              | What to Include                                   |
| -------------------- | ------------------------------------------------- |
| **Method + Path**    | `GET /posts/:id`                                  |
| **Description**      | What it does                                      |
| **Path Parameters**  | Name, type, required, description                 |
| **Query Parameters** | Name, type, optional/required, defaults           |
| **Request Body**     | Schema with field types, required fields, example |
| **Response**         | Status codes, response body schema, examples      |
| **Auth**             | Required? Which scheme?                           |
| **Error Responses**  | All error codes and when they occur               |

### A Well-Documented Endpoint (Markdown Format)

### GET /posts/:id

Returns a single blog post by ID.

**Authentication:** Required (Bearer token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | ✅ | Post ID |

**Response 200:**

```json
{
  "data": {
    "id": 7,
    "title": "Hello World",
    "content": "...",
    "authorId": 42,
    "createdAt": "2026-05-19T10:00:00Z"
  }
}
```

**Response 404:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found"
  }
}
```
````

### Tools for API Documentation

| Tool           | Purpose                           |
| -------------- | --------------------------------- |
| **Swagger UI** | Visual explorer for OpenAPI specs |
| **Postman**    | Test and document APIs            |
| **Insomnia**   | API client with docs              |
| **Redoc**      | Beautiful OpenAPI rendering       |
| **Stoplight**  | Design-first API docs             |

### How to Read API Docs Efficiently

```
1. Find the base URL            → everything is relative to this
2. Check authentication section → Bearer? API key? OAuth?
3. Find the endpoint you need   → use the sidebar/search
4. Check path + query params    → required vs optional
5. Check request body schema    → required fields, types
6. Read ALL response codes      → not just 200
7. Look at examples             → fastest way to understand
```

---

## W — Why It Matters

- Reading and using API docs is a daily frontend skill — every third-party integration (Stripe, Twilio, OpenAI) starts with docs.
- Writing clear API docs (even basic markdown) makes you a better collaborator and teammate.
- OpenAPI/Swagger knowledge is increasingly expected — it enables auto-generated client SDKs, type definitions, and mock servers.
- A well-documented API reduces back-and-forth with backend teammates by 80%.

---

## I — Interview Q&A

### Q1: What is OpenAPI and why does it matter?

**A:** OpenAPI (formerly Swagger) is a standard specification for describing REST APIs in YAML or JSON. It enables auto-generated documentation, mock servers, client SDKs, and type definitions. It's the de facto industry standard for API contracts.

### Q2: What should every API endpoint document?

**A:** The HTTP method and path, description, path and query parameters (with types and required flags), request body schema, all possible response codes with their schemas, authentication requirements, and error response structures.

### Q3: How do you quickly learn a new API?

**A:** Find the base URL, understand the authentication method, search for the specific endpoint, read its required params and request body, then look at the example request/response to understand the actual shape of data. Test in Postman before writing any code.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Only reading the 200 success response

```
// Developer reads the happy path only
// Ships code that crashes on 401, 403, 422, 429
```

**Fix:** Read every response code. The error responses are often more important — they tell you how to handle failures gracefully.

### ❌ Pitfall: Guessing field names instead of checking the schema

```js
const name = user.name; // ← what if the API returns user.fullName?
const id = response.userId; // ← what if it's response.id?
```

**Fix:** Always look at the actual response schema in the docs or in the Network tab before writing code that accesses response fields.

### ❌ Pitfall: Not checking auth requirements before calling an endpoint

```
fetch('/api/admin/users')   ← No auth header → 401
// 20 minutes of debugging later: "oh it needs a token"
```

**Fix:** First thing you check in any API docs: **Authentication Required?**

---

## K — Coding Challenge + Solution

### Challenge

Given this incomplete API docs entry, identify what's missing:

```
### POST /users

Creates a new user.

Request Body:
{ "email": "string", "password": "string" }

Response:
201 - User created
```

List at least **6 things** this documentation is missing.

### Solution

```
1. ❌ No authentication requirement stated (is this open or auth-required?)
2. ❌ No field validation rules (min/max length, email format, password requirements)
3. ❌ No indication of which fields are required vs optional
4. ❌ No response body schema for 201 (what does the created user look like? Does it include the ID?)
5. ❌ No error responses documented (422 for validation? 409 for duplicate email?)
6. ❌ No Content-Type header requirement noted in request
7. ❌ No example request/response JSON shown
8. ❌ No description of the returned resource location (Location header? ID in body?)
```

---

---

## ✅ Day 2 Complete — REST Resource Design

| #   | Subtopic                                                     | Status |
| --- | ------------------------------------------------------------ | ------ |
| 1   | Resource Naming with Nouns & Collections vs Single Resources | ☐      |
| 2   | CRUD Mapping to HTTP Methods                                 | ☐      |
| 3   | Path Params vs Query Params                                  | ☐      |
| 4   | Nested Resources                                             | ☐      |
| 5   | Filtering, Sorting & Searching                               | ☐      |
| 6   | Pagination — From Day One                                    | ☐      |
| 7   | Consistent Response Envelopes & Error Object Structure       | ☐      |
| 8   | Validation Basics & Auth Headers                             | ☐      |
| 9   | Authorization Concepts                                       | ☐      |
| 10  | Versioning Strategies                                        | ☐      |
| 11  | Rate Limiting & CORS Awareness                               | ☐      |
| 12  | API Documentation                                            | ☐      |

---

> **Pick subtopic 1. Read the TL;DR and Key Concepts only.**
> That's your one job right now.
>
> _Doing one small thing beats opening a feed._

```

```
