package main

import (
	"bytes"
	"strings"
	"testing"
)

// run writes to an io.Writer instead of straight to stdout precisely so
// this test can hand it a buffer and inspect the output.
func TestRunPrintsAllScenarios(t *testing.T) {
	var output bytes.Buffer
	if err := run(&output); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"none", "random", "most-connected", "illustrative"} {
		if !strings.Contains(output.String(), want) {
			t.Errorf("output is missing %q:\n%s", want, output.String())
		}
	}
}
