package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	_ "modernc.org/sqlite"
)

const port = "8765"

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/projects", handleProjects)
	mux.HandleFunc("/api/tasks", handleTasks)
	mux.HandleFunc("/api/tasks/", handleTaskDetail)
	mux.HandleFunc("/api/kb/", handleKB)
	mux.HandleFunc("/api/stats", handleStats)
	mux.HandleFunc("/api/activity", handleActivity)
	mux.HandleFunc("/api/throughput", handleThroughput)

	// registerFrontend is defined in either embed_release.go or embed_dev.go
	// depending on the build tag.
	registerFrontend(mux)

	// In dev mode CORS is needed because Vite runs on a separate port.
	// In release mode the frontend is served from the same origin.
	handler := corsMiddleware(mux)

	fmt.Printf("flow-ui running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jsonResponse(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func errorResponse(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// --- Projects ---

type Project struct {
	Slug       string `json:"slug"`
	Priority   string `json:"priority"`
	Status     string `json:"status"`
	Total      int    `json:"total"`
	InProgress int    `json:"in_progress"`
	Backlog    int    `json:"backlog"`
	Done       int    `json:"done"`
}

func handleProjects(w http.ResponseWriter, r *http.Request) {
	out, err := runFlow("list", "projects", "--format", "json")
	if err != nil {
		errorResponse(w, err.Error(), 500)
		return
	}
	var projects []Project
	if err := json.Unmarshal([]byte(out), &projects); err != nil {
		errorResponse(w, "failed to parse projects: "+err.Error(), 500)
		return
	}
	jsonResponse(w, projects)
}

// --- Tasks ---

type Task struct {
	Slug      string   `json:"slug"`
	Status    string   `json:"status"`
	Priority  string   `json:"priority"`
	Project   string   `json:"project"`
	AgeDays   int      `json:"age_days"`
	CreatedAt string   `json:"created_at,omitempty"`
	Stale     bool     `json:"stale,omitempty"`
	StaleDays int      `json:"stale_days,omitempty"`
	WaitingOn string   `json:"waiting_on,omitempty"`
	Tags      []string `json:"tags,omitempty"`
}

func handleTasks(w http.ResponseWriter, r *http.Request) {
	args := []string{"list", "tasks", "--format", "json"}

	if project := r.URL.Query().Get("project"); project != "" {
		args = append(args, "--project", project)
	}
	if status := r.URL.Query().Get("status"); status != "" {
		args = append(args, "--status", status)
	}
	if priority := r.URL.Query().Get("priority"); priority != "" {
		args = append(args, "--priority", priority)
	}

	out, err := runFlow(args...)
	if err != nil {
		errorResponse(w, err.Error(), 500)
		return
	}
	var tasks []Task
	if err := json.Unmarshal([]byte(out), &tasks); err != nil {
		errorResponse(w, "failed to parse tasks: "+err.Error(), 500)
		return
	}

	// Enrich with created_at from SQLite
	if dbPath := flowRoot("flow.db"); dbPath != "" {
		if db, err := sql.Open("sqlite", dbPath+"?mode=ro"); err == nil {
			defer db.Close()
			rows, err := db.Query(`SELECT slug, created_at FROM tasks WHERE created_at IS NOT NULL`)
			if err == nil {
				createdMap := make(map[string]string)
				for rows.Next() {
					var slug, createdAt string
					if rows.Scan(&slug, &createdAt) == nil {
						createdMap[slug] = createdAt
					}
				}
				rows.Close()
				for i := range tasks {
					if t, ok := createdMap[tasks[i].Slug]; ok {
						tasks[i].CreatedAt = t
					}
				}
			}
		}
	}

	jsonResponse(w, tasks)
}

// --- Task Detail ---

type TaskDetail struct {
	Slug               string   `json:"slug"`
	Name               string   `json:"name"`
	Project            string   `json:"project"`
	Status             string   `json:"status"`
	Priority           string   `json:"priority"`
	WorkDir            string   `json:"work_dir"`
	Stale              bool     `json:"stale"`
	StaleDays          int      `json:"stale_days"`
	WaitingOn          string   `json:"waiting_on,omitempty"`
	Tags               []string `json:"tags,omitempty"`
	CreatedAt          string   `json:"created_at,omitempty"`
	Brief              string   `json:"brief"`
	Updates            []Update `json:"updates"`
}

type Update struct {
	Filename string `json:"filename"`
	Date     string `json:"date"`
	Content  string `json:"content"`
}

func handleTaskDetail(w http.ResponseWriter, r *http.Request) {
	// Path: /api/tasks/<slug> or /api/tasks/<slug>/brief or /api/tasks/<slug>/updates
	path := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	parts := strings.SplitN(path, "/", 2)
	slug := parts[0]
	if slug == "" {
		errorResponse(w, "missing slug", 400)
		return
	}

	sub := ""
	if len(parts) > 1 {
		sub = parts[1]
	}

	switch sub {
	case "brief":
		serveBrief(w, slug)
	case "updates":
		serveUpdates(w, slug)
	default:
		serveTaskDetail(w, slug)
	}
}

func serveTaskDetail(w http.ResponseWriter, slug string) {
	out, err := runFlow("show", "task", slug)
	if err != nil {
		errorResponse(w, "task not found: "+err.Error(), 404)
		return
	}

	detail := parseTaskDetail(slug, out)

	// Load brief
	briefPath := flowRoot("tasks", slug, "brief.md")
	if data, err := os.ReadFile(briefPath); err == nil {
		detail.Brief = string(data)
	}

	// Load updates
	detail.Updates = loadUpdates(slug)

	jsonResponse(w, detail)
}

func serveBrief(w http.ResponseWriter, slug string) {
	briefPath := flowRoot("tasks", slug, "brief.md")
	data, err := os.ReadFile(briefPath)
	if err != nil {
		errorResponse(w, "brief not found", 404)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	w.Write(data)
}

func serveUpdates(w http.ResponseWriter, slug string) {
	updates := loadUpdates(slug)
	jsonResponse(w, updates)
}

func loadUpdates(slug string) []Update {
	updatesDir := flowRoot("tasks", slug, "updates")
	entries, err := os.ReadDir(updatesDir)
	if err != nil {
		return []Update{}
	}

	updates := []Update{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		content, err := os.ReadFile(filepath.Join(updatesDir, e.Name()))
		if err != nil {
			continue
		}
		date := ""
		name := e.Name()
		// filename format: YYYY-MM-DD-*.md
		if len(name) >= 10 {
			date = name[:10]
		}
		updates = append(updates, Update{
			Filename: name,
			Date:     date,
			Content:  string(content),
		})
	}

	sort.Slice(updates, func(i, j int) bool {
		return updates[i].Filename < updates[j].Filename
	})
	return updates
}

func parseTaskDetail(slug, raw string) TaskDetail {
	detail := TaskDetail{Slug: slug}
	scanner := bufio.NewScanner(strings.NewReader(raw))
	for scanner.Scan() {
		line := scanner.Text()
		if v := extractField(line, "name:"); v != "" {
			detail.Name = v
		} else if v := extractField(line, "project:"); v != "" {
			detail.Project = v
		} else if v := extractField(line, "status:"); v != "" {
			// status line may contain stale info inline
			parts := strings.Fields(v)
			if len(parts) > 0 {
				detail.Status = parts[0]
			}
		} else if v := extractField(line, "priority:"); v != "" {
			detail.Priority = v
		} else if v := extractField(line, "work_dir:"); v != "" {
			// strip trailing [known] or [missing]
			wdir := strings.Fields(v)
			if len(wdir) > 0 {
				detail.WorkDir = wdir[0]
			}
		} else if v := extractField(line, "created:"); v != "" {
			detail.CreatedAt = v
		} else if v := extractField(line, "waiting_on:"); v != "" {
			detail.WaitingOn = v
		} else if strings.Contains(line, "stale") {
			detail.Stale = true
		}
	}
	return detail
}

func extractField(line, key string) string {
	trimmed := strings.TrimSpace(line)
	if strings.HasPrefix(trimmed, key) {
		val := strings.TrimSpace(strings.TrimPrefix(trimmed, key))
		return val
	}
	return ""
}

// --- KB ---

var kbFiles = []string{"user", "org", "products", "processes", "business"}

func handleKB(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(r.URL.Path, "/api/kb/")
	name = strings.TrimSuffix(name, ".md")

	// Validate against known files
	valid := false
	for _, f := range kbFiles {
		if f == name {
			valid = true
			break
		}
	}
	if !valid {
		// Return list of KB files
		type KBFile struct {
			Name    string `json:"name"`
			Content string `json:"content"`
		}
		var files []KBFile
		for _, f := range kbFiles {
			path := flowRoot("kb", f+".md")
			data, err := os.ReadFile(path)
			content := ""
			if err == nil {
				content = string(data)
			}
			files = append(files, KBFile{Name: f, Content: content})
		}
		jsonResponse(w, files)
		return
	}

	path := flowRoot("kb", name+".md")
	data, err := os.ReadFile(path)
	if err != nil {
		errorResponse(w, "kb file not found", 404)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	w.Write(data)
}

// --- Activity ---

type ActivityDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func handleActivity(w http.ResponseWriter, r *http.Request) {
	dbPath := flowRoot("flow.db")
	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		errorResponse(w, "cannot open db: "+err.Error(), 500)
		return
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT substr(status_changed_at, 1, 10) as date, count(*) as count
		FROM tasks
		WHERE status = 'done'
		  AND status_changed_at IS NOT NULL
		  AND status_changed_at >= date('now', '-365 days')
		GROUP BY substr(status_changed_at, 1, 10)
		ORDER BY date
	`)
	if err != nil {
		errorResponse(w, "query failed: "+err.Error(), 500)
		return
	}
	defer rows.Close()

	var days []ActivityDay
	for rows.Next() {
		var d ActivityDay
		if err := rows.Scan(&d.Date, &d.Count); err != nil {
			continue
		}
		days = append(days, d)
	}
	if days == nil {
		days = []ActivityDay{}
	}
	jsonResponse(w, days)
}

// --- Helpers ---

func flowRoot(parts ...string) string {
	root := os.Getenv("FLOW_ROOT")
	if root == "" {
		home, _ := os.UserHomeDir()
		root = filepath.Join(home, ".flow")
	}
	all := append([]string{root}, parts...)
	return filepath.Join(all...)
}

// --- Stats ---

type FlowStats struct {
	ContextRecalls    int    `json:"context_recalls"`
	Resumes           int    `json:"resumes"`
	References        int    `json:"references"`
	CrossTask         int    `json:"cross_task"`
	KB                int    `json:"kb"`
	TokensEstimated   string `json:"tokens_estimated"`
	InstantResumes    int    `json:"instant_resumes"`
	TasksDone         int    `json:"tasks_done"`
	TokensProcessed   int64  `json:"tokens_processed"`
	KBFacts           int    `json:"kb_facts"`
	AddressedByName   int    `json:"addressed_by_name"`
	WeeklyRecalls     string `json:"weekly_recalls"`
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	out, err := runFlow("stats")
	if err != nil {
		errorResponse(w, err.Error(), 500)
		return
	}

	stats := FlowStats{}
	scanner := bufio.NewScanner(strings.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "flow recalled your context") {
			// "flow recalled your context 238 times"
			var n int
			fmt.Sscanf(trimmed, "flow recalled your context %d", &n)
			stats.ContextRecalls = n
		} else if strings.HasPrefix(trimmed, "resume ") {
			// "resume 90 · reference 32 · cross-task 98 · kb 18"
			parts := strings.Split(trimmed, "·")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				var n int
				if strings.HasPrefix(p, "resume ") {
					fmt.Sscanf(p, "resume %d", &n)
					stats.Resumes = n
				} else if strings.HasPrefix(p, "reference ") {
					fmt.Sscanf(p, "reference %d", &n)
					stats.References = n
				} else if strings.HasPrefix(p, "cross-task ") {
					fmt.Sscanf(p, "cross-task %d", &n)
					stats.CrossTask = n
				} else if strings.HasPrefix(p, "kb ") {
					fmt.Sscanf(p, "kb %d", &n)
					stats.KB = n
				}
			}
		} else if strings.HasPrefix(trimmed, "Context re-established") {
			// "Context re-established : ~200,390 tokens you never re-typed (est.)"
			idx := strings.Index(trimmed, ": ")
			if idx >= 0 {
				val := strings.TrimSpace(trimmed[idx+2:])
				// strip " tokens you never re-typed (est.)"
				if i := strings.Index(val, " tokens"); i >= 0 {
					val = val[:i]
				}
				stats.TokensEstimated = strings.TrimPrefix(val, "~")
			}
		} else if strings.HasPrefix(trimmed, "Instant resumes") {
			// "Instant resumes        : 90× — flow dropped..."
			idx := strings.Index(trimmed, ": ")
			if idx >= 0 {
				val := strings.TrimSpace(trimmed[idx+2:])
				var n int
				fmt.Sscanf(val, "%d", &n)
				stats.InstantResumes = n
			}
		} else if strings.HasPrefix(trimmed, "Tasks done") {
			var n int
			fmt.Sscanf(trimmed, "Tasks done       : %d", &n)
			stats.TasksDone = n
		} else if strings.HasPrefix(trimmed, "Tokens processed") {
			idx := strings.Index(trimmed, ": ")
			if idx >= 0 {
				val := strings.TrimSpace(trimmed[idx+2:])
				val = strings.ReplaceAll(val, ",", "")
				var n int64
				fmt.Sscanf(val, "%d", &n)
				stats.TokensProcessed = n
			}
		} else if strings.HasPrefix(trimmed, "KB facts") {
			var n int
			fmt.Sscanf(trimmed, "KB facts         : %d", &n)
			stats.KBFacts = n
		} else if strings.HasPrefix(trimmed, "Addressed by name") {
			var n int
			fmt.Sscanf(trimmed, "Addressed by name, not a UUID : %d", &n)
			stats.AddressedByName = n
		} else if strings.HasPrefix(trimmed, "Weekly recalls") {
			idx := strings.Index(trimmed, ": ")
			if idx >= 0 {
				stats.WeeklyRecalls = strings.TrimSpace(trimmed[idx+2:])
			}
		}
	}

	jsonResponse(w, stats)
}

// --- Throughput ---

type ThroughputPoint struct {
	Period  string `json:"period"`
	Created int    `json:"created"`
	Closed  int    `json:"closed"`
}

func handleThroughput(w http.ResponseWriter, r *http.Request) {
	granularity := r.URL.Query().Get("granularity")
	if granularity != "day" && granularity != "week" {
		granularity = "week"
	}
	project := r.URL.Query().Get("project")

	dbPath := flowRoot("flow.db")
	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		errorResponse(w, "cannot open db: "+err.Error(), 500)
		return
	}
	defer db.Close()

	// SQLite date truncation expression (use substr for tz-safe extraction)
	var dateTrunc string
	var lookback string
	if granularity == "day" {
		dateTrunc = "substr(created_at, 1, 10)"
		lookback = "-60 days"
	} else {
		// Week start (Monday): date(plain_date, 'weekday 0', '-6 days')
		dateTrunc = "date(substr(created_at, 1, 10), 'weekday 0', '-6 days')"
		lookback = "-112 days" // 16 weeks; SQLite doesn't support 'N weeks' modifier
	}

	projectFilter := ""
	args := []any{}
	if project != "" {
		projectFilter = "AND project_slug = ?"
		args = append(args, project)
	}

	// Created per period
	createdSQL := fmt.Sprintf(`
		SELECT %s as period, count(*) as n
		FROM tasks
		WHERE created_at IS NOT NULL
		  AND substr(created_at, 1, 10) >= date('now', '%s')
		  %s
		GROUP BY period
		ORDER BY period
	`, dateTrunc, lookback, projectFilter)

	createdMap := map[string]int{}
	rows, err := db.Query(createdSQL, args...)
	if err != nil {
		errorResponse(w, "created query failed: "+err.Error(), 500)
		return
	}
	for rows.Next() {
		var period string
		var n int
		if rows.Scan(&period, &n) == nil {
			createdMap[period] = n
		}
	}
	rows.Close()

	// Closed (done) per period — use status_changed_at
	var closedTrunc string
	if granularity == "day" {
		closedTrunc = "substr(status_changed_at, 1, 10)"
	} else {
		closedTrunc = "date(substr(status_changed_at, 1, 10), 'weekday 0', '-6 days')"
	}
	closedSQL := fmt.Sprintf(`
		SELECT %s as period, count(*) as n
		FROM tasks
		WHERE status = 'done'
		  AND status_changed_at IS NOT NULL
		  AND substr(status_changed_at, 1, 10) >= date('now', '%s')
		  %s
		GROUP BY period
		ORDER BY period
	`, closedTrunc, lookback, projectFilter)

	closedMap := map[string]int{}
	rows2, err := db.Query(closedSQL, args...)
	if err != nil {
		errorResponse(w, "closed query failed: "+err.Error(), 500)
		return
	}
	for rows2.Next() {
		var period string
		var n int
		if rows2.Scan(&period, &n) == nil {
			closedMap[period] = n
		}
	}
	rows2.Close()

	// Merge into sorted list
	periodSet := map[string]struct{}{}
	for k := range createdMap {
		periodSet[k] = struct{}{}
	}
	for k := range closedMap {
		periodSet[k] = struct{}{}
	}
	periods := make([]string, 0, len(periodSet))
	for k := range periodSet {
		periods = append(periods, k)
	}
	sort.Strings(periods)

	result := make([]ThroughputPoint, 0, len(periods))
	for _, p := range periods {
		result = append(result, ThroughputPoint{
			Period:  p,
			Created: createdMap[p],
			Closed:  closedMap[p],
		})
	}

	jsonResponse(w, result)
}

func runFlow(args ...string) (string, error) {
	cmd := exec.Command("flow", args...)
	out, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("flow %s failed: %s", strings.Join(args, " "), string(exitErr.Stderr))
		}
		return "", err
	}
	return string(out), nil
}
