# Cloudflare Pages migration

## Intended delivery

Cloudflare Pages project `detailer-calculator`, connected to
`portlandtn/DetailerCalculatorWebapp`, production branch `main`.
Build command: `npm ci && npm test && npm run lint && npm run build:cloudflare`.
Output directory: `out`. Root directory: repository root.
Set build environment `NODE_VERSION=22.19.0` and `NEXT_TELEMETRY_DISABLED=1`.
No runtime secrets, database, functions, Workers code, or bindings are needed.
Enable automatic production builds for main. GitHub-hosted Actions additionally
runs unit tests, lint, the static build, and desktop/mobile browser checks on PRs
and main. Cloudflare's Git integration publishes independently of Ubuntu.

`npm run build:cloudflare` exports the existing React calculator using Next's
static exporter. `npm run build` retains the old Vinext build for local rollback.
The browser tests use Cloudflare Workers static-asset serving locally; production
uses the same static output on Pages. The pinned Wrangler Pages development shim
fails with a missing modules-watch module on this host; final Pages preview
checks are required before custom-domain cutover. The optional manual Pages upload command requires separately
configured Cloudflare credentials.

## State preservation

Keep exactly `https://calc.jedmay.com` without a redirect to pages.dev. Neither
`app/page.tsx`, its `detailer-calculator-state-v1` key, nor the calculation library
changes. The existing browser state remains scoped to the same HTTPS origin.
Browser acceptance tests restore all persisted fields, exercise desktop RPN,
undo/redo/conversion, reload, steel weight, mobile keypad/tools, and static assets.
Nine unit tests cover detailing arithmetic, conversions, all six triangle
operations, dimension formatting, steel units/weight, and divide-by-zero handling.

## Staged cutover (must finish before claiming migration complete)

1. Verify and merge the reviewed migration commit. This stops automatic Ubuntu
   restarts on future pushes but does not stop or alter the running service.
2. Create the Pages project with the exact GitHub repository, branch, build
   command, and output above. Verify a successful deployment for that commit.
3. Verify the returned pages.dev URL with
   `node scripts/check-deployment.mjs https://ACTUAL.pages.dev COMMIT` and run
   `CALC_TEST_URL=https://ACTUAL.pages.dev npm run test:browser`.
4. Record the current `calc.jedmay.com` DNS record's exact ID, type, content,
   proxy flag and TTL, any exact-host Worker route, and its active certificate.
   Logs currently confirm a tunnel ingress to `http://localhost:18882`; this
   alone is not a DNS record backup.
5. Register `calc.jedmay.com` with Pages and follow its documented custom-domain
   activation flow. Do not delete the working record in advance. Change only
   the calculator's DNS record when the project is verified ready. If the UI
   cannot prepare a safe transition with existing HTTPS coverage, stop before
   changing DNS and resolve that concrete limitation.
6. Verify Pages domain status, TLS, `deployment.json` commit, browser checks,
   and Cloudflare's DNS/project mapping at the unchanged public hostname.
   Response headers alone are not proof of the origin.
7. Verify a new GitHub-triggered Pages deployment and matching public commit to
   prove automatic publishing. Record deployment ID, commit, domain status,
   timestamp, and checks in the migration record.

Never stop `calc.service` or cloudflared as an independence test. Do not modify
shared tunnel ingress or other apps' routes. The old tunnel ingress can remain
as a rollback path even after DNS routes directly to Pages.

## Rollback

Keep `/opt/calc/current` and active `calc.service` at the existing known-good
release. If cutover validation fails, restore ONLY the saved calculator DNS
record (same type, target, proxy setting, TTL) and any calculator-specific route
changed during cutover. Remove a calculator Pages custom-domain association only
if required to restore that exact DNS record. Verify HTTPS plus application
interaction against the old origin. Never roll back the entire DNS zone/tunnel.
For a later application regression, use the prior successful Pages deployment
or revert the source commit; neither requires Ubuntu.

## Cost and limits

Cloudflare Pages static asset requests are free and unlimited under its current
published pricing. No paid plan is required for this static app. The Pages Free
plan has build quotas; confirm the account's available quota during setup.
GitHub Actions uses GitHub-hosted Linux runners in this public repository.
No paid services or new subscriptions are authorized by this implementation.

Sources:
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://developers.cloudflare.com/pages/platform/limits/
