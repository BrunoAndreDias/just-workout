import { Link } from "@tanstack/react-router";
import { Check, CheckCircle2 } from "lucide-react";
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
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
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
    <div className="rep-range-step">
      <div className="min-w-0">
        <section aria-labelledby="rep-range-style-title" className="rep-range-choice">
          <div>
            <h3
              className="rep-range-section-title font-black text-stone-950"
              id="rep-range-style-title"
            >
              Select Rep Range Style
            </h3>
            <p className="rep-range-section-copy mt-1 max-w-2xl text-sm text-[#244256]">
              Pick the rep target bias that fits how you want main compounds, secondary compounds,
              and accessories to feel before Volume is set next.
            </p>
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
        </section>

        <RepRangeStyleEffectsPanel repRangeStyle={selectedRepRangeStyle} />

        <StepActions className="rep-range-actions">
          <Button asChild className="rep-range-action-button" variant="outline">
            <Link to={planBuilderPaths.split}>Back to Split</Link>
          </Button>
          <Button
            className="rep-range-action-button"
            onClick={() => {
              void onContinueToVolume();
            }}
            type="button"
          >
            Continue to Volume
          </Button>
        </StepActions>
      </div>

      <PlanBuilderStepStatusCard
        body="Volume targets are set next; Just Workout will use this rep range style later when translating volume into sets and reps."
        className="rep-range-boundary-note"
        title="Boundary for this step"
        titleDisplay="visible"
      />
    </div>
  );
}

function RepRangeStyleEffectsPanel({ repRangeStyle }: RepRangeStyleEffectsPanelProps) {
  return (
    <section
      aria-labelledby="rep-range-style-effect-heading"
      aria-atomic="true"
      aria-live="polite"
      className="rep-range-details rounded-lg border border-[#00636a] bg-[#fbfdfc] p-4"
    >
      <div className="training-split-details__heading">
        <span
          className="training-split-details__check flex h-9 w-9 items-center justify-center rounded-full bg-[#00636a] text-white"
          aria-hidden="true"
        >
          <Check aria-hidden="true" size={18} strokeWidth={2.8} />
        </span>
        <div>
          <h3>{repRangeStyle.title}</h3>
          <p className="training-split-details__copy">
            How this style guides set and rep targets later.
          </p>
        </div>
      </div>
      <div className="rep-range-details__content">
        <div className="training-split-fit-panel">
          <h4 id="rep-range-style-effect-heading">How this affects your plan</h4>
          <ul className="mt-3 grid gap-2">
            {repRangeStyle.planEffects.map((effect) => (
              <li className="flex gap-2 text-sm leading-5 text-[#244256]" key={effect}>
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#007780]"
                  size={15}
                  strokeWidth={2.4}
                />
                {effect}
              </li>
            ))}
          </ul>
        </div>
        <div className="rep-range-detail-targets">
          <h4>Rep targets</h4>
          <RepRangeStyleTargets isSelected targets={repRangeStyle.targets} />
        </div>
      </div>
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
              {isSelected ? (
                <RepRangeStyleStatusBadge tone="selected">
                  <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
                  Selected
                </RepRangeStyleStatusBadge>
              ) : null}

              {option.isRecommended ? (
                <RepRangeStyleStatusBadge tone="recommended">Recommended</RepRangeStyleStatusBadge>
              ) : null}
            </div>
          </div>
          <p className={cn("rep-range-option__copy", repRangeStyleDescriptionStyles[optionState])}>
            {option.description}
          </p>
          <RepRangeStyleTargets isSelected={isSelected} targets={option.targets} />
          <p className={cn("rep-range-option__note", detailStyles.noteBodyClassName)}>
            {option.note}
          </p>
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
          <dt
            className={cn(
              "text-[0.72rem] font-bold uppercase leading-4 tracking-wide",
              styles.targetLabelClassName,
            )}
          >
            {target.label}
          </dt>
          <dd className={cn("mt-0.5 text-sm font-semibold leading-4", styles.targetValueClassName)}>
            {target.reps}
          </dd>
        </div>
      ))}
    </dl>
  );
}
