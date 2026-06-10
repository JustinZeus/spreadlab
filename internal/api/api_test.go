package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/JustinZeus/spreadlab/internal/engine"
)

// httptest exercises handlers fully in memory: no port, no network, just
// a recorded response to assert on.

func serve(t *testing.T, method, path string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	recorder := httptest.NewRecorder()
	NewServer().ServeHTTP(recorder, request)
	return recorder
}

func TestDefaultConfigEndpoint(t *testing.T) {
	recorder := serve(t, http.MethodGet, "/api/config/default", nil)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	var config engine.Config
	if err := json.Unmarshal(recorder.Body.Bytes(), &config); err != nil {
		t.Fatal(err)
	}
	if config != engine.DefaultConfig() {
		t.Errorf("served config %+v, want %+v", config, engine.DefaultConfig())
	}
}

func TestComparisonEndpointMatchesGoldenValues(t *testing.T) {
	body, err := json.Marshal(engine.DefaultConfig())
	if err != nil {
		t.Fatal(err)
	}
	recorder := serve(t, http.MethodPost, "/api/comparison", body)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", recorder.Code, http.StatusOK, recorder.Body)
	}
	var comparison ComparisonResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &comparison); err != nil {
		t.Fatal(err)
	}

	// The same golden values the engine tests pin; the API must not
	// change them in transit.
	wantReached := map[engine.Strategy]int{
		engine.StrategyNone:          99,
		engine.StrategyRandom:        70,
		engine.StrategyMostConnected: 7,
	}
	if len(comparison.Results) != len(wantReached) {
		t.Fatalf("got %d results, want %d", len(comparison.Results), len(wantReached))
	}
	for _, result := range comparison.Results {
		if want := wantReached[result.Strategy]; result.NumReached != want {
			t.Errorf("%s: NumReached = %d, want %d", result.Strategy, result.NumReached, want)
		}
	}
}

func TestComparisonEndpointRejectsBadRequests(t *testing.T) {
	invalidValues, err := json.Marshal(func() engine.Config {
		config := engine.DefaultConfig()
		config.ForwardProb = 2.0
		return config
	}())
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		body []byte
	}{
		{name: "not json", body: []byte("not json")},
		{name: "unknown field", body: []byte(`{"numStudentz": 5}`)},
		{name: "invalid parameter values", body: invalidValues},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			recorder := serve(t, http.MethodPost, "/api/comparison", testCase.body)
			if recorder.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
			}
			if !strings.Contains(recorder.Body.String(), `"error"`) {
				t.Errorf("body %q is not an error response", recorder.Body)
			}
		})
	}

	t.Run("wrong method", func(t *testing.T) {
		recorder := serve(t, http.MethodGet, "/api/comparison", nil)
		if recorder.Code != http.StatusMethodNotAllowed {
			t.Errorf("status = %d, want %d", recorder.Code, http.StatusMethodNotAllowed)
		}
	})
}
