import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createAppRouter } from "../app/router";
import { db } from "../training/local-database";

describe("PlanBuilderRoute", () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("renders the resumable plan builder summary inside the app shell", async () => {
    const router = createAppRouter(
      createMemoryHistory({
        initialEntries: ["/plan-builder"],
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: /plan builder/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /just workout/i })).toBeVisible();
    expect(await screen.findByText("Build Muscle")).toBeVisible();
    expect(await screen.findAllByText("3 days/week")).toHaveLength(2);
    expect(screen.getAllByText("Not chosen yet")).toHaveLength(3);
    expect(screen.getByText("Not configured yet")).toBeVisible();
    expect(screen.getByText("Not ready yet")).toBeVisible();
  });
});
