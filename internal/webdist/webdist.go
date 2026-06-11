// Package webdist embeds the built frontend so one binary serves both
// the dashboard and the API. `//go:embed` needs its directory to exist
// at compile time, but the real build output (web/dist) is gitignored,
// so this package commits a one-line placeholder dist/index.html that
// keeps `go build` and `go test ./...` working everywhere. The
// Dockerfile overwrites the placeholder with the real `npm run build`
// output before compiling; to try that locally, copy web/dist over
// internal/webdist/dist and `git restore` it afterwards.
package webdist

import (
	"embed"
	"io/fs"
	"net/http"
)

// The all: prefix embeds files whose names start with . or _ too, which
// plain go:embed skips; vite output can contain such assets.
//
//go:embed all:dist
var embeddedFiles embed.FS

// Handler serves the embedded frontend. The dashboard is a single page
// without client-side routes, so unknown paths get the file server's
// plain 404 rather than a fallback to index.html.
func Handler() http.Handler {
	distRoot, err := fs.Sub(embeddedFiles, "dist")
	if err != nil {
		// Unreachable: "dist" is compiled into embeddedFiles above.
		panic(err)
	}
	return http.FileServer(http.FS(distRoot))
}
