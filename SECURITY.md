# Security

This repository is usechirp.app, the website of
[Chirp](https://github.com/barahn/chirp). Chirp's
[security policy](https://github.com/barahn/chirp/blob/main/SECURITY.md)
covers it: what is in scope, how reports are handled, and how quickly.

Report a vulnerability in the site privately, through this repository's
**Security → Report a vulnerability**, or by email to
security@fabrintek.com.br. Please do not open a public issue.

The site's own defences, which a report is most likely to concern:

- Every page allows scripts, styles, images and fonts from its own origin only,
  and requires Trusted Types with no policy, so no string can reach the page
  as HTML. `scripts/check-site.sh` keeps that true in CI.
- The link page never receives a link: the token is in the fragment, which the
  browser does not send.
- Cloudflare, in front of GitHub Pages, sends the same Content-Security-Policy as
  a header, with the rules in `.cloudflare/rulesets/`.
  `scripts/check-live-site.sh` checks weekly that what is served matches.
