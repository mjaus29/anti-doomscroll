# 1 — Docker Architecture — Images, Containers, Registries

---

## T — TL;DR

Docker packages an application and its dependencies into an **image** — a read-only, layered snapshot. Running an image creates a **container** — an isolated process with its own filesystem, network, and process space. Images are stored in and pulled from **registries** (Docker Hub, GHCR, ECR). The Docker daemon does the heavy lifting; the CLI talks to it.

---

## K — Key Concepts

```
── Core concepts ─────────────────────────────────────────────────────────────

Image      → read-only template: OS + runtime + app code + config
             built from a Dockerfile, tagged with name:version
             stored locally (docker images) or in a registry

Container  → a running instance of an image
             isolated process with its own: filesystem, network interface, PID namespace
             writable layer on top of the image (ephemeral by default)
             stopped containers still exist — docker ps -a shows them

Registry   → image storage and distribution server
             Docker Hub: hub.docker.com (default)
             GHCR:       ghcr.io (GitHub Container Registry)
             ECR:        AWS Elastic Container Registry
             ACR:        Azure Container Registry

Daemon     → dockerd: background service that manages images, containers, volumes
CLI        → docker: sends commands to daemon via REST API (/var/run/docker.sock)
```

```bash
# ── Essential CLI commands ─────────────────────────────────────────────────

# Images
docker pull node:22-alpine          # download image from registry
docker images                       # list local images
docker rmi node:22-alpine           # remove local image
docker image prune                  # remove dangling (untagged) images

# Containers — run
docker run node:22-alpine node -e "console.log('hello')"
#       │    │               └─ command to run inside container
#       │    └─ image to use
#       └─ create + start container

docker run -it node:22-alpine sh    # -i = interactive, -t = TTY → shell inside container
docker run -d nginx                 # -d = detached (background)
docker run --name myapp -p 3000:3000 myapp:latest
#                        │   │
#                        │   └─ container port
#                        └─ host port

# Containers — manage
docker ps                           # running containers
docker ps -a                        # all containers (including stopped)
docker stop myapp                   # graceful stop (SIGTERM)
docker kill myapp                   # immediate stop (SIGKILL)
docker rm myapp                     # remove stopped container
docker logs myapp -f                # follow logs
docker exec -it myapp sh            # open shell in running container
```

```
── Image naming and tagging ─────────────────────────────────────────────────

[registry/][namespace/]name[:tag][@digest]

node:22-alpine                    → Docker Hub, official image, tag 22-alpine
postgres:18                       → Docker Hub, official, tag 18
myorg/myapp:1.0.0                 → Docker Hub, org namespace
ghcr.io/owner/myapp:sha-abc1234   → GHCR with git SHA tag
123456.dkr.ecr.us-east-1.amazonaws.com/myapp:latest  → ECR

Tag conventions:
  latest        → most recent (avoid in production — not immutable)
  1.0.0         → semantic version (immutable ✅)
  sha-abc1234   → git commit SHA (most immutable ✅)
  main-20250615 → branch + date
```

```bash
# ── Inspect an image ──────────────────────────────────────────────────────
docker inspect node:22-alpine     # full metadata JSON
docker history node:22-alpine     # show image layers + sizes
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

---

## W — Why It Matters

- Containers solve the "works on my machine" problem — the image contains exactly the same OS libraries, runtime version, and dependencies that will run in CI and production. No more `node_modules` differences between developers.
- Images are immutable and versioned — tagging with a git SHA means you can always reproduce exactly what was deployed. `latest` is mutable and should never be used as a deployment tag.
- Understanding the daemon/CLI split matters for CI — CI runners connect to Docker via `/var/run/docker.sock`. Mounting this socket in a container gives it full Docker control (security risk). Services like GitHub Actions use a Docker socket or a Docker-in-Docker sidecar.

---

## I — Interview Q&A

### Q: What is the difference between a Docker image and a container?

**A:** An image is a read-only, layered snapshot containing the OS filesystem, runtime, application code, and configuration — built from a Dockerfile and stored in a registry. It's the blueprint. A container is a running instance of an image — an isolated process that gets a writable layer on top of the image's read-only layers. Multiple containers can run from the same image simultaneously, each with its own isolated state. When a container is deleted, its writable layer is gone; the underlying image is unaffected. Think of an image as a class definition and a container as an instance.

---

## C — Common Pitfalls + Fix

### ❌ Using `:latest` tag in production — non-deterministic deployments

```bash
# ❌ "latest" changes whenever a new image is pushed — unpredictable rollbacks
docker pull myapp:latest
docker run myapp:latest

# ✅ Pin to an immutable tag
docker pull myapp:sha-abc1234
docker run myapp:sha-abc1234
```

---

## K — Coding Challenge + Solution

### Challenge

Run a temporary PostgreSQL container for local development: name it `dev-db`, expose port 5432, set password via environment variable, and verify it's running. Then show how to remove it completely.

### Solution

```bash
# Start PostgreSQL container
docker run -d \
  --name dev-db \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_DB=myapp_dev \
  -p 5432:5432 \
  postgres:18-alpine

# Verify it's running
docker ps --filter name=dev-db

# Connect and verify
docker exec -it dev-db psql -U devuser -d myapp_dev -c '\l'

# Tail logs
docker logs dev-db -f

# Complete teardown
docker stop dev-db
docker rm dev-db
# Or one-liner:
docker rm -f dev-db
```

---

---
