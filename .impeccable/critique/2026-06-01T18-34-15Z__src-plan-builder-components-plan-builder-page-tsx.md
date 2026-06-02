---
target: Plan Builder workflow
total_score: 21
p0_count: 0
p1_count: 2
timestamp: 2026-06-01T18-34-15Z
slug: src-plan-builder-components-plan-builder-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Blueprint status exists, but it moves between header, rail, hidden rail, and step notes. |
| 2 | Match System / Real World | 3 | Training language is mostly disciplined, but "v1", "generation", "read-only", and "derived" leak implementation state. |
| 3 | User Control and Freedom | 2 | Back and continue exist, but disabled adjustment actions imply controls the user cannot use. |
| 4 | Consistency and Standards | 2 | Option cards, badges, dark panels, serif-like heading treatment, and compact overrides vary by step. |
| 5 | Error Prevention | 2 | Constraints are present, but mostly as explanatory text after the user has to parse the decision surface. |
| 6 | Recognition Rather Than Recall | 2 | Stepper and blueprint summary help, but selected-choice details compete with many secondary notes. |
| 7 | Flexibility and Efficiency | 1 | No clear fast path for experienced users; later steps require scanning dense panels and tables. |
| 8 | Aesthetic and Minimalist Design | 2 | Calm visual language, but the builder is over-carded and over-explained in the later steps. |
| 9 | Error Recovery | 2 | Validation exists, but conflicts and unsupported choices are handled as explanation-heavy states. |
| 10 | Help and Documentation | 2 | Guidance is abundant, but embedded as repeated notes instead of progressive help. |
| **Total** | | **21/40** | **Needs structural simplification** |

## Anti-Patterns Verdict

**LLM assessment**: This does not immediately read as generic AI output. The stronger concern is product slop: the interface is trying to keep too much visible at once, then compensating with tiny text, dense cards, and explanatory copy. It feels engineered around layout constraints instead of calmly guiding the workout decision.

**Deterministic scan**: The CLI detector found 1 issue: `side-tab` in `src/design-system/app-shell.tsx:92`, where the active nav item uses `border-l-4`. Browser detection found heavier live-page signals on `/plan-builder/split`: 20 anti-patterns on desktop and laptop, including 15 `tiny-text`, 2 `clipped-overflow-container`, 1 `cramped-padding`, 1 `line-length`, 1 `tight-leading`, 1 `hero-eyebrow-chip`, 1 `single-font`, and 1 `cream-palette`. On mobile it found 5 issues, including `text-overflow` and the same palette/font warnings.

The detector caught a real pattern the qualitative review also saw: layout fit is being won through compression. Some detector findings are false positives or low-priority in this product context: `single-font` is acceptable for app UI, `cream-palette` is a contextual warning because the repo already has committed warm neutral colors, and `text-overflow` on `legend.sr-only` is likely an accessibility hiding pattern rather than visible overflow.

**Visual overlays**: Overlay injection succeeded in headless Playwright, but no persistent human-visible browser tab was left open. Evidence came from browser console output, DOM measurements, and screenshots.

## Overall Impression

The builder has a solid product foundation: domain language, step structure, native controls, and clear recommendations. The biggest opportunity is to stop treating "no desktop scroll" as the top design constraint. The later workflow should be simplified structurally, especially Exercise Selection, rather than squeezed until it technically fits.

## What's Working

- The first two steps have a trustworthy rhythm: choose an option, see why it fits, continue.
- The selected-state detail panels in Split and Rep Range Style are a strong pattern because they connect the user's choice to a training reason.
- Accessibility fundamentals are present: native radio inputs, semantic fieldsets, visible focus handling, and screen-reader labels.

## Priority Issues

**[P1] Desktop fit is achieved by crushing the interface**

**Why it matters**: `src/styles.css:4358` to `src/styles.css:4522` uses `width: 131.6%`, `zoom: 0.76`, and text as small as `0.58rem` for the Exercise Selection step. This creates readability risk and makes the product feel fragile on the exact laptop viewports the app is trying to support.

**Fix**: Redesign Step 5 around one dominant task. Keep Preferred Exercises and Avoided Exercises as the main interaction. Collapse or summarize Strategy, Equipment, Movement Coverage, and Automatic Rules. Remove the zoom-based layout hack.

**Suggested command**: `$impeccable layout src/plan-builder/steps/exercise-selection-preferences-step.tsx`

**[P1] Step 5 has no dominant user action**

**Why it matters**: At `src/plan-builder/steps/exercise-selection-preferences-step.tsx:184`, the step opens into a dense grid containing strategy, equipment, movement coverage, preferred exercises, avoided exercises, automatic rules, conflict notes, and navigation. The user reaches the most concrete exercise decision but has to work to find the actual action.

**Fix**: Reframe the screen as "Choose exercise preferences." Put preference entry/editing first. Move strategy and equipment into compact locked summaries. Treat movement coverage as a validation preview after the preference controls, not as equal-weight content.

**Suggested command**: `$impeccable distill src/plan-builder/steps/exercise-selection-preferences-step.tsx`

**[P2] Blueprint/status visibility is inconsistent**

**Why it matters**: The blueprint anchor is rendered in the header at `src/plan-builder/components/plan-builder-page.tsx:71` and as a rail at `src/plan-builder/components/plan-builder-page.tsx:82`, but visibility changes by viewport and step. Exercise Selection even hides the right rail in `src/styles.css:4354`. Users lose the stable sense of "where am I in the Plan Blueprint?"

**Fix**: Pick one stable blueprint pattern per breakpoint. On desktop, keep the rail or a compact sticky header visible for every step. On mobile, make the blueprint summary a collapsed disclosure near the stepper.

**Suggested command**: `$impeccable polish src/plan-builder/components/plan-builder-page.tsx`

**[P2] Disabled controls create false affordances**

**Why it matters**: `src/plan-builder/steps/weekly-volume-targets-step.tsx:400` renders disabled `Adjust` buttons in each row. They look like actions but cannot be used, which makes the interface feel unfinished and reduces trust.

**Fix**: Remove unavailable actions from the table. Replace them with a plain status label, or provide a single enabled "Customize volume targets" control when that workflow exists.

**Suggested command**: `$impeccable clarify src/plan-builder/steps/weekly-volume-targets-step.tsx`

**[P3] Copy explains implementation instead of guiding the workout decision**

**Why it matters**: Step 5 includes phrases like "read-only in v1" and "stored separately in the Plan Blueprint" at `src/plan-builder/steps/exercise-selection-preferences-step.tsx:194` and `src/plan-builder/steps/exercise-selection-preferences-step.tsx:237`. This shifts the user's attention from training decisions to product limitations.

**Fix**: Rewrite implementation-facing copy into user-facing constraints: what is decided now, what is locked for this blueprint, what can change later, and why the default is safe.

**Suggested command**: `$impeccable clarify src/plan-builder/steps/exercise-selection-preferences-step.tsx`

## Persona Red Flags

**First-time strength planner**: Frequency and Split are approachable, but later labels like "rep target bias," "Weekly Rep Targets," "direct work," and "Exercise Selection Conflict" assume too much training model knowledge before the user sees a Training Plan.

**Experienced lifter with limited time**: This user wants to accept defaults and edit exceptions quickly. Step 4 and Step 5 bury the actionable controls among readonly panels, badges, notes, and tables.

**Low-vision or keyboard user**: Native inputs help, but the compressed Exercise Selection CSS, tiny labels, hidden rails, and disabled ghost actions make later steps feel brittle.

## Minor Observations

- The active sidebar style in `src/design-system/app-shell.tsx:92` trips the side-tab detector. Use a filled selected background, icon color, or subtle full-border treatment instead of a 4px left border.
- Badge fatigue is building: Recommended, Selected, Also works, Read-only in v1, Only v1 preset, Draft, Pending.
- The `Workout Plan Builder` kicker at `src/plan-builder/components/plan-builder-page.tsx:68` is acceptable once, but the detector sees it as eyebrow-chip-like. It should stay quiet and not become a repeated visual crutch.
- Mobile Split is long: actions sit around `y=2480` in a `390x844` viewport. That is not automatically wrong, but it argues for tighter progressive disclosure.

## Questions to Consider

- What is the one thing the user should do on Exercise Selection, and what can wait until Review?
- Should the app optimize for "no desktop scroll" or "no unnecessary decision friction"?
- Would every step be stronger if it followed one stable pattern: choose, see why, continue?
