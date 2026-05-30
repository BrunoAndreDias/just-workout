import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../app/router";
import { db } from "../training/local-database";

describe("PlanBuilderRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("renders the resumable plan builder summary inside the app shell", async () => {
    renderPlanBuilder();

    expect(await screen.findByRole("heading", { name: /plan builder/i })).toBeVisible();
    expect(await screen.findByRole("region", { name: /plan builder workspace/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /just workout/i })).toBeVisible();
    expect(await screen.findByText("Build Muscle")).toBeVisible();
    expect(await screen.findAllByText("3 days/week")).toHaveLength(2);
    expect(screen.getAllByText("Not chosen yet")).toHaveLength(3);
    expect(screen.getByText("Not configured yet")).toBeVisible();
    expect(screen.getByText("Not ready yet")).toBeVisible();
  });

  it("lets the user select a training frequency, updates the summary, and restores it on return", async () => {
    const user = userEvent.setup();
    const firstView = renderPlanBuilder();

    const frequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    expect(within(frequencyGroup).getByText("2 days/week")).toBeVisible();
    expect(within(frequencyGroup).getByRole("radio", { name: /3 days\/week/i })).toBeChecked();
    expect(within(frequencyGroup).getByText("4 days/week")).toBeVisible();
    expect(within(frequencyGroup).getByText("5 days/week")).toBeVisible();
    expect(screen.getByText("Flexible split options")).toBeVisible();
    expect(
      screen.getByText(/flexible split options, steady recovery, and enough training frequency/i),
    ).toBeVisible();
    expect(screen.getByText(/6-day plans are not available in this first version/i)).toBeVisible();

    await user.click(within(frequencyGroup).getByText("5 days/week"));

    await waitFor(() => {
      expect(within(frequencyGroup).getByRole("radio", { name: /5 days\/week/i })).toBeChecked();
    });

    const summary = screen.getByRole("complementary", { name: /plan blueprint summary/i });

    await waitFor(() => {
      expect(within(summary).getAllByText("5 days/week")).toHaveLength(1);
    });

    expect(
      screen.getByText(/supports higher weekly frequency and shorter sessions/i),
    ).toBeVisible();

    firstView.unmount();
    renderPlanBuilder();

    const resumedFrequencyGroup = await screen.findByRole("group", {
      name: /training frequency/i,
    });

    await waitFor(() => {
      expect(
        within(resumedFrequencyGroup).getByRole("radio", { name: /5 days\/week/i }),
      ).toBeChecked();
    });
    expect(
      within(screen.getByRole("complementary", { name: /plan blueprint summary/i })).getByText(
        "5 days/week",
      ),
    ).toBeVisible();
  });

  it("shows the builder steps, disables Back on Frequency, and continues to the Split placeholder", async () => {
    const user = userEvent.setup();

    renderPlanBuilder();

    const stepList = await screen.findByRole("list", { name: /plan builder steps/i });

    expect(within(stepList).getByText("Frequency")).toHaveAttribute("aria-current", "step");
    expect(within(stepList).getByText("Split")).toBeVisible();
    expect(within(stepList).getByText("Rep ranges")).toBeVisible();
    expect(within(stepList).getByText("Volume")).toBeVisible();
    expect(within(stepList).getByText("Exercises")).toBeVisible();
    expect(within(stepList).getByText("Review")).toBeVisible();
    expect(await screen.findByRole("button", { name: /^back$/i })).toBeDisabled();

    await user.click(await screen.findByRole("link", { name: /continue to split/i }));

    expect(await screen.findByRole("heading", { name: /split placeholder/i })).toBeVisible();
    expect(screen.getByText(/split selection is not built yet/i)).toBeVisible();
    expect(
      within(await screen.findByRole("list", { name: /plan builder steps/i })).getByText("Split"),
    ).toHaveAttribute("aria-current", "step");
  });
});

function renderPlanBuilder() {
  const router = createAppRouter({
    history: createMemoryHistory({
      initialEntries: ["/plan-builder"],
    }),
  });
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
