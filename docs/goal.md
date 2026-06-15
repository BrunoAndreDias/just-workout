# Just Workout — 6-week training cycle rotation system

## Objective

Implement a 6-week training cycle system where a training plan can evolve automatically after each cycle.

At the end of 6 weeks, the app should generate the next cycle by rotating exercises, especially main compounds, and prefill suggested loads based on the previous cycle history.

## Core behaviour

### 1. Training cycle model

Add support for training cycles / mesocycles.

Each cycle should track:

- cycle number
- start date
- end date
- week number inside cycle: 1 to 6
- previous cycle id, when available
- generated plan id / related plan id
- status: active, completed, upcoming

### 2. Exercise rotation

When a 6-week cycle is completed, generate a new cycle.

For main compounds:

- Prefer replacing the current main compound with an exercise from the same movement pattern rotation pool.
- Keep the movement pattern compatible.
- Never break required movement coverage.

Required movement patterns:

- Horizontal push
- Horizontal pull
- Vertical pull
- Quad dominant
- Hip / hamstring dominant

Recommended movement pattern:

- Vertical push, unless the selected split later requires it.

For secondary and accessory exercises:

- Rotate them when valid alternatives exist.
- Do not force replacement if no good alternative exists.
- Keep movement pattern, muscle group and exercise role compatible.

### 3. Load carry-over and prefill

When creating the next cycle, inspect completed workout history from the previous cycle.

For each exercise:

- If the exact same exercise existed before, use the latest successfully completed working-set load.
- If the exercise is new but belongs to the same movement pattern, estimate from the previous movement pattern history.
- Apply a conservative reset:
  - same or very similar exercise: previous load × 0.95
  - different but compatible exercise: previous load × 0.90
- Round to the nearest available load increment.
- Store this as a suggested prefilled load, not a locked value.
- Allow the user to edit the value.

For bodyweight exercises:

- Preserve bodyweight logic.
- If assistance or added load exists, adjust that value instead of treating it like a normal barbell load.

### 4. Weekly intensity progression

Each 6-week cycle should progress from easier to harder.

Default RIR progression:

- Week 1: 3 RIR
- Week 2: 2–3 RIR
- Week 3: 2 RIR
- Week 4: 1–2 RIR
- Week 5: 1 RIR
- Week 6: 0–1 RIR

Behaviour:

- Weeks 1 and 2 should feel easier because of the conservative load reset.
- Week 3 should start to feel challenging.
- Weeks 5 and 6 should be hard.
- Main compounds should generally stop at 1 RIR by default.
- Isolation/accessory exercises may reach 0 RIR on the last set if supported.
- Do not force unsafe failure on heavy compounds by default.

### 5. Progression inside the cycle

Use a simple double-progression style:

- Each exercise has a rep range.
- If the user completes all planned sets at the top of the rep range with the target RIR or easier, suggest increasing load next time.
- If the user misses the lower end of the rep range, keep or reduce load.
- If the set was harder than expected, avoid increasing load.
- Use completed set data, not only planned values.

### 6. UI requirements

Add a simple cycle summary to the active plan screen:

Example:

- Cycle 2 · Week 3 of 6
- Current focus: building intensity
- 3 weeks until exercise rotation

Add calm helper text:

“After week 6, Just Workout can rotate exercises and prefill starting loads based on your previous cycle.”

At the end of week 6, show a “Generate next cycle” action.

Before applying the new cycle, show a preview with:

- exercises kept
- exercises rotated
- previous load
- suggested starting load
- reason for the suggestion, for example: “same movement pattern, -5% reset”

Allow the user to accept all or edit before saving.

### 7. Architecture

Keep the implementation incremental and maintainable.

Create pure domain functions for:

- detecting completed 6-week cycles
- selecting rotation exercises
- estimating next-cycle starting loads
- generating weekly RIR targets
- applying progression rules

Add or update types for:

- training cycle
- rotation result
- load suggestion
- weekly intensity target

Keep domain logic separate from UI.

### 8. Tests

Add tests for:

- a new cycle can be generated after 6 completed weeks
- main compounds rotate within the same movement pattern
- required movement coverage is preserved
- same exercise uses previous load × 0.95
- different compatible exercise uses previous load × 0.90
- week 1 is easier than week 6
- week 6 reaches 0–1 RIR
- user-edited suggested loads are preserved
- missing workout history falls back to safe defaults

## Constraints

- Do not redesign the whole app.
- Do not change unrelated screens.
- Do not make the UI card-heavy.
- Keep the Just Workout style: warm ivory background, deep petrol/teal accent, calm premium SaaS, minimal and guided.
- Use the smallest necessary data model changes.
- Prefer readable domain functions over clever abstractions.