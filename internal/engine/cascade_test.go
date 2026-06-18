package engine

import (
	"slices"
	"testing"
)

// The cascade is deterministic once thresholds are fixed, so these tests
// hand-craft a tiny line graph (0-1-2-3) and exact thresholds: no
// randomness, every expectation is exact.

func lineGraph(numNodes int) *Graph {
	graph := NewGraph(numNodes)
	for node := 0; node < numNodes-1; node++ {
		graph.AddEdge(node, node+1)
	}
	return graph
}

// uniformThresholds gives every directed edge the same threshold.
func uniformThresholds(graph *Graph, value float64) EdgeThresholds {
	thresholds := make(EdgeThresholds)
	for node := range graph.NumNodes() {
		for _, neighbor := range graph.Neighbors(node) {
			thresholds[[2]int{node, neighbor}] = value
		}
	}
	return thresholds
}

// uniformChance gives every student the same forwarding chance.
func uniformChance(numNodes int, value float64) []float64 {
	chances := make([]float64, numNodes)
	for node := range chances {
		chances[node] = value
	}
	return chances
}

func TestRunCascadeSpreadsAlongOpenEdges(t *testing.T) {
	graph := lineGraph(4)
	thresholds := uniformThresholds(graph, 0.1) // 0.1 < 0.5: every edge forwards

	result := RunCascade(graph, 0, uniformChance(4, 0.5), thresholds)

	wantRounds := []int{0, 1, 2, 3} // one hop further each round
	if !slices.Equal(result.ReachedAtRound, wantRounds) {
		t.Errorf("ReachedAtRound = %v, want %v", result.ReachedAtRound, wantRounds)
	}
	if result.NumReached != 4 {
		t.Errorf("NumReached = %d, want 4", result.NumReached)
	}
	if result.NumRounds != 4 {
		t.Errorf("NumRounds = %d, want 4", result.NumRounds)
	}
}

func TestRunCascadeThresholdBlocksOneDirection(t *testing.T) {
	graph := lineGraph(4)
	thresholds := uniformThresholds(graph, 0.1)
	// Close the 1 -> 2 direction only. The open 2 -> 1 direction must not
	// matter: student 2 never gets the fake, so never forwards anything.
	thresholds[[2]int{1, 2}] = 0.9

	result := RunCascade(graph, 0, uniformChance(4, 0.5), thresholds)

	wantRounds := []int{0, 1, NeverReached, NeverReached}
	if !slices.Equal(result.ReachedAtRound, wantRounds) {
		t.Errorf("ReachedAtRound = %v, want %v", result.ReachedAtRound, wantRounds)
	}
	if result.NumReached != 2 {
		t.Errorf("NumReached = %d, want 2", result.NumReached)
	}
}

func TestRunCascadeEducatedReceivesButDoesNotForward(t *testing.T) {
	graph := lineGraph(4)
	thresholds := uniformThresholds(graph, 0.1)

	// Student 1 is educated by a full-strength program: forwarding chance 0.
	chance := uniformChance(4, 0.5)
	chance[1] = 0
	result := RunCascade(graph, 0, chance, thresholds)

	// Student 1 still receives the fake in round 1, but the chain stops there.
	wantRounds := []int{0, 1, NeverReached, NeverReached}
	if !slices.Equal(result.ReachedAtRound, wantRounds) {
		t.Errorf("ReachedAtRound = %v, want %v", result.ReachedAtRound, wantRounds)
	}
}

func TestNewEdgeThresholdsDeterministicAndComplete(t *testing.T) {
	graph, err := HolmeKim(30, 3, 0.45, newRand(17))
	if err != nil {
		t.Fatal(err)
	}

	first := NewEdgeThresholds(graph, newRand(2))
	second := NewEdgeThresholds(graph, newRand(2))

	if wantSize := 2 * graph.NumEdges(); len(first) != wantSize {
		t.Errorf("len(thresholds) = %d, want %d (two directions per edge)", len(first), wantSize)
	}
	for directedEdge, firstDraw := range first {
		if firstDraw < 0 || firstDraw >= 1 {
			t.Errorf("threshold %v = %v, want in [0, 1)", directedEdge, firstDraw)
		}
		if secondDraw := second[directedEdge]; firstDraw != secondDraw {
			t.Errorf("threshold %v differs across identical seeds: %v != %v",
				directedEdge, firstDraw, secondDraw)
		}
	}
}
