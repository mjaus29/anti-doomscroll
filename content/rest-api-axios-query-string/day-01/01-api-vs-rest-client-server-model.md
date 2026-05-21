# 1 — API vs REST & Client-Server Model

---

## T — TL;DR

An **API** is a contract for communication between systems. **REST** is a set of rules that makes that contract predictable and scalable. The **client-server model** is the architecture that separates who asks from who answers.

---

## K — Key Concepts

### What is an API?

An **API (Application Programming Interface)** is a defined way for two programs to talk to each other. In web development, it almost always means a server exposing URLs that a frontend can call to get or send data.

```
Your React App  →  calls  →  https://api.example.com/users
                  ←  gets back JSON ←
```

### What is REST?

**REST (Representational State Transfer)** is an **architectural style** — not a protocol, not a library. It's a set of constraints that, when followed, produce a predictable, scalable API.

The 6 REST constraints (simplified):

| Constraint | What it means |
|---|---|
| Client-Server | UI and data are separated |
| Stateless | Each request carries all info it needs |
| Cacheable | Responses can be cached |
| Uniform Interface | Consistent structure across all endpoints |
| Layered System | Client doesn't care how many servers exist |
| Code on Demand *(optional)* | Server can send executable code |

### Client-Server Model

```
CLIENT                          SERVER
──────                          ──────
Browser / React App    →→→→→    Backend / API
                       request
                       ←←←←←
                       response
```

- **Client** = whoever initiates the request (your app)
- **Server** = whoever handles it and sends back data
- They are **completely independent** — the client doesn't care what language the server uses, and vice versa

---

## W — Why It Matters

- Every `fetch()` or `axios.get()` you write is a client making a request to a server.
- Understanding REST lets you **read any API docs instantly** — the patterns repeat everywhere.
- Interviewers expect you to explain client-server separation — it's the foundation of system design.
- "RESTful" is one of the most used (and misused) terms in job postings.

---

## I — Interview Q&A

### Q1: What is an API?

**A:** An API is an interface that defines how two systems communicate. In web development, it's typically a server exposing HTTP endpoints that clients call to retrieve or send data.

### Q2: What is REST and what makes an API "RESTful"?

**A:** REST is an architectural style with 6 constraints: client-server separation, statelessness, cacheability, uniform interface, layered system, and optional code on demand. An API is RESTful when it follows these constraints — especially statelessness, uniform interface, and resource-based URLs.

### Q3: What's the difference between an API and REST?

**A:** An API is any interface for communication. REST is one specific style of designing that interface. You can have non-REST APIs (e.g., SOAP, GraphQL, gRPC). REST is just the most common convention for HTTP APIs.

---

## C — Common Pitfalls + Fix

### ❌ Pitfall: Treating REST as a strict protocol

```
"This API isn't REST because it doesn't use HATEOAS"
```

**Fix:** Most real-world "REST APIs" are technically just "REST-ish." In practice, REST means: resource-based URLs, correct HTTP methods, and stateless requests. Don't over-purify.

### ❌ Pitfall: Confusing REST with HTTP

**A:** HTTP is the protocol (the transport). REST is the design style that uses HTTP. You could theoretically have REST over a different protocol, though you almost never do.

### ❌ Pitfall: Thinking the client and server must be built together

**Fix:** Client-server separation means they can evolve independently. Your React frontend doesn't care if the backend switches from Node to Go — as long as the API contract stays the same.

---

## K — Coding Challenge + Solution

### Challenge

Fill in the blanks:

```
1. The pattern where UI and data logic are separated is called the __________ model.
2. REST stands for __________.
3. A REST API should be __________ — meaning each request contains all info the server needs.
4. TRUE or FALSE: REST is a protocol like HTTP.
5. TRUE or FALSE: The client must know what database the server uses.
```

### Solution

```
1. Client-Server
2. Representational State Transfer
3. Stateless
4. FALSE — REST is an architectural style, not a protocol
5. FALSE — the client only needs to know the API contract (URLs + expected responses)
```

---

---
