package engine

import (
	"slices"
	"testing"
)

// starGraph builds a small graph with a known degree ranking:
// node 0 has degree 5, node 1 degree 3, nodes 2 and 3 degree 2,
// nodes 4 and 5 degree 1.
func starGraph() *Graph {
	graph := NewGraph(6)
	for leaf := 1; leaf <= 5; leaf++ {
		graph.AddEdge(0, leaf)
	}
	graph.AddEdge(1, 2)
	graph.AddEdge(1, 3)
	return graph
}

func TestEducateMostConnected(t *testing.T) {
	tests := []struct {
		name   string
		origin int
		count  int
		want   []int
	}{
		{name: "picks top degrees, skips origin", origin: 0, count: 2, want: []int{1, 2}},
		{name: "origin can be the biggest hub", origin: 1, count: 2, want: []int{0, 2}},
		{name: "tie breaks to lower node number", origin: 0, count: 3, want: []int{1, 2, 3}},
		{name: "count clamps to available students", origin: 0, count: 99, want: []int{1, 2, 3, 4, 5}},
		{name: "zero count educates nobody", origin: 0, count: 0, want: nil},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			got := EducateMostConnected(starGraph(), testCase.origin, testCase.count)
			if !slices.Equal(got, testCase.want) {
				t.Errorf("EducateMostConnected(origin=%d, count=%d) = %v, want %v",
					testCase.origin, testCase.count, got, testCase.want)
			}
		})
	}
}

func TestEducateRandomProperties(t *testing.T) {
	graph := starGraph()
	const origin, count = 0, 3

	educated := EducateRandom(graph, origin, count, newRand(1))

	if len(educated) != count {
		t.Fatalf("len(educated) = %d, want %d", len(educated), count)
	}
	if slices.Contains(educated, origin) {
		t.Errorf("educated %v contains the origin %d", educated, origin)
	}
	for index := 1; index < len(educated); index++ {
		if educated[index] == educated[index-1] {
			t.Errorf("educated %v contains a duplicate", educated)
		}
	}

	// Same seed, same pick; that is the determinism contract.
	repeat := EducateRandom(graph, origin, count, newRand(1))
	if !slices.Equal(educated, repeat) {
		t.Errorf("same seed picked %v then %v", educated, repeat)
	}
}
