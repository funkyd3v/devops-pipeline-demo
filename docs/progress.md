# Progress

Agents: read this at the start of each session and update it at the end of each stage.

## Current stage

Stage 6: Monitoring with Prometheus and Grafana (optional) - not started.

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
- Stage 5: Kubernetes on a local kind cluster
  - `k8s/kind-config.yaml`: one control-plane node; the cluster name is passed on
    the CLI (`kind create cluster --name devops-demo`) because kind's config
    schema has no name field
  - Node image pinned by digest: `kindest/node:v1.37.0` with digest
    `sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5`
    (kind re-pushes tags, so only a digest guarantees the build)
  - Tooling installed per-user, checksum-verified: kind v0.33.0 and kubectl
    v1.37.0 in `~/.local/bin`; the pre-existing global kubectl v1.34.1 is left
    untouched (it is three minors behind the 1.37 API)
  - `k8s/deployment.yaml`: 2 replicas, image
    `funkyd3v/devops-pipeline-demo:4-be6bc1a`, `imagePullPolicy: IfNotPresent`
    (safe because every build tag is unique), requests 50m/64Mi, limits
    250m/256Mi, readiness and liveness probes on `/health`, RollingUpdate with
    `maxUnavailable: 0` and `maxSurge: 1`, `revisionHistoryLimit: 5`
  - Security: pod runs as uid/gid 1000 with `runAsNonRoot`,
    `readOnlyRootFilesystem: true`, all capabilities dropped,
    `seccompProfile: RuntimeDefault`, writable `/tmp` from an emptyDir
  - `k8s/service.yaml`: ClusterIP, port 80 to the named `http` port;
    `k8s/configmap.yaml`: `PORT=3000`
  - No Secret: the app has no database, tokens or credentials, and the Docker Hub
    repository is public, so no Secret was invented (explained in `k8s/README.md`)
  - `k8s/README.md`: pinned install with checksum verification, deploy, verify,
    port-forward, rolling update, rollback, failed rollout, disk usage, teardown
  - Verified: node Ready in 18s; 2/2 pods Ready with 0 restarts; `id` inside the
    container is uid 1000; a write to the image filesystem is denied while the
    emptyDir `/tmp` is writable; `kubectl port-forward` to the Service returned
    `{"status":"ok"}`; `POST /items` 201 then `GET /items` 200; empty `name` 400
  - Zero-downtime: 80 requests at 1/s from a pod inside the cluster (against the
    Service DNS) during the 4-be6bc1a -> 5-28f8fc8 rollout: 80 OK, 0 failed
  - Update: new ReplicaSet created, old scaled to 0; rollout history 1,2
  - Rollback: image back to 4-be6bc1a; history 2,3 because the previous
    ReplicaSet is reused and renumbered (revision 1 disappears)
  - Failed rollout with tag `999-deadbee`: `rollout status` timed out after 60s,
    new pod went ErrImagePull -> ImagePullBackOff, both old pods kept serving
    (`/health` 200); `rollout undo` restored 4-be6bc1a, history 2,4,5
  - Disk: Docker images grew 6.06 -> 7.41 GB and volumes 0.93 -> 2.36 GB; the
    Windows C: drive stayed above 25 GB free (stop line is 10 GB). The kind
    control plane used 1.28 GiB of the Docker VM's 3.78 GiB
  - Cluster is left running; teardown is manual with
    `kind delete cluster --name devops-demo`

## Next

- Stage 6: Monitoring with Prometheus and Grafana (optional), not started
- The kind cluster from Stage 5 is still running until teardown is decided

## Known issues

- Jenkins job is triggered manually (no webhook)
- group_add GID 989 is machine-specific (Jenkins stage only; the Ansible target
  needs no group_add because it talks to the socket as root)
- Docker Pipeline plugin is flagged "up for adoption"
- `python3-docker` 5.0.3 comes from the Ubuntu archive; it works with the newer
  engine thanks to API negotiation, but it is an old SDK
- If the `host_keys` volume is removed (`compose down -v`), the target gets new
  host keys and `ansible/known_hosts` must be deleted before the next run
- The user-local kubectl v1.37.0 must stay first in `PATH`; the global v1.34.1 is
  too old for the 1.37 API and would speak an unsupported version
- `kubectl rollout undo` warns that `last-applied-configuration` is stale; the
  next `kubectl apply -f k8s/deployment.yaml` reconciles it (the file already
  matches the running image)
- `kubectl get endpoints` is deprecated in v1.37; EndpointSlice is the supported
  API, but the warning is cosmetic
- The kind cluster from Stage 5 is still running and holds roughly 2.4 GB of
  Docker volumes; `kind delete cluster --name devops-demo` frees the container
  but leaves the node image cached

