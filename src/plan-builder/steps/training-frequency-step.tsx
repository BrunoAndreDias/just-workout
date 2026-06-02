import { ArrowRight, Calendar, Check, ChevronLeft, Star } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import {
  PlanBuilderStepStatusCard,
  usePlanBuilderLargeScreenLayout,
} from "../components/plan-builder-page";
import {
  getTrainingFrequencyRecommendation,
  type TrainingFrequencyDaysPerWeek,
  type TrainingFrequencyOption,
  type TrainingFrequencyRecommendation,
  trainingFrequencyOptions,
} from "../plan-blueprint";
import "./training-frequency-step.css";

type TrainingFrequencyStepProps = {
  canContinueToSplit: boolean;
  onContinueToSplit: () => Promise<void>;
  onTrainingFrequencyChange: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  selectedTrainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek | null;
};

export function TrainingFrequencyStep({
  canContinueToSplit,
  onContinueToSplit,
  onTrainingFrequencyChange,
  selectedTrainingFrequencyDaysPerWeek,
}: TrainingFrequencyStepProps) {
  const recommendation = getTrainingFrequencyRecommendation(
    selectedTrainingFrequencyDaysPerWeek ?? 3,
  );
  const shouldShowLargeScreenWarning = usePlanBuilderLargeScreenLayout();

  return (
    <section
      aria-labelledby="training-frequency-title"
      className="training-frequency-panel lg:-mx-[1.375rem]"
    >
      <div>
        <h2
          className="training-frequency-title text-3xl font-black leading-tight text-[#120f0d]"
          id="training-frequency-title"
        >
          Training frequency
        </h2>
        <p className="training-frequency-copy mt-4 max-w-3xl text-base font-medium leading-6 text-[#31505d]">
          Choose how many days per week you can realistically train so Just Workout can recommend
          the right split.
        </p>
      </div>

      <fieldset className="training-frequency-options mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Training Frequency</legend>
        {trainingFrequencyOptions.map((option) => (
          <TrainingFrequencyOptionRadio
            isSelected={option.daysPerWeek === selectedTrainingFrequencyDaysPerWeek}
            key={option.daysPerWeek}
            onSelect={onTrainingFrequencyChange}
            option={option}
          />
        ))}
      </fieldset>
      <TrainingFrequencyRecommendationCard recommendation={recommendation} />
      {shouldShowLargeScreenWarning ? (
        <PlanBuilderStepStatusCard
          body="6-day plans are not available in this first version."
          className="training-frequency-large-screen-warning"
          title="Unavailable training frequency"
        />
      ) : null}

      <div className="training-frequency-actions mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          className="training-frequency-action-button h-[3.75rem] min-w-[7.375rem] border-stone-950/10 bg-[#fbf7f1] text-base text-stone-400 hover:bg-[#fbf7f1]"
          disabled
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Back
        </Button>
        {canContinueToSplit ? (
          <Button
            className="training-frequency-action-button h-[3.75rem] min-w-[14.25rem] bg-[#007780] text-base font-medium shadow-[0_12px_26px_rgba(0,119,128,0.18)] hover:bg-[#00666e] focus-visible:outline-[#007780]"
            onClick={() => {
              void onContinueToSplit();
            }}
            type="button"
          >
            Continue to Split
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        ) : (
          <Button disabled type="button">
            Continue to Split
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        )}
      </div>
    </section>
  );
}
type TrainingFrequencyOptionRadioProps = {
  isSelected: boolean;
  onSelect: (trainingFrequencyDaysPerWeek: TrainingFrequencyDaysPerWeek) => void;
  option: TrainingFrequencyOption;
};
function TrainingFrequencyOptionRadio({
  isSelected,
  onSelect,
  option,
}: TrainingFrequencyOptionRadioProps) {
  const optionLabel = `${option.daysPerWeek} days/week`;

  return (
    <label
      className={cn(
        "training-frequency-option relative flex min-h-60 min-w-0 cursor-pointer flex-col items-center justify-center rounded-lg border bg-white/80 p-5 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#007780]",
        isSelected
          ? "border-[#0b8490] text-[#00636a] shadow-[0_14px_30px_rgba(0,119,128,0.08)]"
          : "border-stone-950/10 text-stone-950 hover:bg-white",
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="training-frequency-days-per-week"
        onChange={() => onSelect(option.daysPerWeek)}
        type="radio"
        value={option.daysPerWeek}
      />
      {isSelected ? (
        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#007780] text-white">
          <Check aria-hidden="true" size={19} strokeWidth={2.5} />
        </span>
      ) : null}
      <span className="training-frequency-option__icon flex h-16 w-16 items-center justify-center text-stone-950">
        <span className="training-frequency-option__icon-frame relative flex h-16 w-16 items-center justify-center">
          <Calendar aria-hidden="true" size={58} strokeWidth={1.4} />
          <span className="training-frequency-option__day absolute top-[1.58rem] text-[1.35rem] font-medium leading-none">
            {option.daysPerWeek}
          </span>
        </span>
      </span>
      <span className="training-frequency-option__label mt-6 block text-[1.35rem] font-medium leading-7 text-stone-950">
        {optionLabel}
      </span>
      <span className="training-frequency-option__helper mt-4 block min-h-12 text-base font-medium leading-6 text-[#526873]">
        {option.helperText}
      </span>
    </label>
  );
}
type TrainingFrequencyRecommendationCardProps = {
  recommendation: TrainingFrequencyRecommendation;
};

function TrainingFrequencyRecommendationCard({
  recommendation,
}: TrainingFrequencyRecommendationCardProps) {
  return (
    <section
      aria-labelledby="training-frequency-recommendation-title"
      className="training-frequency-recommendation mt-6 flex items-center gap-5 rounded-lg border border-[#d9ebed] bg-[#f8fcfc] px-5 py-[17px] text-[#075d63]"
    >
      <span className="training-frequency-recommendation__icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#0b8490]/20 bg-white/60">
        <Star aria-hidden="true" size={28} strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-bold" id="training-frequency-recommendation-title">
          Recommended for you
        </h3>
        <p className="mt-2 text-base font-medium leading-7 text-[#31505d]">
          {recommendation.description}
        </p>
      </div>
    </section>
  );
}
