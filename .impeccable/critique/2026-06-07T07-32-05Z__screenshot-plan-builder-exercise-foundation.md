---
target: "screenshot: plan builder exercise foundation"
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-06-07T07-32-05Z
slug: screenshot-plan-builder-exercise-foundation
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Missing required pattern is clear, but rotation pool lock state is under-explained. |
| 2 | Match System / Real World | 3 | Movement-pattern language is good; training block rotation is not visible enough yet. |
| 3 | User Control and Freedom | 2 | User can choose/change main compounds, but cannot yet see or shape future rotation choices. |
| 4 | Consistency and Standards | 3 | Rows, badges, buttons, and right rail are consistent. |
| 5 | Error Prevention | 3 | Missing vertical pull is clearly flagged. |
| 6 | Recognition Rather Than Recall | 2 | The user has to remember what rotation pools are from prior copy. |
| 7 | Flexibility and Efficiency | 2 | Flow is linear and safe, but rotation setup is gated too hard for informed planning. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean product UI, but a few redundant cards compete for attention. |
| 9 | Error Recovery | 3 | Change buttons make correction straightforward. |
| 10 | Help and Documentation | 2 | Microcopy exists, but it does not show examples like pull-up to chin-up. |
| **Total** | | **28/40** | **Solid, with a concept-discoverability gap** |

## Anti-Patterns Verdict

This does not look obviously AI-generated. It reads like a credible product UI: restrained palette, familiar sidebar, clear stepper, predictable row actions. The main weakness is not visual slop, it is product explanation. The screen introduces a domain concept, rotation pools, but treats it like a locked sub-step instead of a future-facing planning decision.

Deterministic scan: clean. The local detector returned no findings for `exercise-foundation-step.tsx`, `exercise-foundation-step.css`, or `plan-builder-route.tsx`.

## Overall Impression

The foundation selection is understandable, but the training-block rotation idea is not yet legible enough. A user can finish the required task, but they may not understand why rotation pools matter or trust what will happen after six weeks.

## What's Working

- The missing required pattern is obvious. The red-tinted vertical pull row, right-rail status, and disabled continue action all point to the same next action.
- The main compound list has good task density. Movement pattern, selected exercise, status, and action are all scannable.
- The stepper and coverage summary give strong orientation. Users know they are in Exercises, with Review still locked.

## Priority Issues

**[P1] Rotation pool is too detached from the compound choice**

Why it matters: The user is choosing anchors for a training block, but the future substitutions are hidden behind a locked section. That makes rotation feel like an afterthought instead of part of the exercise foundation.

Fix: Once a main compound is selected, show its rotation pool inline under that row. Before all required compounds are complete, make it read-only or lightly editable depending on product policy. The inline pool should say: "After 6 weeks, we may rotate this with: Chin Up, Neutral-Grip Pull-Up, Lat Pulldown."

Suggested command: `$impeccable clarify` or `$impeccable layout`

**[P1] The lock copy is technically correct but not helpful enough**

Why it matters: "Unlock after foundation is complete" explains the gate, not the value. The user needs to know this pool supports exercise rotation across a mesocycle.

Fix: Change the bottom module from a generic locked next step to a preview of the future behavior: "Rotation pools prepare optional swaps for the next training block. Pick the main compounds first, then adjust the alternatives."

Suggested command: `$impeccable clarify`

**[P2] The right rail duplicates status but does not help the decision**

Why it matters: The coverage summary repeats selected/missing information from the list. It does not help the user choose the missing vertical pull or understand rotation coverage.

Fix: Keep the required/recommended summary, but add one compact "Next best action" line tied to the active missing pattern: "Choose a vertical pull. Good options: Pull-Up, Chin-Up, Lat Pulldown."

Suggested command: `$impeccable distill`

**[P2] The primary action looks disabled before the user understands the exact blocker**

Why it matters: The disabled bottom CTA is clear, but the label "Select vertical pull to continue" could be more directly connected to the row action.

Fix: Make the CTA label match the row action: "Choose vertical pull exercise". If clicked while disabled is not possible, the visual hierarchy should still point directly to the vertical pull row.

Suggested command: `$impeccable clarify`

## Persona Red Flags

**First-time lifter building a plan**: They can see that vertical pull is missing, but may not understand "horizontal pull", "hip / hamstring dominant", or why a rotation pool matters. They need examples next to concepts.

**Experienced lifter**: They will understand mesocycle rotation and may expect to control the pool immediately. A hard lock can feel unnecessarily paternalistic unless the inline preview makes the future pool visible.

**User with limited time**: The page is mostly efficient, but the sidebar, stepper, list, bottom locked card, right rail, and sticky CTA create many competing places to look. They need one unmistakable next action.

## Minor Observations

- The "4 of 5 required patterns covered" card is useful, but it consumes almost as much visual weight as the actual list.
- "Rotation pools unlock after the foundation is complete" appears in the header and bottom lock. Repetition without an example does not improve comprehension.
- The missing row is well highlighted, but the red wash is wide. Keep it subtle so the row still feels selectable, not erroneous.
- The right rail text at the bottom is small and dense. It is unlikely to be read before the user clicks the vertical pull row.

## Questions to Consider

- Should rotation pools be visible as soon as each main compound is selected, even if the full step is not complete?
- What exact promise should the user understand: "we rotate after 6 weeks", "we may rotate", or "you approve rotations later"?
- Would the main list be stronger if each selected compound had a collapsed "Rotation pool: 3 suggested" line immediately beneath it?
