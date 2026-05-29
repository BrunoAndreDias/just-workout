# Organize code by verticals

Status: accepted

Just Workout will organize product code by verticals: code that changes for the same product capability lives together, regardless of whether it is UI, routing, hooks, domain types, storage adapters, tests, or local utilities. This follows TkDodo's "Vertical Codebase" approach: prefer cohesion around what code does over horizontal directories such as `components`, `hooks`, `types`, or `utils`.

## Considered Options

- Horizontal technical-layer folders: rejected because related workout planning, logging, and progression changes would be split across unrelated directories, making ownership and coupling harder to see.
- Global shared directories by default: rejected because reusable product concepts should usually become their own named vertical rather than disappear into catch-all shared folders.
- Package-per-vertical monorepo now: deferred because v1 is still a single local-first Vite app, but verticals should still expose small public interfaces and avoid private deep imports where practical.

## Consequences

- New product code should live under the vertical that owns the product capability, with private implementation colocated inside that vertical.
- Route and page areas are acceptable starting verticals; reusable cross-route product concepts can be promoted into their own vertical when the coupling becomes real.
- Shared foundational code is allowed only when it is genuinely app-wide, such as app shell, design system primitives, routing/bootstrap, persistence plumbing, and test utilities.
- Cross-vertical usage should go through the owning vertical's public interface rather than importing internal files directly.
- Future refactors should move code toward vertical ownership before adding new global `components`, `hooks`, `types`, or `utils` buckets.

Reference: https://tkdodo.eu/blog/the-vertical-codebase
