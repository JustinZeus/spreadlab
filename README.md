# spreadlab

Self-hosted dashboard that runs an agent-based deepfake-spread model live:
change the levers, watch the spread, and (later) search for the best
intervention under a budget. Output is illustrative, not validated.

Status: milestone 2, thin API + parity page done.

## Layout

- `internal/engine/` - the pure simulation engine (no web dependencies)
- `internal/api/` - thin JSON API over the engine
- `cmd/spreadlab/` - the server binary (`-table` prints a CLI comparison)
- `web/` - Vue 3 + TypeScript frontend (Vite)
- `web/src/types/` - TypeScript types GENERATED from the Go structs; never
  edit by hand, regenerate with `go generate ./...`

## Development

One command (installs frontend deps on first run, Ctrl-C stops everything):

```sh
./dev.sh
```

Or manually, in two terminals:

```sh
go run ./cmd/spreadlab        # API on localhost:8080
cd web && npm run dev         # Vite dev server, proxies /api to :8080
```

Checks:

```sh
go test ./...                              # engine + API tests
golangci-lint run ./...                    # Go linter
go test -bench=. -benchmem ./internal/engine/   # benchmark baseline
cd web && npm run test:unit && npm run lint && npm run type-check
```

After changing `Config`, `Result`, or the API response types, run
`go generate ./...` and commit the regenerated files in `web/src/types/`.

MIT licensed.
