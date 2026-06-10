package engine

import "testing"

// Determinism is a locked project decision: the same seed must always yield
// the same stream, and different seeds must not collide. With fixed seeds
// these assertions are exact, not probabilistic.

func TestNewRandSameSeedSameStream(t *testing.T) {
	firstStream, secondStream := newRand(17), newRand(17)
	for draw := range 100 {
		first, second := firstStream.Float64(), secondStream.Float64()
		if first != second {
			t.Fatalf("draw %d: streams diverged: %v != %v", draw, first, second)
		}
	}
}

func TestNewRandDifferentSeedsDiffer(t *testing.T) {
	seededWith17, seededWith18 := newRand(17), newRand(18)
	for range 100 {
		if seededWith17.Float64() != seededWith18.Float64() {
			return // diverged, as expected
		}
	}
	t.Fatal("seeds 17 and 18 produced 100 identical draws")
}
