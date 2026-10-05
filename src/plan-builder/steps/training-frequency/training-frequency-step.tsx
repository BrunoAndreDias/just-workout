import { Check } from "lucide-react";
import { type CSSProperties, useId } from "react";
import { cn } from "../../../design-system/cn";
import { type TrainingFrequencyDaysPerWeek, trainingFrequencyOptions } from "../../plan-blueprint";
import {
  getCompatibleTrainingSplits,
  getRecommendedTrainingSplitId,
  getTrainingSplit,
  type TrainingSplitDefinition,
  type TrainingSplitId,
} from "../../training-split";
import {
  type CompactWeeklyLayout,
  getCompactWeeklyLayout,
  getDefaultTrainingDayIndexes,
  getTrainingSessionFamily,
} from "./training-frequency-weekly-layout";
import "./training-frequency-step.css";

type TrainingFrequencyStepProps = {
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  onTrainingSplitChange: (split: TrainingSplitId) => void;
  selectedTrainingSplitId: TrainingSplitId | null;
  selectedTrainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek | null;
  showWeeklyPreview?: boolean;
};

const weekdayIndexes = [0, 1, 2, 3, 4, 5, 6] as const;

export function TrainingFrequencyStep({
  onTrainingFrequencyChange,
  onTrainingSplitChange,
  selectedTrainingSplitId,
  selectedTrainingFrequencyDaysPerWeek,
  showWeeklyPreview = true,
}: TrainingFrequencyStepProps) {
  const selectedFrequency = selectedTrainingFrequencyDaysPerWeek ?? 3;
  const recommendedSplit = getTrainingSplit(getRecommendedTrainingSplitId(selectedFrequency));
  const selectedSplitId = selectedTrainingSplitId ?? recommendedSplit.id;
  const selectedSplit =
    compatibleTrainingSplitOrDefault(selectedSplitId, selectedFrequency) ?? recommendedSplit;
  const compatibleSplits = getTrainingScheduleCompatibleSplits(selectedFrequency, recommendedSplit);
  const splitOptions = [recommendedSplit, ...compatibleSplits];
  const daysHeadingId = useId();
  const splitHeadingId = useId();

  return (
    <div className={cn("pb-schedule", showWeeklyPreview ? "pb-schedule--with-week" : null)}>
      <div className="pb-schedule__choices">
        <section aria-labelledby={daysHeadingId} className="pb-schedule__group">
          <h3 className="pb-schedule__heading" id={daysHeadingId}>
            Training days
          </h3>
          <div aria-labelledby={daysHeadingId} className="pb-days" role="radiogroup">
            {trainingFrequencyOptions.map((option) => {
              const isSelected = option.daysPerWeek === selectedTrainingFrequencyDaysPerWeek;
              const trainingDayIndexes = getDefaultTrainingDayIndexes(option.daysPerWeek);

              return (
                <label
                  className="pb-days__option"
                  data-selected={isSelected ? "true" : undefined}
                  key={option.daysPerWeek}
                >
                  <input
                    aria-label={`${option.daysPerWeek} days per week`}
                    checked={isSelected}
                    className="sr-only"
                    name="training-frequency-days-per-week"
                    onChange={() => onTrainingFrequencyChange(option.daysPerWeek)}
                    type="radio"
                    value={String(option.daysPerWeek)}
                  />
                  <span aria-hidden="true" className="pb-days__count">
                    {option.daysPerWeek}
                  </span>
                  <span aria-hidden="true" className="pb-days__unit">
                    days <span className="pb-days__unit-tail">a week</span>
                  </span>
                  <span aria-hidden="true" className="pb-days__dots">
                    {weekdayIndexes.map((dayIndex) => (
                      <span
                        className="pb-days__dot"
                        data-training={trainingDayIndexes.includes(dayIndex) ? "true" : undefined}
                        key={dayIndex}
                      />
                    ))}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section aria-labelledby={splitHeadingId} className="pb-schedule__group">
          <div className="pb-schedule__heading-row">
            <h3 className="pb-schedule__heading" id={splitHeadingId}>
              Weekly split
            </h3>
            <p className="pb-schedule__hint">
              {splitOptions.length} ways to organize {selectedFrequency} days
            </p>
          </div>
          <div aria-labelledby={splitHeadingId} className="pb-splits" role="radiogroup">
            {splitOptions.map((split) => (
              <TrainingSplitOption
                isRecommended={split.id === recommendedSplit.id}
                isSelected={selectedSplit.id === split.id}
                key={split.id}
                onSelect={() => onTrainingSplitChange(split.id)}
                selectedFrequency={selectedFrequency}
                split={split}
              />
            ))}
          </div>
        </section>
      </div>

      {showWeeklyPreview ? (
        <TrainingScheduleWeeklyPreview
          selectedFrequency={selectedFrequency}
          selectedSplit={selectedSplit}
        />
      ) : null}
    </div>
  );
}

function TrainingSplitOption({
  isRecommended,
  isSelected,
  onSelect,
  selectedFrequency,
  split,
}: {
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
  selectedFrequency: TrainingFrequencyDaysPerWeek;
  split: TrainingSplitDefinition;
}) {
  const notesId = useId();
  const sessions = getCompactWeeklyLayout(split, selectedFrequency)
    .days.filter((day) => !day.isRestDay)
    .map((day) => day.sessionLabel);

  return (
    <label
      className="pb-split"
      data-recommended={isRecommended ? "true" : undefined}
      data-selected={isSelected ? "true" : undefined}
    >
      <input
        aria-describedby={notesId}
        aria-label={isRecommended ? `${split.label}, recommended` : split.label}
        checked={isSelected}
        className="sr-only"
        name="training-split"
        onChange={onSelect}
        type="radio"
        value={split.id}
      />
      <span aria-hidden="true" className="pb-split__radio">
        {isSelected ? <Check size={13} strokeWidth={3.2} /> : null}
      </span>
      <span className="pb-split__body">
        <span className="pb-split__head">
          <span className="pb-split__title">{split.label}</span>
          {isRecommended ? <span className="pb-split__badge">Recommended</span> : null}
        </span>
        <span aria-hidden="true" className="pb-split__rhythm">
          {sessions.map((sessionLabel, index) => (
            <span
              className="pb-session"
              data-family={getTrainingSessionFamily(sessionLabel)}
              // biome-ignore lint/suspicious/noArrayIndexKey: sessions repeat within a week.
              key={`${sessionLabel}-${index}`}
            >
              {sessionLabel}
            </span>
          ))}
        </span>
        <span className="pb-split__notes" id={notesId}>
          {getSplitCardBenefits(split).join(" · ")}
        </span>
      </span>
    </label>
  );
}

function TrainingScheduleWeeklyPreview({
  selectedFrequency,
  selectedSplit,
}: {
  selectedFrequency: TrainingFrequencyDaysPerWeek;
  selectedSplit: TrainingSplitDefinition;
}) {
  const headingId = useId();
  const weeklyLayout = getCompactWeeklyLayout(selectedSplit, selectedFrequency);
  const restDayCount = weeklyLayout.days.filter((day) => day.isRestDay).length;

  return (
    <aside aria-labelledby={headingId} className="pb-week-panel">
      <div className="pb-week-panel__header">
        <h3 className="pb-schedule__heading" id={headingId}>
          Your week
        </h3>
        <p className="pb-week-panel__tally">
          <strong>{selectedFrequency}</strong> sessions · <strong>{restDayCount}</strong> rest
        </p>
      </div>

      <ol
        aria-label={`${selectedSplit.label}, ${selectedFrequency} days per week`}
        className="pb-week"
        // Remount on change so the new week wipes in as one authored moment.
        key={`${selectedSplit.id}-${selectedFrequency}`}
      >
        {weeklyLayout.days.map((layoutDay, dayIndex) => (
          <li
            className={cn("pb-week__day", layoutDay.isRestDay ? "pb-week__day--rest" : null)}
            data-family={layoutDay.sessionFamily ?? undefined}
            key={layoutDay.dayLabel}
            style={{ "--pb-week-day-index": dayIndex } as CSSProperties}
          >
            <span className="pb-week__day-name">{layoutDay.dayLabel}</span>
            <span className="pb-week__session">{layoutDay.sessionLabel}</span>
          </li>
        ))}
      </ol>

      <WeeklyPreviewFootnote weeklyLayout={weeklyLayout} />
    </aside>
  );
}

function WeeklyPreviewFootnote({ weeklyLayout }: { weeklyLayout: CompactWeeklyLayout }) {
  const nextWeek = weeklyLayout.cycleWeeks?.[1];

  if (!nextWeek) {
    return <p className="pb-week-panel__note">{weeklyLayout.helperText}</p>;
  }

  return (
    <div className="pb-week-cycle">
      <p className="pb-week-panel__note">
        The cycle carries over to the next week, so it starts where this one stops:
      </p>
      <p className="pb-week-cycle__week">
        <span className="pb-week-cycle__label">Next week</span>
        <span className="pb-week-cycle__sessions">
          {nextWeek.map((sessionLabel, sessionIndex) => (
            <span
              className="pb-session pb-session--small"
              data-family={getTrainingSessionFamily(sessionLabel)}
              // biome-ignore lint/suspicious/noArrayIndexKey: sessions repeat within a week.
              key={`${sessionLabel}-${sessionIndex}`}
            >
              {sessionLabel}
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}

function compatibleTrainingSplitOrDefault(
  selectedSplitId: TrainingSplitId,
  selectedFrequency: TrainingFrequencyDaysPerWeek,
): TrainingSplitDefinition | null {
  return (
    getCompatibleTrainingSplits(selectedFrequency).find((split) => split.id === selectedSplitId) ??
    null
  );
}

function getTrainingScheduleCompatibleSplits(
  selectedFrequency: TrainingFrequencyDaysPerWeek,
  recommendedSplit: TrainingSplitDefinition,
): ReadonlyArray<TrainingSplitDefinition> {
  const compatibleSplits = getCompatibleTrainingSplits(selectedFrequency).filter(
    (split) => split.id !== recommendedSplit.id,
  );

  if (selectedFrequency !== 3) {
    return compatibleSplits;
  }

  return compatibleSplits.toSorted((first, second) => {
    const requestedOrder = ["alternating-full-body-a-b", "upper-lower-full-body"];

    return requestedOrder.indexOf(first.id) - requestedOrder.indexOf(second.id);
  });
}

function getSplitCardBenefits(split: TrainingSplitDefinition): ReadonlyArray<string> {
  switch (split.id) {
    case "full-body-2-day":
      return ["Muscles trained 2x/week", "Simple weekly rhythm", "Long recovery windows"];
    case "alternating-full-body-a-b":
      return ["More variety", "Full-body focus", "Slightly more programming variation"];
    case "upper-lower-full-body":
      return ["Mixed emphasis", "Slightly more complex", "Good variety across the week"];
    case "upper-lower-4-day":
      return ["Upper and lower focus", "Muscles trained 2x/week", "Manageable recovery"];
    case "rotating-upper-lower":
      return ["Upper/Lower A & B rotate", "Abs in every session", "Works for 3 or 5 days"];
    case "rotating-push-pull-legs":
      return ["Flexible training days", "Push, pull, legs variety", "Best with movable weekdays"];
    default:
      return ["Muscles trained 3x/week", "Simple progression", "Manageable recovery"];
  }
}
