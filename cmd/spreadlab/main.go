// Command spreadlab will serve the spreadlab dashboard. Until the HTTP
// server lands (milestone 2), it runs the prototype's three scenarios in
// the default world and prints the comparison.
package main

import (
	"fmt"
	"os"

	"github.com/JustinZeus/spreadlab/internal/engine"
)

func main() {
	config := engine.DefaultConfig()
	fmt.Printf("spreadlab: %d students, educate %d, forwarding probability %.2f\n",
		config.NumStudents, config.NumEducated, config.ForwardProb)
	fmt.Println("(illustrative, not validated)")
	fmt.Println()

	strategies := []engine.Strategy{
		engine.StrategyNone,
		engine.StrategyRandom,
		engine.StrategyMostConnected,
	}
	for _, strategy := range strategies {
		result, err := engine.RunScenario(config, strategy)
		if err != nil {
			fmt.Fprintln(os.Stderr, "spreadlab:", err)
			os.Exit(1)
		}
		fmt.Printf("%-15s educated=%3d reached=%3d/%d (%2.0f%%) in %d rounds\n",
			result.Strategy, len(result.Educated), result.NumReached,
			config.NumStudents, result.ReachedPct, result.NumRounds)
	}
}
