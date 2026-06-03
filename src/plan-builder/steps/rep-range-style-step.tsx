import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, CheckCircle2, Info } from "lucide-react";
import { Button } from "../../design-system/button";
import { cn } from "../../design-system/cn";
import { StepActions } from "../../design-system/step-screen";
import { SectionDescription, SectionTitle } from "../../design-system/typography";
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
    <section aria-labelledby="rep-range-style-title" className="rep-range-step">
      <div className="rep-range-panel">
        <div>
          <SectionTitle
            className="rep-range-section-title font-black text-stone-950"
            id="rep-range-style-title"
          >
            Rep ranges
          </SectionTitle>
          <SectionDescription className="rep-range-section-copy mt-1">
            Choose the rep range style StrongPlan should use when generating your workouts.
          </SectionDescription>
        </div>

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
          <Button asChild className="rep-range-action-button" variant="outline">
            <Link to={planBuilderPaths.split}>Back to Split</Link>
          </Button>
          <Button
            className="rep-range-action-button rep-range-action-button--primary"
            onClick={() => {
              void onContinueToVolume();
            }}
            type="button"
          >
            Continue to Volume
            <ArrowRight aria-hidden="true" size={20} strokeWidth={2.4} />
          </Button>
        </StepActions>
      </div>
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
  const detailStyles = repRangeStyleDetailStyles[optionState];
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
        <span className="training-split-option__control" aria-hidden="true">
          {isSelected ? <Check aria-hidden="true" size={19} strokeWidth={2.8} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="rep-range-option__header flex flex-wrap items-start justify-between gap-3">
            <p className="rep-range-option__title font-black">{option.title}</p>
            <div className="rep-range-option__badges flex flex-wrap items-center justify-end gap-2">
              {option.isRecommended ? (
                <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
              ) : null}
            </div>
          </div>
          <p className={cn("rep-range-option__copy", repRangeStyleDescriptionStyles[optionState])}>
            {option.description}
          </p>
          <RepRangeStyleTargets isSelected={isSelected} targets={option.targets} />
          {isSelected ? (
            <p className={cn("rep-range-option__note", detailStyles.noteBodyClassName)}>
              <Info aria-hidden="true" size={16} strokeWidth={1.9} />
              <span>{option.note}</span>
            </p>
          ) : null}
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
        <div
          className={cn("rep-range-target min-w-0", styles.targetCardClassName)}
          key={target.label}
        >
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
