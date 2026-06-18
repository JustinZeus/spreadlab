# spreadlab

[![CI](https://github.com/JustinZeus/spreadlab/actions/workflows/ci.yml/badge.svg)](https://github.com/JustinZeus/spreadlab/actions/workflows/ci.yml)

An agent-based "what if" dashboard for a hard question: when harmful content
(the modelled case: a non-consensual deepfake) starts spreading through a
school year group, where does a limited education budget actually make a
difference?

It is the proof-of-concept tool for a university grant proposal on protecting
minors from AI-generated non-consensual imagery in an open society.

**Live demo:** <https://aios-demo.justinvisser.org>

> **Illustrative, not validated.** spreadlab is a planning and discussion
> aid. The model is a deliberately simple social-contagion simulation; its
> numbers are not predictions about real schools, real platforms, or real
> incidents, and must not be used as such.

## The idea

Schools can rarely reach everyone with a prevention program. spreadlab runs
the *same* outbreak in the *same* simulated social network under different
education strategies, so the only thing that changes is who gets educated.
With the default world (120 students, educate 30% of them):

| Strategy                       | Reached by the fake |
| ------------------------------ | ------------------- |
| No program                     | 83%                 |
| Educate 30% at random          | 69%                 |
| Educate the 30% best-connected | 18%                 |

Same budget, very different outcomes: educating at random barely dents the
spread, while educating the best-connected students contains it to under a
fifth of the school. Who you teach matters more than how many. Making that
lever visible (and later: searching for the best intervention under a budget)
is the point of the tool.

## How the model works

- **Network**: Holme-Kim preferential attachment with triangle closure
  (Holme & Kim, 2002), producing the hubs and clustered friend groups of
  real social networks; a port of networkx's `powerlaw_cluster_graph`.
- **Spread**: an independent cascade (Kempe, Kleinberg & Tardos, 2003). Each
  student's chance of forwarding is a literature-grounded composite: a baseline
  rate, raised by how novel or shocking the fake is, lowered by the year
  group's ambient harm awareness. Per-edge random draws are shared across all
  scenarios, so strategies are compared in the same world. Because
  deepfake-specific data are scarce, the parameters are sensitivity ranges
  rather than fitted values, drawn from the project team's literature review.
- **Education lever**: the program cuts an educated student's forwarding
  probability by its effect size (a strong but imperfect reduction, not a
  perfect wall). Strategies pick who is educated: no program, uniform random,
  or the most-connected students.
- **Determinism**: every source of randomness flows from seeds in the
  config; identical configs produce identical results, pinned by tests.

## Status

Early development; interface and API are not stable yet.

- [x] Simulation engine in Go (tested, deterministic, benchmarked)
- [x] JSON API + TypeScript types generated from the Go structs
- [x] Web frontend reproducing the three-scenario comparison from live data
- [x] Interactive dashboard (controls, network view, spread animation)
- [x] Single-binary deploy (embedded frontend), public Docker image
- [x] Hosted demo ([aios-demo.justinvisser.org](https://aios-demo.justinvisser.org))
- [ ] Intervention optimisation under a budget

## Quick start (development)

Prerequisites: Go 1.26+, Node 20+.

```sh
git clone https://github.com/JustinZeus/spreadlab
cd spreadlab
./dev.sh
```

`dev.sh` starts the Go API (localhost:8080) and the Vite dev server
(localhost:5173, proxying `/api`), and installs frontend dependencies on
first run. One Ctrl-C stops everything. Or run the two halves manually:

```sh
go run ./cmd/spreadlab        # API on localhost:8080
cd web && npm run dev         # frontend on localhost:5173
```

`go run ./cmd/spreadlab -table` prints the three-scenario comparison to the
terminal as a quick engine sanity check.

## Deploy

Every merge to main publishes a public image to
`ghcr.io/justinzeus/spreadlab`, tagged `latest` and the commit SHA (for
rollbacks). The image is self-contained: one Go binary with the built
frontend embedded, serving the dashboard on `/`, the API under `/api`,
and `/healthz`. A healthcheck is baked in (the binary probes its own
`/healthz`; the distroless base has no shell).

To run it:

```sh
docker run -p 8080:8080 ghcr.io/justinzeus/spreadlab:latest
```

Behind a reverse proxy, attach the container to the proxy's docker
network instead of publishing ports and point the proxy at port 8080.

## Project layout

| Path               | What it is                                              |
| ------------------ | ------------------------------------------------------- |
| `internal/engine/` | Pure simulation engine; no web dependencies             |
| `internal/api/`    | Thin JSON API over the engine                           |
| `cmd/spreadlab/`   | Server binary                                           |
| `web/`             | Vue 3 + TypeScript frontend (Vite)                      |
| `web/src/types/`   | TypeScript types generated from the Go structs          |

The Go structs in `internal/engine/scenario.go` are the single source of
truth for parameters and results. `web/src/types/` is generated from them
(via [tygo](https://github.com/gzuidhof/tygo)); never edit those files by
hand. After changing `Config`, `Result`, or the API response types:

```sh
go generate ./...
```

## Checks

```sh
go test ./...                                   # engine + API tests
golangci-lint run ./...                         # Go linter
go test -bench=. -benchmem ./internal/engine/   # benchmark baseline
cd web && npm run test:unit && npm run lint && npm run type-check
```

CI runs the same checks, plus a guard that the generated TypeScript types
are in sync with the Go structs.

## Background

spreadlab started as the proof-of-concept tool of a university grant
proposal on AI in an open society; the model semantics were ported from the
Python prototype used in that project's pitch. The subject is handled from
the prevention side only: the tool models how harmful content spreads and
what education changes, nothing about creating such content.

The model's diffusion and education parameters were sourced by the project
team from open-access literature on misinformation spread, complex contagion,
peer aggression, and comprehensive sexuality education.

This public demo is the accessible, intuition-building layer of the proposed
research. The funded project would build the full instrument behind it:
calibrating the model to real-school data, incorporating the complete
literature parameter set, and searching for the best intervention under a
budget.

References: P. Holme & B. J. Kim, *Growing scale-free networks with tunable
clustering* (Phys. Rev. E 65, 2002). D. Kempe, J. Kleinberg & E. Tardos,
*Maximizing the spread of influence through a social network* (KDD 2003).

## License

[MIT](LICENSE)
