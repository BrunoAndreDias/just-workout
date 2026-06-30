# Just Workout

Just Workout is a personal training context for planning, performing, and tracking strength workouts.

## Language

**Just Workout**:
The product name for the personal training app.
_Avoid_: StrongPlan

**Training Plan**:
The final generated plan a user follows for their training. A **Training Plan** is created deliberately from a completed **Plan Builder**, contains the workout structure the user will perform over time, and keeps the **Training Frequency** it was built for.
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

**Plan Builder**:
The workspace and in-progress set of choices a user uses before generating a **Training Plan**. A new **Plan Builder** starts with a 3 days/week **Training Frequency**, and unfinished **Plan Builder** choices can be resumed before generation.
_Avoid_: Plan Blueprint, Builder Overview, routine builder, program wizard

**Generate Step**:
The final **Plan Builder** step where a user generates a **Training Plan** from completed **Plan Builder** choices. A **Generate Step** can include a final builder review, but its canonical purpose is generation.
_Avoid_: Review step, final review

**Exercises Step**:
The **Plan Builder** step where a user chooses **Main Compound Preferences**, **Main Compound Rotation Preferences**, **Isolation Exercise Preferences**, and avoided **Exercise Selection Preferences** from the exercise catalog. An **Exercises Step** can be opened from a new **Plan Builder** without manually completing earlier steps first, because exercise preferences do not depend on **Training Frequency**, **Training Split**, **Rep Range Style**, or **Training Volume**.
_Avoid_: Exercise Foundation, custom workout builder, final workout slots

**Recommended Default**:
A **Plan Builder** choice that Just Workout can use because it is the recommended starting point. A **Recommended Default** is a valid **Plan Builder** choice; once the user accepts generation with defaults, those defaults become ordinary **Plan Builder** choices.
_Avoid_: Placeholder, unsaved default

**Default Generation Confirmation**:
The moment when a user asks to generate a **Training Plan** while some required **Plan Builder** choices still rely on **Recommended Defaults**. The confirmation names the defaults Just Workout will use before generation continues.
_Avoid_: Missing-step warning, final review

**Configured Builder Section**:
A **Plan Builder** section whose current choices are valid for the current **Plan Builder**. A section can be configured whether or not the user visited sections in order or clicked a continue action.
_Avoid_: Confirmed step, dirty state, manually changed step

**Stale Builder Output**:
Downstream **Plan Builder** data that was derived from an earlier upstream choice after that upstream choice changes. Stale output can be preserved for review or recovery, but it no longer represents the current **Plan Builder** until the affected section is configured again.
_Avoid_: Invalid generated data, broken state

**Training Frequency**:
The number of days per week the user can realistically train. In the first version, valid choices are 2, 3, 4, or 5 days/week; it constrains valid later choices in the **Plan Builder** without forcing a single split for every frequency, and it does not describe which weekdays the user trains.
_Avoid_: Schedule, availability

**Training Week**:
A selected seven-day span used to review completed Training Sessions for an Active Training Plan. A **Training Week** can be anchored to the plan's training rhythm rather than a calendar week, and can be compared with the previous **Training Week**.
_Avoid_: Calendar week, reporting period

**Training Split**:
The high-level pattern for distributing training sessions across a week within the **Plan Builder** or generated **Training Plan**. A **Training Split** is selected after **Training Frequency** and can imply a suggested weekly layout without generating workout details.
_Avoid_: Split string, routine type

**Training Goal**:
The outcome the user wants the **Training Plan** to optimize for. The current **Plan Builder** assumes the goal is Build Muscle rather than asking the user to choose one.
_Avoid_: Objective, routine type

**Rep Range Style**:
The intensity bias a user chooses in the **Plan Builder** before **Training Volume**, exercises, or the generated **Training Plan** exist. A **Rep Range Style** describes broad reps-per-set targets and informs how **Weekly Rep Targets** are estimated as sets and later translated into set and rep targets.
_Avoid_: Intensity setting, rep scheme, programming controls

**Training Volume**:
The planned amount of training work per muscle group across workouts and weeks. **Training Volume** is canonically expressed as **Weekly Rep Targets** and works with **Rep Range Style** when a later **Training Plan** translates that work into set and rep targets.
_Avoid_: Workload, weekly set target

**Completed Load Volume**:
The amount of completed loaded work from Training Sessions, calculated from weight multiplied by reps and grouped by session, week, or Movement Pattern.
_Avoid_: Training Volume, workload, tonnage

**Loaded Set**:
A completed set with positive external weight and positive reps. Bodyweight-only work can be part of a Training Session, but it is not a **Loaded Set** unless external weight is recorded.
_Avoid_: Completed set, bodyweight set

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
A generation-ready choice that names the primary compound exercise selected as the foundation for a required or recommended **Movement Pattern**. **Main Compound Selections** are derived from **Exercise Selection Preferences** and **Weekly Movement Coverage** before the **Training Plan** is generated.
_Avoid_: Exercise preference, catalog row, generated exercise

**Exercise Selection Preference**:
A **Plan Builder** choice that marks a catalog exercise as preferred or avoided before the final workout structure is known. **Exercise Selection Preferences** are independent of **Training Frequency**, **Training Split**, **Rep Range Style**, and **Training Volume**; later generation maps them into valid **Main Compound Selections**, accessory choices, or exclusions. Avoided exercises are hard exclusions because they can represent injury limits, unavailable equipment, or exercises the user does not know how to perform safely. If avoided exercises leave no valid option for a required **Movement Pattern**, generation should block with a clear problem instead of using an avoided exercise.
_Avoid_: Main Compound Selection, final exercise slot, workout exercise

**Main Compound Preference**:
A ranked preferred catalog exercise the user would like Just Workout to consider for main compound work before the final workout structure is known. **Main Compound Preferences** belong to a **Movement Pattern** bucket; the highest-ranked valid preference is the strongest candidate, and lower-ranked preferences are fallback candidates. A **Main Compound Preference** can become a **Main Compound Selection** only if it fits that pattern's **Weekly Movement Coverage** role. Empty movement-pattern buckets are valid in the **Exercises Step**; generation fills them with **Recommended Defaults** when needed.
_Avoid_: Main Compound Selection, final slot, required lift, unordered favorite

**Main Compound Rotation Preference**:
A ranked preferred catalog exercise the user would like available as a future rotation alternative inside a **Movement Pattern** bucket before the final main compound is selected. **Main Compound Rotation Preferences** use rank order when Just Workout derives future rotation candidates: the highest-ranked valid preference is the strongest rotation candidate, and lower-ranked preferences are fallback rotation candidates. Empty rotation preference buckets are valid; Just Workout can derive recommended rotation alternatives when needed. A **Main Compound Rotation Preference** can become part of a **Main Compound Rotation Pool** only if the generated **Main Compound Selection** for that bucket exists and the rotation exercise still fits the same movement-pattern and primary-muscle role.
_Avoid_: Rotation Pool Compound Exercise, automatic exercise swap, backup exercise, unordered variation

**Isolation Exercise Preference**:
A ranked preferred catalog exercise the user would like Just Workout to consider for isolation or accessory work before the final workout structure is known. **Isolation Exercise Preferences** belong to **Primary Muscle Group** buckets because isolation work is chosen to target a muscle directly. They are optional guidance, not required choices; empty isolation preference buckets are valid and can be filled with **Recommended Defaults** when needed. They can guide generated accessory choices when they fit the selected **Training Volume**, available workout space, and target muscle group.
_Avoid_: Isolation Finisher, final accessory slot, required isolation exercise

**Main Compound Rotation Pool**:
The generated set of alternative compound exercises associated with a **Main Compound Selection** that share its **Movement Pattern** and primary muscle group so **Just Workout** can replace that selected exercise at a **Training Block** boundary. A **Main Compound Rotation Pool** can be derived from **Main Compound Rotation Preferences**, supports a different training stimulus over time, does not include the current **Main Compound Selection**, and does not add extra **Weekly Movement Coverage**.
_Avoid_: Multiple main compound selections, preferred compounds, preference list

**Rotation Pool Compound Exercise**:
An eligible alternative compound exercise inside a **Main Compound Rotation Pool**. A **Rotation Pool Compound Exercise** can replace the current **Main Compound Selection** only when it shares the same **Movement Pattern** and primary muscle group.
_Avoid_: Alternate compound, backup exercise, variation

**Main Compound Rotation Proposal**:
A suggested set of main compound replacements presented at a **Training Block** boundary. A **Main Compound Rotation Proposal** may include only some **Main Compound Selections**, and the user confirms, skips, or changes the proposed replacements before they affect the **Training Plan**.
_Avoid_: Automatic exercise swap, hidden rotation, forced replacement

**User-Defined Exercise**:
An exercise added by the user because it is not already available in Just Workout's exercise catalog. A **User-Defined Exercise** must identify its primary muscle group, optional secondary muscle groups, movement pattern, and compound-or-isolation role so Just Workout can evaluate whether it fits a **Training Plan**. User-defined exercise creation is a future capability; if no valid catalog exercise remains for a required **Movement Pattern**, generation blocks and explains the problem rather than creating a new exercise inline.
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
The universal set of major **Movement Patterns** a **Training Plan** must cover across the training week before generation. **Training Frequency** and **Training Split** decide how that coverage is arranged, distributed, and explained; they do not remove core compound-capable movement-pattern expectations from a good **Training Plan**.
_Avoid_: Hardcoded exercise checklist, per-day movement requirement

**Coverage Rule Family**:
A group of **Training Splits** that share the same arrangement and explanation style for **Weekly Movement Coverage**. Full Body, Upper/Lower, and Push/Pull/Legs are distinct **Coverage Rule Families** because they place and explain the same core movement-pattern expectations differently.
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
The equipment environment a user chooses in the **Plan Builder** so **Just Workout** knows which exercise categories can be considered during later **Training Plan** generation.
_Avoid_: Equipment checklist, gym inventory

**Full Gym Equipment Preset**:
An **Equipment Preset** indicating broad gym access, including free weights, machines, cables, pull-up options, and bodyweight movements. It expands eligible exercise selection without generating a **Training Plan** by itself.
_Avoid_: All equipment selected, editable equipment list

## Example Dialogue

Developer: "When the user finishes the Plan Builder, do we save the Plan Builder choices?"

Domain expert: "No. The Plan Builder choices are only setup state. Finishing the builder generates a Training Plan, and that is what the user follows."
