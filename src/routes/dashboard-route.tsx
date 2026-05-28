import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Plus, Upload } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { trainingService } from "../application/trainingService";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const planFormSchema = z.object({
  planName: z.string().min(2, "Use at least 2 characters.").max(80, "Keep it under 80 characters."),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export function DashboardRoute() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({
    queryFn: trainingService.getDashboardSnapshot,
    queryKey: ["dashboard"],
  });

  const form = useForm<PlanFormValues>({
    defaultValues: {
      planName: "Simple Progressive Full Body",
    },
    resolver: zodResolver(planFormSchema),
  });

  const createPlanMutation = useMutation({
    mutationFn: (values: PlanFormValues) =>
      trainingService.createStarterTrainingPlan(values.planName.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: trainingService.restoreBackupFile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  async function downloadBackup() {
    const backup = await trainingService.createBackupFile();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `just-workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const snapshot = snapshotQuery.data;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <div className="rounded-lg bg-stone-950 p-5 text-stone-50 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#f4b860]">Today</p>
              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                {snapshot?.activePlan?.templates[0]?.name ?? "No active plan"}
              </h1>
            </div>
            <Button asChild variant="secondary">
              <Link to="/workout">Open workout</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="plan">
          <TabsList>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Active Plan</CardTitle>
              </CardHeader>

              {snapshot?.activePlan ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-black">{snapshot.activePlan.name}</p>
                    <p className="text-sm font-semibold text-stone-600">
                      {snapshot.activePlan.templates.length} workouts ·{" "}
                      {snapshot.activePlan.loadUnit}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {snapshot.activePlan.templates.map((template) => (
                      <div
                        className="rounded-md border border-stone-900/10 bg-[#f9f6ef] p-3"
                        key={template.id}
                      >
                        <p className="font-bold">{template.name}</p>
                        <p className="text-sm text-stone-600">
                          {template.prescriptions.length} exercises
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form
                  className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  onSubmit={form.handleSubmit((values) => createPlanMutation.mutate(values))}
                >
                  <label className="grid gap-2" htmlFor="plan-name">
                    <span className="text-sm font-bold text-stone-700">Plan name</span>
                    <Input id="plan-name" {...form.register("planName")} />
                    {form.formState.errors.planName ? (
                      <span className="text-sm font-semibold text-[#b93725]">
                        {form.formState.errors.planName.message}
                      </span>
                    ) : null}
                  </label>
                  <Button
                    className="self-end"
                    disabled={createPlanMutation.isPending}
                    type="submit"
                  >
                    <Plus aria-hidden="true" size={18} />
                    Create
                  </Button>
                </form>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              {snapshot?.recentSessions.length ? (
                <div className="space-y-2">
                  {snapshot.recentSessions.map((session) => (
                    <div
                      className="flex items-center justify-between rounded-md border border-stone-900/10 bg-white px-3 py-2"
                      key={session.id}
                    >
                      <span className="font-semibold">
                        {new Date(session.performedAt).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-bold text-stone-600">
                        {session.sets.length} sets
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-stone-600">No sessions logged.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Backup</CardTitle>
              </CardHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={downloadBackup} type="button" variant="outline">
                  <Download aria-hidden="true" size={18} />
                  Export JSON
                </Button>
                <Button
                  onClick={() => importInputRef.current?.click()}
                  type="button"
                  variant="outline"
                >
                  <Upload aria-hidden="true" size={18} />
                  Import JSON
                </Button>
                <input
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];

                    if (file) {
                      restoreMutation.mutate(file);
                    }
                  }}
                  ref={importInputRef}
                  type="file"
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Exercise Catalog</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {snapshot?.exercises.length ? (
              snapshot.exercises.map((exercise) => (
                <div className="rounded-md bg-white px-3 py-2" key={exercise.id}>
                  <p className="font-bold">{exercise.name}</p>
                  <p className="text-xs font-semibold uppercase text-stone-500">
                    {exercise.movementPattern}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm font-semibold text-stone-600">
                Create a plan to seed exercises.
              </p>
            )}
          </div>
        </Card>
      </aside>
    </section>
  );
}
