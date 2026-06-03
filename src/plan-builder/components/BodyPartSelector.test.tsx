import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BodyPartSelector } from "./BodyPartSelector";
import {
  bodyMapRegions,
  bodyPartSelectorExercises,
  getBodyMapRegionOrder,
  getBodyPartExercises,
} from "./body-part-selector-data";

describe("BodyPartSelector", () => {
  it("defines readable overlay regions for the approved body-map PNG", () => {
    expect(bodyMapRegions.map((region) => region.id)).toEqual(getBodyMapRegionOrder());

    for (const region of bodyMapRegions) {
      expect(region.paths.length).toBeGreaterThan(0);
      expect(region.ariaLabel).toMatch(/^Select /);
    }
  });

  it("filters exercises by the selected body region", () => {
    const chestExercises = getBodyPartExercises(bodyPartSelectorExercises, "chest");
    const upperArmExercises = getBodyPartExercises(bodyPartSelectorExercises, "upperArms");
    const coreExercises = getBodyPartExercises(bodyPartSelectorExercises, "core");

    expect(chestExercises.map((exercise) => exercise.name)).toContain(
      "Flat Barbell or Dumbbell Bench Press",
    );
    expect(upperArmExercises.map((exercise) => exercise.name)).toContain("Cable Press-Downs");
    expect(coreExercises.map((exercise) => exercise.name)).toContain("Planks");
    expect(chestExercises.every((exercise) => exercise.primaryMuscleGroup === "chest")).toBe(true);
  });

  it("starts empty, selects a region by click, and toggles exercise IDs in local state", async () => {
    const user = userEvent.setup();

    render(<BodyPartSelector />);

    expect(screen.getByText("Select a body part to choose exercises.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Select chest" }));

    const chestExercises = screen.getByRole("list", { name: /chest exercises/i });

    expect(screen.getAllByText("Chest")).toHaveLength(2);
    expect(
      within(chestExercises).getByRole("checkbox", {
        name: /flat barbell or dumbbell bench press/i,
      }),
    ).not.toBeChecked();

    await user.click(
      within(chestExercises).getByRole("checkbox", {
        name: /flat barbell or dumbbell bench press/i,
      }),
    );

    expect(screen.getByText("1 selected")).toBeVisible();

    await user.click(
      within(chestExercises).getByRole("checkbox", {
        name: /flat barbell or dumbbell bench press/i,
      }),
    );

    expect(screen.getByText("0 selected")).toBeVisible();
  });

  it("selects regions with keyboard activation and exposes pressed state", async () => {
    const user = userEvent.setup();

    render(<BodyPartSelector />);

    const shouldersRegion = screen.getByRole("button", { name: "Select shoulders" });

    shouldersRegion.focus();
    await user.keyboard("{Enter}");

    expect(shouldersRegion).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list", { name: /shoulders exercises/i })).toBeVisible();

    const coreRegion = screen.getByRole("button", { name: "Select core" });

    coreRegion.focus();
    await user.keyboard(" ");

    expect(shouldersRegion).toHaveAttribute("aria-pressed", "false");
    expect(coreRegion).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list", { name: /core exercises/i })).toBeVisible();
  });
});
