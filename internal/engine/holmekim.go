package engine

import (
	"fmt"
	"math/rand/v2"
	"slices"
)

// HolmeKim generates a random social network of numNodes nodes using the
// Holme-Kim "powerlaw cluster" model, a port of networkx's
// powerlaw_cluster_graph. Each new node attaches to edgesPerNode existing
// nodes by preferential attachment (popular nodes attract more links, which
// produces hubs), and after each attachment a triangle is closed with
// probability triangleProb (a friend of a friend becomes a friend, which
// produces the clustering of real friend groups).
//
// The port preserves the model's semantics, not networkx's random number
// stream: the same seed gives the same graph here, but not the same graph
// as Python.
func HolmeKim(numNodes, edgesPerNode int, triangleProb float64, rng *rand.Rand) (*Graph, error) {
	if edgesPerNode < 1 || edgesPerNode >= numNodes {
		return nil, fmt.Errorf("holme-kim: need 1 <= edgesPerNode < numNodes, got edgesPerNode=%d numNodes=%d",
			edgesPerNode, numNodes)
	}
	if triangleProb < 0 || triangleProb > 1 {
		return nil, fmt.Errorf("holme-kim: need 0 <= triangleProb <= 1, got %v", triangleProb)
	}

	builder := holmeKimBuilder{graph: NewGraph(numNodes), rng: rng}
	// Seed the pool with the first edgesPerNode nodes so the earliest
	// arrivals have someone to connect to.
	for node := range edgesPerNode {
		builder.pool = append(builder.pool, node)
	}
	for newNode := edgesPerNode; newNode < numNodes; newNode++ {
		builder.attachNewNode(newNode, edgesPerNode, triangleProb)
	}
	return builder.graph, nil
}

// holmeKimBuilder carries the generator's working state so each step of the
// algorithm reads as a small named method instead of one deeply nested loop.
type holmeKimBuilder struct {
	graph *Graph
	// pool holds one entry per edge endpoint, so sampling uniformly from it
	// picks nodes proportionally to their degree: that is the whole
	// "preferential attachment" trick.
	pool []int
	rng  *rand.Rand
}

// attachNewNode links newNode to edgesPerNode existing nodes: preferential
// attachment by default, a friend-of-a-friend triangle with probability
// triangleProb.
func (b *holmeKimBuilder) attachNewNode(newNode, edgesPerNode int, triangleProb float64) {
	// Where this node could attach: edgesPerNode distinct existing nodes,
	// drawn degree-proportionally, consumed from the end.
	candidates := b.degreeProportionalSample(edgesPerNode)

	target := popLast(&candidates)
	b.link(newNode, target)

	for edgesAdded := 1; edgesAdded < edgesPerNode; edgesAdded++ {
		if b.rng.Float64() < triangleProb {
			if mutualFriend, found := b.pickMutualFriend(newNode, target); found {
				b.link(newNode, mutualFriend)
				continue
			}
		}
		// Plain preferential attachment. Mirrors networkx, including the
		// quirk that a candidate already linked via a triangle step counts
		// as an attempt without adding an edge, so a node can end up with
		// slightly fewer than edgesPerNode edges.
		target = popLast(&candidates)
		b.link(newNode, target)
	}

	// The new node enters the pool once per edge slot, like networkx.
	for range edgesPerNode {
		b.pool = append(b.pool, newNode)
	}
}

// link adds the edge and records the endpoint in the attachment pool,
// raising target's future attachment odds.
func (b *holmeKimBuilder) link(newNode, target int) {
	b.graph.AddEdge(newNode, target)
	b.pool = append(b.pool, target)
}

// pickMutualFriend draws a random neighbour of target that newNode is not
// already connected to; closing that link forms a triangle. found is false
// when no such neighbour exists.
func (b *holmeKimBuilder) pickMutualFriend(newNode, target int) (mutualFriend int, found bool) {
	var candidates []int
	for _, friendOfTarget := range b.graph.Neighbors(target) {
		if friendOfTarget != newNode && !b.graph.HasEdge(newNode, friendOfTarget) {
			candidates = append(candidates, friendOfTarget)
		}
	}
	if len(candidates) == 0 {
		return 0, false
	}
	return candidates[b.rng.IntN(len(candidates))], true
}

// degreeProportionalSample draws sampleSize distinct nodes from the pool;
// nodes with more edges appear more often there, so they are
// proportionally more likely. networkx returns a Python set here; we keep
// a slice in draw order so the result is deterministic.
func (b *holmeKimBuilder) degreeProportionalSample(sampleSize int) []int {
	sample := make([]int, 0, sampleSize)
	for len(sample) < sampleSize {
		drawn := b.pool[b.rng.IntN(len(b.pool))]
		if !slices.Contains(sample, drawn) {
			sample = append(sample, drawn)
		}
	}
	return sample
}

// popLast removes and returns the last element of the slice.
func popLast(stack *[]int) int {
	last := (*stack)[len(*stack)-1]
	*stack = (*stack)[:len(*stack)-1]
	return last
}
