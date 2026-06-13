---
timestamp: 2026-06-10T20-15-21Z
slug: src-design-system-stepper-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Current step is visually clear, but failed future-step clicks provide no visible status or explanation. |
| 2 | Match System / Real World | 3 | It now reads like a stepper, but active-looking future steps imply navigation that the app does not currently allow. |
| 3 | User Control and Freedom | 2 | Users are offered controls that appear clickable, but clicking Rep ranges from Frequency leaves them on the same screen. |
| 4 | Consistency and Standards | 3 | The segmented navigation pattern is recognizable and product-appropriate, though button behavior does not match the standard affordance. |
| 5 | Error Prevention | 2 | The UI invites invalid navigation instead of preventing it with locked/disabled state or a prerequisite message. |
| 6 | Recognition Rather Than Recall | 3 | Step labels and numbers are visible; the missing piece is prerequisite recognition for future steps. |
| 7 | Flexibility and Efficiency | 2 | Fast navigation is suggested but not actually available for future steps. |
| 8 | Aesthetic and Minimalist Design | 3 | Compact and restrained, but desktop labels are very small and the segmented shell is slightly card-like. |
| 9 | Error Recovery | 1 | No inline feedback appears when a future-step click cannot complete. |
| 10 | Help and Documentation | 2 | The component does not tell the user which steps are available now or what unlocks the next step. |
| **Total** | | **24/40** | **Functional affordance gap** |

#### Anti-Patterns Verdict

**LLM assessment**: This no longer has the obvious "card with options" problem. It reads as a compact product stepper, with current state, numbered stops, and a restrained palette. The remaining AI-slop risk is not visual decoration, it is an affordance mismatch: everything looks equally available, but the product flow silently rejects future navigation.

**Deterministic scan**: `detect.mjs --json src/design-system/stepper.tsx` returned `[]`. No automated slop findings were reported for the markup target.

**Visual overlays**: No reliable user-visible overlay is available. The bundled live overlay server was attempted and failed with `Timed out waiting for live server to start`; fallback browser evidence was used instead.

#### Overall Impression

The stepper is visually much closer to the intended mental model: a compact route navigator instead of a passive card. The single biggest opportunity is behavioral clarity. If future steps are not reachable yet, they must not look like normal enabled navigation.

#### What's Working

- The full step target is now visible. Each step has a segment surface instead of relying only on a small dot and label.
- Current-step state is clear. The teal numbered dot and selected segment make "Frequency" easy to locate.
- Basic accessibility and responsive structure are in decent shape. Render checks showed 46px mobile/tablet targets, 51px desktop targets, visible focus outline, and no horizontal overflow.

#### Priority Issues

**[P1] Active-looking future steps do not navigate**

**Why it matters**: The UI says "click to navigate," but clicking `Go to Rep ranges step` from Frequency leaves the user on `Training schedule`. This breaks trust immediately because the primary affordance does not honor its promise.

**Fix**: Give steps explicit availability states. Use enabled buttons only for reachable steps. Render unavailable future steps as disabled/locked segments with a short reason such as `Complete Training schedule first`, or allow navigation and show the destination with incomplete-state guidance.

**Suggested command**: `$impeccable harden stepper navigation states`

**[P1] No feedback when a step click is rejected**

**Why it matters**: If the router or blueprint guard blocks navigation, the user gets no explanation. They may assume the app is broken.

**Fix**: On blocked navigation, show a small inline status near the stepper or a step-level tooltip/popover on focus and click. Keep it plain: `Choose a training frequency to unlock Rep ranges.`

**Suggested command**: `$impeccable clarify stepper locked-step feedback`

**[P2] Desktop label size is too small for a primary flow control**

**Why it matters**: At desktop, labels render at roughly 10px. This is compact, but the Plan Builder stepper is a key navigation control, not metadata. Small labels make the control feel less confident and reduce scan speed.

**Fix**: Raise desktop labels to the project meta size, around `0.6875rem` to `0.75rem`, and adjust dot/segment spacing rather than shrinking text to fit.

**Suggested command**: `$impeccable typeset stepper labels`

**[P2] Mobile/tablet wrapping still reads slightly like option tiles**

**Why it matters**: The two-column mobile and three-column tablet layouts are usable, but they weaken the linear "stepper" mental model. The ordering is readable, but the path is not continuous.

**Fix**: For small screens, consider a horizontal scrollable step track or a compressed `Step 1 of 5` header with a secondary "Jump to" control for reachable steps. If keeping the grid, add locked/current/complete language so it does not depend only on shape.

**Suggested command**: `$impeccable adapt stepper small screens`

#### Persona Red Flags

**Jordan (First-Timer)**: Jordan sees five clickable-looking steps and taps `Rep ranges` to understand what comes next. The screen stays on `Training schedule` with no explanation. They now have to infer that the first choice is required before navigation works.

**Alex (Power User)**: Alex expects a stepper to be a fast route switcher. The segments look like efficient navigation, but future steps are non-functional. This makes the workflow feel slower than the affordance promised.

**Sam (Keyboard User)**: Sam can focus the future-step buttons and gets a visible outline, which is good. The problem is that activating a focused future step does not produce a clear result or status announcement, so keyboard feedback is incomplete.

#### Minor Observations

- The current step is a non-interactive `span`, which is acceptable, but visually it is close to the buttons. That works only if unavailable steps get their own clear state.
- The connector line on desktop helps the stepper read linearly; the grid variants lose that benefit.
- Contrast is strong in measured states: inactive label approximately 10.2:1, current label approximately 7.5:1, muted dot approximately 5.75:1, and white-on-teal approximately 5.3:1.
- The component has reduced-motion handling, which fits product UI expectations.

#### Questions to Consider

- Should future steps be blocked until prerequisites are complete, or should users be allowed to preview them with incomplete-state guidance?
- If a step is locked, what is the shortest useful reason the user needs at the moment of click or focus?
- Is the mobile stepper trying to be navigation, progress display, or both? The answer should determine whether it stays as a grid.
