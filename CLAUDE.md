# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev        # Start dev server on http://localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

Use `pnpm` — not `npm` or `yarn`.

```bash
pnpm test         # Run tests once
pnpm test:watch   # Run tests in watch mode
```

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4

- `src/app/` — App Router pages and layouts. `layout.tsx` is the root layout; `page.tsx` is the home route.
- `globals.css` uses Tailwind CSS v4 with CSS custom properties for theming (light/dark via `@media (prefers-color-scheme: dark)`).
- Path alias `@/*` maps to `./src/*`.
- ESLint uses flat config (`eslint.config.mjs`) with Next.js core-web-vitals + TypeScript rules.
- `pnpm-workspace.yaml` is present for potential monorepo expansion.

## Git

This project follows **trunk-based development** — commit directly to `main`. No feature branches.

After successfully completing a task, commit all changes using the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <short description>

[optional body]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `chore`. Use `pnpm build` to verify the build passes before committing.

After every commit, push to origin: `git push origin main`

After completing any task that adds, changes, or removes user-facing features, commands, configuration, or environment variables, update `README.md` to reflect those changes before committing.

Use `git tag` to bookmark milestones (e.g. `v0.3-data-analysis`) instead of long-lived branches.
