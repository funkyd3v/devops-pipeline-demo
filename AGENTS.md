# AGENTS.md: devops-pipeline-demo

Instructions for any AI coding agent working in this repo. Read this file first.

## Purpose
Portfolio project: take a small NestJS REST API through a full DevOps workflow
(Docker, Jenkins, Ansible, Kubernetes). The app is intentionally simple. The
pipeline and infrastructure are the point.

## Layout
app/      NestJS source
docker/   Dockerfile extras, compose files
jenkins/  Jenkinsfile
ansible/  playbooks, inventory, roles
k8s/      manifests
docs/     progress.md, decisions.md, learning-log.md

## Working rules
- Work on ONE roadmap stage at a time. Do not touch other stages.
- Read docs/progress.md before starting. Update it when finished.
- Only modify files inside the folder for the current stage, unless told otherwise.
- Never commit or push. Show `git status` and `git diff --stat` and stop.
- Never invent credentials, hostnames, IPs, or URLs. Use placeholders
  like `<DOCKERHUB_USER>` and read secrets from env vars or Jenkins credentials.
- Never put secrets in any file, including examples. Provide `.env.example` only.
- Prefer simple, commonly used patterns over clever ones. Add short comments
  explaining WHY for non-obvious DevOps choices (I need to explain them in interviews).
- Pin versions (base images, Node, action/plugin versions). No `latest` tags.
- Do not add tools or dependencies that are not in the roadmap.

## Conventions
- Node 20, npm (use `npm ci` in CI), TypeScript.
- Docker: multi-stage, non-root user, small base image, HEALTHCHECK.
- Commits: conventional style (feat:, fix:, docs:, chore:).
- Image name: `<DOCKERHUB_USER>/devops-pipeline-demo`.

## Definition of done (every stage)
- Commands run successfully and output is shown.
- README roadmap item and docs/progress.md updated.
- Short entry suggested for docs/learning-log.md (I will review and edit).