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
