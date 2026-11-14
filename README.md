# usechirp.app

[![CodeScene general](https://codescene.io/images/analyzed-by-codescene-badge.svg)](https://codescene.io/projects/87775)

The website of [Chirp](https://github.com/barahn/chirp): remote help between two
people who trust each other, with nothing to install and no account.

The pages are in `site/`. `scripts/build-site.sh` assembles them into `_site/`,
adding the fonts and the icon the app embeds, fetched from the Chirp commit
`chirp-assets.lock` pins and checked against its SHA-256. The link page is tested
against the link cases Chirp keeps, at the commit `test/chirp-vectors.lock` pins.

```bash
./scripts/build-site.sh && python3 -m http.server -d _site 8000
```

```bash
./scripts/check-site.sh && (cd site && bun test) && ./scripts/test-fetch-chirp-assets.sh
```

Pushes to `main` are published to GitHub Pages and then checked against what
usechirp.app serves. [docs/website.md](docs/website.md) covers the hosting,
Cloudflare in front of it, the security headers, and the settings no pull
request can deliver.

## Licence

AGPL-3.0-only, as Chirp is. Copyright © 2026 Fabrintek Engenharia Digital Ltda.
Contributions follow Chirp's
[CONTRIBUTING.md](https://github.com/barahn/chirp/blob/main/CONTRIBUTING.md)
and [LICENSING.md](https://github.com/barahn/chirp/blob/main/LICENSING.md).
