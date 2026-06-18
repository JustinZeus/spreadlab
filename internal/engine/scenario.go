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

	// Forwarding is an additive composite (see ForwardChance): a baseline
	// propensity, raised by how novel/shocking the fake is, lowered by the
	// year group's ambient harm awareness.
	ForwardProb   float64 `json:"forwardProb"`   // baseline chance a student forwards the fake along an edge
	Novelty       float64 `json:"novelty"`       // how novel/shocking the fake is (0..1); raises forwarding
	HarmAwareness float64 `json:"harmAwareness"` // ambient AI-literacy / harm awareness in the year group (0..1); lowers forwarding

	NumEducated   int     `json:"numEducated"`   // students the education program reaches
	ProgramEffect float64 `json:"programEffect"` // how strongly the program suppresses an educated student's forwarding (0..1; 1 = never forwards)
	Origin        int     `json:"origin"`        // student who first posts the fake

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
		Novelty:       0, // behaviour-neutral until the model is tuned (slice 4)
		HarmAwareness: 0, // "
		NumEducated:   36,
		ProgramEffect: 1.0, // a perfect program: today's hard block, softened in slice 4
		Origin:        0,
		GraphSeed:     17,
		ThresholdSeed: 2,
		EducationSeed: 1,
	}
}

// Forwarding-composite weights: how far each lever can move the baseline
// forwarding probability. These are provisional, illustrative values, not
// fitted to data; they are tuned for legible behaviour in slice 4.
const (
	noveltyWeight       = 0.30 // a maximally novel fake adds up to +0.30
	harmAwarenessWeight = 0.40 // a maximally aware year group subtracts up to -0.40
)

// maxForwardChance caps the composite: even the most novel fake in the most
// permissive world is never forwarded with certainty.
const maxForwardChance = 0.95

// ForwardChance is the probability that a student forwards the fake along one
// friendship in one round: the additive composite at the heart of the model.
// A baseline propensity is raised by the fake's novelty and lowered by the
// year group's ambient harm awareness; a student the program reached then has
// that propensity scaled down by the program's effect. educated reports
// whether the education program reached this student.
func (config Config) ForwardChance(educated bool) float64 {
	propensity := config.ForwardProb +
		noveltyWeight*config.Novelty -
		harmAwarenessWeight*config.HarmAwareness
	propensity = min(max(propensity, 0), maxForwardChance)
	if educated {
		propensity *= 1 - config.ProgramEffect
	}
	return propensity
}

// IntBounds is an inclusive allowed range for an integer Config field.
type IntBounds struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

// FloatBounds is an inclusive allowed range for a float Config field.
type FloatBounds struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}

// Bounds gives the allowed range for every absolute Config field. These
// are realism limits, not mathematical ones: a student does not keep 150
// close friendships, and a guaranteed forward is not a plausible base
// rate. numEducated and origin are relational (0..numStudents and
// 0..numStudents-1) and therefore not listed; seeds are unrestricted.
type Bounds struct {
	NumStudents   IntBounds   `json:"numStudents"`
	EdgesPerNode  IntBounds   `json:"edgesPerNode"`
	TriangleProb  FloatBounds `json:"triangleProb"`
	ForwardProb   FloatBounds `json:"forwardProb"`
	Novelty       FloatBounds `json:"novelty"`
	HarmAwareness FloatBounds `json:"harmAwareness"`
	ProgramEffect FloatBounds `json:"programEffect"`
}

// ConfigBounds returns the bounds the engine enforces. The frontend
// receives this verbatim (with the default config) and drives its
// sliders and clamping from the same numbers.
func ConfigBounds() Bounds {
	return Bounds{
		NumStudents:   IntBounds{Min: 10, Max: 500},
		EdgesPerNode:  IntBounds{Min: 1, Max: 8},
		TriangleProb:  FloatBounds{Min: 0, Max: 1},
		ForwardProb:   FloatBounds{Min: 0, Max: 0.9},
		Novelty:       FloatBounds{Min: 0, Max: 1},
		HarmAwareness: FloatBounds{Min: 0, Max: 1},
		ProgramEffect: FloatBounds{Min: 0, Max: 1},
	}
}

// ValidateConfig rejects configs outside ConfigBounds or with relational
// fields out of range. Error messages contain the offending field's JSON
// name; the frontend matches on it to mark the right control invalid.
func ValidateConfig(config Config) error {
	bounds := ConfigBounds()
	if config.NumStudents < bounds.NumStudents.Min || config.NumStudents > bounds.NumStudents.Max {
		return fmt.Errorf("scenario: need %d <= numStudents <= %d, got %d",
			bounds.NumStudents.Min, bounds.NumStudents.Max, config.NumStudents)
	}
	if config.EdgesPerNode < bounds.EdgesPerNode.Min || config.EdgesPerNode > bounds.EdgesPerNode.Max {
		return fmt.Errorf("scenario: need %d <= edgesPerNode <= %d, got %d",
			bounds.EdgesPerNode.Min, bounds.EdgesPerNode.Max, config.EdgesPerNode)
	}
	if config.TriangleProb < bounds.TriangleProb.Min || config.TriangleProb > bounds.TriangleProb.Max {
		return fmt.Errorf("scenario: need %v <= triangleProb <= %v, got %v",
			bounds.TriangleProb.Min, bounds.TriangleProb.Max, config.TriangleProb)
	}
	if config.ForwardProb < bounds.ForwardProb.Min || config.ForwardProb > bounds.ForwardProb.Max {
		return fmt.Errorf("scenario: need %v <= forwardProb <= %v, got %v",
			bounds.ForwardProb.Min, bounds.ForwardProb.Max, config.ForwardProb)
	}
	if config.Novelty < bounds.Novelty.Min || config.Novelty > bounds.Novelty.Max {
		return fmt.Errorf("scenario: need %v <= novelty <= %v, got %v",
			bounds.Novelty.Min, bounds.Novelty.Max, config.Novelty)
	}
	if config.HarmAwareness < bounds.HarmAwareness.Min || config.HarmAwareness > bounds.HarmAwareness.Max {
		return fmt.Errorf("scenario: need %v <= harmAwareness <= %v, got %v",
			bounds.HarmAwareness.Min, bounds.HarmAwareness.Max, config.HarmAwareness)
	}
	if config.ProgramEffect < bounds.ProgramEffect.Min || config.ProgramEffect > bounds.ProgramEffect.Max {
		return fmt.Errorf("scenario: need %v <= programEffect <= %v, got %v",
			bounds.ProgramEffect.Min, bounds.ProgramEffect.Max, config.ProgramEffect)
	}
	if config.NumEducated < 0 || config.NumEducated > config.NumStudents {
		return fmt.Errorf("scenario: need 0 <= numEducated <= %d students, got %d",
			config.NumStudents, config.NumEducated)
	}
	if config.Origin < 0 || config.Origin >= config.NumStudents {
		return fmt.Errorf("scenario: origin %d outside 0..%d", config.Origin, config.NumStudents-1)
	}
	return nil
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
	if err := ValidateConfig(config); err != nil {
		return Result{}, err
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

	// Fold the education lever into a per-student forwarding chance: an
	// educated student's composite is scaled down by the program effect, so
	// the cascade itself needs no special case for education.
	isEducated := make([]bool, config.NumStudents)
	for _, student := range educated {
		isEducated[student] = true
	}
	forwardChance := make([]float64, config.NumStudents)
	for student := range forwardChance {
		forwardChance[student] = config.ForwardChance(isEducated[student])
	}

	cascade := RunCascade(graph, config.Origin, forwardChance, thresholds)
	return Result{
		Strategy:       strategy,
		Educated:       educated,
		ReachedAtRound: cascade.ReachedAtRound,
		NumReached:     cascade.NumReached,
		NumRounds:      cascade.NumRounds,
		ReachedPct:     100 * float64(cascade.NumReached) / float64(config.NumStudents),
	}, nil
}
