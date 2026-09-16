#!/bin/sh
set -eu

# Only disposable build layers and unused images are removed. Volumes,
# databases, uploads and running containers are intentionally untouched.
# Retain a small warm cache so deploys remain fast without unbounded growth.
docker builder prune -af --keep-storage "${DOCKER_BUILD_CACHE_LIMIT:-3GB}"
docker image prune -af --filter "until=168h"

df -h /
