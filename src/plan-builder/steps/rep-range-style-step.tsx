import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ChevronLeft, Info } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions } from "../../design-system/step-screen";
import {
  getRepRangeStyleOptionCardClassName,
  getSelectableOptionState,
  RepRangeStyleStatusBadge,
  repRangeStyleDescriptionStyles,
  repRangeStyleDetailStyles,
} from "../components/plan-builder-option-ui";
import { type RepRangeStyle, type RepRangeStyleId, repRangeStyles } from "../plan-blueprint";
import { planBuilderPaths } from "../plan-builder-paths";
import "./rep-range-style-step.css";

type RepRangeStyleStepProps = {
  onContinueToVolume: () => Promise<void>;
  onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) => void;
  savedRepRangeStyleId: RepRangeStyleId | null;
  selectedRepRangeStyle: RepRangeStyle;
};

type RepRangeStyleEffectsPanelProps = {
  repRangeStyle: RepRangeStyle;
};

type RepRangeStyleOptionRadioProps = {
  isSavedSelection: boolean;
  isSelected: boolean;
  onSelect: (repRangeStyle: RepRangeStyleId) => void;
  option: RepRangeStyle;
};

type RepRangeStyleTargetsProps = {
  isSelected?: boolean;
  targets: RepRangeStyle["targets"];
};
export function RepRangeStyleStep({
  onContinueToVolume,
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
}: RepRangeStyleStepProps) {
  return (
    <section aria-label="Rep Range Style selection" className="rep-range-step">
      <fieldset className="rep-range-options">
        <legend className="sr-only">Rep Range Style</legend>
        {repRangeStyles.map((option) => (
          <RepRangeStyleOptionRadio
            isSavedSelection={option.id === savedRepRangeStyleId}
            isSelected={option.id === selectedRepRangeStyle.id}
            key={option.id}
            onSelect={onRepRangeStyleChange}
            option={option}
          />
        ))}
      </fieldset>

      <RepRangeStyleEffectsPanel repRangeStyle={selectedRepRangeStyle} />

      <div className="rep-range-generation-note" role="note">
        <Info aria-hidden="true" size={18} strokeWidth={1.9} />
        <span>Rest times and progression rules will be added when the plan is generated.</span>
      </div>

      <StepActions className="rep-range-actions">
        <Button asChild size="step" variant="outline">
          <Link to={planBuilderPaths.frequency}>
            <ChevronLeft aria-hidden="true" size={20} />
            Back to Training schedule
          </Link>
        </Button>
        <Button
          onClick={() => {
            void onContinueToVolume();
          }}
          size="step"
          type="button"
          variant="builderPrimary"
        >
          Continue to Volume
          <ArrowRight aria-hidden="true" size={20} strokeWidth={2.4} />
        </Button>
      </StepActions>
    </section>
  );
}

function RepRangeStyleEffectsPanel({ repRangeStyle }: RepRangeStyleEffectsPanelProps) {
  return (
    <section
      aria-labelledby="rep-range-style-effect-heading"
      aria-atomic="true"
      aria-live="polite"
      className="rep-range-details"
    >
      <h3 id="rep-range-style-effect-heading">How this affects your plan</h3>
      <ul className="rep-range-effects-list">
        {repRangeStyle.planEffects.map((effect) => (
          <li key={effect}>
            <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.2} />
            <span>{effect}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
function RepRangeStyleOptionRadio({
  isSavedSelection,
  isSelected,
  onSelect,
  option,
}: RepRangeStyleOptionRadioProps) {
  const optionState = getSelectableOptionState(isSelected);
  function selectOption() {
    onSelect(option.id);
  }

  function saveImplicitDefaultSelection() {
    if (isSelected && !isSavedSelection) {
      selectOption();
    }
  }

  return (
    <label
      className={cn(
        "rep-range-option",
        getRepRangeStyleOptionCardClassName(optionState),
        isSelected ? "rep-range-option--selected" : null,
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        name="rep-range-style"
        onClick={saveImplicitDefaultSelection}
        onChange={selectOption}
        type="radio"
        value={option.id}
      />

      <div className="rep-range-option__body">
        <div className="min-w-0 flex-1">
          <div className="rep-range-option__header">
            <div className="rep-range-option__title-row">
              <p className="rep-range-option__title font-black">{option.title}</p>
              {option.isRecommended ? (
                <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
              ) : null}
            </div>
          </div>
          <p className={cn("rep-range-option__copy", repRangeStyleDescriptionStyles[optionState])}>
            {option.description}
          </p>
          <RepRangeStyleTargets isSelected={isSelected} targets={option.targets} />
        </div>
      </div>
    </label>
  );
}

function RepRangeStyleTargets({ isSelected = false, targets }: RepRangeStyleTargetsProps) {
  const optionState = getSelectableOptionState(isSelected);
  const styles = repRangeStyleDetailStyles[optionState];

  return (
    <dl className="rep-range-targets">
      {targets.map((target) => (
        <div className="rep-range-target min-w-0" key={target.label}>
          <dt className={cn("rep-range-target__label", styles.targetLabelClassName)}>
            {target.label}
          </dt>
          <dd className={cn("rep-range-target__value", styles.targetValueClassName)}>
            {target.reps}
          </dd>
        </div>
      ))}
    </dl>
  );
}
