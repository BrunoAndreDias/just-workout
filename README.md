# Just Workout

Personal-use fitness web app for workout planning, workout logging, and progression.

## Stack

- React + TypeScript + Vite
- TanStack Router and TanStack Query
- Tailwind CSS v4, Radix primitives, and source-owned shadcn-style components
- Dexie + IndexedDB for local-first persistence
- React Hook Form + Zod for forms and validation
- vite-plugin-pwa + Workbox for installability and offline app shell caching
- Biome, TypeScript, Husky, lint-staged, Vitest, and Playwright
- Sandcastle for running coding-agent workflows in an isolated Docker sandbox

See [ADR 0001](./docs/adr/0001-local-first-pwa-stack.md) for the stack decision.

## Commands

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm check
pnpm test
pnpm build
```

## Sandcastle

Sandcastle is configured with a blank Codex workflow in `.sandcastle/`.
Edit `.sandcastle/prompt.md` with the task you want the sandboxed agent to run.

```bash
pnpm sandcastle
```

`pnpm sandcastle` now auto-builds the `sandcastle:just-workout-v2` image the first time it is missing. You can still force a rebuild with `pnpm sandcastle:build-image`.

Copy `.sandcastle/.env.example` to `.sandcastle/.env` and set the required local credentials before running an agent. The generated `.sandcastle/SETUP_ISSUE_TRACKER.md` is only needed if this project later gets wired to an issue tracker.
