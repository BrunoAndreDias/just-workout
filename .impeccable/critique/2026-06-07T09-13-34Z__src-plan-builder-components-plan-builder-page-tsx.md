---
target: Plan Blueprint stepper vs breadcrumbs
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-06-07T09-13-34Z
slug: src-plan-builder-components-plan-builder-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Plan Blueprint progress disappears at common desktop sizes. |
| 2 | Match System / Real World | 3 | Domain language is mostly strong, but short labels like "Rep ranges" weaken precise terminology. |
| 3 | User Control and Freedom | 3 | Back/continue and step navigation exist, but availability changes by breakpoint. |
| 4 | Consistency and Standards | 2 | Header summary, compact stepper, and progress summary behave like different navigation systems. |
| 5 | Error Prevention | 3 | Guarded routes and locked-state logic exist, but the compact stepper does not communicate locks. |
| 6 | Recognition Rather Than Recall | 2 | At normal desktop widths users must remember prior blueprint choices. |
| 7 | Flexibility and Efficiency | 2 | Returning to prior steps is efficient only on some layouts. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm product UI, but mobile orientation consumes too much first-viewport space. |
| 9 | Error Recovery | 2 | Recovery depends on route guard redirects and Back rather than clear stateful step navigation. |
| 10 | Help and Documentation | 3 | Recommendation copy is useful, but next-step and lock explanations are uneven. |
| **Total** | | **25/40** | **Solid UI with a navigation/status architecture gap** |

## Anti-Patterns Verdict

**LLM assessment**: This does not read as obvious AI-generated UI. The tone is restrained, practical, and aligned with the product. The product-slop risk is not visual decoration; it is that the flow looks carefully styled while its status/navigation model changes by breakpoint.

**Deterministic scan**: The installed detector returned an empty JSON array for `src/plan-builder`, `src/design-system/stepper.tsx`, and the project root. No detector findings, no false positives.

**Visual/browser evidence**: The in-app browser was unavailable, so local Playwright was used against the already-running dev server at `localhost:5173`. At `1366x720`, `/plan-builder/frequency` and `/plan-builder/rep-ranges` showed no compact stepper, no Plan Blueprint header, no progress summary, and no rail. At `390x844`, the header summary plus stepper pushed actual step content to roughly `585px` on Rep Range Style. Assessment B also observed that the richer Plan Blueprint progress summary appears at `2200x900`, where it communicates current and locked states better than the compact stepper.

## Overall Impression

The Plan Builder has the right product tone and a credible choice rhythm. The problem is not "stepper looks bad." The problem is that the UI has three competing concepts: app location, workflow progress, and Plan Blueprint status. Breadcrumbs would clarify only the first one. The user's core need here is the second and third.

## What's Working

- The first decisions are understandable: selected cards, recommended defaults, concrete benefits, and clear continue actions work well.
- The richer Plan Blueprint progress summary is directionally right because it shows selected values, current state, and locked future steps.
- The visual system is calm and practical, with no gym-bro or decorative marketing pattern.

## Priority Issues

**[P1] Plan Blueprint status disappears on normal desktop**

**Why it matters**: At `1366x720`, users have neither the stepper nor the Plan Blueprint summary. That violates the product principle that the current choice, constraints, and blueprint status remain visible without unnecessary desktop scrolling.

**Fix**: Keep one compact Plan Blueprint progress strip visible from tablet through normal desktop, especially `1280-2199px`. Do not reserve status visibility only for very wide screens or the Exercises step.

**Suggested command**: `$impeccable polish src/plan-builder/components/plan-builder-page.tsx`

**[P1] The compact stepper exposes future steps without lock semantics**

**Why it matters**: `Stepper` makes every non-current item interactive when `onItemSelect` exists. The router guard can redirect, but visually the user sees future steps as ordinary available buttons. A breadcrumb replacement would repeat this problem if it presents future steps as links.

**Fix**: Move the availability model from `PlanBlueprintProgressSummary` into the primary progress navigation: completed steps can be buttons, current uses `aria-current="step"`, locked steps are not links/buttons and show why they are locked.

**Suggested command**: `$impeccable shape Plan Blueprint progress navigation`

**[P2] Mobile spends too much first-viewport space on orientation**

**Why it matters**: On mobile Rep Range Style, the Plan Blueprint header and five-step stepper push the actual task below roughly `585px`. Users see status before work, but too much of it.

**Fix**: Collapse mobile blueprint details into a compact disclosure or one-line status row, then show a horizontal progress strip with current step and nearest neighbors. The full five-step/details view can open on demand.

**Suggested command**: `$impeccable adapt src/plan-builder/components/plan-builder-page.tsx`

**[P2] Breakpoint-specific CSS is carrying product decisions**

**Why it matters**: `stepper.css` has hundreds of stepper references, many media queries, tiny label sizes, and repeated high-specificity overrides. This is a sign that layout pressure is being solved after the fact instead of by one stable navigation model.

**Fix**: Replace the compact stepper and wide progress summary with one component that has explicit compact, full, and collapsed modes, driven by content needs rather than many one-off media overrides.

**Suggested command**: `$impeccable extract Plan Blueprint progress navigation`

**[P2] Labels are short in a way that weakens domain precision**

**Why it matters**: The product language asks for Training Frequency, Training Split, Rep Range Style, and Plan Blueprint. Short labels like "Frequency," "Volume," and "Exercises" save space but lose meaning in a compact nav.

**Fix**: Use precise labels where the navigation carries orientation: `Training Frequency`, `Rep Range Style`, `Training Volume`, `Exercise Foundation`, `Review`. If space is tight, keep full accessible labels and visually abbreviate only at narrow widths.

**Suggested command**: `$impeccable clarify src/plan-builder/components/plan-builder-config.ts`

## Stepper vs Breadcrumbs

Do not replace the current stepper with a traditional breadcrumb.

Breadcrumbs communicate hierarchy: `Home > Plan Builder > Rep Range Style`. That is useful for app location, but it does not communicate a constrained Plan Blueprint workflow. This flow needs current step, completed choices, locked future steps, and selected values. A breadcrumb cannot naturally carry all of that without becoming a disguised stepper.

The better direction is a breadcrumb-like **Plan Blueprint progress strip**:

- `Training Frequency` shows `3 days/week · Full Body` after completion.
- `Rep Range Style` shows `Current` on that step.
- `Training Volume`, `Exercise Foundation`, and `Review` show `Locked` or `Ready`.
- Completed steps are buttons.
- Current step is not a button and uses `aria-current="step"`.
- Locked steps are not buttons and explain the prerequisite.

Use actual breadcrumbs only in the app shell if you need page hierarchy, for example `Plan Builder / Plan Blueprint`. Keep workflow progress separate and label it as Plan Blueprint progress.

## Persona Red Flags

**First-time planner**: On normal desktop, after continuing to Rep Range Style, prior choices vanish. They may wonder whether the Training Split was saved.

**Busy lifter on a laptop**: On mobile and smaller layouts, the user has to move past a large status block and stepper before reaching the decision. On some laptop widths, action placement and compressed layout increase scanning effort.

**Power user editing a blueprint**: Fast backtracking is unreliable because the navigation affordance changes across viewport sizes, and compact future-step buttons do not distinguish available from unavailable steps.

## Minor Observations

- `PlanBlueprintProgressSummary` has better locked-state behavior than `Stepper`, but should add current-step accessibility semantics.
- The compact stepper's current/completed/upcoming visual model is underpowered because completed and upcoming both look like non-current destinations.
- If the page introduces breadcrumbs, avoid stacking them above the existing stepper/header summary. That would add another orientation layer instead of resolving the model.

## Questions to Consider

- Is the primary goal app wayfinding or Plan Blueprint state? If it is state, breadcrumbs are the wrong primitive.
- Should locked future steps be visible as disabled context, or hidden until available?
- What single line should users always be able to read to know what their blueprint currently contains?
