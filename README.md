# spreadlab

Self-hosted dashboard that runs an agent-based deepfake-spread model live:
change the levers, watch the spread, and (later) search for the best
intervention under a budget. Output is illustrative, not validated.

Status: milestone 1, porting the simulation engine.

Layout:

- `internal/engine/` - the pure simulation engine (no web dependencies)
- `cmd/spreadlab/` - the server binary (milestone 2)
- `web/` - Vue 3 + TypeScript frontend (milestone 2+)

MIT licensed.
