# Handoff: milestone 3 frontend (slices 2-12)

You are implementing the spreadlab dashboard frontend. The design is fully
decided and the backend is ready; this segment is Vue/TypeScript only.
Repo root: grant-proposal/tool/ (paths below are relative to it).

## State as of 2026-06-10

- `docs/ui-spec.md` is the NORMATIVE spec: read it end to end before any
  code. Page layout, component tree, every interaction with
  trigger/behavior/states, visual tokens for both themes, URL scheme,
  accessibility checklist, responsive rules, and the slice order
  (section 10). Slice 1 is done; you start at slice 2.
- `docs/mockup/rendered.html` is the approved visual reference. View it in
  a browser (or headless, see Method) in light, dark (`?dark`), and at
  phone width. Match its look; do not port its code.
- `POST /api/scenario` is live (slice 1): `{config, strategy}` in,
  `{config, result, edges}` out, edges as deterministic `[from, to]`
  node-index pairs. 400 with `{"error": "..."}` on invalid input.
  Generated types in `web/src/types/` already include
  `ScenarioRequest`/`ScenarioResponse` (edges arrive as `number[][]`).
- The current `web/src/App.vue` is the milestone 2 parity page. Slice 3
  replaces it; `ComparisonTable.vue` evolves into the collapsed
  ResultsTable (spec 4 and 8). Keep its test current, do not orphan it.
- The Go side needs no changes in this segment. If one becomes necessary,
  raise it first; remember `go generate ./...` + commit the regenerated
  types (CI has a drift guard).

## Method

- Vue/TS is Justin's home turf: drive fast and mostly autonomously. No
  micro-briefs needed; keep commits per slice with clear messages, push
  after each slice (CI must stay green: type-check, lint, vitest, build,
  plus the Go jobs).
- THE DESIGN BAR IS THE HARD PART. Justin rejected the first mockup as "a
  very weak mishmash of elements"; the approved one is the bar: one card
  system, real type scale, consistent spacing, both themes, mobile
  first-class. Never show boxes-on-a-page, not even as an intermediate
  state. Slice 3 is the make-or-break visual slice.
- Self-check visually before claiming a visual slice done: screenshot the
  running app headlessly and compare against the mockup, e.g.
  `chromium --headless --disable-gpu --screenshot=/tmp/app.png
  --window-size=1366,900 http://localhost:5173` (also dark theme and
  `--window-size=390,1400`). Read the PNGs; if it does not look like the
  mockup, it is not done.
- Dev stack runs in the shared tmux session "spreadlab" (window 1 runs
  ./dev.sh: API :8080, Vite :5173). Restart it there with C-c +
  `./dev.sh` via tmux send-keys; never spawn invisible background tasks.
- Work through the accessibility checklist (spec section 8) as you build
  each piece; slice 12 is the audit, not the first time you think about it.
- One shared `formatPct` (Math.round to whole percent) used everywhere;
  the mockup says 83% where Go's printf said 82% for 99/120, and that
  class of mismatch must not reach the UI.
- Descriptive variable names; no em dashes anywhere.

## Small open choices (decide with Justin via AskUserQuestion, batched)

- d3-force dependency: `d3-force` + `d3-quadtree` only (recommended) vs
  full d3. The seeded random source (mulberry32, spec section 6) is
  hand-written either way.
- Inter font: `@fontsource-variable/inter` (recommended) vs static weights.
- Panel ids: `crypto.randomUUID()` (recommended, zero deps) vs nanoid.
- Reach chart: hand-rolled SVG paths (recommended at this scale) vs a
  chart library.

Everything else is decided in the spec; do not re-open decided items
(rejected alternatives are listed in spec section 11).

## First steps

1. Read `docs/ui-spec.md` fully, view the mockup in both themes and at
   phone width.
2. Batch the four open choices above into one AskUserQuestion round.
3. Slice 2 (store + URL + debounced parallel runs) with Vitest coverage:
   it is pure logic, test it well; it carries every later slice.
4. Slice 3, compared pixel-wise against the mockup before you call it done.
5. Continue down spec section 10; each slice leaves the app shippable.
