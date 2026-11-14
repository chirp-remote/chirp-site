# usechirp.app

How the site is hosted and what protects it: GitHub Pages behind Cloudflare,
the settings no pull request can deliver, the headers, and how to move the
domain. Until 2026-11-14 this lived in Chirp's
[docs/devsecops.md](https://github.com/barahn/chirp/blob/main/docs/devsecops.md),
and the site in Chirp's repository.

## Settings that are not in this repository

1. **Branch protection on `main`**: the `main protected` ruleset. It requires
   pull requests, signed commits and merge commits, and the checks
   `Check, Test & Build`, `gitleaks`, `Analyze (javascript-typescript)`,
   `Analyze (actions)`, `Review dependency changes` and `Design hold`.
2. **Code security**: secret scanning and push protection, private
   vulnerability reporting, Dependabot alerts and security updates.
3. **Actions**: workflow permissions read-only by default.
4. **Deployment branch of the `github-pages` environment → `main`**
   (Settings → Environments → github-pages). `pages.yml` deploys only from
   `main`, but a workflow can change its own `if:`; the environment's rule is
   the check a pull request cannot edit.
5. **usechirp.app verified for the chirp-remote organization** (organization
   Settings → Pages), so no repository outside it can publish to the domain.
   The `_github-pages-challenge-chirp-remote` `TXT` record must stay.
6. **usechirp.app behind Cloudflare**, which adds the security headers GitHub
   Pages cannot set. See [The headers](#the-headers).

## Moving the site between repositories

On 2026-11-14 the site moved from `barahn/chirp` to this repository, down for
about 45 seconds. The order that kept it short, for the next time:

1. Verify the domain for the receiving organization first. GitHub allowed it
   while the old organization still had it verified.
2. Disable the old repository's `pages.yml` and `site-live.yml`, delete its
   Pages site, then at once enable Pages here with the custom domain, enable
   `Website`, and run it. The outage is the time between deleting and the
   deploy finishing.
3. Point `www`'s `CNAME` at the receiving organization's `github.io`.
4. GitHub kept the domain's certificate (`approved`, the same expiry), so
   Full (strict) never saw an invalid one. Had it not, Full would have been
   the fallback until the new certificate was approved.
5. Remove the domain from the old organization and its challenge `TXT`.

## The headers

The site is static and served by GitHub Pages, which sets no custom headers.
Each page carries its Content-Security-Policy in a `<meta>` tag instead, and
that cannot hold `frame-ancestors`, the rule that stops another site from
framing the page. So Cloudflare's proxy sits in front of GitHub Pages and adds
the headers, from
[`.cloudflare/rulesets/response-headers.json`](../.cloudflare/rulesets/response-headers.json):

| Header | Value | Why |
| --- | --- | --- |
| `Content-Security-Policy` | the pages' policy, plus `frame-ancestors 'none'` | no framing, so no clickjacking of the link page |
| `X-Frame-Options` | `DENY` | the same, for browsers that predate `frame-ancestors` |
| `X-Content-Type-Options` | `nosniff` | a file is only ever what its type says |
| `Referrer-Policy` | `no-referrer` | as the `<meta>` tag already says |
| `Cross-Origin-Opener-Policy` | `same-origin` | a page that opens the site keeps no handle on it |
| `Cross-Origin-Resource-Policy` | `same-origin` | other sites cannot embed its files |
| `Permissions-Policy` | camera, microphone, geolocation, display capture, USB and payment off | the site needs none of them |

The status page, `/status/`, is the one exception to a single policy. It reads
the status service's API, so a second rule, `usechirp_status_csp`, replaces the
policy there with the same one plus `connect-src https://status.usechirp.app`.
Every other page, the link page above all, still connects to nothing.
`scripts/check-site.sh` fails if the two policies differ by anything else.

`Strict-Transport-Security` comes from the zone's HSTS setting (SSL/TLS →
Edge Certificates), not from the ruleset: Cloudflare drops it from a transform
rule without an error, so the rule that held it from 2026-10-16 never sent it.
The setting covers every proxied host in the zone, `status.usechirp.app`
included: `max-age=31536000; includeSubDomains; preload`. `.app` is already
on the browsers' HSTS preload list, so browsers force HTTPS anyway; the header
says so explicitly, which is what security scans (Aikido, on 2026-10-16) look
for. `includeSubDomains` is safe because every web host under the domain is
HTTPS-only; the relay, which is not proxied, sends its own from Caddy.
`scripts/check-live-site.sh` checks it with the ruleset's headers.

Both policies are enforced, the header's and the `<meta>` tag's, so a page
served without Cloudflare (a misconfigured DNS, a preview) keeps every rule but
`frame-ancestors`. `scripts/check-site.sh`, run in CI, fails if the two differ
by anything else, and if `site/` uses an HTML sink: the pages require Trusted
Types, which keeps sinks out in the browsers that enforce them, and the check
keeps them out of the source for the rest.

As of 2026-11-14, set up as follows:

| Piece | State |
| --- | --- |
| Registrar | Unstoppable Domains, nameservers delegated to Cloudflare (`anuj` and `nancy.ns.cloudflare.com`) |
| DNS | `A` and `AAAA` for the apex to GitHub Pages' addresses; `www` a `CNAME` to `chirp-remote.github.io`; the `_github-pages-challenge-chirp-remote` `TXT` that verifies the domain for the chirp-remote organization |
| Proxy | on for the apex and `www` |
| SSL/TLS | **Full (strict)**, with Cloudflare's automatic mode **off**: Cloudflare checks GitHub's certificate, so the hop to GitHub is authenticated |
| Edge certificate | Cloudflare's, for `usechirp.app` and `*.usechirp.app` |
| DNSSEC | signed by Cloudflare; DS `2371 13 2 25CFA0663341592F9436373DCB5E87C3B16F0FE043C7169BB7C47D11F9B9AF23` at the registrar, and resolvers validate the chain |
| Header rules | loaded from `response-headers.json` |
| HSTS | on since 2026-10-19: 12 months, subdomains, preload, No-Sniff |
| Page rewrites | off: Email Address Obfuscation, Web Analytics (RUM), Bot Fight Mode; `config-settings.json` keeps the first two, Rocket Loader and Zaraz off |

The encryption mode is a zone setting, not a rule, so no file here holds it.
Cloudflare's **Automatic SSL/TLS** mode chooses one on its own, and by
2026-11-14 it had chosen **Full**, which accepts any certificate from GitHub:
the documented Full (strict) had drifted without a change anyone made. It was
set back to Full (strict) with the automatic mode off. Leave that mode off.

The rules in [`.cloudflare/rulesets/`](../.cloudflare/rulesets/) are loaded
with `scripts/apply-cloudflare.sh`, which asks for an API token allowed to
edit the zone's transform rules and configuration rules, and puts each file
into its phase. The token reaches `curl` on its standard input, not in its
arguments, which other processes on the machine can read. A `PUT` replaces every rule in that phase, which is the point:
the files are the reference, and a rule added in the dashboard that is not in
them is drift. Run it again after any change to them.

### Cloudflare must not rewrite the pages

Several Cloudflare features edit the HTML on its way through, and on a site
whose CSP allows only its own scripts each one is at best blocked and at worst
breaks the page. On 2026-10-12 three did:

- **Email Address Obfuscation** replaced the security contact in every page's
  footer with a link reading `[email protected]`, plus a script to decode it,
  which the CSP blocked: the page showed no way to report a vulnerability.
- **Web Analytics** added a beacon from `static.cloudflareinsights.com`, a
  third-party script on the link page.
- **JavaScript Detections** added an inline script loading
  `/cdn-cgi/challenge-platform/scripts/jsd/main.js`.

The first two are off, in the dashboard and in `config-settings.json`, which
also keeps Rocket Loader and Zaraz off. Bot Fight Mode is off too: it cannot
be set by a rule, and it challenges visitors on its own judgement.

JavaScript Detections cannot be turned off on the Free plan: it stays on with
Bot Fight Mode off and its own toggle off, a limitation others report too. It
is accepted. Its inline script carries parameters that change on every
response, so no hash or nonce could allow it, and allowing it would take
`'unsafe-inline'`, which would undo the policy. Blocked, it never runs; the
cost is an error in the console. The Pro plan makes it optional.

`scripts/check-live-site.sh`, run by `pages.yml` after each deploy and
weekly by `site-live.yml`, fetches the pages and scripts from usechirp.app and fails unless they
match what `scripts/build-site.sh` makes of the repository byte for byte (the
pages with a content hash on each asset reference), with that one snippet as
the only exception, and unless every header in `response-headers.json` comes
back. It
also requires `www.usechirp.app` to answer every path with a 301 to the same
path on `usechirp.app`, carrying the same headers, which is why both rules
match both hosts: a page served on `www` would sit outside the check. A
setting changed in the dashboard shows up there within a week.

### Moving the domain

To move the domain again, the order matters, and some steps can take the site
down if skipped. Two cases:

**Another registrar, Cloudflare still the DNS provider.** The nameservers and
the keys do not change, so DNSSEC can stay on. Carry the nameservers and the
DS `2371 13 2 25CF…AF23` over with the transfer, and afterwards check that the
parent still publishes both (the commands in steps 1 and 5 below).

**Another DNS provider.** The keys change, so the old DS has to be gone before
the new provider answers:

1. **DNSSEC off, measured, before the nameservers change.** Read the DS's TTL
   from the parent itself, not from a resolver's cache, *before* removing it:
   `dig DS usechirp.app @ns-tld1.charlestonroadregistry.com +norec`. Turn
   DNSSEC off at the registrar. Wait until the parent no longer returns the
   DS, and neither do several independent resolvers (`@1.1.1.1`, `@8.8.8.8`,
   `@9.9.9.9`), then wait that TTL again from the parent's removal before
   changing nameservers. Do not assume an hour: it was one on 2026-10-12, and
   the parent sets it.
2. Create every record at the new provider. Before changing the nameservers,
   read the NS TTL from the parent too, in the authority section of
   `dig NS usechirp.app @ns-tld1.charlestonroadregistry.com +norec`: it is how
   long resolvers keep asking the old provider. Change the nameservers, and
   leave the old provider's records in place for at least that TTL after the
   parent shows the new ones. It was three hours on 2026-10-12; the parent
   sets it.
3. **Anything in front of Pages that terminates TLS** (Cloudflare's proxy, or
   another provider's equivalent) goes on only once its certificate for
   `usechirp.app` is active, and checks GitHub's certificate on the way back
   (on Cloudflare, **Full (strict)**). On 2026-10-12 Cloudflare's proxy was on
   before its edge certificate was issued, and for a while HTTPS through it
   failed its handshake. `.app` is HTTPS-only, so there was no plain-HTTP
   fallback: the site and every link page were down for anyone whose resolver
   had picked up the new nameservers. Test it before turning it on:
   `curl -sI --resolve usechirp.app:443:<edge address> https://usechirp.app/`.
4. **The headers belong to that layer.** A provider without one, or without
   response-header rules, serves the pages with their `<meta>` policy only:
   everything but `frame-ancestors` and the other headers above. Port
   `.cloudflare/rulesets/response-headers.json` to the new provider, moving
   the path `scripts/check-site.sh` reads with it, or record here that they
   are gone.
5. **DNSSEC on, keys first.** Turn signing on at the new provider and wait
   until *every* one of its authoritative servers returns the DNSKEY whose
   digest is the DS the provider gives: `dig DNSKEY usechirp.app @<server>`
   for each, and compare the key tag and digest the KSK (flags 257) gives
   with `dnssec-dsfromkey -2`, from BIND's tools. Only then publish the DS at the
   registrar, check that the parent returns it, and that several independent
   resolvers answer `dig A usechirp.app +dnssec` with the `ad` flag.

GitHub renews its certificate through the proxy. If a renewal fails, Pages
says so in its settings; switch the records to *DNS only* until it is renewed,
then back.

