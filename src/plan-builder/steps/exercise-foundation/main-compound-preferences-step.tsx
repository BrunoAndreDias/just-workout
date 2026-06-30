import { ArrowLeft, ArrowRight, ListChecks } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../design-system/button";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type {
  MainCompoundPreferenceReadModel,
  MainCompoundPreferenceRowReadModel,
} from "../../main-compound-preference-read-model";
import type { MainCompoundRotationPreferenceReadModel } from "../../main-compound-rotation-preference-read-model";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";
import { MainCompoundPickerToggleButton } from "./main-compound-picker-toggle-button";
import { MainCompoundPreferencesPicker } from "./main-compound-preferences-picker";
import { MainCompoundRotationPreferencesPicker } from "./main-compound-rotation-preferences-picker";
import "./exercise-foundation-step.css";
import "./main-compound-drawer.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type MainCompoundPreferencesStepProps = {
  mainCompoundReadModel: MainCompoundPreferenceReadModel;
  mainCompoundRotationReadModel: MainCompoundRotationPreferenceReadModel;
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  onMainCompoundRotationPreferencesChange: (preferences: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
};

export function MainCompoundPreferencesStep({
  mainCompoundReadModel,
  mainCompoundRotationReadModel,
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundPreferencesChange,
  onMainCompoundRotationPreferencesChange,
}: MainCompoundPreferencesStepProps) {
  const [activePicker, setActivePicker] = useState<{
    kind: "main" | "rotation";
    movementPattern: CompoundCapableMovementPatternId;
  } | null>(null);
  const activeMainCompoundPickerRow =
    activePicker?.kind === "main"
      ? mainCompoundReadModel.rows.find(
          (row) => row.movementPattern === activePicker.movementPattern,
        )
      : undefined;
  const activeRotationPickerRow =
    activePicker?.kind === "rotation"
      ? mainCompoundRotationReadModel.rows.find(
          (row) => row.movementPattern === activePicker.movementPattern,
        )
      : undefined;

  async function handleMainCompoundPreferencesChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onMainCompoundPreferencesChange({
      exerciseIds,
      movementPattern,
    });
  }

  async function handleMainCompoundRotationPreferencesChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onMainCompoundRotationPreferencesChange({
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
                  Exercises preference overview
                </h3>
                <p className="exercise-foundation-status__title">{mainCompoundReadModel.summary}</p>
                <p className="exercise-foundation-status__body">{mainCompoundReadModel.guidance}</p>
              </div>
            </section>

            <PreferenceBucketSection
              buttonLabel="Rank preferences"
              cardAriaLabel="Main compound preference buckets"
              emptySelectionText="No preferences ranked yet."
              headingId="main-compound-preference-buckets-title"
              headingText="Main compound preference buckets"
              isPickerOpen={(movementPattern) =>
                activePicker?.kind === "main" && activePicker.movementPattern === movementPattern
              }
              listAriaLabel="Main compound preference rows"
              onTogglePicker={(movementPattern) =>
                setActivePicker((currentPicker) =>
                  currentPicker?.kind === "main" &&
                  currentPicker.movementPattern === movementPattern
                    ? null
                    : { kind: "main", movementPattern },
                )
              }
              pickerIdPrefix="main-compound-preferences-picker"
              preferenceListLabel="ranked preferences"
              readModelRows={mainCompoundReadModel.rows}
            />

            <section
              aria-label="Main compound rotation preference status"
              className="exercise-foundation-status"
            >
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <ListChecks size={22} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="sr-only" id="main-compound-rotation-preferences-title">
                  Main compound rotation preferences overview
                </h3>
                <p className="exercise-foundation-status__title">
                  {mainCompoundRotationReadModel.summary}
                </p>
                <p className="exercise-foundation-status__body">
                  {mainCompoundRotationReadModel.guidance}
                </p>
              </div>
            </section>

            <PreferenceBucketSection
              buttonLabel="Rank rotation preferences"
              cardAriaLabel="Main compound rotation preference buckets"
              emptySelectionText="No rotation preferences ranked yet."
              headingId="main-compound-rotation-preference-buckets-title"
              headingText="Main compound rotation preference buckets"
              isPickerOpen={(movementPattern) =>
                activePicker?.kind === "rotation" &&
                activePicker.movementPattern === movementPattern
              }
              listAriaLabel="Main compound rotation preference rows"
              onTogglePicker={(movementPattern) =>
                setActivePicker((currentPicker) =>
                  currentPicker?.kind === "rotation" &&
                  currentPicker.movementPattern === movementPattern
                    ? null
                    : { kind: "rotation", movementPattern },
                )
              }
              pickerIdPrefix="main-compound-rotation-preferences-picker"
              preferenceListLabel="ranked rotation preferences"
              readModelRows={mainCompoundRotationReadModel.rows}
            />
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

      {activeMainCompoundPickerRow ? (
        <MainCompoundPreferencesPicker
          id={`main-compound-preferences-picker-${activeMainCompoundPickerRow.movementPattern}`}
          mainCompoundOptions={activeMainCompoundPickerRow.mainCompoundOptions}
          movementPattern={activeMainCompoundPickerRow.movementPattern}
          movementPatternLabel={activeMainCompoundPickerRow.movementPatternLabel}
          onChange={(exerciseIds) =>
            handleMainCompoundPreferencesChange(
              activeMainCompoundPickerRow.movementPattern,
              exerciseIds,
            )
          }
          onClose={() => setActivePicker(null)}
          preferenceExerciseIds={activeMainCompoundPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
        />
      ) : null}

      {activeRotationPickerRow ? (
        <MainCompoundRotationPreferencesPicker
          id={`main-compound-rotation-preferences-picker-${activeRotationPickerRow.movementPattern}`}
          mainCompoundOptions={activeRotationPickerRow.mainCompoundOptions}
          movementPattern={activeRotationPickerRow.movementPattern}
          movementPatternLabel={activeRotationPickerRow.movementPatternLabel}
          onChange={(exerciseIds) =>
            handleMainCompoundRotationPreferencesChange(
              activeRotationPickerRow.movementPattern,
              exerciseIds,
            )
          }
          onClose={() => setActivePicker(null)}
          preferenceExerciseIds={activeRotationPickerRow.preferences.map(
            (preference) => preference.exerciseId,
          )}
        />
      ) : null}
    </div>
  );
}

function PreferenceBucketSection({
  buttonLabel,
  cardAriaLabel,
  emptySelectionText,
  headingId,
  headingText,
  isPickerOpen,
  listAriaLabel,
  onTogglePicker,
  pickerIdPrefix,
  preferenceListLabel,
  readModelRows,
}: {
  buttonLabel: string;
  cardAriaLabel: string;
  emptySelectionText: string;
  headingId: string;
  headingText: string;
  isPickerOpen: (movementPattern: CompoundCapableMovementPatternId) => boolean;
  listAriaLabel: string;
  onTogglePicker: (movementPattern: CompoundCapableMovementPatternId) => void;
  pickerIdPrefix: string;
  preferenceListLabel: string;
  readModelRows: ReadonlyArray<MainCompoundPreferenceRowReadModel>;
}) {
  return (
    <section
      aria-labelledby={headingId}
      aria-label={cardAriaLabel}
      className="exercise-foundation-card"
    >
      <h3 className="sr-only" id={headingId}>
        {headingText}
      </h3>
      <ul aria-label={listAriaLabel} className="exercise-foundation-list">
        {readModelRows.map((row) => (
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
                <p>{row.topPreference?.exerciseName ?? emptySelectionText}</p>
                <span>{row.metadata}</span>
              </div>

              <div className="exercise-foundation-row__actions">
                <MainCompoundPickerToggleButton
                  isOpen={isPickerOpen(row.movementPattern)}
                  label={row.preferences.length > 0 ? "Edit ranking" : buttonLabel}
                  onToggle={() => onTogglePicker(row.movementPattern)}
                  pickerId={`${pickerIdPrefix}-${row.movementPattern}`}
                />
              </div>
            </div>

            {row.preferences.length > 0 ? (
              <ol
                aria-label={`${row.movementPatternLabel} ${preferenceListLabel}`}
                className="exercise-foundation-row__preferences"
              >
                {row.preferences.map((preference, index) => (
                  <li key={preference.exerciseId}>
                    {index + 1}. {preference.exerciseName}
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
