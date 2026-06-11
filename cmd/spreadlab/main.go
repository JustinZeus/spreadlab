// Command spreadlab serves the dashboard and its API from one binary:
// the embedded frontend on /, the API under /api, and a trivial
// /healthz for container healthchecks. The -table flag instead prints
// the three-scenario comparison and exits, a quick engine sanity check.
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/JustinZeus/spreadlab/internal/api"
	"github.com/JustinZeus/spreadlab/internal/engine"
	"github.com/JustinZeus/spreadlab/internal/webdist"
)

func main() {
	addr := flag.String("addr", "localhost:8080", "address to serve the API on")
	table := flag.Bool("table", false, "print the three-scenario comparison and exit")
	flag.Parse()

	if *table {
		if err := run(os.Stdout); err != nil {
			fmt.Fprintln(os.Stderr, "spreadlab:", err)
			os.Exit(1)
		}
		return
	}

	// One mux, one origin: the longer /api/ pattern wins over / for API
	// calls, everything else falls through to the embedded frontend.
	mux := http.NewServeMux()
	mux.Handle("/api/", api.NewServer())
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	mux.Handle("/", webdist.Handler())

	log.Printf("spreadlab listening on http://%s", *addr)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
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
