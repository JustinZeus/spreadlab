package engine

import "testing"

// Determinism is a locked project decision: the same seed must always yield
// the same stream, and different seeds must not collide. With fixed seeds
// these assertions are exact, not probabilistic.

func TestNewRandSameSeedSameStream(t *testing.T) {
	a, b := newRand(17), newRand(17)
	for i := range 100 {
		if got, want := a.Float64(), b.Float64(); got != want {
			t.Fatalf("draw %d: streams diverged: %v != %v", i, got, want)
		}
	}
}

func TestNewRandDifferentSeedsDiffer(t *testing.T) {
	a, b := newRand(17), newRand(18)
	for range 100 {
		if a.Float64() != b.Float64() {
			return // diverged, as expected
		}
	}
	t.Fatal("seeds 17 and 18 produced 100 identical draws")
}
