//go:build !release

package main

import "net/http"

// registerFrontend is a no-op in dev mode.
// The frontend is served by the Vite dev server (npm start).
func registerFrontend(_ *http.ServeMux) {}
