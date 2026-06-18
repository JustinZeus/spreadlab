package engine

import "testing"

// Golden regression tests, per the handoff: exact reach values are pinned
// for the default (fixed-seed) config so any change to engine behaviour
// shows up as a diff, and the qualitative ordering vs the prototype is
// asserted explicitly. The exact numbers intentionally differ from the
// Python figure (different RNG); the SHAPE of the result must match:
// no program >> random >> most-connected, with most-connected collapsing.

func runAllStrategies(t *testing.T) map[Strategy]Result {
	t.Helper()
	results := make(map[Strategy]Result)
	for _, strategy := range []Strategy{StrategyNone, StrategyRandom, StrategyMostConnected} {
		result, err := RunScenario(DefaultConfig(), strategy)
		if err != nil {
			t.Fatalf("RunScenario(%q): %v", strategy, err)
		}
		results[strategy] = result
	}
	return results
}

func TestRunScenarioGoldenReachValues(t *testing.T) {
	// Pinned for the tuned default world (2026-06-18): a moderately novel
	// fake, some ambient harm awareness, and a strong-but-imperfect program
	// (programEffect 0.8), so educated students mostly refuse rather than
	// never forwarding. The prototype's figure showed 102/77/10 (85/64/8);
	// the story (no program >> random >> most-connected) is the same, the
	// dice and the soft program differ.
	wantReached := map[Strategy]int{
		StrategyNone:          100, // 83%
		StrategyRandom:        83,  // 69%
		StrategyMostConnected: 21,  // 18%
	}
	results := runAllStrategies(t)
	for strategy, result := range results {
		t.Logf("%-15s educated=%2d reached=%3d/120 (%.0f%%) rounds=%d",
			strategy, len(result.Educated), result.NumReached, result.ReachedPct, result.NumRounds)
		if want, pinned := wantReached[strategy]; pinned && result.NumReached != want {
			t.Errorf("%s: NumReached = %d, want %d", strategy, result.NumReached, want)
		}
	}
}

func TestRunScenarioQualitativeOrdering(t *testing.T) {
	results := runAllStrategies(t)
	noProgram := results[StrategyNone].NumReached
	random := results[StrategyRandom].NumReached
	mostConnected := results[StrategyMostConnected].NumReached

	if noProgram <= random || random <= mostConnected {
		t.Errorf("want noProgram > random > mostConnected, got %d, %d, %d",
			noProgram, random, mostConnected)
	}
	if noProgram < 60 { // an unchecked cascade must reach most of the school
		t.Errorf("no program reached only %d/120, expected a majority", noProgram)
	}
	if mostConnected > 30 { // educating the hubs must collapse the spread
		t.Errorf("most-connected still reached %d/120, expected a collapse", mostConnected)
	}
}

func TestRunScenarioRejectsInvalidInput(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*Config)
	}{
		{name: "forward probability above one", mutate: func(c *Config) { c.ForwardProb = 1.5 }},
		{name: "origin out of range", mutate: func(c *Config) { c.Origin = 120 }},
		{name: "negative educated count", mutate: func(c *Config) { c.NumEducated = -1 }},
		{name: "edges per node too large", mutate: func(c *Config) { c.EdgesPerNode = 120 }},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			config := DefaultConfig()
			testCase.mutate(&config)
			if _, err := RunScenario(config, StrategyNone); err == nil {
				t.Error("RunScenario accepted an invalid config")
			}
		})
	}

	t.Run("unknown strategy", func(t *testing.T) {
		if _, err := RunScenario(DefaultConfig(), Strategy("telepathy")); err == nil {
			t.Error("RunScenario accepted an unknown strategy")
		}
	})
}
