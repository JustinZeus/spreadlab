# UI/UX design session brief

You are running a design session for spreadlab's milestone 3 dashboard. The
deliverable is a written spec, `docs/ui-spec.md`, that an implementation
session can execute without re-deciding anything. Do NOT write application
code in this session.

## How to run this session

- Walk through the UX with the user top-down: audience and core message
  first, then page layout, then each interaction, then states and edge
  cases. One topic at a time.
- Use AskUserQuestion aggressively for every meaningful choice, with a
  recommended option first. Use ASCII mockups in option previews when
  comparing layouts.
- The user is a developer (Vue/TS background), not a designer; explain
  design trade-offs the way you would explain code trade-offs.
- No em dashes in anything you write.

## What spreadlab is

A self-hosted dashboard running an agent-based model live: a non-consensual
deepfake spreads through a simulated school year group (120 students), and
an education program changes who forwards it. The headline result: the same
education budget reaches 82% / 58% / 6% of the school depending on who gets
educated (no program / random 30% / best-connected 30%). The product goal
is making that lever visceral. Always framed "illustrative, not validated".

Audience, in order: grant-pitch audience and course graders (first contact,
must land in seconds), curious public on the hosted demo, the author.

## What already exists (look at it)

- Run `./dev.sh` from the repo root and open http://localhost:5173 to see
  the current parity page (a static table of the three scenarios).
- The Python prototype's rendered output defines the inherited visual
  language: ../pitch/figure/out/spread.png and spread.gif (relative to the
  repo root's parent: grant-proposal/pitch/figure/out/). Teal donut ring =
  educated, rose = forwarded the fake, haloed node = origin, slate =
  unreached; colourblind-safe via shape, not colour alone. Modern-dashboard
  look, Tailwind-ish palette (see constants in
  ../pitch/figure/spread_figure.py).
- API: GET /api/config/default, POST /api/comparison (full Config in, all
  three strategies' Results out). Result.reachedAtRound gives per-node
  activation rounds, exactly what an animation needs. Types in
  web/src/types/ are generated from Go structs.
- KNOWN GAP: the API does not yet expose graph topology (edges), which any
  network view needs. The spec should state what the frontend needs from a
  new/extended endpoint; the implementation session will add it.

## Locked decisions the spec must respect (from ../tool-handoff.md)

- Layout is computed in the frontend with a force simulation (d3-force or
  equivalent) seeded from the config: a shared URL must render the same
  picture.
- Config is the whole truth and goes in the URL: shareable, reproducible.
- Vue 3 + TypeScript, lean and conventional; Pinia/Router only when the
  design actually requires them (note it in the spec if so).
- No shape redefinition in the frontend: all data types come generated
  from Go.
- Quality bar includes accessibility, and the concrete criteria are
  UNDEFINED so far. Defining them is part of this design session (keyboard
  operation, reduced-motion behaviour for the animation, contrast,
  screen-reader treatment of results at minimum).

## Questions the spec must answer

1. Page composition: prototype-style three panels side by side, or one
   network view with a strategy switcher, or something better? What is
   above the fold at first contact?
2. Which config levers get visible controls first, which live in an
   "advanced" area (seeds?), and what control types (sliders, steppers)?
3. Animation: autoplay or user-initiated? Play/pause/scrub/speed? What does
   round-by-round progression look like; what happens at reduced motion?
4. Metrics: what numbers/curves accompany the picture, and how do they
   update while animating?
5. Sharing UX: how does config-in-URL surface to the user (copy button,
   live-updating address bar)?
6. States: loading, API unreachable, invalid config (the API returns 400
   with an error string), tiny screens.
7. How is "illustrative, not validated" communicated without undermining
   the demo?
8. Accessibility acceptance criteria (the concrete, testable list).

## Output format for docs/ui-spec.md

Page layout (with a final ASCII wireframe), component tree with
responsibilities, every interaction specced (trigger, behaviour, states),
data requirements from the API (including the topology gap), visual tokens
(palette, shape encodings), accessibility criteria as a checklist, and an
ordered implementation slice list for milestone 3. Decisions only, no
options left open; record rejected alternatives in one line each at the end.
