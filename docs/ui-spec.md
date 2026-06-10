# spreadlab UI specification (milestone 3)

Status: decided. This spec is the output of the design session run from
`docs/ui-design-brief.md`. An implementation session should be able to build
the dashboard from this document without re-deciding anything. Rejected
alternatives are listed at the end, one line each.

The normative visual reference is the approved mockup in `docs/mockup/`
(`index.html` is the source; build `rendered.html` by replacing `__DATA__`
with a live `/api/comparison` response). The mockup is a design artifact:
its network layout and edges are stand-ins, its components are static. Match
its look (spacing, type scale, card system, both themes), not its code.

---

## 1. Product shape

A single-page Vue 3 + TypeScript dashboard. One page, no routes. The page
shows a dynamic list of simulation scenarios ("panels") that share a base
config; each panel may override any config field. The default experience is
the grant story: three panels (no program, educate 30% at random, educate
the best-connected 30%) over the default config, animated once on load.

Audience order: grant-pitch audience and graders (message must land in
seconds, without interaction), curious public on the hosted demo (often on
a phone), the author.

### Study presets, no hardcoded research question

All study-specific copy and the initial scenario set live in a preset
module, not in components: `web/src/presets/deepfake-school.ts`, typed as
`StudyPreset`:

```ts
interface StudyPreset {
  headline: string            // hero h1
  narrative: string           // hero paragraph, may contain {0} {1} {2}...
                              // placeholders, replaced by each panel's
                              // reached% (same formatter as the panels)
  disclaimerShort: string     // badge text: "Illustrative model, not validated"
  disclaimerLong: string      // About popover body (2-4 sentences)
  toneThresholdPct: number    // reached% <= threshold renders "good" (teal),
                              // above renders "bad" (rose); 30 for this study
  base: Config                // from generated types, the default world
  panels: PanelSpec[]         // initial panels (labels + overrides)
}
```

The app imports exactly one preset. A different research question is a new
preset file plus a changed import, zero component changes. `StudyPreset`
and `PanelSpec` are frontend-only types (they describe presentation, not
simulation data, so they do not violate the no-shape-redefinition rule;
`Config`, `Result`, `Strategy` stay imported from the generated types).

### Panel model

```ts
interface PanelSpec {
  id: string                       // stable client id (nanoid-style)
  label: string                    // user editable
  strategy: Strategy               // from generated types
  overrides: Partial<Config>       // sparse diff against base
}
```

Effective config for a panel = `{ ...base, ...overrides }`. Panels that do
not override `numStudents`, `edgesPerNode`, `triangleProb`, or `graphSeed`
share the base graph and therefore the identical layout; differences then
read as the experiment, not as noise. Maximum 6 panels; the Add button
disables at the cap with a tooltip "Maximum 6 scenarios".

---

## 2. Data requirements from the API

The API currently exposes `GET /api/config/default` and
`POST /api/comparison`. Neither returns graph topology, and comparison is
locked to the three fixed strategies of one config. Milestone 3 needs one
new endpoint; the implementation session adds it Go-side and regenerates
types with tygo.

### New: `POST /api/scenario`

Request body (Go struct, tygo-generated for the frontend):

```jsonc
{ "config": { /* Config */ }, "strategy": "random" }
```

Response:

```jsonc
{
  "config": { /* echoed effective Config */ },
  "result": { /* Result, as today */ },
  "edges":  [[0, 5], [0, 12], ...]   // undirected, node-index pairs,
                                      // deterministic from the config's
                                      // graph fields
}
```

- Validation and 400-with-error-string behavior identical to comparison.
- `edges` is small (roughly `numStudents * edgesPerNode` pairs) and is
  always included; the frontend deduplicates layout work by hashing the
  graph-shaping fields (`numStudents`, `edgesPerNode`, `triangleProb`,
  `graphSeed`), so panels sharing a graph compute one layout.
- The frontend issues one request per panel, in parallel
  (`Promise.all`), debounced 400 ms after the last input change, and swaps
  all results in atomically when every request has settled.
- `GET /api/config/default` keeps seeding the preset's `base` fallback.
- `POST /api/comparison` remains for the parity table and API consumers.

### Reserved: `POST /api/optimize` (post-M3, design hook only)

Goal-seek endpoint: body `{ base: Config, strategy, goal: { maxReachedPct,
optimize: "numEducated" } }`, response: best config plus the candidate
sweep (config + reachedPct per candidate) so the UI can show its work as a
curve. Milestone 3 ships no UI for this; the controls card layout simply
leaves room for one extra button row, nothing more.

---

## 3. Page layout

Desktop wireframe (mobile differences in section 9):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ spreadlab   (ⓘ Illustrative model, not validated)        ☾  ⌥src  │  app bar, sticky
├──────────────────────────────────────────────────────────────────────┤
│  How a non-consensual deepfake spreads through a school              │  hero (from preset)
│  One simulated year group, 120 students. Educate the same 30%,       │
│  but change who: 83% ... 58% ... 6% ...                              │  live numbers
│                                                                      │
│  SCENARIOS                                    [↓ Export] [+ Add]     │  toolbar
│  ┌──────────────────┬──────────────────┬──────────────────┐          │
│  │ ▪ No program   ⋮ │ ▪ Educate rand ⋮ │ ▪ Educate conn ⋮ │          │  panel cards
│  │ 83%              │ 58%              │ 6%               │          │
│  │ 99/120 · 9r · 0e │ 70/120 · 9r · 36e│ 7/120 · 3r · 36e │          │
│  │ [override chips] │ [override chips] │ [override chips] │          │
│  │   (network SVG)  │   (network SVG)  │   (network SVG)  │          │
│  └──────────────────┴──────────────────┴──────────────────┘          │
│  ● Forwarded  ◎ Educated  · Not reached  ◉ Origin                    │  legend
│                                                                      │
│         ( ↻  ⏮  ▶  ⏭  ──●──·──·──·──  Round 9 of 9   1× )           │  player pill, centered
│                                                                      │
│  ┌─ REACH OVER TIME ────────────────┐ ┌─ WORLD ───────────────────┐  │
│  │  (overlaid curves, playhead)     │ │ Chance to forward   ──●   │  │
│  │                                  │ │ Education budget    ──●   │  │
│  │                                  │ │ ▾ Advanced (6 fields)     │  │
│  └──────────────────────────────────┘ └───────────────────────────┘  │
│  ▸ Data table (collapsed)                                            │
│  Illustrative (not validated output) · toy model      spreadlab ·   │  footer
└──────────────────────────────────────────────────────────────────────┘
```

Above the fold at 1366x768: app bar, hero, toolbar, the full panel row,
legend, player. Chart and controls may start below the fold; the story
must not.

---

## 4. Component tree

```
App
├── AppBar
│   ├── Wordmark                 (logo glyph + "spreadlab")
│   ├── DisclaimerBadge          (opens AboutPopover; hidden on mobile)
│   ├── ThemeToggle
│   └── SourceLink               (repo icon link)
├── HeroHeadline                 (preset headline + narrative with live %)
│   └── DisclaimerNote           (mobile only: same popover trigger)
├── MobileScoreStrip             (mobile only, sticky)
├── ScenarioToolbar              ("Scenarios", ExportMenu, AddScenarioButton)
├── ErrorBanner                  (failed refresh / API unreachable)
├── PanelGrid
│   └── ScenarioPanel  (xN)
│       ├── PanelHeader          (accent swatch, label, kebab PanelMenu)
│       ├── PanelStats           (big %, meta row, override chips)
│       └── NetworkView          (SVG: edges, nodes; emits hover/tap)
├── LegendRow
├── PlayerBar                    (replay, step back, play/pause, step fwd,
│                                 RoundScrubber, round counter, speed pill)
├── ReachChart                   (overlaid cumulative curves + playhead)
├── ControlsCard
│   ├── LeverSlider (x2)         (forwardProb, numEducated)
│   └── AdvancedFields           (collapsible: students, edges/node,
│                                 clique tendency, origin, 3 seeds w/ dice)
├── ResultsTable                 (collapsible; accessible data table,
│                                 evolved from existing ComparisonTable)
├── FocusModal                   (enlarged ScenarioPanel + PlayerBar dock)
├── PanelEditorPopover           (per-panel config diff editor)
├── NodeTooltip                  (single instance, positioned per hover)
└── FooterDisclaimer

composables (module-scope singletons, no Pinia):
├── useSimStore    state: base, panels[], resultsByPanelId, edgesByGraphHash,
│                  round, playing, speed, focusPanelId, hoveredNode,
│                  runState (idle|running|error), errorMessage
│                  actions: setBaseField, add/update/remove/duplicatePanel,
│                  run (debounced), syncToUrl/fromUrl
├── useLayout      seeded d3-force layout per graph hash (cached)
└── usePlayback    rAF round timer honoring speed + reduced motion
```

State lives in `useSimStore` (a plain `reactive` module singleton). No
Pinia, no Vue Router: one page, one store, modal focus is store state.

---

## 5. Interactions, one by one

Every interaction lists trigger, behavior, and states.

### 5.1 Initial load
- Trigger: page open.
- Behavior: parse URL state (section 7); if absent, use the preset. Fetch
  `/api/scenario` per panel. While loading, panels render as skeleton
  cards (surface block, shimmer, fixed height) so layout does not jump.
  When all results land: compute layouts, render round 0, then autoplay
  (5.4). Hero percentages fill in with the results.
- States: success (autoplay), API unreachable (centered message in the
  panel area: "Could not reach the spreadlab API at <origin>/api", retry
  button, nothing else dimmed since nothing rendered yet), invalid URL
  state (fall back to preset, show ErrorBanner "Link contained an invalid
  configuration, showing defaults").

### 5.2 Changing a base lever (sliders, advanced fields)
- Trigger: input on any ControlsCard field.
- Behavior: update store immediately (slider thumb moves), debounce 400 ms
  after the last change, then re-run all panels in parallel. While
  running: panels dim to 60% opacity with a small spinner in the toolbar;
  interaction stays enabled. On success: results swap in atomically,
  animation resets to the final round (no autoplay re-trigger), URL
  updates via `history.replaceState`. Hero numbers update.
- States: success; network failure (keep last good results undimmed,
  ErrorBanner "Could not update: <message>" with a Retry button); 400
  invalid config (keep last good results, attach the API error string
  inline under the controls card header in rose, mark the offending field
  if identifiable by name match, no banner).

### 5.3 Seed rerolls
- Trigger: dice button next to a seed field (graph seed "Friendship
  network", threshold seed "Who resists", education seed "Random picks").
- Behavior: set that seed to a fresh random uint32, then as 5.2. Rerolling
  the graph seed invalidates the layout cache for affected panels; the new
  layout fades in (200 ms opacity crossfade, skipped under reduced
  motion). A text button "Reroll world" rerolls all three seeds at once.
- States: as 5.2.

### 5.4 Playback
- Trigger: autoplay once after first successful load; afterwards only via
  player controls.
- Behavior: rounds advance every 700 ms at 1x (speed pill cycles 0.5x,
  1x, 2x). Within a round, nodes reached that round transition from their
  resting state to rose: scale 0.6 to 1.0 plus fade, 250 ms ease-out.
  Educated rings are visible from round 0 (they exist before the spread).
  Panels whose run ended before the global max round hold their final
  state. At the end, playback stops on the final round (no loop), play
  button becomes replay affordance.
- Player controls: replay (jump to round 0 and play), step back, play /
  pause toggle, step forward, scrubber (one tick per round, drag or click
  to seek; seeking pauses), round counter "Round 4 of 9" (global max),
  speed pill.
- Keyboard (when focus is inside the player, plus global except in text
  inputs): Space toggles play/pause, ArrowLeft/ArrowRight step one round,
  Home/End jump to first/final round. The scrubber is a native
  `input[type=range]` so arrow keys work on it natively;
  `aria-valuetext="Round 4 of 9"`.
- Reduced motion (`prefers-reduced-motion: reduce`): no autoplay, page
  loads at the final round; play still works but rounds swap discretely
  (no tween, no scale); the 700 ms cadence becomes 1000 ms at 1x.
- States: round state is global and drives every panel, the chart
  playhead, and the modal simultaneously. Round is not stored in the URL.

### 5.5 Node hover / tap
- Trigger: pointerenter on a node (desktop), tap (touch). SVG circles get
  a transparent 12 px-radius hit halo so 4 px dots are tappable.
- Behavior: NodeTooltip appears near the pointer: "Student 17", state in
  this panel ("Forwarded in round 3" / "Educated, refused" / "Not
  reached"; "Origin, posted it" for the origin), and "5 friends" (degree,
  computed from edges). The same student gets a 2 px ink outline ring in
  every panel simultaneously (the cross-panel echo: the same kid, reached
  in one world, safe in another).
- Dismiss: pointerleave, tap elsewhere, Esc. No click-to-pin in M3.
- States: tooltips are pointer-only; the equivalent information is
  available non-visually through the ResultsTable (per-panel aggregate)
  and is acceptable per the accessibility decision (8).

### 5.6 Add scenario
- Trigger: "+ Add scenario" button in the toolbar.
- Behavior: append a panel cloned from base (`strategy: "none"`, empty
  overrides, label "Scenario N", next free accent color), run it, and
  open its PanelEditorPopover anchored to the new panel. At 6 panels the
  button disables with tooltip "Maximum 6 scenarios".
- States: while its first run is in flight the new panel shows the
  skeleton card.

### 5.7 Panel menu and editor
- Trigger: kebab menu on a panel header: Edit, Rename, Duplicate, Remove.
- Behavior:
  - Edit opens PanelEditorPopover: strategy select (none / random /
    most-connected) plus every Config field as a row showing the base
    value; typing a different value creates an override (row highlights,
    a reset icon appears per overridden field). Overrides render as chips
    on the panel card ("numEducated · 60"). Apply follows the same
    debounced-run path as 5.2 but re-runs only that panel.
  - Rename: inline edit of the label in the popover header.
  - Duplicate: copy panel with " copy" suffix, next accent.
  - Remove: deletes immediately (no confirm; the action is cheap to
    redo and the URL history keeps the old state one paste away). The
    last remaining panel cannot be removed (menu item disabled).
- States: editor validation mirrors the API (400 text shown inline in the
  popover); a panel whose run failed shows its last good result plus a
  small rose dot on the kebab.

### 5.8 Focus modal
- Trigger: click anywhere on a panel's network area (cursor: zoom-in), or
  "Focus" in the panel menu.
- Behavior: modal overlay (scrim `rgba(15,23,42,.5)`), panel rendered
  large (max 90 vw / 85 vh), same SVG and round state, with the PlayerBar
  docked at the modal footer (same store state, both bars stay in sync;
  the background one is inert under the scrim). Close via X button, Esc,
  or scrim click. `focusPanelId` is part of URL state, so a shared link
  can open pre-focused.
- States: focus trap inside the modal; on close, focus returns to the
  panel that opened it. `aria-modal="true"`, labelled by the panel label.

### 5.9 Export
- Trigger: "Export" menu in the toolbar: "Data (JSON)", "Per-node CSV",
  "Picture (PNG)".
- Behavior:
  - JSON: downloads `spreadlab-export.json`: `{ base, panels, results }`
    exactly as held in the store (configs echoed from the API).
  - CSV: `spreadlab-nodes.csv`, columns `panel,label,node,educated,
    reachedAtRound` (one row per panel x node; -1 kept as -1).
  - PNG: renders the current view at the current round to a canvas
    (serialize each panel SVG, draw side by side with panel labels and
    percentages, current theme colors, legend row, disclaimer footer
    line) and downloads `spreadlab.png` at 2x resolution.
- States: menu items disable while a run is in flight (export captures
  settled state only). Animated WebM/GIF export is post-M3 (rejected
  list).

### 5.10 Sharing
- Trigger: none. The address bar is the share UI.
- Behavior: after every successful run and on panel/focus changes, the
  full state serializes into the URL query via `history.replaceState`
  (never `pushState`, no history spam). Copying the URL at any time
  reproduces the exact view: same seeds, same layout (seeded force), same
  panels, same focus. No Share button, no toast.

### 5.11 Theme
- Trigger: ThemeToggle in the app bar.
- Behavior: default follows `prefers-color-scheme`; toggle overrides and
  persists to `localStorage` (`spreadlab-theme`). Theme is not URL state.
  Both themes use the token table in section 6; node semantics are
  identical in both.

### 5.12 About / disclaimer
- Trigger: DisclaimerBadge (app bar, desktop) or DisclaimerNote line under
  the hero (mobile).
- Behavior: small popover, `disclaimerLong` from the preset: what the
  model is (a seeded agent-based toy simulation with parameters chosen
  for illustration), what it is not (a validated prediction of real
  schools), and a link to the proposal/repo. The italic footer line
  ("Illustrative (not validated output)") is always present and is
  included in PNG exports. The headline itself carries no caveat.

---

## 6. Visual tokens

Inherited from the prototype figure (`grant-proposal/pitch/figure/
spread_figure.py`) and extended for dark mode. Implement as CSS custom
properties on `:root` / `.dark`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F8FAFC` | `#0B1120` | page background |
| `--surface` | `#FFFFFF` | `#111A2E` | cards, app bar |
| `--border` | `#E2E8F0` | `#1E293B` | card borders |
| `--border-soft` | `#EEF2F7` | `#1A2438` | inner dividers, chart grid |
| `--edge` | `#E6E9EF` | `#243349` | network edges |
| `--unreached` | `#D8DFE9` | `#3B4A61` | unreached node fill |
| `--spread` | `#F43F5E` | `#FB7185` | forwarded nodes, bad % |
| `--edu` | `#14B8A6` | `#2DD4BF` | educated rings, good %, slider accents |
| `--ink` | `#0F172A` | `#F1F5F9` | headings, primary buttons |
| `--ink-2` | `#334155` | `#CBD5E1` | body, labels |
| `--ink-3` | `#64748B` | `#94A3B8` | secondary text (min for informative text) |
| `--ink-4` | `#94A3B8` | `#64748B` | decorative/duplicated text only (fails AA for body sizes; never sole carrier of information) |

Panel accent palette (categorical, deliberately distinct from the rose and
teal node semantics; used for the header swatch, chart line, and mobile
chip): `#6366F1`, `#F59E0B`, `#0EA5E9`, `#8B5CF6`, `#EC4899`, `#84CC16`,
assigned by panel position, recycled on remove.

Node encodings (shape carries meaning, color reinforces it; colorblind-safe
by shape alone):
- Forwarded: filled disc, `--spread`, r 4.
- Educated, not reached: donut, `--surface` fill, 2.2 px `--edu` stroke.
- Educated but reached (origin educated edge case): rose fill inside the
  teal donut.
- Not reached: small disc, `--unreached`, r 3.
- Origin: rose disc with a 1.4 px rose halo ring at r 7.5.

Type: `Inter, system-ui, sans-serif` (self-host Inter via fontsource;
system-ui fallback). Hero h1 30/700/-0.022em (22 on mobile). Panel
percentage 40/700 tabular. Section headings 13/600 uppercase tracked.
Body 15, secondary 13. All numerals `font-variant-numeric: tabular-nums`.

Surfaces: radius 16 (cards) / 10 (buttons, fields) / 999 (pills, player).
Shadows: resting `0 1px 2px rgba(15,23,42,.05), 0 4px 16px -8px
rgba(15,23,42,.08)`; lifted (hover, modal, mobile player) deeper per
mockup. Spacing on an 8 px-ish scale as in the mockup; page max-width
1240 px, padding 28 px.

Number formatting: one shared `formatPct` (round to whole percent) used by
hero, panels, strip, chart labels, and table. No other rounding anywhere.

Network rendering: inline SVG (not canvas). Layout via d3-force
(`forceLink`, `forceManyBody`, `forceCenter`, collision), run
synchronously for a fixed 300 ticks with `simulation.randomSource(
mulberry32(graphSeed))` and seeded initial positions, so identical configs
give identical pictures on every machine (the shared-URL guarantee).
Layout results cached per graph hash.

---

## 7. URL state scheme

Query parameters, human-readable, no encoded blob:

- Base config: each field by its JSON name, only when it differs from the
  preset base: `?forwardProb=0.5&graphSeed=99`.
- Panels: one `panel=` param per panel (repeated params), value is
  `label~strategy~overrides` with overrides as comma-separated
  `field:value` pairs, URL-encoded:
  `panel=No%20program~none~`
  `panel=Big%20budget~random~numEducated:60`.
  When the panel set equals the preset's, all `panel=` params are omitted.
- Focus: `focus=<panel index>` when the modal is open.
- Unknown params are ignored; malformed state falls back to the preset
  with the ErrorBanner notice (5.1).

---

## 8. Accessibility acceptance criteria

Testable checklist; "both themes" means verified in light and dark.

- [ ] Every interactive control (toolbar buttons, kebab menus, popover
      fields, sliders, player controls, scrubber, collapsibles, modal,
      theme toggle) is reachable and operable with keyboard only, in a
      logical DOM order, with no trap outside the modal.
- [ ] Visible focus indicator on every focusable element: 2 px outline in
      `--ink` with 2 px offset, both themes.
- [ ] Player keyboard map works as specced (Space, ArrowLeft/Right,
      Home/End); scrubber is a native range input announcing
      "Round x of y" via `aria-valuetext`.
- [ ] `prefers-reduced-motion: reduce` disables autoplay, tweening, hover
      lift, and crossfades; stepping and scrubbing remain fully usable.
- [ ] All informative text meets WCAG 2.1 AA contrast (4.5:1, or 3:1 at
      18 px+/bold) against its background, both themes; `--ink-4` is never
      the sole carrier of information.
- [ ] Node state is never encoded by color alone (shape encodings of
      section 6 verified with a deuteranopia simulator on both themes).
- [ ] Network SVGs are `aria-hidden="true"`; each panel is a `region`
      whose accessible name is its label and whose text content (big
      percentage + meta row) carries the result.
- [ ] ResultsTable renders the live per-panel numbers as a real `<table>`
      with `<th scope>` headers (evolved from the existing
      ComparisonTable), collapsed behind a disclosure reachable by
      keyboard.
- [ ] One `aria-live="polite"` region announces results after each
      successful run ("Updated: No program 83 percent, ..."), on pause,
      on scrub release, and at playback end ("Final: ..."); it does not
      announce every round during playback.
- [ ] FocusModal: `role="dialog"` `aria-modal="true"`, labelled by the
      panel name, focus moves in on open, is trapped, Esc closes, focus
      returns to the opener.
- [ ] Popovers (About, panel editor, export menu) follow the same
      open/trap/restore rules as menus or dialogs per their role.
- [ ] ErrorBanner and inline 400 errors use `role="alert"`.
- [ ] Touch targets are at least 44x44 px on mobile (player buttons,
      kebabs, chips, strip items); node hit halos at least 24 px.
- [ ] `<html lang="en">`, landmarks: `header` (app bar), `main`, `footer`.
- [ ] Zoom to 200% at 1366 px wide loses no content or functionality
      (panels reflow to the mobile stack).

---

## 9. Responsive behavior

Breakpoint: 760 px (one breakpoint only).

Mobile (< 760 px):
- App bar keeps wordmark + theme + source; DisclaimerBadge hides, replaced
  by the DisclaimerNote line under the hero.
- MobileScoreStrip appears: sticky under the app bar, horizontally
  scrollable pill chips, one per panel (short label + colored %); tapping
  a chip smooth-scrolls to its panel (instant under reduced motion).
- PanelGrid stacks single-column; toolbar stays one row (Export collapses
  to an icon button if needed).
- PlayerBar fixes to the bottom edge (12 px inset, lifted shadow); step
  buttons and the speed pill hide, leaving replay, play/pause, scrubber,
  round counter. Page bottom padding clears it.
- Lower grid stacks: chart, then controls. Control rows go single-column
  (label above slider, value right-aligned).
- FocusModal becomes a full-screen sheet.
- No horizontal scrolling at 320 px width; the strip is the only
  horizontally scrollable element.

Desktop >= 760 px matches the wireframe; the panel grid is
`repeat(3, 1fr)` for up to 3 panels, wraps to two rows of up to 3 beyond.

---

## 10. Implementation slices (ordered)

Each slice leaves the app shippable.

1. **API topology**: add `POST /api/scenario` (config + strategy in,
   result + edges out) in Go, tygo regen, tests for edge determinism.
2. **Store + URL**: `useSimStore` with preset loading, URL parse/serialize,
   debounced parallel runs, atomic swap, keep-last-good error states.
3. **Static dashboard**: app bar, hero with live numbers, theme system and
   tokens, panel cards with seeded d3-force NetworkView at final state,
   legend, footer. (The page now beats the parity page; ComparisonTable
   becomes the collapsed ResultsTable.)
4. **Playback**: usePlayback, PlayerBar, round-state rendering, autoplay
   once, reduced-motion path, keyboard map.
5. **Reach chart**: overlaid cumulative curves, accents, playhead synced
   to round.
6. **Controls**: lever sliders, advanced fields, seed rerolls, inline 400
   handling, ErrorBanner.
7. **Panel management**: add/duplicate/rename/remove, PanelEditorPopover
   with override chips, 6-panel cap.
8. **Focus modal** with docked player and URL focus state.
9. **Node tooltip** with cross-panel echo and touch hit halos.
10. **Mobile pass**: score strip, fixed player, stacking, touch targets.
11. **Export**: JSON, CSV, PNG snapshot.
12. **Accessibility audit**: walk the section 8 checklist, fix, record
    results in the PR description.

Post-M3 (specced hooks, not built): `POST /api/optimize` goal-seek UI,
animated WebM/GIF export, additional study presets.

---

## 11. Rejected alternatives

- Single large network with strategy tabs: hides the comparison behind
  clicks; the side-by-side comparison is the message.
- Fixed three-strategy panels only: cannot express budget or world
  variations the dynamic-panel model needs.
- Fully independent config per panel: breaks layout comparability and
  bloats URL and editor; overrides express the same power against a shared
  base.
- Hardcoded study copy: blocks reuse for other research questions; preset
  file chosen instead.
- Expand-in-place or routed focus view: modal chosen by user; routing
  would pull in Vue Router for one interaction.
- Share button with clipboard toast: user chose address-bar-only sharing.
- Explicit Run button (and hybrid auto/manual): kills the
  cause-and-effect immediacy that makes the lever visceral.
- Looping autoplay: hostile motion while reading; play-once chosen.
- Per-panel players: panels drift out of sync and the comparison dies.
- Per-panel sparklines and numbers-only metrics: hard to compare; one
  overlaid chart chosen.
- Budget sweep / optimizer in M3: doubles scope; reserved as API hook.
- Animated GIF/WebM export in M3: as much work as the whole animation
  feature; PNG + live share URL cover the need.
- Dark-only or light-only theme: both ship, prototype renders exist for
  both and the toggle is cheap.
- Canvas/WebGL network rendering: SVG is ample at 120 nodes x 6 panels
  and is easier to theme, hit-test, and export.
- Batch `/api/scenarios` endpoint: per-panel `POST /api/scenario` with
  `Promise.all` is simpler and lets panels rerun independently.
- Base64 state blob in URL: readable repeated params chosen for a FOSS
  demo; blob survives only as a fallback idea if URLs ever exceed limits.
- Fully focusable network nodes for screen readers: 120 tab stops x N
  panels is worse than the table; aria-hidden SVG + live region + table
  chosen.
- Pinia and Vue Router: not required by this design; module-scope
  composable store and modal focus suffice.
