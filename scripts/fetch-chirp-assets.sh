#!/usr/bin/env bash
#
# Puts the fonts and the icon the site shares with Chirp into the directory
# given, each fetched from the commit chirp-assets.lock pins and kept only if
# its SHA-256 matches the lock's. A file that does not match stops the build
# rather than reach usechirp.app.
#
# CHIRP_ASSETS_LOCK replaces the lock, as scripts/check-chirp-vectors.sh
# does; CHIRP_ASSETS_BASE replaces the address files are fetched from, for
# scripts/test-fetch-chirp-assets.sh.
#
# Usage: scripts/fetch-chirp-assets.sh <site-dir>
#
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 Fabrintek Engenharia Digital Ltda
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:?usage: fetch-chirp-assets.sh <site-dir>}"
lock="${CHIRP_ASSETS_LOCK:-$root/chirp-assets.lock}"

repo="$(awk '$1 == "repo" { print $2 }' "$lock")"
rev="$(awk '$1 == "rev" { print $2 }' "$lock")"
if ! [[ "$rev" =~ ^[0-9a-f]{40}$ ]]; then
	echo "error: $lock must pin rev to a full commit, not \"$rev\"" >&2
	exit 1
fi
base="${CHIRP_ASSETS_BASE:-https://raw.githubusercontent.com/$repo/$rev}"

grep -E '^[0-9a-f]{64} ' "$lock" | while read -r want from to; do
	dest="$out/$to"
	mkdir -p "$(dirname "$dest")"
	curl -fsSL --proto '=https,file' --retry 3 -o "$dest.part" "$base/$from"
	have="$(sha256sum "$dest.part" | cut -d' ' -f1)"
	if [ "$have" != "$want" ]; then
		rm -f "$dest.part"
		echo "error: $from at $rev has SHA-256 $have, not $want as $lock says" >&2
		exit 1
	fi
	mv "$dest.part" "$dest"
done
