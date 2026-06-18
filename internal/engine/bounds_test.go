package engine

import (
	"strings"
	"testing"
)

// Bounds are realism limits agreed 2026-06-11 (e.g. a student does not
// have 150 close friendships, and a guaranteed forward is not a real
// base rate), enforced engine-side so the public API is covered too.

func TestConfigBoundsContainDefaultConfig(t *testing.T) {
	if err := ValidateConfig(DefaultConfig()); err != nil {
		t.Fatalf("ValidateConfig(DefaultConfig()) = %v, want nil", err)
	}
}

func TestValidateConfigRejectsOutOfBounds(t *testing.T) {
	cases := []struct {
		name        string
		mutate      func(*Config)
		wantMention string // the offending field's JSON name, for the UI's inline message
	}{
		{"too few students", func(c *Config) { c.NumStudents = 9 }, "numStudents"},
		{"too many students", func(c *Config) { c.NumStudents = 501 }, "numStudents"},
		{"no friendships", func(c *Config) { c.EdgesPerNode = 0 }, "edgesPerNode"},
		{"implausibly many friendships", func(c *Config) { c.EdgesPerNode = 9 }, "edgesPerNode"},
		{"negative triangle probability", func(c *Config) { c.TriangleProb = -0.1 }, "triangleProb"},
		{"triangle probability above one", func(c *Config) { c.TriangleProb = 1.1 }, "triangleProb"},
		{"negative forward probability", func(c *Config) { c.ForwardProb = -0.1 }, "forwardProb"},
		{"guaranteed forwarding", func(c *Config) { c.ForwardProb = 0.95 }, "forwardProb"},
		{"negative novelty", func(c *Config) { c.Novelty = -0.1 }, "novelty"},
		{"novelty above one", func(c *Config) { c.Novelty = 1.1 }, "novelty"},
		{"negative harm awareness", func(c *Config) { c.HarmAwareness = -0.1 }, "harmAwareness"},
		{"harm awareness above one", func(c *Config) { c.HarmAwareness = 1.1 }, "harmAwareness"},
		{"negative program effect", func(c *Config) { c.ProgramEffect = -0.1 }, "programEffect"},
		{"program effect above one", func(c *Config) { c.ProgramEffect = 1.1 }, "programEffect"},
		{"negative education budget", func(c *Config) { c.NumEducated = -1 }, "numEducated"},
		{"educating more students than exist", func(c *Config) { c.NumEducated = 121 }, "numEducated"},
		{"negative origin", func(c *Config) { c.Origin = -1 }, "origin"},
		{"origin beyond the last student", func(c *Config) { c.Origin = 120 }, "origin"},
	}
	for _, testCase := range cases {
		t.Run(testCase.name, func(t *testing.T) {
			config := DefaultConfig()
			testCase.mutate(&config)
			err := ValidateConfig(config)
			if err == nil {
				t.Fatalf("ValidateConfig accepted %+v, want error", config)
			}
			if !strings.Contains(err.Error(), testCase.wantMention) {
				t.Errorf("error %q does not name field %q", err, testCase.wantMention)
			}
			if _, err := RunScenario(config, StrategyNone); err == nil {
				t.Error("RunScenario accepted the same config, want error")
			}
		})
	}
}

func TestValidateConfigAcceptsBoundaryValues(t *testing.T) {
	config := DefaultConfig()
	bounds := ConfigBounds()
	config.NumStudents = bounds.NumStudents.Max
	config.EdgesPerNode = bounds.EdgesPerNode.Max
	config.ForwardProb = bounds.ForwardProb.Max
	config.TriangleProb = bounds.TriangleProb.Max
	config.Novelty = bounds.Novelty.Max
	config.HarmAwareness = bounds.HarmAwareness.Max
	config.ProgramEffect = bounds.ProgramEffect.Max
	config.NumEducated = config.NumStudents
	config.Origin = config.NumStudents - 1
	if err := ValidateConfig(config); err != nil {
		t.Fatalf("ValidateConfig at the upper bounds = %v, want nil", err)
	}
}
