package engine

import "fmt"

// Strategy selects who gets educated.
type Strategy string

const (
	StrategyNone          Strategy = "none"
	StrategyRandom        Strategy = "random"
	StrategyMostConnected Strategy = "most-connected"
)

// AllStrategies lists every strategy in display order. The CLI, and later
// the API and frontend, read this one list; nothing redefines it.
func AllStrategies() []Strategy {
	return []Strategy{StrategyNone, StrategyRandom, StrategyMostConnected}
}

// Config fully describes one simulation world. It is the single source of
// truth for parameters: API and frontend types will be generated from the
// structs in this file, never redefined by hand. Identical configs produce
// identical results; all randomness flows from the three seeds.
type Config struct {
	NumStudents  int     `json:"numStudents"`
	EdgesPerNode int     `json:"edgesPerNode"` // attachment edges per new student (network density)
	TriangleProb float64 `json:"triangleProb"` // chance to close a friend-of-a-friend triangle
	ForwardProb  float64 `json:"forwardProb"`  // chance a student forwards the fake along an edge
	NumEducated  int     `json:"numEducated"`  // students the education program reaches
	Origin       int     `json:"origin"`       // student who first posts the fake

	GraphSeed     uint64 `json:"graphSeed"`
	ThresholdSeed uint64 `json:"thresholdSeed"`
	EducationSeed uint64 `json:"educationSeed"` // used by the random strategy only
}

// DefaultConfig mirrors the Python prototype: a school year of 120
// students, educate 30% of them, forwarding probability 0.38.
func DefaultConfig() Config {
	return Config{
		NumStudents:   120,
		EdgesPerNode:  3,
		TriangleProb:  0.45,
		ForwardProb:   0.38,
		NumEducated:   36,
		Origin:        0,
		GraphSeed:     17,
		ThresholdSeed: 2,
		EducationSeed: 1,
	}
}

// Result is the outcome of one scenario run.
type Result struct {
	Strategy       Strategy `json:"strategy"`
	Educated       []int    `json:"educated"`
	ReachedAtRound []int    `json:"reachedAtRound"` // per node; -1 means never reached
	NumReached     int      `json:"numReached"`
	NumRounds      int      `json:"numRounds"`
	ReachedPct     float64  `json:"reachedPct"`
}

// GraphEdges builds the world's social network from the config's graph
// fields and returns its undirected edge list. The same config always
// yields the same edges (seeded generator), so the API can expose
// topology separately without every Result carrying it.
func GraphEdges(config Config) ([][2]int, error) {
	graph, err := HolmeKim(config.NumStudents, config.EdgesPerNode, config.TriangleProb, newRand(config.GraphSeed))
	if err != nil {
		return nil, err
	}
	return graph.Edges(), nil
}

// RunScenario builds the world the config describes (network plus edge
// thresholds), picks the educated students per strategy, and runs the
// cascade. Scenarios with the same config share the same world, so
// comparing strategies compares only the lever.
func RunScenario(config Config, strategy Strategy) (Result, error) {
	if config.ForwardProb < 0 || config.ForwardProb > 1 {
		return Result{}, fmt.Errorf("scenario: need 0 <= forwardProb <= 1, got %v", config.ForwardProb)
	}
	if config.Origin < 0 || config.Origin >= config.NumStudents {
		return Result{}, fmt.Errorf("scenario: origin %d outside 0..%d", config.Origin, config.NumStudents-1)
	}
	if config.NumEducated < 0 {
		return Result{}, fmt.Errorf("scenario: need numEducated >= 0, got %d", config.NumEducated)
	}

	graph, err := HolmeKim(config.NumStudents, config.EdgesPerNode, config.TriangleProb, newRand(config.GraphSeed))
	if err != nil {
		return Result{}, err
	}
	thresholds := NewEdgeThresholds(graph, newRand(config.ThresholdSeed))

	var educated []int
	switch strategy {
	case StrategyNone:
		// nobody educated; the baseline
	case StrategyRandom:
		educated = EducateRandom(graph, config.Origin, config.NumEducated, newRand(config.EducationSeed))
	case StrategyMostConnected:
		educated = EducateMostConnected(graph, config.Origin, config.NumEducated)
	default:
		return Result{}, fmt.Errorf("scenario: unknown strategy %q", strategy)
	}

	if educated == nil {
		educated = []int{} // a nil slice marshals to JSON null, not []
	}
	cascade := RunCascade(graph, config.Origin, config.ForwardProb, educated, thresholds)
	return Result{
		Strategy:       strategy,
		Educated:       educated,
		ReachedAtRound: cascade.ReachedAtRound,
		NumReached:     cascade.NumReached,
		NumRounds:      cascade.NumRounds,
		ReachedPct:     100 * float64(cascade.NumReached) / float64(config.NumStudents),
	}, nil
}
