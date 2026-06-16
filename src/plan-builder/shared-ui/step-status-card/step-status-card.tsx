import { Info } from "lucide-react";
import { cn } from "../../../design-system/cn";
import { StepNotice } from "../../../design-system/step-screen";

export type PlanBuilderStepStatusCardProps = {
  body: string;
  className?: string;
  title: string;
  titleDisplay?: PlanBuilderStepStatusCardTitleDisplay;
};

type PlanBuilderStepStatusCardTitleDisplay = "screen-reader-only" | "visible";

export function PlanBuilderStepStatusCard({
  body,
  className,
  title,
  titleDisplay = "screen-reader-only",
}: PlanBuilderStepStatusCardProps) {
  return (
    <StepNotice
      className={cn("plan-builder-step-status", className)}
      icon={<Info aria-hidden="true" size={24} strokeWidth={1.7} />}
      title={title}
      titleDisplay={titleDisplay}
    >
      {body}
    </StepNotice>
  );
}
