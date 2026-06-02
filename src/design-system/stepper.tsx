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
          "plan-builder-stepper-list grid grid-cols-2 gap-x-3 sm:grid-cols-3 lg:grid-cols-6",
          density === "compact" ? "gap-y-3" : "gap-y-5",
        )}
      >
        {items.map((item, index) => {
          const status = getStepperStatus(index, currentIndex);

          return (
            <li className="relative min-w-0 text-center" key={item.id}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "plan-builder-stepper-line absolute left-[-50%] top-[1.35rem] hidden h-px w-full bg-stone-950/10 lg:block",
                    density === "compact" ? "top-[1.1rem]" : null,
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "plan-builder-stepper-dot relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-base font-semibold shadow-[0_6px_18px_rgba(0,0,0,0.04)]",
                  density === "compact" ? "h-9 w-9 text-sm shadow-none" : null,
                  status === "current"
                    ? "border-[#006f78] bg-[#006f78] text-white"
                    : "border-stone-950/10 bg-white text-[#31505d]",
                )}
              >
                {index + 1}
              </span>
              <span
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "plan-builder-stepper-label mt-3 block truncate text-sm font-medium",
                  density === "compact" ? "mt-2 text-xs" : null,
                  status === "current" ? "text-[#00636a]" : "text-stone-950",
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
