# Pinned full LTS tag on JDK 21 (not `latest`) so rebuilds are reproducible.
FROM jenkins/jenkins:2.580.2-lts-jdk21

# Root is needed only for the install below; the image ends as the jenkins user.
USER root

# Pin one exact CLI build instead of floating: rebuilds don't drift, and it stays
# aligned with the host Docker Desktop client (both speak API 1.51).
ARG DOCKER_CE_CLI_VERSION=5:29.9.2-1~debian.13~trixie

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# CLI only, no daemon: builds use the host engine through the mounted socket, so
# a second daemon in here would be useless. Armored .asc + signed-by avoids gnupg.
RUN install -d -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian trixie stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        "docker-ce-cli=${DOCKER_CE_CLI_VERSION}" \
    && rm -rf /var/lib/apt/lists/*

USER jenkins

# Plugins are baked into the image (not clicked in the UI) so a fresh jenkins_home
# starts ready; /usr/share/jenkins/ref is the supported offline install location.
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# /login is the cheapest endpoint that proves the UI is serving. Plain curl (no
# --fail) so the pre-setup 403 still counts as up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -s -o /dev/null http://localhost:8080/login || exit 1
