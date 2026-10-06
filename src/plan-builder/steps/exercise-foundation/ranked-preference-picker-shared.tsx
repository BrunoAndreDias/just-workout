import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export type RankedPreferencePickerOption = {
  id: string;
  name: string;
};

export function useRankedPreferenceSelection<TOption extends RankedPreferencePickerOption>({
  onChange,
  options,
  preferenceExerciseIds,
}: {
  onChange: (exerciseIds: ReadonlyArray<string>) => Promise<void>;
  options: ReadonlyArray<TOption>;
  preferenceExerciseIds: ReadonlyArray<string>;
}) {
  const selectedOptions = preferenceExerciseIds.flatMap((exerciseId) => {
    const option = options.find((candidate) => candidate.id === exerciseId);

    return option ? [option] : [];
  });

  async function handleOptionToggle(option: TOption, isSelected: boolean): Promise<void> {
    if (isSelected) {
      await onChange(preferenceExerciseIds.filter((exerciseId) => exerciseId !== option.id));
      return;
    }

    await onChange([...preferenceExerciseIds, option.id]);
  }

  async function handleMovePreference(exerciseId: string, direction: "up" | "down"): Promise<void> {
    const currentIndex = preferenceExerciseIds.indexOf(exerciseId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= preferenceExerciseIds.length) {
      return;
    }

    const nextExerciseIds = [...preferenceExerciseIds];
    const [movedExerciseId] = nextExerciseIds.splice(currentIndex, 1);

    if (!movedExerciseId) {
      return;
    }

    nextExerciseIds.splice(targetIndex, 0, movedExerciseId);
    await onChange(nextExerciseIds);
  }

  async function handleRemovePreference(exerciseId: string): Promise<void> {
    await onChange(preferenceExerciseIds.filter((candidateId) => candidateId !== exerciseId));
  }

  return {
    handleMovePreference,
    handleOptionToggle,
    handleRemovePreference,
    selectedOptions,
  };
}

export function RankedPreferenceSelectedList<TOption extends RankedPreferencePickerOption>({
  ariaLabel,
  emptyMessage,
  onMovePreference,
  onRemovePreference,
  options,
  rankLabel,
  title,
}: {
  ariaLabel: string;
  emptyMessage: string;
  onMovePreference: (exerciseId: string, direction: "up" | "down") => void;
  onRemovePreference: (exerciseId: string) => void;
  options: ReadonlyArray<TOption>;
  rankLabel?: (rank: number) => string;
  title: string;
}) {
  return (
    <section aria-label={ariaLabel}>
      <h4 className="main-compound-drawer__selected-title">{title}</h4>
      {options.length === 0 ? (
        <p className="main-compound-drawer__selected-empty">{emptyMessage}</p>
      ) : (
        <ol className="main-compound-drawer__selected-list">
          {options.map((option, index) => {
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
              <li className="main-compound-drawer__selected-item" key={option.id}>
                <div className="main-compound-drawer__selected-copy">
                  <span className="main-compound-drawer__selected-rank">
                    {rankLabel ? rankLabel(index + 1) : `Preference #${index + 1}`}
                  </span>
                  <span className="main-compound-drawer__selected-name">{option.name}</span>
                </div>
                <div className="main-compound-drawer__selected-actions">
                  <button
                    aria-label={`Move ${option.name} up`}
                    className="icon-btn"
                    disabled={isFirst}
                    onClick={() => onMovePreference(option.id, "up")}
                    type="button"
                  >
                    <ArrowUp aria-hidden="true" size={14} strokeWidth={2.4} />
                  </button>
                  <button
                    aria-label={`Move ${option.name} down`}
                    className="icon-btn"
                    disabled={isLast}
                    onClick={() => onMovePreference(option.id, "down")}
                    type="button"
                  >
                    <ArrowDown aria-hidden="true" size={14} strokeWidth={2.4} />
                  </button>
                  <button
                    aria-label={`Remove ${option.name}`}
                    className="icon-btn"
                    onClick={() => onRemovePreference(option.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={14} strokeWidth={2.4} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
