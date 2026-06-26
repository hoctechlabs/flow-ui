//go:build release

package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed dist
var embeddedDist embed.FS

// registerFrontend serves the embedded Vite build for all non-API routes,
// with an index.html fallback for client-side routing.
func registerFrontend(mux *http.ServeMux) {
	distFS, err := fs.Sub(embeddedDist, "dist")
	if err != nil {
		panic("embed error: " + err.Error())
	}
	fileServer := http.FileServer(http.FS(distFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path != "" {
			f, err := distFS.Open(path)
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		// SPA fallback
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
