# flow-ui

A local web dashboard for the [flow](https://github.com/Facets-cloud/flow) CLI — visualise your tasks, projects, knowledge base, and throughput in a browser.

flow is a personal task and session manager for developers. flow-ui gives it a visual layer: kanban boards, throughput charts, a GitHub-style activity heatmap, and a knowledge base reader — all reading directly from your local `~/.flow` data, with no external services.

## What it looks like

- **Dashboard** — overview stats, AI memory metrics, activity heatmap, throughput charts (tasks created vs closed per day/week, overall and per project)
- **Tasks** — kanban board (Backlog / In Progress / Done) with priority, stale, and waiting-on badges; click any card for a detail drawer with brief and update history
- **Knowledge Base** — renders your flow KB files (user, org, products, processes, business)

## Install (release binary — recommended)

Download the binary for your platform from the [latest release](https://github.com/hoctechlabs/flow-ui/releases/latest), make it executable, and run it. No Node or Go required.

```bash
# macOS Apple Silicon
curl -L https://github.com/hoctechlabs/flow-ui/releases/latest/download/flow-ui-darwin-arm64 -o flow-ui
chmod +x flow-ui
./flow-ui
```

```bash
# macOS Intel
curl -L https://github.com/hoctechlabs/flow-ui/releases/latest/download/flow-ui-darwin-amd64 -o flow-ui
chmod +x flow-ui
./flow-ui
```

```bash
# Linux amd64
curl -L https://github.com/hoctechlabs/flow-ui/releases/latest/download/flow-ui-linux-amd64 -o flow-ui
chmod +x flow-ui
./flow-ui
```

Then open [http://localhost:8765](http://localhost:8765).

**Requires:** [flow CLI](https://github.com/Facets-cloud/flow) installed and initialised (`flow init`).

---

## Running from source

**Prerequisites:** Go 1.21+, Node.js 18+, flow CLI

```bash
# Install frontend dependencies (first time only)
npm install

# Start both the API server (port 8765) and the frontend (port 5173)
npm start
```

Then open [http://localhost:5173](http://localhost:5173).

The `npm start` command runs two processes concurrently:
- **Go server** on `:8765` — thin HTTP wrapper around the flow CLI and SQLite DB
- **Vite dev server** on `:5173` — the React frontend

## Configuration

| Variable | Default | Description |
|---|---|---|
| `FLOW_ROOT` | `~/.flow` | Path to your flow data directory |

Set `FLOW_ROOT` before starting if your flow data lives somewhere other than `~/.flow`:

```bash
FLOW_ROOT=/custom/path npm start
```

## API endpoints

The Go server exposes a simple REST API:

| Endpoint | Description |
|---|---|
| `GET /api/projects` | All projects with task counts |
| `GET /api/tasks` | Tasks (supports `?status=`, `?project=`, `?priority=`) |
| `GET /api/tasks/:slug` | Task detail with brief and update history |
| `GET /api/throughput` | Tasks created vs closed per period (`?granularity=day\|week&project=<slug>`) |
| `GET /api/activity` | Daily task completion counts (last 52 weeks) |
| `GET /api/stats` | flow session and memory stats |
| `GET /api/kb/all` | All knowledge base files |

## Tech stack

**Frontend:** React 19 + TypeScript, Vite, Ant Design v6, TanStack Query, Axios, @ant-design/charts

**Backend:** Go — single file (`server/main.go`), uses `modernc.org/sqlite` (no CGo required)

## Security note

flow-ui has **no authentication**. It is designed for local-only use and should not be exposed on a public network. The Go server reads from your local `~/.flow` directory which may contain personal and organisation-sensitive information.

## License

MIT
