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

	graph := NewGraph(numNodes)

	// One entry per edge endpoint, so sampling uniformly from this list is
	// sampling nodes proportionally to their degree: that is the whole
	// "preferential attachment" trick. Seeded with the first edgesPerNode
	// nodes so the earliest arrivals have someone to connect to.
	attachmentPool := make([]int, edgesPerNode)
	for node := range attachmentPool {
		attachmentPool[node] = node
	}

	for newNode := edgesPerNode; newNode < numNodes; newNode++ {
		// Where this node could attach: edgesPerNode distinct existing
		// nodes, drawn degree-proportionally. Consumed from the end.
		candidates := degreeProportionalSample(attachmentPool, edgesPerNode, rng)

		target := candidates[len(candidates)-1]
		candidates = candidates[:len(candidates)-1]
		graph.AddEdge(newNode, target)
		attachmentPool = append(attachmentPool, target)

		for edgesAdded := 1; edgesAdded < edgesPerNode; {
			// Triangle step: with probability triangleProb, also link to a
			// friend of the node we just attached to.
			if rng.Float64() < triangleProb {
				var mutualCandidates []int
				for _, friendOfTarget := range graph.Neighbors(target) {
					if friendOfTarget != newNode && !graph.HasEdge(newNode, friendOfTarget) {
						mutualCandidates = append(mutualCandidates, friendOfTarget)
					}
				}
				if len(mutualCandidates) > 0 {
					mutualFriend := mutualCandidates[rng.IntN(len(mutualCandidates))]
					graph.AddEdge(newNode, mutualFriend)
					attachmentPool = append(attachmentPool, mutualFriend)
					edgesAdded++
					continue
				}
			}
			// Otherwise (or if no triangle was possible): plain
			// preferential attachment to the next candidate. Mirrors
			// networkx, including the quirk that a candidate already linked
			// via a triangle step counts as an attempt without adding an
			// edge, so a node can end up with slightly fewer than
			// edgesPerNode edges.
			target = candidates[len(candidates)-1]
			candidates = candidates[:len(candidates)-1]
			graph.AddEdge(newNode, target)
			attachmentPool = append(attachmentPool, target)
			edgesAdded++
		}

		// The new node enters the pool once per edge slot, like networkx.
		for range edgesPerNode {
			attachmentPool = append(attachmentPool, newNode)
		}
	}
	return graph, nil
}

// degreeProportionalSample draws sampleSize distinct nodes from the pool.
// The pool holds one entry per edge endpoint, so nodes with more edges are
// proportionally more likely to be drawn. networkx returns a Python set
// here; we keep a slice in draw order so the result is deterministic.
func degreeProportionalSample(pool []int, sampleSize int, rng *rand.Rand) []int {
	sample := make([]int, 0, sampleSize)
	for len(sample) < sampleSize {
		drawn := pool[rng.IntN(len(pool))]
		if !slices.Contains(sample, drawn) {
			sample = append(sample, drawn)
		}
	}
	return sample
}
