// Package api exposes the engine over HTTP as a small JSON API. It stays
// thin on purpose: decode, run the engine, encode. All validation lives in
// the engine; the API only translates errors into status codes.
package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/JustinZeus/spreadlab/internal/engine"
)

// ComparisonResponse bundles what the dashboard needs to render one
// comparison: the config that was run, echoed back so frontend state stays
// honest, and one result per strategy.
type ComparisonResponse struct {
	Config  engine.Config   `json:"config"`
	Results []engine.Result `json:"results"`
}

// errorResponse is the JSON shape of every non-2xx body.
type errorResponse struct {
	Error string `json:"error"`
}

// NewServer returns the API as an http.Handler. Routes use the Go 1.22+
// pattern syntax, method and path in one string; the stdlib answers 405
// for wrong methods on a known path by itself.
func NewServer() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/config/default", handleDefaultConfig)
	mux.HandleFunc("POST /api/comparison", handleComparison)
	return mux
}

func handleDefaultConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, engine.DefaultConfig())
}

func handleComparison(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // a typo in a field name fails loudly
	var config engine.Config
	if err := decoder.Decode(&config); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Errorf("invalid config: %w", err))
		return
	}

	strategies := engine.AllStrategies()
	results := make([]engine.Result, 0, len(strategies))
	for _, strategy := range strategies {
		result, err := engine.RunScenario(config, strategy)
		if err != nil {
			// The engine only errors on bad parameter values, which is
			// the client's mistake, not the server's.
			writeError(w, http.StatusBadRequest, err)
			return
		}
		results = append(results, result)
	}
	writeJSON(w, http.StatusOK, ComparisonResponse{Config: config, Results: results})
}

// writeJSON marshals first and writes after, so an encoding failure can
// still become a clean 500 instead of a half-written body.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		http.Error(w, "encoding response failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body) // a failed write means the client went away
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, errorResponse{Error: err.Error()})
}
