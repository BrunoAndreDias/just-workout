import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { MainCompoundPreferenceReadModel } from "../../main-compound-preference-read-model";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";
import { MainCompoundPickerToggleButton } from "./main-compound-picker-toggle-button";
import { MainCompoundPreferencesPicker } from "./main-compound-preferences-picker";
import "./exercise-foundation-step.css";
import "./main-compound-drawer.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type MainCompoundPreferencesStepProps = {
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  readModel: MainCompoundPreferenceReadModel;
};

export function MainCompoundPreferencesStep({
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundPreferencesChange,
  readModel,
}: MainCompoundPreferencesStepProps) {
  const [activePickerPattern, setActivePickerPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const activePickerRow =
    activePickerPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activePickerPattern);

  async function handleMainCompoundPreferencesChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onMainCompoundPreferencesChange({
      exerciseIds,
      movementPattern,
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
              aria-label="Main compound preferences status"
              className="exercise-foundation-status"
            >
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <ListChecks size={22} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="sr-only" id="main-compound-preferences-title">
                  Main compound preferences overview
                </h3>
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
                    <li className="exercise-foundation-row" key={row.movementPattern}>
                      <div className="exercise-foundation-row__grid">
                        <div className="exercise-foundation-row__pattern">
                          <span
                            aria-hidden="true"
                            className={`exercise-foundation-row__icon ${getFoundationIconClassName(row.movementPattern)}`}
                          >
                            <FoundationPatternIcon movementPattern={row.movementPattern} />
                          </span>
                          <div className="min-w-0">
                            <div className="exercise-foundation-row__heading">
                              <h4>{row.movementPatternLabel}</h4>
                              <span>Universal movement pattern</span>
                            </div>
                            <p className="exercise-foundation-row__helper">{row.helperText}</p>
                          </div>
                        </div>

                        <div className="exercise-foundation-row__selection">
                          <p>{row.topPreference?.exerciseName ?? "No preferences ranked yet."}</p>
                          <span>{row.metadata}</span>
                        </div>

                        <div className="exercise-foundation-row__actions">
                          <MainCompoundPickerToggleButton
                            isOpen={isPickerOpen}
                            label={row.preferences.length > 0 ? "Edit ranking" : "Rank preferences"}
                            onToggle={() =>
                              setActivePickerPattern((currentPattern) =>
                                currentPattern === row.movementPattern ? null : row.movementPattern,
                              )
                            }
                            pickerId={`main-compound-preferences-picker-${row.movementPattern}`}
                          />
                        </div>
                      </div>

                      {row.preferences.length > 0 ? (
                        <ol
                          className="exercise-foundation-row__preferences"
                          aria-label={`${row.movementPatternLabel} ranked preferences`}
                        >
                          {row.preferences.map((preference, index) => (
                            <li key={preference.exerciseId}>
                              {index + 1}. {preference.exerciseName}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </li>
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
    </div>
  );
}
