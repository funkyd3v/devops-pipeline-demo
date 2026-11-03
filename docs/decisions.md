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
