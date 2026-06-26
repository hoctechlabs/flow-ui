# Contributing to flow-ui

Thanks for your interest. flow-ui is a companion to the [flow CLI](https://github.com/Facets-cloud/flow) and is intentionally kept simple — a thin Go server and a React frontend. Contributions that stay true to that spirit are very welcome.

## Raising an issue

Before opening an issue, check if one already exists.

**Bug reports** — include:
- What you did, what you expected, what happened instead
- Your macOS version and whether you're using the release binary or running from source
- Any error output from the terminal

**Feature requests** — describe the use case, not just the solution. What are you trying to do and why doesn't the current UI support it?

Open issues at: https://github.com/hoctechlabs/flow-ui/issues

## Contributing code

### Setup

```bash
git clone https://github.com/hoctechlabs/flow-ui.git
cd flow-ui
npm install
npm start   # starts Go server on :8765 and Vite on :5173
```

You'll also need the [flow CLI](https://github.com/Facets-cloud/flow) installed and initialised (`flow init`).

### Project structure

```
flow-ui/
  src/                  # React frontend
    components/         # UI components
    api.ts              # Axios client
    types.ts            # Shared TypeScript types
  server/
    main.go             # Go HTTP server (all API handlers)
    embed_dev.go        # Dev build: no embed (Vite serves frontend)
    embed_release.go    # Release build: embeds server/dist/ into binary
```

### Workflow

1. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature main
   ```

2. Make your changes. For frontend changes, verify in the browser at `http://localhost:5173`. For API changes, test with `curl http://localhost:8765/api/...`.

3. Make sure the frontend builds without errors before opening a PR:
   ```bash
   npm run build
   ```

4. Open a pull request against `main`. Describe what you changed and why.

### Guidelines

- **Keep the server thin.** `server/main.go` is a read-only wrapper around the flow CLI and SQLite DB. It should not contain business logic — that belongs in flow itself.
- **No auth, no config files, no daemons.** flow-ui is local-only and intentionally zero-config.
- **Match the existing style.** The frontend uses Ant Design v6 with a dark theme. New UI should feel consistent with what's already there.
- **One concern per PR.** Small, focused PRs are much easier to review than large ones.

## Questions

If you're unsure whether something is a good fit before investing time in it, open an issue first and describe what you're thinking. Happy to discuss.
