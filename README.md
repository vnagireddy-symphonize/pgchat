# pgchat

A conversational data analysis interface for PostgreSQL. Ask questions in plain English — pgchat connects to your database via an MCP server, runs SQL, and returns structured analysis powered by Gemini.

## Features

- **Natural language querying** — describe what you want to know; Gemini writes the SQL
- **Deep statistical analysis** — trends, distributions, outliers, correlations, aggregations
- **Agentic tool-calling loop** — Gemini autonomously explores schema, iterates on queries, and synthesises results
- **Live tool call visibility** — see exactly which database tools were called and what they returned
- **Markdown responses** — answers rendered with full formatting (tables, code blocks, lists)
- **MCP-native** — connects to any MCP server over stdio or HTTP; PostgreSQL support via `mcp-postgres`
- **Dark mode** — full light/dark theme support

## Requirements

- Node.js 18+
- pnpm
- A running PostgreSQL database
- A [Gemini API key](https://aistudio.google.com/app/apikey)

## Setup

```bash
pnpm install
```

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## MCP Server Configuration

Database connectivity is provided by [`mcp-postgres`](https://www.npmjs.com/package/mcp-postgres), configured in `mcp.config.json`:

```json
{
  "servers": [
    {
      "name": "postgres",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-postgres@latest"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    }
  ]
}
```

`${DATABASE_URL}` is resolved from the environment at runtime. To add additional MCP servers (HTTP-based), use `transport: "streamable-http"` with a `url` field. For local overrides without touching the committed config, create `mcp.config.local.json` (gitignored).

## Example Questions

- *What tables are in this database?*
- *Show me the distribution of orders by month*
- *Which customers have the highest lifetime value?*
- *Are there any anomalies in the transaction data from last quarter?*
- *What is the average revenue per user, segmented by region?*

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| LLM | Gemini 2.0 Flash (`@google/genai`) |
| Tool protocol | MCP (`@modelcontextprotocol/sdk`) |
| Database bridge | `mcp-postgres` (stdio) |
| Markdown | `react-markdown` + `@tailwindcss/typography` |

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
```
