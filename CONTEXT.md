# Just Workout

Just Workout is a personal training context for planning, performing, and tracking strength workouts.

## Language

**Just Workout**:
The product name for the personal training app.
_Avoid_: StrongPlan

**Training Plan**:
The final generated plan a user follows for their training. A **Training Plan** is created deliberately from a completed **Plan Blueprint**, contains the workout structure the user will perform over time, and keeps the **Training Frequency** it was built for.
_Avoid_: Routine, program

**Active Training Plan**:
The **Training Plan** the user currently follows. Generating a new **Training Plan** makes it the **Active Training Plan** instead of any previous one.
_Avoid_: Current routine, selected program

**Training Block**:
A defined span of time within a **Training Plan** before selected exercises are reviewed or rotated for a different training stimulus. The default **Training Block** length is 6 weeks.
_Avoid_: Mesocycle, phase, cycle

**Workout Template**:
A reusable workout structure inside a **Training Plan** that represents one session the user can perform. In the first generated **Training Plan**, **Workout Templates** are split-derived structures with concrete exercise slots, while exact sets, reps, progression, and future user configurability can be added later.
_Avoid_: Workout day, generated routine

**Superset Group**:
The default exercise grouping inside a generated **Workout Template**, where related concrete exercise slots are performed together before moving to the next group. A **Superset Group** can combine main compound work, secondary movement work, abs, or isolation work, and its exact structure can become configurable later.
_Avoid_: Superset approach, circuit

**Main Superset Group**:
A **Superset Group** that contains the primary compound work for a **Workout Template**. By default, main upper supersets pair pull and push movement patterns with abs, and main lower supersets pair quad-dominant and hip/hamstring-dominant movement patterns with abs.
_Avoid_: Compound circuit, main block

**Isolation Finisher**:
The final **Superset Group** in a generated **Workout Template** for smaller or more targeted exercises after the main compound work. The default lower **Isolation Finisher** contains lower isolation exercises, does not add a third abs slot, and must not repeat exercises already used as main or secondary work in the same **Workout Template**.
_Avoid_: Accessory block, burnout

**Default Abs Exposure**:
The current generated-plan default of exactly two abs exercise slots per **Workout Template**. Abs appear in the main compound **Superset Groups** by default, not as an unbounded filler exercise in every group, and each abs slot should use a different abs exercise from the other abs slot in that **Workout Template**.
_Avoid_: Core placeholder, optional abs slot

**Lower Superset Template**:
The default lower-body **Workout Template** structure with two **Main Superset Groups** plus one **Isolation Finisher**. The first lower main superset emphasizes the quad-dominant main compound and pairs it with a hip/hamstring secondary exercise plus abs; the second emphasizes the hip/hamstring main compound and pairs it with a quad secondary exercise plus abs.
_Avoid_: Single lower superset, lower circuit

**Plan Blueprint**:
The in-progress set of choices a user makes before generating a **Training Plan**. A new **Plan Blueprint** starts with a 3 days/week **Training Frequency**, and an unfinished **Plan Blueprint** can be resumed before generation.
_Avoid_: Draft routine, temporary plan

**Plan Builder**:
The guided flow where a user creates a **Plan Blueprint** and generates a **Training Plan**.
_Avoid_: Routine builder, program wizard

**Generate Step**:
The final **Plan Builder** step where a user generates a **Training Plan** from the completed **Plan Blueprint**. A **Generate Step** can include a final blueprint review, but its canonical purpose is generation.
_Avoid_: Review step, final review

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

**Main Compound Selection**:
A **Plan Blueprint** choice that names the primary compound exercise selected as the foundation for a required or recommended **Movement Pattern**. **Main Compound Selections** are actual plan-building choices and are evaluated before the **Training Plan** is generated.
_Avoid_: Preferred exercise, catalog row, generated exercise

**Main Compound Rotation Pool**:
The set of alternative compound exercises associated with a **Main Compound Selection** that share its **Movement Pattern** and primary muscle group so **Just Workout** can replace that selected exercise at a **Training Block** boundary. A **Main Compound Rotation Pool** supports a different training stimulus over time; it does not include the current **Main Compound Selection** and does not add extra **Weekly Movement Coverage**.
_Avoid_: Multiple main compound selections, preferred compounds, variation list

**Rotation Pool Compound Exercise**:
An eligible alternative compound exercise inside a **Main Compound Rotation Pool**. A **Rotation Pool Compound Exercise** can replace the current **Main Compound Selection** only when it shares the same **Movement Pattern** and primary muscle group.
_Avoid_: Alternate compound, backup exercise, variation

**Main Compound Rotation Proposal**:
A suggested set of main compound replacements presented at a **Training Block** boundary. A **Main Compound Rotation Proposal** may include only some **Main Compound Selections**, and the user confirms, skips, or changes the proposed replacements before they affect the **Training Plan**.
_Avoid_: Automatic exercise swap, hidden rotation, forced replacement

**User-Defined Exercise**:
An exercise added by the user because it is not already available in Just Workout's exercise catalog. A **User-Defined Exercise** must identify its primary muscle group, optional secondary muscle groups, movement pattern, and compound-or-isolation role so Just Workout can evaluate whether it fits a **Training Plan**.
_Avoid_: Custom exercise, free-text exercise

**Primary Muscle Group**:
The main muscle group a **User-Defined Exercise** is intended to train directly. A **User-Defined Exercise** must have exactly one **Primary Muscle Group** so Just Workout can evaluate coverage and exercise fit.
_Avoid_: Main body part, target area

**Secondary Muscle Group**:
A muscle group that receives meaningful indirect work from a **User-Defined Exercise**. **Secondary Muscle Groups** are optional and describe meaningful supporting work without replacing the **Primary Muscle Group**.
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

**Full-Body Template Focus**:
The emphasis used when arranging main compounds inside a **Full Body** **Workout Template**. The current default is upper-focused and not yet user-configurable: each core full-body superset pairs two upper-body main compounds with one lower-body main compound, with no abs inside the core supersets. A future lower-focused option can invert that ratio while keeping the same two core superset structure.
_Avoid_: Full-body mode, body emphasis

**Workout Block**:
A grouped section inside a generated **Workout Template**. The default block types are superset, isolation, and abs. Upper templates generate two complementary push/pull/abs superset blocks, Lower templates generate two complementary quad-dominant/hip-hamstring/abs superset blocks, and Full Body templates generate two upper-focused full-body superset blocks plus accessory work.
_Avoid_: UI superset setting, configurable circuit

**Workout Exercise Role**:
The role an exercise fills inside a generated **Workout Block**: main compound, secondary compound, isolation, or abs. Main compounds carry the primary movement for the block; secondary compounds provide the complementary movement; isolation and abs exercises belong in accessory or abs blocks unless the default Upper/Lower superset rule explicitly includes abs.
_Avoid_: Exercise type, set style

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

## Example Dialogue

Developer: "When the user finishes the Plan Builder, do we save the Plan Blueprint?"

Domain expert: "No. The Plan Blueprint is only the setup state. Finishing the builder generates a Training Plan, and that is what the user follows."
