import { CheckCircle2 } from "lucide-react";
import { type RepRangeStyle, type RepRangeStyleId, repRangeStyles } from "../../plan-blueprint";
import { ChoiceCard, ChoiceCardGroup } from "../../shared-ui/choice-card/choice-card";
import { PlanBuilderStepSection } from "../../shared-ui/step-layout/plan-builder-step-layout";
import "./rep-range-style-step.css";

type RepRangeStyleStepProps = {
  onRepRangeStyleChange: (repRangeStyle: RepRangeStyleId) => void;
  savedRepRangeStyleId: RepRangeStyleId | null;
  selectedRepRangeStyle: RepRangeStyle;
  showEffectsPanel?: boolean;
};

export function RepRangeStyleStep({
  onRepRangeStyleChange,
  savedRepRangeStyleId,
  selectedRepRangeStyle,
  showEffectsPanel = true,
}: RepRangeStyleStepProps) {
  return (
    <>
      <ChoiceCardGroup legend="Rep Range Style">
        {repRangeStyles.map((option) => {
          const isSelected = option.id === selectedRepRangeStyle.id;

          return (
            <ChoiceCard
              description={option.description}
              facts={option.targets.map((target) => ({ label: target.label, value: target.reps }))}
              isRecommended={option.isRecommended}
              isSelected={isSelected}
              key={option.id}
              name="rep-range-style"
              onClick={() => {
                // Clicking the shown default saves it as an explicit choice.
                if (isSelected && option.id !== savedRepRangeStyleId) {
                  onRepRangeStyleChange(option.id);
                }
              }}
              onSelect={() => onRepRangeStyleChange(option.id)}
              title={option.title}
              value={option.id}
            />
          );
        })}
      </ChoiceCardGroup>

      {showEffectsPanel ? (
        <PlanBuilderStepSection
          description="Rest times and progression rules are added when the plan is generated."
          title="How this affects your plan"
        >
          <ul aria-atomic="true" aria-live="polite" className="pb-effects">
            {selectedRepRangeStyle.planEffects.map((effect) => (
              <li key={effect}>
                <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.2} />
                <span>{effect}</span>
              </li>
            ))}
          </ul>
        </PlanBuilderStepSection>
      ) : null}
    </>
  );
}
