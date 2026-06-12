import { cn } from "./cn";
import "./stepper.css";

export type StepperItem = {
  disabledReason?: string;
  id: string;
  label: string;
};

type StepperProps = {
  currentIndex: number;
  density?: "default" | "compact";
  items: ReadonlyArray<StepperItem>;
  label: string;
  onItemSelect?: (item: StepperItem) => void;
  onLockedItemSelect?: (item: StepperItem) => void;
};

export function Stepper({
  currentIndex,
  density = "compact",
  items,
  label,
  onItemSelect,
  onLockedItemSelect,
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
          const status = item.disabledReason ? "locked" : getStepperStatus(index, currentIndex);
          const isCurrent = status === "current";
          const isLocked = status === "locked";
          const isInteractive = onItemSelect && !isCurrent;
          const descriptionId = item.disabledReason
            ? `stepper-${item.id}-locked-description`
            : undefined;
          const itemContent = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "plan-builder-stepper-dot",
                  isLocked
                    ? "plan-builder-stepper-dot--locked"
                    : status === "current"
                      ? "plan-builder-stepper-dot--current"
                      : "plan-builder-stepper-dot--upcoming",
                )}
              />
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "plan-builder-stepper-label",
                  status === "current"
                    ? "plan-builder-stepper-label--current"
                    : isLocked
                      ? "plan-builder-stepper-label--locked"
                      : "plan-builder-stepper-label--upcoming",
                )}
              >
                {item.label}
              </span>
              {item.disabledReason ? (
                <span className="sr-only" id={descriptionId}>
                  {item.disabledReason}
                </span>
              ) : null}
            </>
          );

          return (
            <li
              className={cn("plan-builder-stepper-item", `plan-builder-stepper-item--${status}`)}
              key={item.id}
            >
              {index > 0 ? <span aria-hidden="true" className="plan-builder-stepper-line" /> : null}
              {isInteractive ? (
                <button
                  aria-describedby={descriptionId}
                  aria-disabled={isLocked || undefined}
                  aria-label={isLocked ? `${item.label} step locked` : `Go to ${item.label} step`}
                  className={cn(
                    "plan-builder-stepper-control",
                    isLocked
                      ? "plan-builder-stepper-control--locked"
                      : "plan-builder-stepper-control--interactive",
                  )}
                  onClick={() => {
                    if (isLocked) {
                      onLockedItemSelect?.(item);
                      return;
                    }

                    onItemSelect(item);
                  }}
                  type="button"
                >
                  {itemContent}
                </button>
              ) : (
                <span className="plan-builder-stepper-control plan-builder-stepper-control--current">
                  {itemContent}
                </span>
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
