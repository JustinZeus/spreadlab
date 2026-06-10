package engine

import "testing"

// Benchmarks are a baseline, not a gate: run them manually with
//
//	go test -bench=. -benchmem ./internal/engine/
//
// The numbers become interesting in milestone 5, when the optimisation
// feature starts running thousands of cascades per request; comparing
// against this baseline catches accidental quadratic behaviour.

func BenchmarkHolmeKim(b *testing.B) {
	config := DefaultConfig()
	for b.Loop() {
		_, err := HolmeKim(config.NumStudents, config.EdgesPerNode, config.TriangleProb, newRand(config.GraphSeed))
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRunScenario(b *testing.B) {
	config := DefaultConfig()
	for b.Loop() {
		if _, err := RunScenario(config, StrategyMostConnected); err != nil {
			b.Fatal(err)
		}
	}
}
