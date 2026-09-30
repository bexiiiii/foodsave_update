# Console deployment checklist (operator-run, never automatic)

Use only after explicit deployment approval and at the approved time. This document is a review checklist, **not a script to paste wholesale**. Stop after preflight until the actual production layout is known. Never print `.env`, Docker container environment, expanded Compose configuration, connection passwords, or access tokens into chat/logs. Never use the repository root `.env.example` as production configuration.

## Read-only preflight to share for review

Run these from the known deployment checkout (if the location is unknown, identify it through the hosting panel first):

```sh
pwd
git status --short
git branch --show-current
git rev-parse HEAD
git log -3 --oneline
docker compose ls
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
df -h .
free -m
```

For each actual app container, inspect only non-secret labels/state/image identity:

```sh
docker inspect --format '{{.Name}} image={{.Image}} state={{.State.Status}} project={{index .Config.Labels "com.docker.compose.project"}} service={{index .Config.Labels "com.docker.compose.service"}} dir={{index .Config.Labels "com.docker.compose.project.working_dir"}} files={{index .Config.Labels "com.docker.compose.project.config_files"}}' ACTUAL_CONTAINER_NAME
```

Unknowns that must be resolved before write steps:
- Production checkout path, deployed commit, local modifications/untracked configuration, Compose project and all override files
- Actual database host/container and approved existing database access/backup method; root Compose has no database service
- Existing migration tracking mechanism and which V001..V019 schema prerequisites are applied
- Current app image IDs, secure environment source, available disk/RAM, and existing health URLs
- Actual timestamp conventions (the app defaults to Almaty), order volume, backup/restore status, and allowed maintenance interruption

Repository evidence only: root `docker-compose.yml` defines services `backend`, `admin`, `miniapp`, expected containers `foodsave-backend`, `foodsave-admin`, `foodsave-miniapp`, ports 8080/3001/3000 and the named backend uploads volume. **Do not assume the server uses this file unchanged.** The nested backend Compose differs. Do not start a second Compose project or create replacement database/volume infrastructure.

## Prepare without changing running services

1. Record current commit and backend/admin image IDs privately. Take the existing approved PostgreSQL backup (including schema/data) and uploads backup; verify their size, success and restore procedure. Do not disclose backup contents. Do not delete old images, caches, uploads or database files to make room.
2. Review local Git drift. Stop if there are local edits to files this release changes. Do not reset, stash, overwrite `.env` files or force-pull. Preserve the server copy and reconcile separately.
3. Fetch the review branch without merging main:

```sh
git fetch origin review/foodsave-growth-controls-20260930
git rev-parse FETCH_HEAD
git log --oneline HEAD..FETCH_HEAD
git diff --stat HEAD..FETCH_HEAD
```

Compare `FETCH_HEAD` to the **full verified release SHA supplied with the delivery report**. Abort on any mismatch or unexpected history. Select that exact commit only after the clean-tree/drift review; a branch name alone is not a release pin. Record the previous commit before changing checkout. Do not use force push or merge main.

4. Reuse the server's actual Compose project, files and secure configuration. Add a reviewed local override outside the repository that explicitly keeps only growth sends OFF:

```yaml
services:
  backend:
    environment:
      NOTIFICATIONS_GROWTH_ENABLED: "false"
```

Append this override to the **existing** Compose invocation; keep all existing files/project/env sources. Do not replace JAVA_OPTS or other settings. Do not change the ordinary marketing flag. Confirm the override's key is present by reviewing the file, without printing expanded secrets.

5. Build only the services actually changed, backend and admin, with no effect on running containers. Use the previously verified Compose invocation plus the OFF override:

```sh
# Replace COMPOSE_INVOCATION with the reviewed command, never guess project/files.
COMPOSE_INVOCATION build backend admin
```

This is a notation placeholder, not a literal shell command. If build fails (dependencies, Google Fonts DNS, resources, types), stop; do not restart the old healthy containers. The existing admin Next config skips lint/type checking, so an image build alone does not clear its baseline type errors. Source compilation and tests must also be reviewed.

## Additive migrations (explicitly reviewed write step)

Apply V020 then V021 using the actual approved DB access and migration tracking. Verify neither migration already exists. Use checksums of the exact release files. Both must be atomic; V020's snapshot and trigger installation must not have a write gap.

```sh
# Illustrative only: PGSERVICE must refer to existing authorized secure connection settings.
# Never put a password on the command line or paste a connection string into chat.
PGOPTIONS='-c lock_timeout=5000 -c statement_timeout=300000' \
  psql --single-transaction -v ON_ERROR_STOP=1 -f backend_foodsave/src/main/resources/db/migration/V020__growth_experiments.sql
PGOPTIONS='-c lock_timeout=5000 -c statement_timeout=300000' \
  psql --single-transaction -v ON_ERROR_STOP=1 -f backend_foodsave/src/main/resources/db/migration/V021__growth_dispatch.sql
```

Adapt invocation to the verified existing access route; do not run these without a known target and backup. A timeout/error means stop and inspect, not retry blindly. Roll back the failed transaction; never mark a failed migration applied. Snapshot/index runtime depends on production volume. Record successful migration checksums through the established mechanism. No data purge or destructive down migration is needed.

Read-only post-migration checks: expected four V020 tables plus two V021 tables and their indexes/triggers exist; initial experiments/assignments/dispatches counts are zero for a fresh install; order ledger baseline count matches the snapshot expectations. If this is not a fresh install, preserve existing experiments and do not assert zero or reset them.

## Minimal service update and health

After successful build/migrations and final approval, use the reviewed invocation:

```sh
COMPOSE_INVOCATION up -d --no-deps backend admin
```

Update only these app services. Do not run `down`, remove volumes, restart the DB/Redis/miniapp, prune images, or enable growth delivery. Verify backend health at the already established internal endpoint (repository healthcheck uses `/actuator/health`), container status and authenticated admin page. Keep logs private and redact tokens/customer data before sharing excerpts. Check ordinary-user denial, read-only preview, and transactional order behavior without creating customer orders/messages. No experiment creation, enrollment, pickup attestation, enablement or dispatch is part of deployment.

## Pause and rollback

If health fails, restore the recorded backend/admin image IDs using the same project/config/volumes, then verify health. Use a temporary image override and `up -d --no-deps --no-build` for those services only; verify old images exist before replacing containers. Do not roll back database tables/triggers or delete audit evidence.

A pre-growth image does not preserve participant suppression. On a fresh OFF install with zero participants, reverting app images leaves only additive storage. If any participants exist, disable new growth sends first and retain isolation-capable code for their full D14 follow-up; do not silently revert to code that sends ordinary marketing to them. An already claimed in-flight send may complete after a flag is disabled. Preserve all claims, assignments, ledger entries and backups.
