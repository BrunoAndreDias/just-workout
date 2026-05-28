# Use a local-first PWA stack for v1

Status: accepted

The first version of Just Workout will be a local-first, offline-capable PWA built as a React + TypeScript Vite SPA with TanStack Router. Workout data will persist locally in IndexedDB through Dexie, with a versioned schema, a versioned JSON export/import backup format, and a repository/application-service boundary so future cloud sync can be added without spreading persistence details through the UI.

This deliberately avoids TanStack Start, a backend, auth, and multi-device sync in v1 because the core product value is reliable mobile workout planning, logging, and progression at the gym, including when connectivity is poor. Future sync remains a planned extension, but v1 treats the local device as the source of truth.

## Considered Options

- TanStack Start/full-stack app: deferred until the product needs server functions, accounts, cloud sync, or server-rendered public pages.
- Server-backed persistence from day one: rejected for v1 because it adds auth, deployment, database hosting, sync failure modes, and conflict handling before the personal offline workflow is proven.
- Plain local storage: rejected for core data because workout history, plans, progression state, migrations, and backup validation need structured durable storage.

## Consequences

- The app can be statically hosted later on any HTTPS host with SPA fallback support.
- The offline/installable layer will use `vite-plugin-pwa` and Workbox, while durable workout data remains in Dexie/IndexedDB.
- UI will use Tailwind CSS, Radix primitives, and selective shadcn/ui components, with custom workout-specific surfaces where needed.
- App data access will go through repositories and application services, with plain TypeScript domain functions for planning and progression rules.
- Tooling will use pnpm, Biome for formatting/linting/import organization, `tsc --noEmit` for type checking, Husky + lint-staged for pre-commit checks, Vitest/React Testing Library for fast tests, and Playwright for a small set of mobile-critical flows.
