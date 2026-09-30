import { CheckCircle2, Info } from "lucide-react";
import { cn } from "../../../design-system/cn";
import { type RepRangeStyle, type RepRangeStyleId, repRangeStyles } from "../../plan-blueprint";
import {
  getSelectableOptionCardClassName,
  getSelectableOptionState,
  SelectableOptionStatusBadge,
  selectableOptionDescriptionStyles,
  selectableOptionDetailStyles,
} from "../../shared-ui/option-ui/selectable-option-ui";
import "./rep-range-style-step.css";
import "./rep-range-style-responsive.css";
import "./rep-range-style-page-overrides.css";

type RepRangeStyleStepProps = {
  onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) => void;
  savedRepRangeStyleId: RepRangeStyleId | null;
  selectedRepRangeStyle: RepRangeStyle;
  showEffectsPanel?: boolean;
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
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
  showEffectsPanel = true,
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

      {showEffectsPanel ? (
        <RepRangeStyleEffectsPanel repRangeStyle={selectedRepRangeStyle} />
      ) : null}

      <div className="rep-range-generation-note" role="note">
        <Info aria-hidden="true" size={18} strokeWidth={1.9} />
        <span>Rest times and progression rules will be added when the plan is generated.</span>
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
        getSelectableOptionCardClassName(optionState),
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
                <SelectableOptionStatusBadge tone="recommended">
                  Recommended
                </SelectableOptionStatusBadge>
              ) : null}
            </div>
          </div>
          <p
            className={cn("rep-range-option__copy", selectableOptionDescriptionStyles[optionState])}
          >
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
  const styles = selectableOptionDetailStyles[optionState];

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
