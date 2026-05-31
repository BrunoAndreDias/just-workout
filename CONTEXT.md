# Just Workout

Just Workout is a personal training context for planning, performing, and tracking strength workouts.

## Language

**Just Workout**:
The product name for the personal training app.
_Avoid_: StrongPlan

**Training Plan**:
The final generated plan a user follows for their training. A **Training Plan** contains the workout structure the user will perform over time and keeps the **Training Frequency** it was built for.
_Avoid_: Routine, program

**Plan Blueprint**:
The in-progress set of choices a user makes before generating a **Training Plan**. A new **Plan Blueprint** starts with a 3 days/week **Training Frequency**, and an unfinished **Plan Blueprint** can be resumed before generation.
_Avoid_: Draft routine, temporary plan

**Plan Builder**:
The guided flow where a user creates a **Plan Blueprint** and generates a **Training Plan**.
_Avoid_: Routine builder, program wizard

**Recommended Default**:
A **Plan Builder** choice that Just Workout preselects and persists because it is the recommended starting point. A **Recommended Default** is a valid **Plan Blueprint** choice, but the user has not actively confirmed that builder step until they continue past it.
_Avoid_: Placeholder, unsaved default

**Confirmed Builder Step**:
A **Plan Builder** step the user has accepted and moved past. A step can have a valid configured choice before it becomes a **Confirmed Builder Step**.
_Avoid_: Dirty state, manually changed step

**Stale Builder Output**:
Downstream **Plan Builder** data that was derived from an earlier upstream choice after that upstream choice changes. Stale output can be preserved for review or recovery, but it no longer represents the current **Plan Blueprint** until the affected step is confirmed again.
_Avoid_: Invalid generated data, broken state

**Training Frequency**:
The number of days per week the user can realistically train. In the first version, valid choices are 2, 3, 4, or 5 days/week; it constrains valid later choices in the **Plan Builder** without forcing a single split for every frequency, and it does not describe which weekdays the user trains.
_Avoid_: Schedule, availability

**Training Split**:
The high-level pattern for distributing training sessions across a week within a **Plan Blueprint** or generated **Training Plan**. A **Training Split** is selected after **Training Frequency** and can imply a suggested weekly layout without generating workout details.
_Avoid_: Split string, routine type

**Training Goal**:
The outcome the user wants the **Training Plan** to optimize for. The current **Plan Builder** assumes the goal is Build Muscle rather than asking the user to choose one.
_Avoid_: Objective, routine type

**Rep Range Style**:
The intensity bias a user chooses in a **Plan Blueprint** before **Training Volume**, exercises, or the generated **Training Plan** exist. A **Rep Range Style** describes broad reps-per-set targets and informs how **Weekly Rep Targets** are estimated as sets and later translated into set and rep targets.
_Avoid_: Intensity setting, rep scheme, programming controls

**Training Volume**:
The planned amount of training work per muscle group across workouts and weeks. **Training Volume** is canonically expressed as **Weekly Rep Targets** and works with **Rep Range Style** when a later **Training Plan** translates that work into set and rep targets.
_Avoid_: Workload, weekly set target

**Volume Preset**:
A **Plan Builder** choice that positions **Weekly Rep Targets** within the source-backed optimal volume range. The Balanced **Volume Preset** is the recommended default for the current intermediate Build Muscle profile.
_Avoid_: Set preset, volume mode

**Weekly Rep Target**:
The total number of reps planned for a muscle group across a week. **Weekly Rep Targets** are the source of truth for **Training Volume**; estimated set counts are derived from them for display and planning.
_Avoid_: Weekly hard sets, set target

**Optional Volume Target**:
A muscle group with source-backed volume guidance that is not included as a direct **Weekly Rep Target** unless the user adds it. Optional muscle groups can be shown in the **Plan Builder** without being part of the configured **Training Volume** yet.
_Avoid_: Missing volume, untracked muscle

**Preset-Derived Volume Target**:
A **Weekly Rep Target** that comes from the selected **Volume Preset** rather than a user adjustment. Preset-derived targets can update when the **Volume Preset** changes.
_Avoid_: Static target, copied preset value

**Custom Volume Override**:
A user-adjusted **Weekly Rep Target** that should be preserved when the **Volume Preset** changes. Custom overrides take precedence over preset-derived targets for the same muscle group.
_Avoid_: Manual tweak, dirty target

**Secondary Direct Volume Target**:
A muscle group that receives a direct **Weekly Rep Target** below the larger muscle-group range because it also receives meaningful indirect work from compound exercises. Shoulders are a **Secondary Direct Volume Target** in the current **Plan Builder**.
_Avoid_: Main target, accessory-only target

**Hamstrings/Glutes Row**:
The user-facing **Plan Builder** row for the baseline hamstrings **Weekly Rep Target**. It does not create a separate baseline glutes target; glute specialization would be an optional product-specific override.
_Avoid_: Glutes baseline target, separate glutes target

## Example Dialogue

Developer: "When the user finishes the Plan Builder, do we save the Plan Blueprint?"

Domain expert: "No. The Plan Blueprint is only the setup state. Finishing the builder generates a Training Plan, and that is what the user follows."
