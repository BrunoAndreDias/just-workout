import { ArrowRight, Calendar, Check, ChevronLeft, Info, Star } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { usePlanBuilderLargeScreenLayout } from "../components/plan-builder-page";
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
      className="training-frequency-panel"
    >
      <div className="training-frequency-heading">
        <h2
          className="training-frequency-title"
          id="training-frequency-title"
        >
          Training frequency
        </h2>
        <p className="training-frequency-copy">
          Choose how many days per week you can realistically train so Just Workout can recommend
          the right split.
        </p>
      </div>

      <fieldset className="training-frequency-options">
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
        <section
          aria-label="Unavailable training frequency"
          className="training-frequency-note-row training-frequency-large-screen-warning"
        >
          <Info aria-hidden="true" size={16} strokeWidth={1.8} />
          <p>6-day plans are not available in this first version.</p>
        </section>
      ) : null}

      <div className="training-frequency-actions">
        <Button
          className="training-frequency-action-button training-frequency-action-button--back"
          disabled
          type="button"
          variant="outline"
        >
          <ChevronLeft aria-hidden="true" size={20} />
          Back
        </Button>
        {canContinueToSplit ? (
          <Button
            className="training-frequency-action-button training-frequency-action-button--continue"
            onClick={() => {
              void onContinueToSplit();
            }}
            type="button"
          >
            Continue to Split
            <ArrowRight aria-hidden="true" size={20} />
          </Button>
        ) : (
          <Button
            className="training-frequency-action-button training-frequency-action-button--continue"
            disabled
            type="button"
          >
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
        "training-frequency-option",
        isSelected ? "training-frequency-option--selected" : null,
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
        <span className="training-frequency-option__check">
          <Check aria-hidden="true" size={19} strokeWidth={2.5} />
        </span>
      ) : null}
      <span className="training-frequency-option__icon">
        <span className="training-frequency-option__icon-frame">
          <Calendar aria-hidden="true" size={58} strokeWidth={1.4} />
          <span className="training-frequency-option__day">
            {option.daysPerWeek}
          </span>
        </span>
      </span>
      <span className="training-frequency-option__label">
        {optionLabel}
      </span>
      <span className="training-frequency-option__helper">
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
      className="training-frequency-recommendation"
    >
      <span className="training-frequency-recommendation__icon">
        <Star aria-hidden="true" size={28} strokeWidth={1.5} />
      </span>
      <div className="training-frequency-recommendation__copy">
        <h3 id="training-frequency-recommendation-title">
          Recommended for you
        </h3>
        <p>
          {recommendation.description}
        </p>
      </div>
    </section>
  );
}
