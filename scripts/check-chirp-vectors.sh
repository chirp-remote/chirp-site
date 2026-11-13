#!/usr/bin/env bash
#
# Checks that the test cases in test/ are Chirp's, at the commit
# test/chirp-vectors.lock pins: each is fetched from there, held to the lock's
# SHA-256, and compared with the copy the site's tests read.
#
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 Fabrintek Engenharia Digital Ltda
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
lock="$root/test/chirp-vectors.lock"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

CHIRP_ASSETS_LOCK="$lock" "$root/scripts/fetch-chirp-assets.sh" "$work"
grep -E '^[0-9a-f]{64} ' "$lock" | while read -r _ from to; do
	if ! cmp -s "$work/$to" "$root/test/$to"; then
		echo "error: test/$to is not $from as Chirp has it at the commit $lock pins" >&2
		exit 1
	fi
done
echo "test cases: as Chirp has them"
