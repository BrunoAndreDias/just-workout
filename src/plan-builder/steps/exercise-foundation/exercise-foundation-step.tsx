import { ArrowLeft, ArrowRight, Check, CircleCheck, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import { StepActions, StepPanel } from "../../../design-system/step-screen";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationReadModel } from "../../exercise-foundation-read-model";
import type { MainCompoundSelection } from "../../weekly-movement-coverage";
import { getBlockedGenerateActionLabel } from "./exercise-foundation-formatting";
import { FoundationPatternIcon, getFoundationIconClassName } from "./foundation-pattern-icon";
import { getFoundationStatusClassName } from "./foundation-status";
import { InlineRotationPoolEditor } from "./inline-rotation-pool-editor";
import { IsolationExercisesDrawer } from "./isolation-exercises-drawer";
import {
  IsolationExercisesSummary,
  IsolationExercisesUnavailableSummary,
} from "./isolation-exercises-summary";
import { MainCompoundPicker } from "./main-compound-picker";
import { RotationPoolPicker } from "./rotation-pool-picker";
import "./exercise-foundation-step.css";
import "./main-compound-drawer.css";
import "./isolation-exercises-summary.css";
import "./rotation-pool-inline-preview.css";
import "./exercise-foundation-page-overrides.css";
import "./exercise-foundation-responsive.css";

type ExerciseFoundationStepProps = {
  onBackToVolume: () => void;
  onContinueToGenerate: () => Promise<void>;
  onMainCompoundSelectionChange: (
    selection: Pick<MainCompoundSelection, "exerciseId" | "movementPattern">,
  ) => Promise<void>;
  onRotationPoolChange: (rotationPool: {
    exerciseIds: ReadonlyArray<string>;
    movementPattern: CompoundCapableMovementPatternId;
  }) => Promise<void>;
  readModel: ExerciseFoundationReadModel;
};

export function ExerciseFoundationStep({
  onBackToVolume,
  onContinueToGenerate,
  onMainCompoundSelectionChange,
  onRotationPoolChange,
  readModel,
}: ExerciseFoundationStepProps) {
  const [activePickerPattern, setActivePickerPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [activeRotationPoolPattern, setActiveRotationPoolPattern] =
    useState<CompoundCapableMovementPatternId | null>(null);
  const [isAccessoryDrawerOpen, setIsAccessoryDrawerOpen] = useState(false);
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const selectedAccessories = readModel.accessoryExercises.filter((exercise) =>
    selectedAccessoryIds.has(exercise.id),
  );
  const selectedAccessoryCount = selectedAccessories.length;
  const activePickerRow =
    activePickerPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activePickerPattern);
  const activeRotationPoolRow =
    activeRotationPoolPattern === null
      ? undefined
      : readModel.rows.find((row) => row.movementPattern === activeRotationPoolPattern);

  useEffect(() => {
    const availableAccessoryExerciseIds = new Set(readModel.accessoryExerciseIds);

    setSelectedAccessoryIds((currentAccessoryIds) => {
      const nextAccessoryIds = new Set(
        [...currentAccessoryIds].filter((accessoryId) =>
          availableAccessoryExerciseIds.has(accessoryId),
        ),
      );

      return nextAccessoryIds.size === currentAccessoryIds.size
        ? currentAccessoryIds
        : nextAccessoryIds;
    });
  }, [readModel.accessoryExerciseIds]);

  useEffect(() => {
    if (
      activePickerPattern === null &&
      activeRotationPoolPattern === null &&
      !isAccessoryDrawerOpen
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePickerPattern(null);
        setActiveRotationPoolPattern(null);
        setIsAccessoryDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePickerPattern, activeRotationPoolPattern, isAccessoryDrawerOpen]);

  async function handleMainCompoundSelect(
    exerciseId: string,
    movementPattern: CompoundCapableMovementPatternId,
  ) {
    await onMainCompoundSelectionChange({
      exerciseId,
      movementPattern,
    });
    setActivePickerPattern(null);
  }

  async function handleRotationPoolChange(
    movementPattern: CompoundCapableMovementPatternId,
    exerciseIds: ReadonlyArray<string>,
  ) {
    await onRotationPoolChange({
      exerciseIds,
      movementPattern,
    });
  }

  function handleAccessorySelectionChange(accessoryId: string, isSelected: boolean) {
    setSelectedAccessoryIds((currentAccessoryIds) => {
      const nextAccessoryIds = new Set(currentAccessoryIds);

      if (isSelected) {
        nextAccessoryIds.add(accessoryId);
      } else {
        nextAccessoryIds.delete(accessoryId);
      }

      return nextAccessoryIds;
    });
  }

  return (
    <div className="grid gap-6">
      <StepPanel aria-labelledby="exercise-foundation-title" className="exercise-foundation-panel">
        <div className="exercise-foundation-workspace">
          <div className="exercise-foundation-main">
            <section aria-label="Exercise foundation status" className="exercise-foundation-status">
              <span aria-hidden="true" className="exercise-foundation-status__icon">
                <Check size={22} strokeWidth={2.4} />
              </span>
              <div>
                <h3 className="sr-only" id="exercise-foundation-title">
                  Exercise foundation overview
                </h3>
                <p className="exercise-foundation-status__title">{readModel.summary}</p>
                {readModel.guidance ? (
                  <p className="exercise-foundation-status__body">{readModel.guidance}</p>
                ) : null}
              </div>
            </section>

            <div className="exercise-foundation-tabbar">
              <span className="exercise-foundation-tabbar__active">Main compounds</span>
              <span
                className={cn(
                  "exercise-foundation-tabbar__locked",
                  readModel.canContinueToGenerate
                    ? "exercise-foundation-tabbar__locked--ready"
                    : null,
                )}
              >
                {readModel.canContinueToGenerate ? (
                  <CircleCheck aria-hidden="true" size={15} strokeWidth={2.2} />
                ) : (
                  <Lock aria-hidden="true" size={15} strokeWidth={2} />
                )}
                {readModel.canContinueToGenerate
                  ? "Swaps ready"
                  : "Swaps unlock after required picks"}
              </span>
            </div>

            <section aria-label="Main compound selections" className="exercise-foundation-card">
              <ul aria-label="Exercise foundation rows" className="exercise-foundation-list">
                {readModel.rows.map((row) => {
                  const isPickerOpen = activePickerPattern === row.movementPattern;

                  return (
                    <li
                      aria-label={row.accessibleLabel}
                      className={cn(
                        "exercise-foundation-row",
                        row.isMissing ? "exercise-foundation-row--missing" : null,
                      )}
                      key={row.movementPattern}
                    >
                      <div className="exercise-foundation-row__grid">
                        <div className="exercise-foundation-row__pattern">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "exercise-foundation-row__icon",
                              getFoundationIconClassName(row.movementPattern),
                            )}
                          >
                            <FoundationPatternIcon movementPattern={row.movementPattern} />
                          </span>
                          <div className="min-w-0">
                            <div className="exercise-foundation-row__heading">
                              <h4>{row.movementPatternLabel}</h4>
                              <span>{row.bucket}</span>
                            </div>
                            <p className="exercise-foundation-row__helper">{row.helperText}</p>
                          </div>
                        </div>

                        <div className="exercise-foundation-row__selection">
                          <p>{row.shownExercise?.exerciseName ?? "No exercise selected yet."}</p>
                          <span>{row.metadata}</span>
                        </div>

                        <div className="exercise-foundation-row__actions">
                          <span
                            aria-label={row.statusAccessibleLabel}
                            className={cn(
                              "exercise-foundation-row__status",
                              getFoundationStatusClassName(row.status),
                            )}
                            role="status"
                          >
                            {row.statusLabel}
                          </span>
                          <Button
                            aria-expanded={isPickerOpen}
                            aria-controls={
                              isPickerOpen
                                ? `main-compound-picker-${row.movementPattern}`
                                : undefined
                            }
                            onClick={() =>
                              setActivePickerPattern((currentPattern) =>
                                currentPattern === row.movementPattern ? null : row.movementPattern,
                              )
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            {row.confirmedSelection ? "Change" : "Choose"}
                          </Button>
                        </div>
                      </div>

                      {row.rotationPool ? (
                        <InlineRotationPoolEditor
                          movementPattern={row.movementPattern}
                          onEdit={() => {
                            setActivePickerPattern(null);
                            setActiveRotationPoolPattern(row.movementPattern);
                          }}
                          rotationPool={row.rotationPool}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>

        <div>
          {activePickerRow ? (
            <MainCompoundPicker
              currentExerciseId={activePickerRow.confirmedSelection?.exerciseId}
              id={`main-compound-picker-${activePickerRow.movementPattern}`}
              mainCompoundOptions={activePickerRow.mainCompoundOptions}
              movementPattern={activePickerRow.movementPattern}
              movementPatternLabel={activePickerRow.movementPatternLabel}
              onClose={() => setActivePickerPattern(null)}
              onSelect={handleMainCompoundSelect}
            />
          ) : null}

          {activeRotationPoolPattern && activeRotationPoolRow?.rotationPool ? (
            <RotationPoolPicker
              id={`rotation-pool-picker-${activeRotationPoolPattern}`}
              movementPattern={activeRotationPoolPattern}
              movementPatternLabel={activeRotationPoolRow.movementPatternLabel}
              onChange={(exerciseIds) =>
                handleRotationPoolChange(activeRotationPoolPattern, exerciseIds)
              }
              onClose={() => setActiveRotationPoolPattern(null)}
              rotationPool={activeRotationPoolRow.rotationPool}
            />
          ) : null}

          {readModel.canShowOptionalAccessoriesSummary ? (
            <IsolationExercisesSummary
              isDrawerOpen={isAccessoryDrawerOpen}
              onConfigure={() => {
                setActivePickerPattern(null);
                setActiveRotationPoolPattern(null);
                setIsAccessoryDrawerOpen(true);
              }}
              onRemove={(accessoryId) => handleAccessorySelectionChange(accessoryId, false)}
              optionalAccessoryCount={readModel.optionalAccessoryCount}
              recommendedAccessoryCount={readModel.recommendedAccessoryCount}
              selectedAccessories={selectedAccessories}
              selectedExerciseCount={selectedAccessoryCount}
            />
          ) : (
            <IsolationExercisesUnavailableSummary />
          )}

          <StepActions>
            <Button onClick={onBackToVolume} size="step" type="button" variant="outline">
              <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.9} />
              Back to Volume
            </Button>
            <Button
              disabled={!readModel.canContinueToGenerate}
              onClick={() => {
                void onContinueToGenerate();
              }}
              size="step"
              type="button"
              variant="builderPrimary"
            >
              {readModel.canContinueToGenerate
                ? "Continue to Generate"
                : getBlockedGenerateActionLabel(readModel.nextRequiredPattern)}
              <ArrowRight aria-hidden="true" size={20} strokeWidth={1.9} />
            </Button>
          </StepActions>
        </div>
      </StepPanel>

      {isAccessoryDrawerOpen ? (
        <IsolationExercisesDrawer
          accessoryExercises={readModel.accessoryExercises}
          onClose={() => setIsAccessoryDrawerOpen(false)}
          onSelectionChange={handleAccessorySelectionChange}
          selectedAccessoryIds={selectedAccessoryIds}
        />
      ) : null}
    </div>
  );
}
