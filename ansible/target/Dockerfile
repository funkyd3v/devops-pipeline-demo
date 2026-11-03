# A container that pretends to be a VM for the Ansible stage: it runs sshd and
# carries a Docker CLI. The app container that the playbook deploys does NOT run
# here - it is created on the HOST's Docker engine through the socket mounted in
# docker-compose.yml.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# policy-rc.d: package postinst scripts must never try to start services (a
# container has no init system). Deliberately kept for the container's whole
# life, not just the build, so apt runs done later by the playbook behave the
# same way instead of failing on a missing systemctl/dockerd start.
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
    && chmod 755 /usr/sbin/policy-rc.d

# python3 + python3-apt: Ansible modules run on this host, and the apt module
# imports python3-apt. ca-certificates: the playbook downloads Docker's apt key
# over HTTPS. No docker package here on purpose - the playbook installs it.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssh-server \
        python3 \
        python3-apt \
        sudo \
    && rm -rf /var/lib/apt/lists/*

# Login user for Ansible. The password field is '*' rather than useradd's default
# '!' on purpose: with UsePAM off, sshd treats '!' as a locked account and
# refuses the login, while '*' still makes password logins impossible.
RUN useradd -m -s /bin/bash -p '*' bootstrap \
    && install -d -m 700 -o bootstrap -g bootstrap /home/bootstrap/.ssh \
    && printf 'bootstrap ALL=(ALL) NOPASSWD:ALL\n' > /etc/sudoers.d/90-bootstrap \
    && chmod 440 /etc/sudoers.d/90-bootstrap

# Key-only SSH. sshd_config.d is included at the top of sshd_config, so these
# values win over the packaged defaults.
RUN printf '%s\n' \
        'PasswordAuthentication no' \
        'KbdInteractiveAuthentication no' \
        'PermitRootLogin no' \
        'UsePAM no' \
        > /etc/ssh/sshd_config.d/10-key-only.conf \
    && printf '%s\n' \
        'HostKey /etc/ssh/host_keys/ssh_host_ed25519_key' \
        'HostKey /etc/ssh/host_keys/ssh_host_rsa_key' \
        > /etc/ssh/sshd_config.d/00-host-keys.conf

# /run/sshd: sshd's privilege separation directory.
# /etc/ssh/host_keys: filled by the entrypoint, persisted by a named volume.
RUN mkdir -p /run/sshd /etc/ssh/host_keys

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh

EXPOSE 22

# There is no ssh client in this image, so prove sshd listens with bash's
# /dev/tcp redirect instead of installing one.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/22'

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
