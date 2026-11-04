# Kubernetes (Stage 5)

Runs the image built by Jenkins on a local [kind](https://kind.sigs.k8s.io/)
cluster, with a Deployment, a Service, a ConfigMap and both probes, then shows a
rolling update and a rollback.

The cluster is local only. It is created and destroyed on this machine, holds no
real data, and talks to no remote host.

## Pinned versions

| Component | Version | Why |
| --- | --- | --- |
| kind | v0.33.0 | Pinned binary, checksum verified before install |
| kubectl | v1.37.0 | Matches the cluster's Kubernetes minor version |
| kind node image | `kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5` | kind requires a digest: tags are re-pushed when an image is rebuilt |
| App image | `funkyd3v/devops-pipeline-demo:4-be6bc1a` | Jenkins build #4, rolled to `5-28f8fc8` (build #5) during the demo |

The app image is `linux/amd64` only. On an arm64 host the pod would fail with an
exec format error until the image is built for arm64 too.

## Prerequisites

- Docker running (Docker Desktop is fine; no settings need to change).
- `~/.local/bin` first in `PATH` (it is on this machine).
- About 2 GB of free space on the Docker disk for the node image.

## 1. Install the pinned CLIs

Both binaries are installed per-user into `~/.local/bin`, which needs no `sudo`
and does not touch `/usr/local/bin`. The checksum is verified **before** the file
is made executable.

```bash
mkdir -p ~/.local/bin /tmp/opencode/stage5
cd /tmp/opencode/stage5

# The checksum file names the binary "kind-linux-amd64", so keep that filename.
curl -sSL -o kind-linux-amd64 https://kind.sigs.k8s.io/dl/v0.33.0/kind-linux-amd64
curl -sSL -o kind-linux-amd64.sha256sum \
  https://github.com/kubernetes-sigs/kind/releases/download/v0.33.0/kind-linux-amd64.sha256sum
sha256sum -c kind-linux-amd64.sha256sum
install -m 0755 kind-linux-amd64 ~/.local/bin/kind

curl -sSL -o kubectl https://dl.k8s.io/release/v1.37.0/bin/linux/amd64/kubectl
curl -sSL -o kubectl.sha256 \
  https://dl.k8s.io/release/v1.37.0/bin/linux/amd64/kubectl.sha256
echo "$(cat kubectl.sha256)  kubectl" | sha256sum -c
install -m 0755 kubectl ~/.local/bin/kubectl
```

Verify:

```bash
command -v kind kubectl     # both must be /home/<user>/.local/bin/...
kind --version              # kind version 0.33.0
kubectl version --client    # Client Version: v1.37.0
```

> A global `kubectl` may already exist in `/usr/local/bin`. Because
> `~/.local/bin` comes first in `PATH`, the pinned v1.37.0 is the one that runs;
> the global copy is left untouched.

## 2. Create the cluster

kind takes the cluster name on the command line; the config file only describes
the nodes.

```bash
# Keep the existing kubeconfig so unrelated contexts can be restored later.
cp ~/.kube/config ~/.kube/config.bak-stage5 2>/dev/null || true

kind create cluster --name devops-demo --config k8s/kind-config.yaml --wait 120s
kubectl config current-context    # kind-devops-demo
kubectl get nodes -o wide
```

Expected: one node, `control-plane`, `Ready`, Kubernetes `v1.37.0`.

## 3. Deploy

```bash
kubectl apply -f k8s/configmap.yaml -f k8s/deployment.yaml -f k8s/service.yaml
kubectl rollout status deployment/devops-pipeline-demo --timeout=120s
kubectl get pods -o wide
kubectl get svc,endpoints
```

Expected: two pods `1/1 Running`, both endpoints listed for the Service.

Inspect what the scheduler and probes think:

```bash
kubectl describe deployment devops-pipeline-demo
kubectl describe pod -l app=devops-pipeline-demo
```

## 4. Reach the app

The Service is `ClusterIP`, so it is reachable inside the cluster only. Forward a
local port for the demo:

```bash
kubectl port-forward svc/devops-pipeline-demo 8080:80
# in a second terminal
curl -s localhost:8080/health     # {"status":"ok"}
curl -s localhost:8080/items      # []
curl -s -X POST localhost:8080/items \
  -H 'Content-Type: application/json' -d '{"name":"demo"}'
```

`port-forward` goes through the API server to one ready pod, which also proves
the readiness probe is passing.

## 5. Rolling update

Build #5 (`5-28f8fc8`) is the same code as build #4, so only a new ReplicaSet
appears; no behaviour change is expected.

```bash
kubectl set image deployment/devops-pipeline-demo \
  api=funkyd3v/devops-pipeline-demo:5-28f8fc8

kubectl rollout status deployment/devops-pipeline-demo --timeout=120s
kubectl get pods -o wide
kubectl get rs                       # new ReplicaSet, old one scaled to 0
kubectl rollout history deployment/devops-pipeline-demo
```

With `maxUnavailable: 0` and `maxSurge: 1`, a third pod is created, must pass its
readiness probe, and only then is one old pod terminated. At no point are zero
pods ready.

## 6. Rollback

```bash
kubectl rollout undo deployment/devops-pipeline-demo
kubectl rollout status deployment/devops-pipeline-demo --timeout=120s

# The previous version is running again:
kubectl get deployment devops-pipeline-demo \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
# funkyd3v/devops-pipeline-demo:4-be6bc1a

kubectl rollout history deployment/devops-pipeline-demo
```

Rolling back does not delete the newer ReplicaSet; it becomes the next undo
target. The Deployment reuses the previous ReplicaSet instead of recreating it,
so the rolled-back state is renumbered as a new revision (undoing revision 2
produces revision 3, and revision 1 disappears from the list).

Roll back to a specific revision instead of "the previous one" with
`kubectl rollout undo deployment/devops-pipeline-demo --to-revision=<N>`
(revision numbers come from `rollout history`).

## 7. When a rollout fails (it should fail safely)

Use a tag that was never pushed. `999-deadbee` is deliberately fake.

```bash
kubectl set image deployment/devops-pipeline-demo \
  api=funkyd3v/devops-pipeline-demo:999-deadbee

kubectl rollout status deployment/devops-pipeline-demo --timeout=60s
# error: timed out waiting for the condition

kubectl get pods
# one pod in ImagePullBackOff / ErrImagePull, the two 4-be6bc1a pods still Running

curl -s localhost:8080/health      # still {"status":"ok"}
```

Because the new pod never becomes Ready, `maxUnavailable: 0` keeps both old pods
in the Service, and the rollout simply stops. Recover with:

```bash
kubectl rollout undo deployment/devops-pipeline-demo
kubectl rollout status deployment/devops-pipeline-demo --timeout=120s
```

A broken probe can be demonstrated the same way, by pointing `readinessProbe`
at a path that does not exist (e.g. `/healthz`) with `kubectl patch`, watching
the rollout stall, then undoing it.

## Configuration and secrets

`k8s/configmap.yaml` holds `PORT`. That is the app's entire configuration.

**There is no Secret, and none is invented.** The app has no database, no API
tokens and no credentials: items live in memory and `/health` is public. The
Docker Hub repository is public, so no image pull secret is needed either.
A Secret would only be warranted for things the app actually has, such as:

- a private registry (`imagePullSecrets`), if the image ever stops being public;
- a database password or signing key, if the in-memory store is replaced.

Those would be created at runtime and never committed:

```bash
kubectl create secret generic devops-pipeline-demo-db \
  --from-literal=password="$DB_PASSWORD"
```

and referenced from the Deployment with `secretKeyRef`. Nothing in this repo
would contain the value; `.env.example`-style placeholders only.

## Disk usage

kind runs the control plane as a Docker container, so everything it needs lands
in the Docker disk (on this machine, inside Docker Desktop's WSL disk on `C:`).

Measured before the cluster existed (2026-11-04):

```text
C:                    186G total, 162G used, 25G free
docker system df      Images 6.06 GB, Containers 123.5 MB,
                      Volumes 931.4 MB, Build cache 43.1 MB
```

Expected cost of the demo: roughly 1.5-2 GB, almost all of it the
`kindest/node` image. Check at any point with:

```bash
df -h /mnt/c
docker system df
```

Stop and free space if `C:` drops below **10 GB free**. In that order:

1. `kind delete cluster --name devops-demo` - removes the node container. The
   `kindest/node` image stays cached, so the next cluster starts faster.
2. Remove that image explicitly only if space is still needed:
   `docker rmi kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5`.

`docker system prune` is not used: it also deletes other projects' images,
build cache and stopped containers on this shared Docker daemon.

## Teardown

```bash
kind delete cluster --name devops-demo
```

That removes the node container and the cluster's kubeconfig context. The
downloaded `kind`/`kubectl` binaries stay in `~/.local/bin` (10 MB and 62 MB,
outside the Docker disk) and can be reused.

To restore the kubeconfig from before this stage:

```bash
cp ~/.kube/config.bak-stage5 ~/.kube/config
```

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `ImagePullBackOff` on both pods | Image tag does not exist, or no network to Docker Hub |
| Pod `Running` but `0/1 Ready` | Readiness probe failing; check `kubectl describe pod` events and `kubectl logs` |
| Rollout stuck at "waiting for rollout to finish" | New pod not Ready; `kubectl rollout undo` recovers, `kubectl rollout history` shows revisions |
| `exec format error` in logs | Running an amd64-only image on an arm64 host |
| `port-forward` connection refused | Pod not Ready, or the forward died; restart the command |
| Cluster creation fails on memory | Docker VM has 4 GB total; stop unrelated containers first |
