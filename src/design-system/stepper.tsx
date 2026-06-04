import { cn } from "./cn";
import "./stepper.css";

export type StepperItem = {
  id: string;
  label: string;
};

type StepperProps = {
  currentIndex: number;
  density?: "default" | "compact";
  items: ReadonlyArray<StepperItem>;
  label: string;
  onItemSelect?: (item: StepperItem) => void;
};

export function Stepper({
  currentIndex,
  density = "compact",
  items,
  label,
  onItemSelect,
}: StepperProps) {
  return (
    <nav aria-label={label}>
      <ol
        aria-label={`${label} steps`}
        className={cn(
          "plan-builder-stepper-list",
          density === "compact"
            ? "plan-builder-stepper-list--compact"
            : "plan-builder-stepper-list--default",
        )}
      >
        {items.map((item, index) => {
          const status = getStepperStatus(index, currentIndex);
          const isCurrent = status === "current";
          const isInteractive = onItemSelect && !isCurrent;
          const itemContent = (
            <>
              <span
                className={cn(
                  "plan-builder-stepper-dot",
                  status === "current"
                    ? "plan-builder-stepper-dot--current"
                    : "plan-builder-stepper-dot--upcoming",
                )}
              >
                {index + 1}
              </span>
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "plan-builder-stepper-label",
                  status === "current"
                    ? "plan-builder-stepper-label--current"
                    : "plan-builder-stepper-label--upcoming",
                )}
              >
                {item.label}
              </span>
            </>
          );

          return (
            <li className="plan-builder-stepper-item" key={item.id}>
              {index > 0 ? <span aria-hidden="true" className="plan-builder-stepper-line" /> : null}
              {isInteractive ? (
                <button
                  aria-label={item.label}
                  className="plan-builder-stepper-control"
                  onClick={() => onItemSelect(item)}
                  type="button"
                >
                  {itemContent}
                </button>
              ) : (
                <span className="plan-builder-stepper-control">{itemContent}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function getStepperStatus(index: number, currentIndex: number) {
  if (index === currentIndex) {
    return "current";
  }

  if (index < currentIndex) {
    return "completed";
  }

  return "upcoming";
}
