# Ansible: provision the target and deploy the app

Stage 4 of the pipeline. Ansible runs from WSL2 and reaches the target over real
SSH (passwordless key auth). The target is a Docker container that pretends to
be a VM: Ubuntu 24.04, sshd, key-only login, a `bootstrap` user with passwordless
sudo for Ansible.

> **Where the app actually runs.** The target container carries a Docker *CLI*,
> not a Docker daemon. `docker-compose.yml` mounts the host's
> `/var/run/docker.sock` into it, so the app container the playbook starts runs
> on the **host Docker engine** — not inside the target. The target is only the
> thing Ansible configures and sends commands to. Mounting that socket gives
> anything in the target root-equivalent control of the host engine: fine for a
> throwaway local lab, not something to copy to a real server (use a rootless or
> SSH Docker context there).

## Prerequisites

- Docker Desktop running in WSL2 integration mode (the lab is not usable without
  the host engine).
- Ansible with the `community.docker` collection (`ansible` 9 / core 2.16 ships
  `community.docker` 3.7; here it comes from the distro `ansible` package).
- An SSH key pair. This repo's lab uses `~/.ssh/devops_demo` (private) and
  `~/.ssh/devops_demo.pub` (public, mounted into the target).

## Run

```sh
# 1. Start the "server". The public key is mounted, not built in.
docker compose -f ansible/target/docker-compose.yml up -d --build

# 2. Create your inventory from the committed example and fill in the private
#    key path plus an absolute path to the gitignored known_hosts file.
cp ansible/inventory.example.ini ansible/inventory.ini
$EDITOR ansible/inventory.ini

# 3. Check connectivity, then deploy. Run from ansible/ so ansible.cfg is found.
cd ansible
ansible all -m ping
ansible-playbook playbook.yml     # first run makes changes
ansible-playbook playbook.yml     # second run must end with changed=0

# 4. The app is published on the host engine:
curl http://localhost:3002/health   # {"status":"ok"}
```

## What the playbook does

| Task | Why |
| --- | --- |
| Add Docker's apt repo + key | The Ubuntu archive only ships `docker.io` (CLI **and** dockerd); `docker-ce-cli` is the CLI alone |
| Install `docker-ce-cli` (pinned) + `python3-docker` | Client for the mounted host socket; SDK required by `community.docker` modules |
| Create `deploy` user | Non-root, no sudo, no supplementary groups (in particular no `docker` group) |
| Pull `funkyd3v/devops-pipeline-demo:4-be6bc1a` | The exact image Jenkins build #4 pushed |
| Run `demo-api` with `restart: unless-stopped` | Declarative `docker_container`: recreates only when image/config changes |

Idempotency comes from the modules, not from `creates:`-style guards: `docker_image`
pulls only when the image is missing locally, `docker_container` compares the
running container against the task, and the apt cache is valid for an hour
(`cache_valid_time`), so a second run reports `changed=0`.

No Docker daemon is installed in the target on purpose; `policy-rc.d` is kept in
the image so package postinst scripts never try to start a service in a container.

## Why `community.docker` and not `command:`

`docker pull` / `docker run` via `command` would need hand-rolled `docker inspect`
guards to know when to pull or recreate a stale container, and supports no check
mode. The modules are declarative, give a meaningful `changed` count, and work
with `--check`. The price is one extra package on the target (`python3-docker`).

## SSH notes

- Key-only: `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
  `PermitRootLogin no`, `UsePAM no` (no PAM/logind in a container).
- The `bootstrap` password field is `*`, not the default `!`: with `UsePAM off`,
  sshd rejects `!` as a locked account.
- Host keys live in the `host_keys` named volume, so rebuilding the target does
  not invalidate `ansible/known_hosts`. If you wipe the volume
  (`docker compose ... down -v`), the keys change and SSH will refuse the new key
  until you delete `ansible/known_hosts` (or run `ssh-keygen -R '[127.0.0.1]:2222' -f ansible/known_hosts`).
- `known_hosts` is repo-local and gitignored; `~/.ssh/known_hosts` is untouched.

## Layout

```
ansible.cfg              inventory path, accept-new host keys, no .retry files
inventory.example.ini    committed template (placeholders only)
inventory.ini            real host details (gitignored)
known_hosts              host keys seen by Ansible (gitignored)
playbook.yml             the provisioning + deploy tasks
target/Dockerfile        Ubuntu 24.04 + sshd, key-only, bootstrap user
target/entrypoint.sh     installs the mounted key, generates host keys, runs sshd
target/docker-compose.yml  the target service on 127.0.0.1:2222, host socket mounted
```
