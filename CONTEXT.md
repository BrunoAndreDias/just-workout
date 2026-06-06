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

**Exercise Selection Preferences**:
The choices in a **Plan Blueprint** that guide how **Just Workout** should select exercises when generating a **Training Plan**. **Exercise Selection Preferences** describe selection strategy, equipment context, user-preferred exercises, and user-avoided exercises; they are not the generated workout days or final exercise list.
_Avoid_: Generated exercises, workout exercise list, final routine exercises

**Main Compound Selection**:
A **Plan Blueprint** choice that names the primary compound exercise selected as the foundation for a required or recommended **Movement Pattern**. **Main Compound Selections** are actual plan-building choices, not soft **Exercise Selection Preferences**, and they are evaluated before the **Training Plan** is generated.
_Avoid_: Preferred exercise, catalog row, generated exercise

**User-Defined Exercise**:
An exercise added by the user because it is not already available in Just Workout's exercise catalog. A **User-Defined Exercise** must identify its primary muscle group, optional secondary muscle groups, movement pattern, and compound-or-isolation role so Just Workout can evaluate whether it fits a **Training Plan**.
_Avoid_: Custom exercise, free-text exercise

**Primary Muscle Group**:
The main muscle group a **User-Defined Exercise** is intended to train directly. When adding a **User-Defined Exercise** from the body map, the first selected muscle group is the **Primary Muscle Group**.
_Avoid_: Main body part, target area

**Secondary Muscle Group**:
A muscle group that receives meaningful indirect work from a **User-Defined Exercise**. When adding a **User-Defined Exercise** from the body map, muscle groups selected after the **Primary Muscle Group** are **Secondary Muscle Groups**.
_Avoid_: Extra target, supporting area

**Movement Pattern**:
The exercise category that describes the main direction or joint action of a strength exercise, such as horizontal push, vertical pull, quad dominant, or elbow extension. **Movement Patterns** help Just Workout balance opposing work across a workout or week.
_Avoid_: Exercise category, movement type

**Weekly Movement Coverage**:
The set of **Movement Patterns** a **Plan Blueprint** must cover across the training week before **Training Plan** generation. **Weekly Movement Coverage** is evaluated against the selected **Training Frequency** and **Training Split**; it is not a fixed per-screen checklist and does not require every workout day to contain every required pattern.
_Avoid_: Hardcoded exercise checklist, per-day movement requirement

**Coverage Rule Family**:
A group of **Training Splits** that share the same **Weekly Movement Coverage** expectations. Full Body, Upper/Lower, and Push/Pull/Legs are distinct **Coverage Rule Families** because they explain missing movement coverage differently and can treat the same **Movement Pattern** as required or recommended.
_Avoid_: Split id rule, UI checklist variant

**Split Bucket**:
A **Training Split** context used to explain where **Weekly Movement Coverage** belongs, such as Push, Pull, Legs, Upper, Lower, or Full Body. Validation remains canonical by **Movement Pattern**, but user-facing copy can include the **Split Bucket** that is missing coverage.
_Avoid_: Workout day, fixed weekday

**Compound-Capable Movement Pattern**:
A major **Movement Pattern** that can be covered by a **Main Compound Selection**, such as horizontal push, horizontal pull, vertical push, vertical pull, quad dominant, or hip/hamstring dominant. Arm and accessory patterns can contribute useful training work, but they are handled as optional isolation or accessory coverage rather than required **Main Compound Selections**.
_Avoid_: Accessory requirement, arm main lift

**Exercise Role**:
Whether an exercise is compound or isolation for training-plan evaluation. An **Exercise Role** helps Just Workout prioritize main work, add targeted volume, and classify **User-Defined Exercises**.
_Avoid_: Exercise type, lift kind

**Equipment Preset**:
The equipment environment a user chooses in the **Plan Blueprint** so **Just Workout** knows which exercise categories can be considered during later **Training Plan** generation.
_Avoid_: Equipment checklist, gym inventory

**Full Gym Equipment Preset**:
An **Equipment Preset** indicating broad gym access, including free weights, machines, cables, pull-up options, and bodyweight movements. It expands eligible exercise selection without generating a **Training Plan** by itself.
_Avoid_: All equipment selected, editable equipment list

**Preferred Exercise**:
An exercise the user wants **Just Workout** to consider during later **Training Plan** generation. A **Preferred Exercise** is a soft preference and can be used when it fits the **Plan Blueprint**, equipment context, movement-pattern balance, volume targets, safety, and progression.
_Avoid_: Required exercise, guaranteed exercise

**Avoided Exercise**:
An exercise the user marks as painful, unavailable, or unsuitable. An **Avoided Exercise** is a hard exclusion; if no safe viable replacement exists during **Training Plan** generation, **Just Workout** should surface an **Exercise Selection Conflict** rather than silently include it.
_Avoid_: Disliked exercise, low-priority exercise

**Exercise Selection Conflict**:
A blocker found when **Just Workout** cannot generate a safe viable **Training Plan** from the current **Exercise Selection Preferences**. The user must resolve the conflict by removing an exclusion, adjusting equipment or preferences, or explicitly accepting a lower-quality incomplete **Training Plan**.
_Avoid_: Warning, validation message, generation error

## Example Dialogue

Developer: "When the user finishes the Plan Builder, do we save the Plan Blueprint?"

Domain expert: "No. The Plan Blueprint is only the setup state. Finishing the builder generates a Training Plan, and that is what the user follows."
