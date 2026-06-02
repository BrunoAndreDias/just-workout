import { Link } from "@tanstack/react-router";
import { Button } from "../../design-system/button";
import { StepActions, StepPanel } from "../../design-system/step-screen";
import { PlanBuilderStepStatusCard } from "../components/plan-builder-page";
import { planBuilderPaths } from "../plan-builder-paths";
export function ReviewPlaceholderStep() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <StepPanel>
          <h3 className="text-xl font-black text-stone-950 sm:text-2xl">Review step coming next</h3>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Exercises are confirmed. This placeholder keeps the final pre-generation route real
            without introducing full Review content yet.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-stone-600">
            Exercise order and rest rules will be applied automatically during generation.
          </p>

          <StepActions className="mt-6">
            <Button asChild variant="outline">
              <Link to={planBuilderPaths.exercises}>Back to Exercises</Link>
            </Button>
          </StepActions>
        </StepPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PlanBuilderStepStatusCard
          body="This route is a guarded placeholder only. Final blueprint review stays out of scope in this slice."
          title="Step scope"
          titleDisplay="visible"
        />
      </div>
    </div>
  );
}
