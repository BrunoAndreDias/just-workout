import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../design-system/button";
import { PageHeader, PageMain } from "../design-system/typography";
import {
  seedTrainingCycleDevPlans,
  type TrainingCycleDevSeedResult,
} from "./training-cycle-dev-seeds";

type SeedState =
  | { kind: "idle" }
  | { kind: "seeding" }
  | { kind: "seeded"; result: TrainingCycleDevSeedResult }
  | { error: string; kind: "error" };

export function TrainingCycleDevSeedRoute() {
  const [seedState, setSeedState] = useState<SeedState>({ kind: "idle" });

  if (!import.meta.env.DEV) {
    return (
      <section className="px-[var(--jw-page-padding-x)] py-[var(--jw-page-padding-y)]">
        <PageHeader
          description="Dev seed routes are disabled outside local development builds."
          title="Dev seeds unavailable"
        />
      </section>
    );
  }

  return (
    <section className="training-plan-page px-[var(--jw-page-padding-x)] py-[var(--jw-page-padding-y)]">
      <PageHeader
        description="Create local IndexedDB records that are already at the cycle-rotation edge cases."
        title="Training cycle dev seeds"
      />

      <PageMain>
        <div className="grid max-w-3xl gap-4 rounded-md border border-stone-900/10 bg-white/85 p-5 shadow-sm">
          <p className="text-sm font-semibold text-stone-700">
            This upserts three demo plans, makes the week-6 plan active, and adds completed sessions
            for load suggestions.
          </p>

          <Button
            disabled={seedState.kind === "seeding"}
            onClick={() => {
              setSeedState({ kind: "seeding" });
              seedTrainingCycleDevPlans()
                .then((result) => setSeedState({ kind: "seeded", result }))
                .catch((error: unknown) =>
                  setSeedState({
                    error: error instanceof Error ? error.message : "Unknown seed error",
                    kind: "error",
                  }),
                );
            }}
            type="button"
            variant="builderPrimary"
          >
            {seedState.kind === "seeding" ? "Creating dev plans..." : "Create cycle test plans"}
          </Button>

          {seedState.kind === "error" ? (
            <p className="text-sm font-bold text-red-700">{seedState.error}</p>
          ) : null}

          {seedState.kind === "seeded" ? <SeededPlanLinks result={seedState.result} /> : null}
        </div>
      </PageMain>
    </section>
  );
}

function SeededPlanLinks({ result }: { result: TrainingCycleDevSeedResult }) {
  return (
    <div className="grid gap-3 text-sm font-semibold text-stone-700">
      <p className="font-black text-stone-950">Seeded plans are ready:</p>
      <Link
        className="underline"
        params={{ planId: result.readyWeekSixPlanId }}
        to="/training-plans/$planId"
      >
        Week 6 ready for next-cycle generation
      </Link>
      <Link
        className="underline"
        params={{ planId: result.bodyweightWeekSixPlanId }}
        to="/training-plans/$planId"
      >
        Week 6 bodyweight-only load suggestion case
      </Link>
      <Link
        className="underline"
        params={{ planId: result.acceptedNextCyclePlanId }}
        to="/training-plans/$planId"
      >
        Accepted cycle 2 with saved starting loads
      </Link>
    </div>
  );
}
