# Progress

Agents: read this at the start of each session and update it at the end of each stage.

## Current stage

Stage 5: Kubernetes manifests (Deployment, Service, ConfigMap/Secret, probes) - not started.

## Completed

- Repo created, README with roadmap, AGENTS.md added
- Stage 1: NestJS REST API
  - `GET /health` returns `{ status: 'ok' }`
  - `GET /items` and `POST /items`, with `CreateItemDto` validation
    (global `ValidationPipe`, `whitelist: true` in `src/app.config.ts`)
  - In-memory `ItemsService`; data is lost on restart
  - PORT read from env, default 3000
  - Unit tests: 2 suites / 4 tests passing (`npm test`)
  - E2E tests: 1 suite / 3 tests passing (`npm run test:e2e`)
- Stage 2: Dockerfile (multi-stage) and docker-compose
  - `app/Dockerfile`: `deps` -> `build` -> `prod-deps` -> `runtime`
  - Base image pinned to `node:26.13.0-alpine` in every stage
  - Runtime stage copies only `dist/`, production `node_modules/`, `package*.json`
  - Runs as non-root `node` user (uid 1000); `NODE_ENV=production`, `PORT=3000`
  - `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3`
    calls `GET /health` with busybox `wget`
  - `app/.dockerignore` keeps `node_modules/`, `dist/`, `.git`, `.env` out of the context
  - `docker/docker-compose.yml`: one `api` service, image
    `funkyd3v/devops-pipeline-demo:0.1.0`, `3000:3000`, `restart: unless-stopped`
  - Verified: image 68.9 MB content size, container runs as `node`, compose service
    healthy in ~3s, `/health` 200, `POST /items` 201, `GET /items` 200,
    empty name 400, `compose down` clean
  - Fixed during build: build stage was missing `package.json`, so
    `npm run build` had no script
- Stage 3: Jenkins pipeline
  - Jenkins runs in a container (jenkins/Dockerfile, plugins.txt, docker-compose.yml),
    pinned LTS 2.580.2-lts-jdk21, Docker CLI only, host socket mounted via group_add
  - Four plugins pinned: workflow-aggregator, git, credentials-binding, docker-workflow
  - Credential `dockerhub-creds` stored in the Jenkins credentials store (never in the repo)
  - jenkins/Jenkinsfile: Checkout -> Test -> Build Image -> Push Image, with cleanup in post
  - Tests run inside the image build via a `test` stage in app/Dockerfile
  - Tag format <BUILD_NUMBER>-<short sha>; build #4 pushed funkyd3v/devops-pipeline-demo:4-be6bc1a
  - Verified: image pulled from Docker Hub and /health returned {"status":"ok"}
  - Fixed during build: nested sh() in a multi-line Groovy string (syntax error);
    timestamps() option rejected because the Timestamper plugin is not installed
- Stage 4: Ansible (provision a local container over real SSH + deploy the image)
  - Target: `ansible/target/Dockerfile` (ubuntu:24.04) runs sshd key-only
    (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
    `PermitRootLogin no`, `UsePAM no`); `bootstrap` user has password field `*`
    (not `!`, which sshd rejects when PAM is off) and passwordless sudo
  - `ansible/target/docker-compose.yml`: SSH on 127.0.0.1:2222 only, public key
    mounted read-only (never baked in), host Docker socket mounted (same
    trade-off as Jenkins: root-equivalent control of the host engine)
  - Host keys persist in the `host_keys` named volume, so rebuilds do not
    invalidate the repo-local `ansible/known_hosts`; `~/.ssh/known_hosts` is
    never touched (`accept-new` + `UserKnownHostsFile` per host)
  - `ansible/playbook.yml`: Docker apt repo + `docker-ce-cli` (pinned, CLI only -
    no dockerd in the target), `python3-docker`, `deploy` user (no sudo, no
    supplementary groups), then `docker_image` + `docker_container` for
    `funkyd3v/devops-pipeline-demo:4-be6bc1a` on 127.0.0.1:3002 with
    `restart: unless-stopped`
  - Installed in the target: docker-ce-cli 5:29.9.2-1~ubuntu.24.04~noble,
    python3-docker 5.0.3-1ubuntu1.1, openssh-server 1:9.6p1-3ubuntu13.20,
    python3 3.12.3-0ubuntu2.1, python3-apt 2.7.7ubuntu5.3,
    sudo 1.9.15p5-3ubuntu5.24.04.4
  - Host engine is 28.5.1 while the pinned CLI is 29.9.2; API auto-negotiation
    in the CLI and the Python SDK handled the difference
  - Verified: `ansible all -m ping` -> pong; playbook run 1 changed=5, run 2
    changed=0; `--check` changed=0; `curl localhost:3002/health` ->
    {"status":"ok"}; app container runs on the host engine (target `ps` shows
    only sshd); host key fingerprint identical after `compose restart target`
  - Fixed during stage: Ansible split `ansible_ssh_common_args` at the space in
    the INI inventory, so the value is quoted

## Next

- Stage 5: Kubernetes
  - Deployment, Service, ConfigMap/Secret and probes for the same image
  - Then the rolling update / rollback demo

## Known issues

- Jenkins job is triggered manually (no webhook)
- group_add GID 989 is machine-specific (Jenkins stage only; the Ansible target
  needs no group_add because it talks to the socket as root)
- Docker Pipeline plugin is flagged "up for adoption"
- `python3-docker` 5.0.3 comes from the Ubuntu archive; it works with the newer
  engine thanks to API negotiation, but it is an old SDK
- If the `host_keys` volume is removed (`compose down -v`), the target gets new
  host keys and `ansible/known_hosts` must be deleted before the next run
