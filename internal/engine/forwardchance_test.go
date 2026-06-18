package engine

import "testing"

// ForwardChance is the additive composite the whole model rests on. These
// pin the formula's shape (which lever pushes which way, the clamp, and how
// the program scales an educated student) in terms of the weight constants,
// so tuning the weights later does not silently break the relationships.
func TestForwardChance(t *testing.T) {
	base := DefaultConfig() // ForwardProb 0.38, novelty/harm 0, programEffect 1

	t.Run("default not educated is the baseline", func(t *testing.T) {
		if got := base.ForwardChance(false); got != base.ForwardProb {
			t.Errorf("ForwardChance(false) = %v, want baseline %v", got, base.ForwardProb)
		}
	})

	t.Run("default educated never forwards under a full program", func(t *testing.T) {
		if got := base.ForwardChance(true); got != 0 {
			t.Errorf("ForwardChance(true) = %v, want 0 (programEffect 1)", got)
		}
	})

	t.Run("novelty raises forwarding", func(t *testing.T) {
		config := base
		config.Novelty = 1
		want := base.ForwardProb + noveltyWeight
		if got := config.ForwardChance(false); got != want {
			t.Errorf("ForwardChance = %v, want %v", got, want)
		}
	})

	t.Run("harm awareness lowers forwarding", func(t *testing.T) {
		config := base
		config.HarmAwareness = 0.5
		want := base.ForwardProb - harmAwarenessWeight*0.5
		if got := config.ForwardChance(false); got != want {
			t.Errorf("ForwardChance = %v, want %v", got, want)
		}
	})

	t.Run("clamps to zero", func(t *testing.T) {
		config := base
		config.HarmAwareness = 1 // 0.38 - 0.40 < 0
		if got := config.ForwardChance(false); got != 0 {
			t.Errorf("ForwardChance = %v, want clamped 0", got)
		}
	})

	t.Run("clamps to the ceiling", func(t *testing.T) {
		config := base
		config.ForwardProb = 0.9
		config.Novelty = 1 // 0.9 + 0.30 > 0.95
		if got := config.ForwardChance(false); got != maxForwardChance {
			t.Errorf("ForwardChance = %v, want clamped %v", got, maxForwardChance)
		}
	})

	t.Run("a softer program leaves some forwarding", func(t *testing.T) {
		config := base
		config.ProgramEffect = 0.5
		want := base.ForwardProb * 0.5
		if got := config.ForwardChance(true); got != want {
			t.Errorf("ForwardChance(true) = %v, want %v", got, want)
		}
	})
}
