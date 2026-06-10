package engine

import (
	"math/rand/v2"
	"slices"
)

// Education strategies pick which students the program educates. The origin
// is never educated (they post the fake in the first place). Returned
// slices are sorted by node number for readable, stable output; the order
// carries no meaning.

// EducateRandom educates count students drawn uniformly from everyone but
// the origin. This is the "spray and pray" baseline.
func EducateRandom(graph *Graph, origin, count int, rng *rand.Rand) []int {
	if count <= 0 {
		return nil
	}
	candidates := make([]int, 0, graph.NumNodes()-1)
	for student := range graph.NumNodes() {
		if student != origin {
			candidates = append(candidates, student)
		}
	}
	rng.Shuffle(len(candidates), func(i, j int) {
		candidates[i], candidates[j] = candidates[j], candidates[i]
	})
	educated := candidates[:min(count, len(candidates))]
	slices.Sort(educated)
	return educated
}

// EducateMostConnected educates the count students with the highest degree:
// the hubs whose forwarding keeps the network connected. Ties break towards
// the lower node number (stable sort) so the choice is deterministic.
func EducateMostConnected(graph *Graph, origin, count int) []int {
	if count <= 0 {
		return nil
	}
	candidates := make([]int, 0, graph.NumNodes()-1)
	for student := range graph.NumNodes() {
		if student != origin {
			candidates = append(candidates, student)
		}
	}
	slices.SortStableFunc(candidates, func(first, second int) int {
		return graph.Degree(second) - graph.Degree(first) // descending by degree
	})
	educated := candidates[:min(count, len(candidates))]
	slices.Sort(educated)
	return educated
}
