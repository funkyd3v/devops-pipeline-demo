# Decisions

One entry per decision: what was chosen, why, and what the alternative was.

| Date       | Decision                    | Reason                                       | Alternative      |
| ---------- | --------------------------- | -------------------------------------------- | ---------------- |
| 2026-11-01 | NestJS for the app          | Familiar, TypeScript, built-in testing with Jest | Express, FastAPI |
| 2026-11-01 | AGENTS.md for agent context | Tool-neutral, works with most coding agents  | CLAUDE.md        |
| 2026-11-01 | In-memory storage for items | The app is only cargo for the pipeline       | A database       |
| 2026-11-03 | Ansible targets a local container instead of a VM | Real VPS is off limits; a container gives real SSH, package installs and a Docker CLI, reproducible on any machine | Vagrant VM, cloud VM |
| 2026-11-03 | `docker-ce-cli` from Docker's repo, not `docker.io` | Ubuntu's archive only bundles the CLI with dockerd, which this target must not run; `docker-ce-cli` is CLI-only (libc6 only) and pinnable | `docker.io` (unused daemon), static CLI tarball |
| 2026-11-03 | `community.docker` modules, not `command` | Declarative idempotency, meaningful `changed`, check mode; costs one package (`python3-docker`) on the target | `command` with hand-rolled `docker inspect` guards |
| 2026-11-03 | Docker tasks run as root via `become`, no `group_add` | The socket is owned by root, so its machine-specific GID never gets hardcoded (Stage 3 needed 989); `deploy` stays out of any docker group | `group_add` with a hardcoded or `.env`-supplied GID |
| 2026-11-03 | Repo-local `ansible/known_hosts` + `accept-new` | Leaves `~/.ssh/known_hosts` untouched and still fails if a host key changes (better than disabling checks) | Global known_hosts, `StrictHostKeyChecking=no` |
| 2026-11-03 | Host keys in a named volume | Rebuilds keep the same key, otherwise known_hosts breaks every time | Regenerate per container |
| 2026-11-03 | Pinned CLI 29.9.2 against a host engine 28.5.1 | Client/daemon API differences are negotiated automatically; a newer CLI works with an older daemon | Matching the CLI to the engine, Ubuntu `docker.io` 24.0.7 |
| 2026-11-04 | kind instead of minikube | A kind cluster is itself a container: no VM, no driver choice, no separate image cache, and it can be deleted in seconds. kind also ships a digest-pinned node image per release, which makes the Kubernetes version reproducible | minikube (needs a driver or VM and leaves its own profile behind) |
| 2026-11-04 | One control-plane node only | The stage demonstrates Deployments, probes and rollouts, not scheduling capacity. A single node is a complete conformant cluster and keeps the footprint low on a machine with 4 GB for Docker | Multi-node (one control plane plus workers) |
| 2026-11-04 | `maxUnavailable: 0`, `maxSurge: 1` | A pod is only removed after its replacement is Ready, so a bad release cannot take the Service down: during the bad-tag test both old pods kept serving. One surge pod is all a single node can use | Default 25% maxUnavailable (can drop to zero ready pods with 2 replicas) |
| 2026-11-04 | No Secret manifest | The app has no database, API token or credentials, and the Docker Hub repo is public, so there is nothing to store. A placeholder Secret would model a requirement that does not exist; real secrets would be created with `kubectl create secret` and referenced via `secretKeyRef` | A committed example Secret with dummy values |
| 2026-11-04 | `readOnlyRootFilesystem: true` with an emptyDir at `/tmp` | The runtime image writes nothing to its filesystem after startup, so a read-only root removes a persistence path; any component needing scratch space gets an in-memory volume instead. Verified live: the app started and passed its probes | Writable root filesystem (simpler, larger blast radius) |
| 2026-11-04 | `imagePullPolicy: IfNotPresent` with per-build tags | Every Jenkins build pushes a unique `<build>-<sha>` tag, so a cached image can never be the wrong one. Restarts and rollbacks avoid a registry round-trip. With a mutable tag this would have to be `Always` | `Always` (works with mutable tags, but re-pulls on every pod restart) |
| 2026-11-04 | Checksum-verified kind and kubectl in `~/.local/bin` | No sudo and no global install, and the pinned versions are explicit. kubectl v1.37.0 matches the 1.37 API; the older global v1.34.1 stays untouched and is shadowed by `PATH` | System package manager, or downloading into `/usr/local/bin` as root |
