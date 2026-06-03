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
};

export function Stepper({ currentIndex, density = "compact", items, label }: StepperProps) {
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

          return (
            <li className="plan-builder-stepper-item" key={item.id}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="plan-builder-stepper-line"
                />
              ) : null}
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
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "plan-builder-stepper-label",
                  status === "current"
                    ? "plan-builder-stepper-label--current"
                    : "plan-builder-stepper-label--upcoming",
                )}
              >
                {item.label}
              </span>
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
