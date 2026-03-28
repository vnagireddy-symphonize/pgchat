# Roadmap

Potential next steps for pgchat, grouped by priority.

## High Value / Near-term

- **Table & chart rendering** — render query results as sortable data tables and charts (bar, line, pie) using `recharts`
- **Conversation history** — persist chat sessions to the database or localStorage so conversations survive page reloads
- **Multi-turn context truncation** — handle Gemini's context limit gracefully for long conversations

## Quality / Reliability

- **Error boundaries** — graceful UI fallback when the API route throws or the MCP server is unreachable
- **MCP reconnection** — health check + reconnect logic when the Postgres MCP server crashes mid-session
- **Rate limiting** — protect the API route from rapid repeated requests

## Developer Experience

- **E2E tests** — Playwright tests covering the full chat flow
- **CI pipeline** — GitHub Actions running `pnpm build` + `pnpm test` on every push
- **Deploy previews** — Vercel preview deployments (compatible with trunk-based development via tags)

## Features

- **Schema explorer sidebar** — always-visible panel showing tables and columns so users know what to ask about
- **SQL visibility** — show the actual SQL queries Gemini ran alongside the results
- **Export** — download query results as CSV
