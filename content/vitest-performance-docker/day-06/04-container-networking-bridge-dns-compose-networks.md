# 4 — Container Networking — Bridge, DNS, Compose Networks

---

## T — TL;DR

Docker containers communicate through virtual networks. The **bridge** network is the default — containers on the same bridge network can reach each other by container name as a hostname. Docker provides built-in DNS resolution within a network. In Compose, all services share a default network, so `db:5432` works as a hostname from `app` without any port mapping.

---

## K — Key Concepts

```bash
# ── Network types ─────────────────────────────────────────────────────────
# bridge (default): isolated virtual network, container-to-container by name
# host:             container shares host network stack (no isolation)
# none:             no network access
# overlay:          multi-host networking (Docker Swarm)

# ── Create and inspect networks ───────────────────────────────────────────
docker network create myapp-net
docker network ls
docker network inspect myapp-net
docker network rm myapp-net

# ── Connect containers to a network ──────────────────────────────────────
docker run -d --name db    --network myapp-net postgres:18-alpine
docker run -d --name app   --network myapp-net -e DB_HOST=db myapp:latest
#                                                         ↑
#                        "db" resolves to the db container's IP via Docker DNS ✅

# ── Port publishing: host:container ───────────────────────────────────────
docker run -p 3000:3000 myapp      # expose container port 3000 on host port 3000
docker run -p 127.0.0.1:3000:3000  # bind only to localhost (safer)
docker run -p 3000                  # random host port (docker port myapp for the mapping)
```

```yaml
# ── Compose networking — automatic service DNS ────────────────────────────
services:
  app:
    build: .
    environment:
      # Use service name "db" as hostname — Docker DNS resolves it ✅
      DATABASE_URL: postgresql://user:pass@db:5432/mydb
    networks:
      - backend

  db:
    image: postgres:18-alpine
    networks:
      - backend
    # No ports: — db is not exposed to host, only app can reach it ✅

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"    # only nginx is exposed to the host
    networks:
      - backend
      - frontend

networks:
  backend:    # internal — app ↔ db
  frontend:   # external — nginx faces the host
```

```yaml
# ── Network isolation between services ────────────────────────────────────
# Only services on the same network can communicate
# Good practice: separate internal services from public-facing ones

services:
  web:
    networks: [public, internal]   # can reach both nginx and db

  db:
    networks: [internal]           # only reachable from services on internal ✅
    # No ports exposed to host

  redis:
    networks: [internal]           # same — internal only

networks:
  public:
  internal:
```

```bash
# ── Debugging container networking ───────────────────────────────────────
# From inside a container
docker exec -it app sh
  ping db                          # test DNS resolution
  wget -qO- http://db:5432         # test connectivity
  nslookup db                      # check DNS

# From host — check what ports are bound
docker port myapp
# 3000/tcp -> 0.0.0.0:3000
```

---

## W — Why It Matters

- Docker DNS within a Compose network is why `DATABASE_URL: postgresql://db:5432/mydb` works — you never need to know or hardcode container IPs. Container IPs are dynamic; service names are stable. Always use service names as hostnames.
- Not exposing the database port to the host (`ports:` section on the db service) is a security baseline — without a published port, the database is unreachable from outside Docker. This is the correct production posture even locally.
- Understanding Compose's default network (all services on one auto-created network) explains why simple Composefiles work without explicit `networks:` declarations — but explicit networks are better for security and clarity in production.

---

## I — Interview Q&A

### Q: How do two Docker containers communicate with each other by service name?

**A:** Docker provides embedded DNS within user-defined networks. When containers are on the same Docker network, Docker runs a DNS resolver at `127.0.0.11` inside each container. Any hostname matching a container name or Compose service name on the same network resolves to that container's virtual IP address. So `db:5432` from the `app` container works because Docker's DNS resolves `db` to the IP of the container named `db` on the shared network. This is automatic in Docker Compose — all services in the same Compose file share a default network, and service names become resolvable hostnames. Container IPs are not stable across restarts; service name DNS is.

---

## C — Common Pitfalls + Fix

### ❌ Publishing database port to all interfaces in production

```yaml
# ❌ PostgreSQL accessible from any host on port 5432
db:
  image: postgres:18-alpine
  ports:
    - "5432:5432"   # exposes to all network interfaces ❌
```

**Fix:** No published port for internal services, or bind to localhost only:

```yaml
# ✅ Option A: no ports (other services reach via Compose DNS)
db:
  image: postgres:18-alpine
  # no ports: section ✅

# ✅ Option B: bind to localhost only (for local dev access)
db:
  ports:
    - "127.0.0.1:5432:5432"   # only reachable from localhost ✅
```

---

## K — Coding Challenge + Solution

### Challenge

Create a Compose network topology for: `nginx` (public), `api` (internal + public), `db` (internal only), `redis` (internal only). Show how `api` connects to `db` and `redis` using service name DNS. Show the correct `ports:` for only nginx.

### Solution

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    networks: [public, internal]
    depends_on: [api]

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/myapp
      REDIS_URL:    redis://redis:6379
    networks: [internal]   # api is NOT on public — nginx proxies to it
    depends_on:
      db:    { condition: service_healthy }
      redis: { condition: service_started }

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks: [internal]

networks:
  public:    # nginx faces the outside world
  internal:  # api, db, redis — never exposed directly ✅
```

---

---
