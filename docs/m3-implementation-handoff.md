# Handoff: milestone 3 implementation (from the UI design session)

You wrote `docs/ui-design-brief.md` and asked for a design session. It ran on
2026-06-10, every decision made with Justin via AskUserQuestion, and it is
done: nothing UI-shaped is left open. This doc tells you what exists now,
what changed relative to your milestone 3 assumptions, and where to start.

## What exists now

- `docs/ui-spec.md` is the normative spec. Page layout with wireframe,
  component tree, every interaction with trigger/behavior/states, API
  requirements, visual tokens for both themes, a testable accessibility
  checklist, 12 ordered implementation slices, and one-line rejected
  alternatives. Build from it without re-deciding; if you disagree with
  something, raise it with Justin, do not silently deviate.
- `docs/mockup/index.html` is the approved visual reference (v2; Justin
  rejected v1 outright). It is a design artifact with stand-in layout and
  edges, not app code. To view: bake a live `/api/comparison` response into
  it (replace `__DATA__`, see `data.json` + `rendered.html` already there),
  open in a browser, `?dark` for the dark theme, narrow window for mobile.
  Match its look; do not port its code.

## Deltas against what you probably assumed for milestone 3

- The dashboard is not the fixed three-strategy comparison. Panels are a
  dynamic list (cap 6) of scenarios: one shared base `Config` plus sparse
  per-panel overrides and a strategy. The classic trio is just the default,
  loaded from a study preset module (`web/src/presets/deepfake-school.ts`)
  that owns all study copy, so no research question is hardcoded.
- New endpoint needed, and it is slice 1, your Go territory:
  `POST /api/scenario` takes `{config, strategy}`, returns
  `{config, result, edges}` where `edges` is the deterministic topology as
  node-index pairs. This closes the topology gap flagged in the brief. The
  engine already has the graph; expose it. Same validation and 400-string
  behavior as comparison. tygo regen, determinism test on edges.
  `/api/comparison` stays as-is (parity table and external consumers).
- The frontend fires one `/api/scenario` per panel in parallel, debounced
  400 ms, atomic swap, keep-last-good on errors. No batch endpoint
  (rejected, one-liner in the spec).
- The optimisation feature (your milestone 5) got its API shape reserved:
  `POST /api/optimize` goal-seek, request/response sketched in spec
  section 2. M3 ships no optimizer UI, only a layout that can host it.
- In scope for M3 beyond what the brief listed: export (JSON, per-node CSV,
  PNG snapshot), both light and dark themes with a toggle, and mobile as a
  first-class target (Justin expects first contact by phone). Animated
  GIF/WebM export is explicitly post-M3.
- The accessibility criteria your locked decisions called UNDEFINED are now
  defined: spec section 8 is the checklist, and slice 12 is the audit.
- Pinia and Vue Router: decided not needed. Module-scope composable store,
  modal focus, one page.

## Calls Justin made explicitly (do not relitigate)

- Focus view is a modal overlay (recommendation was expand-in-place).
- Sharing is address-bar-only, no Share button, no toast
  (`history.replaceState` after every successful run).
- Both themes ship, not light-only.
- Dynamic panels, export, and the optimizer hook all came from him
  unprompted; they are wanted, not gold-plating.

## Method notes

- Your working agreements stand: teaching-paced TDD on Go (slice 1 gets a
  micro-brief, failing test first, small annotated diffs, learning-log
  commit message); Vue/TS driven fast and mostly autonomously.
- Justin's design bar is high. His words on the first mockup: "a very weak
  mishmash of elements"; he wants a clean, responsive SPA that "looks
  professional and feels amazing". The approved mockup is the bar: app
  shell, type scale, one card system, real SVG icons, consistent spacing.
  Never show him boxes-on-a-page, not even as an intermediate state demo.
- Dev stack runs in the shared tmux session "spreadlab" (`./dev.sh`, API on
  :8080, Vite on :5173). Use it, do not spawn background tasks.
- One shared percent formatter everywhere; the 82-vs-83 rounding mismatch
  already bit the mockup once (spec section 6).

## First steps

Read `docs/ui-spec.md` end to end, view the mockup in both themes and at
phone width, then propose the slice 1 plan (the `/api/scenario` endpoint)
and start the usual loop. Spec section 10 is the full M3 slice order; each
slice leaves the app shippable.
