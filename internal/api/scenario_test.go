package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/JustinZeus/spreadlab/internal/engine"
)

func postScenario(t *testing.T, request ScenarioRequest) *json.Decoder {
	t.Helper()
	body, err := json.Marshal(request)
	if err != nil {
		t.Fatal(err)
	}
	recorder := serve(t, http.MethodPost, "/api/scenario", body)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", recorder.Code, http.StatusOK, recorder.Body)
	}
	return json.NewDecoder(recorder.Body)
}

func TestScenarioEndpointReturnsResultAndTopology(t *testing.T) {
	request := ScenarioRequest{Config: engine.DefaultConfig(), Strategy: engine.StrategyMostConnected}

	var response ScenarioResponse
	if err := postScenario(t, request).Decode(&response); err != nil {
		t.Fatal(err)
	}

	if response.Result.NumReached != 7 { // the pinned golden value
		t.Errorf("NumReached = %d, want 7", response.Result.NumReached)
	}
	if response.Config != request.Config {
		t.Errorf("config not echoed: got %+v", response.Config)
	}
	if len(response.Edges) == 0 {
		t.Fatal("no edges returned")
	}
	for _, edge := range response.Edges {
		if edge[0] >= edge[1] || edge[1] >= request.Config.NumStudents {
			t.Fatalf("invalid edge %v", edge)
		}
	}

	// Determinism across requests is the shared-URL guarantee.
	var repeat ScenarioResponse
	if err := postScenario(t, request).Decode(&repeat); err != nil {
		t.Fatal(err)
	}
	if len(repeat.Edges) != len(response.Edges) || repeat.Edges[0] != response.Edges[0] {
		t.Error("edges differ across identical requests")
	}
}

func TestScenarioEndpointRejectsBadRequests(t *testing.T) {
	valid := engine.DefaultConfig()
	invalid := valid
	invalid.ForwardProb = 2.0

	encode := func(request ScenarioRequest) []byte {
		body, err := json.Marshal(request)
		if err != nil {
			t.Fatal(err)
		}
		return body
	}

	tests := []struct {
		name string
		body []byte
	}{
		{name: "not json", body: []byte("not json")},
		{name: "unknown field", body: []byte(`{"config":{},"strategy":"none","extra":1}`)},
		{name: "unknown strategy", body: encode(ScenarioRequest{Config: valid, Strategy: "telepathy"})},
		{name: "invalid config values", body: encode(ScenarioRequest{Config: invalid, Strategy: engine.StrategyNone})},
	}
	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			recorder := serve(t, http.MethodPost, "/api/scenario", testCase.body)
			if recorder.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d; body: %s", recorder.Code, http.StatusBadRequest, recorder.Body)
			}
		})
	}
}
