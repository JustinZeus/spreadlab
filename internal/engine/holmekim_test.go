package engine

import (
	"slices"
	"testing"
)

// The generator is random, so these are property tests: instead of pinning
// exact graphs we assert what must hold for ANY valid output (size, edge
// bounds, connectivity, hubs) across several seeds, plus exact determinism
// for a fixed seed. The prototype's values: 120 students, 3 edges per new
// student, triangle probability 0.45.

const (
	testNumNodes     = 120
	testEdgesPerNode = 3
	testTriangleProb = 0.45
)

func TestHolmeKimRejectsInvalidParameters(t *testing.T) {
	tests := []struct {
		name         string
		numNodes     int
		edgesPerNode int
		triangleProb float64
	}{
		{name: "zero edges per node", numNodes: 10, edgesPerNode: 0, triangleProb: 0.5},
		{name: "edges per node not below node count", numNodes: 3, edgesPerNode: 3, triangleProb: 0.5},
		{name: "negative triangle probability", numNodes: 10, edgesPerNode: 2, triangleProb: -0.1},
		{name: "triangle probability above one", numNodes: 10, edgesPerNode: 2, triangleProb: 1.1},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := HolmeKim(testCase.numNodes, testCase.edgesPerNode, testCase.triangleProb, newRand(1))
			if err == nil {
				t.Errorf("HolmeKim(%d, %d, %v) accepted invalid parameters",
					testCase.numNodes, testCase.edgesPerNode, testCase.triangleProb)
			}
		})
	}
}

func TestHolmeKimDeterministicForSameSeed(t *testing.T) {
	first, err := HolmeKim(testNumNodes, testEdgesPerNode, testTriangleProb, newRand(17))
	if err != nil {
		t.Fatal(err)
	}
	second, err := HolmeKim(testNumNodes, testEdgesPerNode, testTriangleProb, newRand(17))
	if err != nil {
		t.Fatal(err)
	}
	for node := range testNumNodes {
		if !slices.Equal(first.Neighbors(node), second.Neighbors(node)) {
			t.Fatalf("node %d: neighbour lists differ for identical seeds: %v vs %v",
				node, first.Neighbors(node), second.Neighbors(node))
		}
	}
}

func TestHolmeKimProperties(t *testing.T) {
	for _, seed := range []uint64{1, 2, 17} {
		graph, err := HolmeKim(testNumNodes, testEdgesPerNode, testTriangleProb, newRand(seed))
		if err != nil {
			t.Fatal(err)
		}

		if got := graph.NumNodes(); got != testNumNodes {
			t.Errorf("seed %d: NumNodes() = %d, want %d", seed, got, testNumNodes)
		}

		// Every new node attempts exactly edgesPerNode attachments; some
		// may collide with an edge a triangle step already added, so the
		// count is bounded, not exact.
		grownNodes := testNumNodes - testEdgesPerNode
		minEdges, maxEdges := grownNodes, grownNodes*testEdgesPerNode
		if got := graph.NumEdges(); got < minEdges || got > maxEdges {
			t.Errorf("seed %d: NumEdges() = %d, want within [%d, %d]", seed, got, minEdges, maxEdges)
		}

		if !isConnected(graph) {
			t.Errorf("seed %d: graph is not connected", seed)
		}

		// Preferential attachment must produce hubs: some node far better
		// connected than the attachment minimum.
		maxDegree := 0
		for node := range graph.NumNodes() {
			maxDegree = max(maxDegree, graph.Degree(node))
		}
		if maxDegree < 3*testEdgesPerNode {
			t.Errorf("seed %d: max degree %d, want at least %d (no hubs formed)",
				seed, maxDegree, 3*testEdgesPerNode)
		}
	}
}

// isConnected reports whether every node is reachable from node 0,
// via breadth-first search.
func isConnected(graph *Graph) bool {
	visited := make([]bool, graph.NumNodes())
	visited[0] = true
	frontier := []int{0}
	visitedCount := 1
	for len(frontier) > 0 {
		current := frontier[0]
		frontier = frontier[1:]
		for _, neighbor := range graph.Neighbors(current) {
			if !visited[neighbor] {
				visited[neighbor] = true
				visitedCount++
				frontier = append(frontier, neighbor)
			}
		}
	}
	return visitedCount == graph.NumNodes()
}
