#!/bin/sh
set -eu

# 1. Authorised key: mounted read-only from the host by docker-compose.yml, so
#    the public key is never baked into the image. Restart the container to pick
#    up a rotated key.
if [ ! -f /run/keys/devops_demo.pub ]; then
    echo "missing /run/keys/devops_demo.pub (see volumes in docker-compose.yml)" >&2
    exit 1
fi
install -d -m 700 -o bootstrap -g bootstrap /home/bootstrap/.ssh
install -m 600 -o bootstrap -g bootstrap /run/keys/devops_demo.pub /home/bootstrap/.ssh/authorized_keys

# 2. Host keys live in a named volume. A real server keeps its host keys for
#    years; regenerating them on every rebuild would make every client that
#    pinned the old key (here: ansible/known_hosts) see a changed host key.
for type in ed25519 rsa; do
    key="/etc/ssh/host_keys/ssh_host_${type}_key"
    if [ ! -f "$key" ]; then
        ssh-keygen -q -t "$type" -N '' -f "$key"
    fi
done

exec /usr/sbin/sshd -D -e
