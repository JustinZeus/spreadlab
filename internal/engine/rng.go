// Package engine implements the agent-based spread model: build a social
// network, run an independent cascade over it, and measure the effect of
// education strategies. It is pure: no I/O, no web dependencies, and all
// randomness flows from seeds in the config, so identical inputs always
// produce identical runs.
package engine

import "math/rand/v2"

// newRand returns a deterministic random stream for the given seed. The
// engine never touches global random state; every source of randomness
// (graph build, edge thresholds, education sampling) gets its own seeded
// stream so each can be varied independently.
func newRand(seed uint64) *rand.Rand {
	return rand.New(rand.NewPCG(seed, 0))
}
