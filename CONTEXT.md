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

**Training Frequency**:
The number of days per week the user can realistically train. In the first version, valid choices are 2, 3, 4, or 5 days/week; it constrains valid later choices in the **Plan Builder** without forcing a single split for every frequency, and it does not describe which weekdays the user trains.
_Avoid_: Schedule, availability

**Training Split**:
The high-level pattern for distributing training sessions across a week within a **Plan Blueprint** or generated **Training Plan**. A **Training Split** is selected after **Training Frequency** and can imply a suggested weekly layout without generating workout details.
_Avoid_: Split string, routine type

**Training Goal**:
The outcome the user wants the **Training Plan** to optimize for. The current **Plan Builder** assumes the goal is Build Muscle rather than asking the user to choose one.
_Avoid_: Objective, routine type

## Example Dialogue

Developer: "When the user finishes the Plan Builder, do we save the Plan Blueprint?"

Domain expert: "No. The Plan Blueprint is only the setup state. Finishing the builder generates a Training Plan, and that is what the user follows."
