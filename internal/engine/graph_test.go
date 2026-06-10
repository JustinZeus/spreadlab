package engine

import (
	"slices"
	"testing"
)

// Table-driven tests are the standard Go shape: a slice of cases, one
// t.Run per case so failures name the case that broke.

func TestGraphAddEdge(t *testing.T) {
	tests := []struct {
		name      string
		edges     [][2]int // applied in order
		wantAdded []bool   // expected AddEdge result per edge
		wantEdges int      // expected NumEdges afterwards
	}{
		{
			name:      "simple edges",
			edges:     [][2]int{{0, 1}, {1, 2}},
			wantAdded: []bool{true, true},
			wantEdges: 2,
		},
		{
			name:      "duplicate ignored both directions",
			edges:     [][2]int{{0, 1}, {0, 1}, {1, 0}},
			wantAdded: []bool{true, false, false},
			wantEdges: 1,
		},
		{
			name:      "self loop ignored",
			edges:     [][2]int{{2, 2}},
			wantAdded: []bool{false},
			wantEdges: 0,
		},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			graph := NewGraph(4)
			for edgeIndex, edge := range testCase.edges {
				added := graph.AddEdge(edge[0], edge[1])
				if added != testCase.wantAdded[edgeIndex] {
					t.Errorf("AddEdge(%d, %d) = %v, want %v",
						edge[0], edge[1], added, testCase.wantAdded[edgeIndex])
				}
			}
			if got := graph.NumEdges(); got != testCase.wantEdges {
				t.Errorf("NumEdges() = %d, want %d", got, testCase.wantEdges)
			}
		})
	}
}

func TestGraphNeighborsAndDegree(t *testing.T) {
	graph := NewGraph(4)
	graph.AddEdge(0, 1)
	graph.AddEdge(0, 2)
	graph.AddEdge(0, 3)

	if got := graph.Degree(0); got != 3 {
		t.Errorf("Degree(0) = %d, want 3", got)
	}
	if got := graph.Degree(3); got != 1 {
		t.Errorf("Degree(3) = %d, want 1", got)
	}
	// Insertion order is part of the contract (determinism).
	if got, want := graph.Neighbors(0), []int{1, 2, 3}; !slices.Equal(got, want) {
		t.Errorf("Neighbors(0) = %v, want %v", got, want)
	}
	if !graph.HasEdge(2, 0) {
		t.Error("HasEdge(2, 0) = false, want true (undirected)")
	}
	if graph.HasEdge(1, 2) {
		t.Error("HasEdge(1, 2) = true, want false")
	}
}
