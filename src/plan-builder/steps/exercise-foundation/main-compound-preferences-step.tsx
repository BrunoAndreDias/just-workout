import { ArrowLeft, ArrowRight, Dumbbell, ListChecks } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type {
  CompoundCapableMovementPatternId,
  ExerciseCatalogMuscleGroupId,
} from "../../exercise-catalog";
import type { IsolationExercisePreferenceReadModel } from "../../isolation-exercise-preference-read-model";
import type { MainCompoundPreferenceReadModel } from "../../main-compound-preference-read-model";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";
import { IsolationExercisePreferencesPicker } from "./isolation-exercise-preferences-picker";
import { MainCompoundPickerToggleButton } from "./main-compound-picker-toggle-button";
import { MainCompoundPreferencesPicker } from "./main-compound-preferences-picker";
import "./exercise-foundation-step.css";
import "./main-compound-drawer.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type MainCompoundPreferencesStepProps = {
  isolationReadModel: IsolationExercisePreferenceReadModel;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onIsolationExercisePreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    primaryMuscleGroup: ExerciseCatalogMuscleGroupId;
  }) => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  readModel: MainCompoundPreferenceReadModel;
};

type PreferenceBucketRowProps = {
  helperText: string;
  icon: ReactNode;
  isPickerOpen: boolean;
  metadata: string;
  onTogglePicker: () => void;
  preferences: ReadonlyArray<{ exerciseId: string; exerciseName: string }>;
  title: string;
  titleBadge: string;
  togglePickerId: string;
};

export function MainCompoundPreferencesStep({
  isolationReadModel,
  onBackToVolume,
  onContinueToGenerate,
  onIsolationExercisePreferencesChange,
  onMainCompoundPreferencesChange,
  readModel,
}: MainCompoundPreferencesStepProps) {
  const [activePickerPattern, setActivePickerPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [activeIsolationPickerMuscleGroup, setActiveIsolationPickerMuscleGroup] =
    useState<ExerciseCatalogMuscleGroupId | null>(null);
  const activePickerRow =
    activePickerPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activePickerPattern);
  const activeIsolationPickerRow =
    activeIsolationPickerMuscleGroup === null
      ? undefined
      : isolationReadModel.rows.find(
          (row) => row.primaryMuscleGroup === activeIsolationPickerMuscleGroup,
        );

  async function handleMainCompoundPreferencesChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onMainCompoundPreferencesChange({
      exerciseIds,
      movementPattern,
    });
  }

  async function handleIsolationExercisePreferencesChange(
    primaryMuscleGroup: ExerciseCatalogMuscleGroupId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onIsolationExercisePreferencesChange({
      exerciseIds,
      primaryMuscleGroup,
    });
  }

  return (
    <div className="grid gap-6">
      <StepPanel
        aria-labelledby="main-compound-preferences-title"
        className="exercise-foundation-panel"
      >
        <div className="exercise-foundation-workspace">
          <div className="exercise-foundation-main">
            <section
              aria-label="Exercise preferences status"
              className="exercise-foundation-status"
            >
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <ListChecks size={22} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="sr-only" id="main-compound-preferences-title">
                  Exercise preferences overview
                </h3>
                <p className="exercise-foundation-status__title">
                  {`${readModel.rankedBucketCount} main compound buckets ranked · ${isolationReadModel.rankedBucketCount} isolation buckets ranked`}
                </p>
                <p className="exercise-foundation-status__body">
                  Rank main compounds and optional isolation work. Empty buckets stay valid and
                  Recommended Defaults can still fill gaps later.
                </p>
              </div>
            </section>

            <section
              aria-label="Main compound preferences status"
              className="exercise-foundation-status"
            >
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <ListChecks size={22} strokeWidth={2.4} />
              </span>
              <div>
                <p className="exercise-foundation-status__title">{readModel.summary}</p>
                <p className="exercise-foundation-status__body">{readModel.guidance}</p>
              </div>
            </section>

            <section
              aria-label="Main compound preference buckets"
              className="exercise-foundation-card"
            >
              <ul aria-label="Main compound preference rows" className="exercise-foundation-list">
                {readModel.rows.map((row) => {
                  const isPickerOpen = activePickerPattern === row.movementPattern;

                  return (
                    <PreferenceBucketRow
                      helperText={row.helperText}
                      icon={
                        <span
                          aria-hidden="true"
                          className={`exercise-foundation-row__icon ${getFoundationIconClassName(row.movementPattern)}`}
                        >
                          <FoundationPatternIcon movementPattern={row.movementPattern} />
                        </span>
                      }
                      isPickerOpen={isPickerOpen}
                      key={row.movementPattern}
                      metadata={row.metadata}
                      onTogglePicker={() =>
                        setActivePickerPattern((currentPattern) =>
                          currentPattern === row.movementPattern ? null : row.movementPattern,
                        )
                      }
                      preferences={row.preferences}
                      title={row.movementPatternLabel}
                      titleBadge="Universal movement pattern"
                      togglePickerId={`main-compound-preferences-picker-${row.movementPattern}`}
                    />
                  );
                })}
              </ul>
            </section>

            <section
              aria-label="Isolation exercise preferences status"
              className="exercise-foundation-status"
            >
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <Dumbbell size={22} strokeWidth={2.4} />
              </span>
              <div>
                <p className="exercise-foundation-status__title">{isolationReadModel.summary}</p>
                <p className="exercise-foundation-status__body">{isolationReadModel.guidance}</p>
              </div>
            </section>

            <section
              aria-label="Isolation exercise preference buckets"
              className="exercise-foundation-card"
            >
              <ul
                aria-label="Isolation exercise preference rows"
                className="exercise-foundation-list"
              >
                {isolationReadModel.rows.map((row) => {
                  const isPickerOpen = activeIsolationPickerMuscleGroup === row.primaryMuscleGroup;

                  return (
                    <PreferenceBucketRow
                      helperText={row.helperText}
                      icon={
                        <span aria-hidden="true" className="exercise-foundation-row__icon">
                          <Dumbbell size={16} strokeWidth={2} />
                        </span>
                      }
                      isPickerOpen={isPickerOpen}
                      key={row.primaryMuscleGroup}
                      metadata={row.metadata}
                      onTogglePicker={() =>
                        setActiveIsolationPickerMuscleGroup((currentMuscleGroup) =>
                          currentMuscleGroup === row.primaryMuscleGroup
                            ? null
                            : row.primaryMuscleGroup,
                        )
                      }
                      preferences={row.preferences}
                      title={row.primaryMuscleGroupLabel}
                      titleBadge="Primary muscle group"
                      togglePickerId={`isolation-exercise-preferences-picker-${row.primaryMuscleGroup}`}
                    />
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        <div>
          <StepActions>
            <Button onClick={onBackToVolume} size="step" type="button" variant="outline">
              <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
              Back to Volume
            </Button>
            <Button
              onClick={() => {
                void onContinueToGenerate();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              Continue to Generate
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </Button>
          </StepActions>
        </div>
      </StepPanel>

      {activePickerRow ? (
        <MainCompoundPreferencesPicker
          id={`main-compound-preferences-picker-${activePickerRow.movementPattern}`}
          mainCompoundOptions={activePickerRow.mainCompoundOptions}
          movementPattern={activePickerRow.movementPattern}
          movementPatternLabel={activePickerRow.movementPatternLabel}
          onChange={(exerciseIds) =>
            handleMainCompoundPreferencesChange(activePickerRow.movementPattern, exerciseIds)
          }
          onClose={() => setActivePickerPattern(null)}
          preferenceExerciseIds={activePickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
        />
      ) : null}
      {activeIsolationPickerRow ? (
        <IsolationExercisePreferencesPicker
          id={`isolation-exercise-preferences-picker-${activeIsolationPickerRow.primaryMuscleGroup}`}
          isolationOptions={activeIsolationPickerRow.isolationOptions}
          onChange={(exerciseIds) =>
            handleIsolationExercisePreferencesChange(
              activeIsolationPickerRow.primaryMuscleGroup,
              exerciseIds,
            )
          }
          onClose={() => setActiveIsolationPickerMuscleGroup(null)}
          preferenceExerciseIds={activeIsolationPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
          primaryMuscleGroup={activeIsolationPickerRow.primaryMuscleGroup}
          primaryMuscleGroupLabel={activeIsolationPickerRow.primaryMuscleGroupLabel}
        />
      ) : null}
    </div>
  );
}

function PreferenceBucketRow({
  helperText,
  icon,
  isPickerOpen,
  metadata,
  onTogglePicker,
  preferences,
  title,
  titleBadge,
  togglePickerId,
}: PreferenceBucketRowProps) {
  return (
    <li className="exercise-foundation-row">
      <div className="exercise-foundation-row__grid">
        <div className="exercise-foundation-row__pattern">
          {icon}
          <div className="min-w-0">
            <div className="exercise-foundation-row__heading">
              <h4>{title}</h4>
              <span>{titleBadge}</span>
            </div>
            <p className="exercise-foundation-row__helper">{helperText}</p>
          </div>
        </div>

        <div className="exercise-foundation-row__selection">
          <p>{preferences[0]?.exerciseName ?? "No preferences ranked yet."}</p>
          <span>{metadata}</span>
        </div>

        <div className="exercise-foundation-row__actions">
          <MainCompoundPickerToggleButton
            isOpen={isPickerOpen}
            label={preferences.length > 0 ? "Edit ranking" : "Rank preferences"}
            onToggle={onTogglePicker}
            pickerId={togglePickerId}
          />
        </div>
      </div>

      {preferences.length > 0 ? (
        <ol
          className="exercise-foundation-row__preferences"
          aria-label={`${title} ranked preferences`}
        >
          {preferences.map((preference, index) => (
            <li key={preference.exerciseId}>
              {index + 1}. {preference.exerciseName}
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}
