# devops-pipeline-demo

End-to-end CI/CD and deployment pipeline for a NestJS REST API using Docker, Jenkins, Ansible, and Kubernetes.

**Status:** 🚧 In progress. Roadmap below is updated as each stage is completed.

## Overview

This project takes a small NestJS (TypeScript) REST API through a complete DevOps workflow: containerization, automated CI/CD, configuration management, and orchestration. The API itself is intentionally simple; the focus is the pipeline and infrastructure that builds, ships, and runs it.

## Tech Stack

| Area | Tool |
| --- | --- |
| Application | NestJS (TypeScript), Jest |
| Containerization | Docker (multi-stage build), Docker Compose |
| CI/CD | Jenkins (declarative pipeline), Docker Hub |
| Configuration Management | Ansible |
| Orchestration | Kubernetes (minikube/kind) |
| Monitoring (optional) | Prometheus, Grafana |


## Roadmap

- [x] NestJS REST API (`/health`, `/items`) with unit tests
- [x] Dockerfile (multi-stage) and docker-compose
- [x] Jenkins pipeline (build, test, push image)
- [x] Ansible playbook (provision VM + deploy app)
- [x] Kubernetes manifests (Deployment, Service, ConfigMap/Secret, probes)
- [x] Rolling update and rollback demo
- [ ] Monitoring with Prometheus and Grafana
- [ ] Cloud deployment on AWS free tier

## Planned Project Structure

```text
devops-pipeline-demo/
├── app/          # NestJS source (TypeScript)
├── docker/       # Docker and Docker Compose files
├── jenkins/      # Jenkinsfile and pipeline scripts
├── ansible/      # Playbooks and inventory
├── k8s/          # Kubernetes manifests
└── docs/         # Project documentation
```

## Getting Started

Setup and run instructions will be added as each stage is completed.
