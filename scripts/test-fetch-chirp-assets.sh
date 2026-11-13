#!/usr/bin/env bash
#
# Tests scripts/fetch-chirp-assets.sh against a stand-in for Chirp's tree, so
# it runs offline: the fonts and the icon arrive where chirp-assets.lock says,
# a file whose hash differs is refused and left out, and the lock pins a full
# commit rather than a name that can move.
#
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (C) 2026 Fabrintek Engenharia Digital Ltda
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
fetch="$root/scripts/fetch-chirp-assets.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
failures=0

fail() {
	echo "FAIL: $*" >&2
	failures=$((failures + 1))
}

mkdir -p "$work/chirp/fonts" "$work/chirp/bird"
printf 'a font' >"$work/chirp/fonts/A.ttf"
printf 'the bird' >"$work/chirp/bird/icon.svg"
hash() { sha256sum "$1" | cut -d' ' -f1; }

cat >"$work/good.lock" <<EOF
repo example/chirp
rev 0123456789abcdef0123456789abcdef01234567
$(hash "$work/chirp/fonts/A.ttf") fonts/A.ttf assets/fonts/A.ttf
$(hash "$work/chirp/bird/icon.svg") bird/icon.svg favicon.svg
EOF

if CHIRP_ASSETS_LOCK="$work/good.lock" CHIRP_ASSETS_BASE="file://$work/chirp" \
	"$fetch" "$work/out" >/dev/null 2>&1; then
	cmp -s "$work/chirp/fonts/A.ttf" "$work/out/assets/fonts/A.ttf" || fail "the font did not arrive at assets/fonts/A.ttf"
	cmp -s "$work/chirp/bird/icon.svg" "$work/out/favicon.svg" || fail "the icon did not arrive at favicon.svg"
else
	fail "a lock whose hashes match was refused"
fi

sed -E "3s/^[0-9a-f]{64}/$(printf '0%.0s' {1..64})/" "$work/good.lock" >"$work/tampered.lock"
if CHIRP_ASSETS_LOCK="$work/tampered.lock" CHIRP_ASSETS_BASE="file://$work/chirp" \
	"$fetch" "$work/out2" >/dev/null 2>&1; then
	fail "a file whose hash differs from the lock was accepted"
fi
[ ! -e "$work/out2/assets/fonts/A.ttf" ] || fail "a file whose hash differs was left in the site"

sed '2s/.*/rev main/' "$work/good.lock" >"$work/branch.lock"
if CHIRP_ASSETS_LOCK="$work/branch.lock" CHIRP_ASSETS_BASE="file://$work/chirp" \
	"$fetch" "$work/out3" >/dev/null 2>&1; then
	fail "a lock naming a branch rather than a full commit was accepted"
fi

grep -qE '^rev [0-9a-f]{40}$' "$root/chirp-assets.lock" || fail "chirp-assets.lock does not pin a full commit"

if [ "$failures" -gt 0 ]; then
	echo "$failures failure(s)" >&2
	exit 1
fi
echo "fetch-chirp-assets: ok"
