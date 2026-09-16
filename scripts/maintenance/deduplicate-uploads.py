#!/usr/bin/env python3
"""Replace byte-identical uploads with hard links while preserving every URL."""

from __future__ import annotations

import argparse
import hashlib
import os
import time
from collections import defaultdict
from pathlib import Path


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def candidates(root: Path, min_age_seconds: int) -> dict[int, list[Path]]:
    cutoff = time.time() - min_age_seconds
    by_size: dict[int, list[Path]] = defaultdict(list)
    for path in root.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue
        stat = path.stat()
        if stat.st_mtime <= cutoff:
            by_size[stat.st_size].append(path)
    return {size: paths for size, paths in by_size.items() if len(paths) > 1}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--min-age-seconds", type=int, default=300)
    args = parser.parse_args()

    root = args.root.resolve(strict=True)
    by_hash: dict[str, list[Path]] = defaultdict(list)
    for paths in candidates(root, args.min_age_seconds).values():
        for path in paths:
            by_hash[digest(path)].append(path)

    duplicate_groups = {
        expected_digest: paths
        for expected_digest, paths in by_hash.items()
        if len(paths) > 1
    }
    reclaimable = 0
    linked = 0

    for expected_digest, paths in duplicate_groups.items():
        canonical = paths[0]
        canonical_stat = canonical.stat()
        if digest(canonical) != expected_digest:
            continue
        for duplicate in paths[1:]:
            duplicate_stat = duplicate.stat()
            if duplicate_stat.st_ino == canonical_stat.st_ino:
                continue
            reclaimable += duplicate_stat.st_size
            if not args.apply:
                continue

            # Recheck immediately before replacement so a concurrently changed
            # upload can never be linked to stale content.
            if duplicate.stat().st_size != canonical_stat.st_size:
                continue
            if digest(duplicate) != expected_digest:
                continue

            temporary = duplicate.with_name(f".{duplicate.name}.dedupe-{os.getpid()}")
            try:
                os.link(canonical, temporary)
                os.replace(temporary, duplicate)
                linked += 1
            finally:
                temporary.unlink(missing_ok=True)

    mode = "applied" if args.apply else "dry-run"
    print(
        f"mode={mode} duplicate_groups={len(duplicate_groups)} "
        f"reclaimable_bytes={reclaimable} linked_files={linked}"
    )


if __name__ == "__main__":
    main()
