// Package spreadlab anchors repo-wide go:generate directives; it contains
// no code. go:generate runs commands from the directory of the file that
// declares them, so root-level tooling (tygo reads tygo.yaml from the
// working directory) lives here.
//
// The frontend's TypeScript types are generated from the engine's structs,
// the single source of truth for parameters and results:
//
//go:generate go tool tygo generate
package spreadlab
