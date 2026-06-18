package engine

import "math/rand/v2"

// EdgeThresholds holds one random draw in [0, 1) per directed edge. The
// cascade forwards across u -> v when the draw is below the forwarding
// probability. Drawing all thresholds once and reusing them recreates the
// prototype's "same world, different lever" comparison: scenarios that
// share thresholds differ only in who is educated.
type EdgeThresholds map[[2]int]float64

// NewEdgeThresholds draws a threshold for every directed edge. Both
// directions get independent draws (u forwarding to v is a different event
// than v forwarding to u). Node order makes the draws deterministic.
func NewEdgeThresholds(graph *Graph, rng *rand.Rand) EdgeThresholds {
	thresholds := make(EdgeThresholds, 2*graph.NumEdges())
	for node := range graph.NumNodes() {
		for _, neighbor := range graph.Neighbors(node) {
			if node < neighbor { // visit each undirected edge exactly once
				thresholds[[2]int{node, neighbor}] = rng.Float64()
				thresholds[[2]int{neighbor, node}] = rng.Float64()
			}
		}
	}
	return thresholds
}

// NeverReached marks a node the fake never got to.
const NeverReached = -1

// CascadeResult describes one finished spread.
type CascadeResult struct {
	// ReachedAtRound[node] is the round in which node first received the
	// fake (round 0 is the origin posting it), or NeverReached. This is
	// exactly what an animation needs: the activation time per node.
	ReachedAtRound []int
	NumReached     int
	NumRounds      int
}

// RunCascade spreads the fake from origin: in every round, each newly
// reached student forwards to each neighbour whose edge threshold falls
// below that student's forwarding chance. forwardChance[student] already
// encodes the education lever (an educated student's chance is scaled down,
// to zero under a full-strength program), so the cascade has no education
// special case; an educated student receives the fake like anyone else and
// simply forwards it with a lower chance.
func RunCascade(graph *Graph, origin int, forwardChance []float64, thresholds EdgeThresholds) CascadeResult {
	reachedAtRound := make([]int, graph.NumNodes())
	for node := range reachedAtRound {
		reachedAtRound[node] = NeverReached
	}
	reachedAtRound[origin] = 0

	numReached := 1
	lastRound := 0
	frontier := []int{origin}
	for round := 1; len(frontier) > 0; round++ {
		var nextFrontier []int
		for _, forwarder := range frontier {
			chance := forwardChance[forwarder]
			for _, receiver := range graph.Neighbors(forwarder) {
				alreadyReached := reachedAtRound[receiver] != NeverReached
				forwards := thresholds[[2]int{forwarder, receiver}] < chance
				if !alreadyReached && forwards {
					reachedAtRound[receiver] = round
					numReached++
					lastRound = round
					nextFrontier = append(nextFrontier, receiver)
				}
			}
		}
		frontier = nextFrontier
	}

	return CascadeResult{
		ReachedAtRound: reachedAtRound,
		NumReached:     numReached,
		NumRounds:      lastRound + 1,
	}
}
