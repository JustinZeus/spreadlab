// Command spreadlab will serve the spreadlab dashboard. Until the HTTP
// server lands (milestone 2), it runs the prototype's three scenarios in
// the default world and prints the comparison.
package main

import (
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/JustinZeus/spreadlab/internal/engine"
)

// main stays a thin shell: the work lives in run, which takes its output
// as an io.Writer so tests can capture it.
func main() {
	if err := run(os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, "spreadlab:", err)
		os.Exit(1)
	}
}

// run executes the three-scenario comparison in the default world and
// writes the table to out. Formatting is pure string building; the single
// write at the end is the only error to handle.
func run(out io.Writer) error {
	config := engine.DefaultConfig()
	lines := []string{
		fmt.Sprintf("spreadlab: %d students, educate %d, forwarding probability %.2f",
			config.NumStudents, config.NumEducated, config.ForwardProb),
		"(illustrative, not validated)",
		"",
	}
	for _, strategy := range engine.AllStrategies() {
		result, err := engine.RunScenario(config, strategy)
		if err != nil {
			return err
		}
		lines = append(lines, formatResult(config, result))
	}
	_, err := fmt.Fprintln(out, strings.Join(lines, "\n"))
	return err
}

// formatResult renders one scenario's outcome as a table row.
func formatResult(config engine.Config, result engine.Result) string {
	return fmt.Sprintf("%-15s educated=%3d reached=%3d/%d (%2.0f%%) in %d rounds",
		result.Strategy, len(result.Educated), result.NumReached,
		config.NumStudents, result.ReachedPct, result.NumRounds)
}
