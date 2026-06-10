# Handoff: milestone 4 (single binary + deploy)

You are shipping spreadlab to Justin's server. Milestone 3 is done; this
segment turns the repo into one deployable artifact: a Go binary with the
built frontend embedded, a public container image, and a Portainer stack
behind Caddy. Repo root: grant-proposal/tool/ (paths below relative to it).

## State as of 2026-06-10

- All 12 M3 slices are merged and CI is green: the dashboard, playback,
  chart, controls, panel management, focus modal, tooltips, mobile pass,
  export, and the accessibility audit (results in commit d9b3812).
- `docs/ui-spec.md` was amended in place where the implementation
  deliberately deviates (playback pacing and trickle in 5.4, seed range in
  5.3, viewBox and layout forces in 6, `readingCaption` in 1). The spec is
  normative again; do not "fix" the app back toward old numbers.
- Deploy shape is DECIDED in `grant-proposal/tool-handoff.md` (read it):
  multi-stage Dockerfile (node build, Go build with go:embed, minimal
  final image), a compose snippet for a Portainer stack joining the
  existing Caddy network, and a GitHub Actions job pushing a public image
  to ghcr.io on merge to main. No Docker in the dev loop: native
  `./dev.sh` (tmux session "spreadlab", API :8080 + Vite :5173) stays.
- The UI already carries the "illustrative, not validated" framing
  everywhere, including PNG exports; deploy adds no copy.

## Method

- This is Go/infra territory: Justin is learning Go from the diffs, so
  the M1/M2 working agreements apply again (unlike the fast autonomous
  Vue pace of M3). Micro-brief each new concept before the code:
  go:embed, http.FileServer over an embedded FS, multi-stage builds,
  GHCR auth and the packages:write permission. Small annotated diffs,
  one slice per commit, push after each, CI stays green.
- Verify each slice for real: run the binary and curl both / and /api;
  build the image once locally and run it; after the GHCR job lands,
  pull the public image and run it cold.
- `go generate ./...` + commit if generated types ever change (CI drift
  guard); nothing in this segment should need it.

## The one design decision to settle first

`//go:embed` requires the embedded directory to exist at compile time,
but `web/dist/` is gitignored, so a naive embed breaks `go test ./...`
for anyone (and CI) without a frontend build. Decide with Justin via
AskUserQuestion, batched with the open choices below. Recommended: keep
the embed in its own small package (e.g. `internal/webdist`) with a
committed one-line placeholder `dist/index.html` ("run `npm run build`");
the Dockerfile overwrites it with the real build. Alternatives: build
tags (dev binary without embed) or making CI build the frontend before
every Go job.

## Suggested slices (each leaves main shippable)

1. **Serve the SPA from Go**: embed web/dist, serve it on / alongside
   /api (single page, no client routes; unknown paths can 404). Local
   proof: `npm run build`, `go run ./cmd/spreadlab`, one origin serving
   both. The vite dev proxy keeps working unchanged.
2. **Dockerfile**: multi-stage (node build → Go build → minimal final
   image), plus .dockerignore. Build and run locally once to verify;
   Docker still stays out of the daily dev loop.
3. **GHCR workflow**: build and push ghcr.io/justinzeus/spreadlab on
   push to main (permissions: packages: write), then make the package
   public. Verify with a cold pull.
4. **Portainer stack**: compose snippet joining the external Caddy
   network plus the Caddyfile entry, documented in the README (deploy
   section). Justin applies it in Portainer; verify the public URL,
   both themes, a shared link with panels and focus, and a PNG export
   from the hosted app.

## Small open choices (decide with Justin via AskUserQuestion, batched)

- Embed strategy for web/dist (see above; placeholder file recommended).
- Final image base: scratch vs distroless vs alpine (distroless static
  recommended: CA certs and tzdata without a shell).
- Image tags: latest + commit SHA on main (recommended) vs semver tags.
- Listen port and a /healthz endpoint for compose healthchecks
  (recommended: keep :8080, add the trivial healthz handler).
- The public hostname, and whether the Caddyfile entry is managed by
  hand on the server or checked into the repo as documentation.

## Traps learned in M3 (do not rediscover)

- npm ci on CI rejects a lockfile that was updated incrementally after
  installs (missing optional deps like @emnapi/*); regenerate
  package-lock.json from scratch (`rm -rf node_modules package-lock.json
  && npm install`) whenever dependencies change.
- Prettier must never touch `web/src/types/` (generated; CI drift guard).
  `web/.prettierignore` already enforces this; keep it.
- Headless theme screenshots: `web/public/__light.html` and
  `__dark.html` (gitignored one-liners that set localStorage and
  redirect; recreate if missing). Screenshot light, dark, and 390 px
  wide before calling visual work done.
- Compound shell commands need every pipe segment allowlisted, not just
  the chromium part.
- Playback feel is perceptual: if any slice touches animation, have
  Justin look at it running in his browser early, not after polish.

## First steps

1. Read `grant-proposal/tool-handoff.md` (deploy shape, working
   agreements) and skim README + .github/workflows/ci.yml.
2. Batch the open choices above into one AskUserQuestion round.
3. Slice 1 with its micro-brief on go:embed; continue down the list.
