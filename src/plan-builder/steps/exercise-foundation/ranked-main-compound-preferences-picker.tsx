import { GripVertical, Trash2, X } from "lucide-react";
import { type DragEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../design-system/button";
import { cn } from "../../../design-system/cn";
import type { ExerciseFoundationCompoundOption } from "../../exercise-foundation-read-model";

type RankedMainCompoundPreferencesPickerProps = {
  closeLabel: string;
  helperText: string;
  id: string;
  mainCompoundOptions: ReadonlyArray<ExerciseFoundationCompoundOption>;
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  onClose: () => void;
  preferenceExerciseIds: ReadonlyArray<string>;
  saveLabel: string;
  title: string;
};

export function RankedMainCompoundPreferencesPicker({
  closeLabel,
  helperText,
  id,
  mainCompoundOptions,
  onChange,
  onClose,
  preferenceExerciseIds,
  saveLabel,
  title,
}: RankedMainCompoundPreferencesPickerProps) {
  const [draftExerciseIds, setDraftExerciseIds] =
    useState<ReadonlyArray<string>>(preferenceExerciseIds);
  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);
  const [dropTargetExerciseId, setDropTargetExerciseId] = useState<string | null>(null);
  const titleId = `${id}-title`;
  const helperId = `${id}-helper`;
  const countId = `${id}-count`;

  useEffect(() => {
    setDraftExerciseIds(preferenceExerciseIds);
  }, [preferenceExerciseIds]);

  const optionById = useMemo(
    () => new Map(mainCompoundOptions.map((option) => [option.id, option])),
    [mainCompoundOptions],
  );
  const rankedOptions = draftExerciseIds.flatMap((exerciseId) => {
    const option = optionById.get(exerciseId);

    return option ? [option] : [];
  });

  function reorderDraftExerciseIds(
    sourceExerciseId: string,
    targetExerciseId: string,
    placement: "before" | "after",
  ) {
    setDraftExerciseIds((currentExerciseIds) =>
      moveExerciseNear(currentExerciseIds, sourceExerciseId, targetExerciseId, placement),
    );
  }

  function handleDragStart(
    event: DragEvent<HTMLLIElement>,
    exercise: ExerciseFoundationCompoundOption,
  ) {
    setDraggedExerciseId(exercise.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", exercise.id);
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, targetExerciseId: string) {
    event.preventDefault();
    const sourceExerciseId = event.dataTransfer.getData("text/plain") || draggedExerciseId;

    if (sourceExerciseId) {
      const targetRect = event.currentTarget.getBoundingClientRect();
      const placement = event.clientY > targetRect.top + targetRect.height / 2 ? "after" : "before";

      reorderDraftExerciseIds(sourceExerciseId, targetExerciseId, placement);
    }

    setDraggedExerciseId(null);
    setDropTargetExerciseId(null);
  }

  function handleHandleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    exerciseId: string,
    index: number,
  ) {
    if (event.altKey && event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      setDraftExerciseIds((currentExerciseIds) =>
        moveExerciseToIndex(currentExerciseIds, exerciseId, index - 1),
      );
      return;
    }

    if (event.altKey && event.key === "ArrowDown" && index < rankedOptions.length - 1) {
      event.preventDefault();
      setDraftExerciseIds((currentExerciseIds) =>
        moveExerciseToIndex(currentExerciseIds, exerciseId, index + 1),
      );
    }
  }

  async function handleSave() {
    await onChange(draftExerciseIds);
    onClose();
  }

  const drawer = (
    <div className="main-compound-ranking-drawer-shell">
      <button
        aria-label={closeLabel}
        className="main-compound-ranking-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby={`${helperId} ${countId}`}
        aria-labelledby={titleId}
        aria-modal="true"
        className="main-compound-ranking-drawer"
        id={id}
        role="dialog"
      >
        <div className="main-compound-ranking-drawer__header">
          <div className="main-compound-ranking-drawer__title-row">
            <div>
              <h3 className="main-compound-ranking-drawer__title" id={titleId}>
                {title}
              </h3>
              <p className="main-compound-ranking-drawer__helper" id={helperId}>
                {helperText}
              </p>
            </div>
            <Button
              aria-label={closeLabel}
              className="main-compound-ranking-drawer__close"
              onClick={onClose}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" size={20} strokeWidth={2} />
            </Button>
          </div>
          <span className="main-compound-ranking-drawer__count" id={countId}>
            {rankedOptions.length} ranked
          </span>
        </div>

        <div className="main-compound-ranking-drawer__body">
          {rankedOptions.length > 0 ? (
            <ol className="main-compound-ranking-drawer__list">
              {rankedOptions.map((exercise, index) => (
                <li
                  className={cn(
                    "main-compound-ranking-drawer__item",
                    draggedExerciseId === exercise.id && "is-dragging",
                    dropTargetExerciseId === exercise.id &&
                      draggedExerciseId !== exercise.id &&
                      "is-drop-target",
                  )}
                  draggable
                  key={exercise.id}
                  onDragEnd={() => {
                    setDraggedExerciseId(null);
                    setDropTargetExerciseId(null);
                  }}
                  onDragEnter={() => setDropTargetExerciseId(exercise.id)}
                  onDragOver={handleDragOver}
                  onDragStart={(event) => handleDragStart(event, exercise)}
                  onDrop={(event) => handleDrop(event, exercise.id)}
                >
                  <button
                    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
                    aria-label={`Drag ${exercise.name} to reorder`}
                    className="main-compound-ranking-drawer__drag-handle"
                    onKeyDown={(event) => handleHandleKeyDown(event, exercise.id, index)}
                    type="button"
                  >
                    <GripVertical aria-hidden="true" size={20} strokeWidth={2.1} />
                  </button>
                  <span className="main-compound-ranking-drawer__rank">#{index + 1}</span>
                  <span className="main-compound-ranking-drawer__name">{exercise.name}</span>
                  <button
                    aria-label={`Remove ${exercise.name}`}
                    className="main-compound-ranking-drawer__remove"
                    onClick={() =>
                      setDraftExerciseIds((currentExerciseIds) =>
                        currentExerciseIds.filter((exerciseId) => exerciseId !== exercise.id),
                      )
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={18} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="main-compound-ranking-drawer__empty">No preferences ranked yet.</p>
          )}
        </div>

        <div className="main-compound-ranking-drawer__footer">
          <Button
            className="main-compound-ranking-drawer__action"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="main-compound-ranking-drawer__action"
            onClick={() => void handleSave()}
            type="button"
            variant="builderPrimary"
          >
            {saveLabel}
          </Button>
        </div>
      </section>
    </div>
  );

  return createPortal(drawer, document.body);
}

function moveExerciseNear(
  exerciseIds: ReadonlyArray<string>,
  sourceExerciseId: string,
  targetExerciseId: string,
  placement: "before" | "after",
): ReadonlyArray<string> {
  if (sourceExerciseId === targetExerciseId) {
    return exerciseIds;
  }

  const sourceIndex = exerciseIds.indexOf(sourceExerciseId);
  const targetIndex = exerciseIds.indexOf(targetExerciseId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return exerciseIds;
  }

  const nextExerciseIds = [...exerciseIds];
  const [movedExerciseId] = nextExerciseIds.splice(sourceIndex, 1);

  if (!movedExerciseId) {
    return exerciseIds;
  }

  const placementOffset = placement === "after" ? 1 : 0;
  const adjustedTargetIndex =
    sourceIndex < targetIndex
      ? Math.max(0, targetIndex - 1 + placementOffset)
      : targetIndex + placementOffset;

  nextExerciseIds.splice(adjustedTargetIndex, 0, movedExerciseId);

  return nextExerciseIds;
}

function moveExerciseToIndex(
  exerciseIds: ReadonlyArray<string>,
  exerciseId: string,
  targetIndex: number,
): ReadonlyArray<string> {
  const sourceIndex = exerciseIds.indexOf(exerciseId);

  if (sourceIndex === -1 || sourceIndex === targetIndex) {
    return exerciseIds;
  }

  const nextExerciseIds = [...exerciseIds];
  const [movedExerciseId] = nextExerciseIds.splice(sourceIndex, 1);

  if (!movedExerciseId) {
    return exerciseIds;
  }

  nextExerciseIds.splice(targetIndex, 0, movedExerciseId);

  return nextExerciseIds;
}
