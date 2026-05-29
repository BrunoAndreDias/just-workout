import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../design-system/button";
import { Card, CardHeader, CardTitle } from "../design-system/card";
import { recommendProgression } from "./progression";
import { trainingService } from "./training-service";

export function WorkoutRoute() {
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({
    queryFn: trainingService.getDashboardSnapshot,
    queryKey: ["dashboard"],
  });

  const logWorkoutMutation = useMutation({
    mutationFn: trainingService.recordCompletedStarterWorkout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const snapshot = snapshotQuery.data;
  const activePlan = snapshot?.activePlan;
  const template = activePlan?.templates[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <div className="rounded-lg bg-[#d6462f] p-5 text-white sm:p-6">
          <p className="text-xs font-black uppercase tracking-wide text-white/75">Workout</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            {template?.name ?? "No workout selected"}
          </h1>
        </div>

        <div className="space-y-3">
          {template && snapshot ? (
            template.prescriptions.map((prescription) => {
              const exercise = snapshot.exercises.find(
                (item) => item.id === prescription.exerciseId,
              );
              const recommendation = recommendProgression({
                completedSets: Array.from(
                  { length: prescription.targetSets },
                  () => prescription.targetRepMax,
                ),
                currentLoad: 20,
                loadStep: prescription.loadStep,
                targetRepMax: prescription.targetRepMax,
                targetSets: prescription.targetSets,
              });

              return (
                <Card key={prescription.id}>
                  <CardHeader>
                    <div>
                      <CardTitle>{exercise?.name ?? "Exercise"}</CardTitle>
                      <p className="text-sm font-semibold text-stone-600">
                        {prescription.targetSets} x {prescription.targetRepMin}-
                        {prescription.targetRepMax}
                      </p>
                    </div>
                  </CardHeader>

                  <div className="grid grid-cols-3 gap-2">
                    {Array.from(
                      { length: prescription.targetSets },
                      (_, setIndex) => setIndex + 1,
                    ).map((setNumber) => (
                      <div
                        className="rounded-md border border-stone-900/10 bg-[#f9f6ef] p-3 text-center"
                        key={`${prescription.id}-set-${setNumber}`}
                      >
                        <p className="text-xs font-bold uppercase text-stone-500">
                          Set {setNumber}
                        </p>
                        <p className="text-xl font-black">{prescription.targetRepMax}</p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 rounded-md bg-stone-950 px-3 py-2 text-sm font-bold text-stone-50">
                    Next: {recommendation.nextLoad} {activePlan?.loadUnit ?? "kg"}
                  </p>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardTitle>Create a plan first</CardTitle>
            </Card>
          )}
        </div>
      </div>

      <aside>
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <Button
            className="w-full"
            disabled={!template || logWorkoutMutation.isPending}
            onClick={() => logWorkoutMutation.mutate()}
            type="button"
            variant="secondary"
          >
            <CheckCircle2 aria-hidden="true" size={18} />
            Log completed
          </Button>
        </Card>
      </aside>
    </section>
  );
}
