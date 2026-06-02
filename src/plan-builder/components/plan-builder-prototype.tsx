import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Stepper } from "../../design-system/stepper";
import type { PlanBlueprintSummary } from "../plan-blueprint";
import {
  PlanBuilderNextStepMini,
  PrototypeBlueprintPills,
  PrototypeBlueprintRows,
  PrototypeBlueprintStrip,
  PrototypeHeaderBlueprintPanel,
} from "./plan-blueprint-summary";
import {
  type PlanBuilderPrototypeVariant,
  planBuilderLargeScreenQuery,
  planBuilderPrototypeVariants,
  planBuilderSteps,
} from "./plan-builder-config";
import "./plan-builder-prototype.css";

type PlanBuilderPrototypePageProps = {
  children: ReactNode;
  currentStepIndex: number;
  intro: ReactNode;
  summary: PlanBlueprintSummary | null;
  variant: PlanBuilderPrototypeVariant;
};
// PROTOTYPE: Four Plan Blueprint layout variants, switchable via `?variant=`.
export function PlanBuilderPrototypePage({
  children,
  currentStepIndex,
  intro,
  summary,
  variant,
}: PlanBuilderPrototypePageProps) {
  if (variant === "rail") {
    return (
      <section className="plan-builder-page plan-builder-prototype grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-10"
        >
          <PlanBuilderPrototypeHeader intro={intro} />
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
        </section>

        <aside
          aria-label="Plan blueprint summary"
          className="self-start border-l border-stone-950/10 px-4 pt-7"
        >
          <p className="text-xs font-black uppercase text-[#b93725]">Plan blueprint</p>
          <PrototypeBlueprintRows compact summary={summary} />
          <PlanBuilderNextStepMini currentStep="frequency" />
        </aside>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  if (variant === "header") {
    return (
      <section className="plan-builder-page plan-builder-prototype">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,32rem)] xl:items-end">
            <PlanBuilderPrototypeHeader intro={intro} />
            <aside aria-label="Plan blueprint summary">
              <PrototypeHeaderBlueprintPanel summary={summary} />
            </aside>
          </div>
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
        </section>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  if (variant === "bottom") {
    return (
      <section className="plan-builder-page plan-builder-prototype">
        <section
          aria-label="Plan Builder workspace"
          className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
        >
          <PlanBuilderPrototypeHeader intro={intro} />
          <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
          <div className="plan-builder-step-content mt-5">{children}</div>
          <aside
            aria-label="Plan blueprint summary"
            className="mt-4 border-t border-stone-950/10 pt-3"
          >
            <PrototypeBlueprintPills summary={summary} />
          </aside>
        </section>

        <PlanBuilderPrototypeSwitcher current={variant} />
      </section>
    );
  }

  return (
    <section className="plan-builder-page plan-builder-prototype">
      <section
        aria-label="Plan Builder workspace"
        className="plan-builder-workspace-card min-w-0 px-6 pb-4 pt-6 sm:px-8 lg:min-h-screen xl:px-12"
      >
        <PlanBuilderPrototypeHeader intro={intro} />
        <PlanBuilderPrototypeStepper currentStepIndex={currentStepIndex} />
        <PrototypeBlueprintStrip summary={summary} />
        <div className="plan-builder-step-content mt-5">{children}</div>
      </section>

      <PlanBuilderPrototypeSwitcher current={variant} />
    </section>
  );
}

function PlanBuilderPrototypeHeader({ intro }: Pick<PlanBuilderPrototypePageProps, "intro">) {
  return (
    <header className="space-y-1">
      <p className="text-xs font-black uppercase text-[#b93725]">Prototype layout</p>
      <h1 className="plan-builder-title text-[2rem] font-black leading-tight text-[#120f0d]">
        Build your workout plan
      </h1>
      {intro}
    </header>
  );
}

function PlanBuilderPrototypeStepper({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <div className="plan-builder-stepper mt-4">
      <Stepper currentIndex={currentStepIndex} items={planBuilderSteps} label="Plan Builder" />
    </div>
  );
}

function PlanBuilderPrototypeSwitcher({ current }: { current: PlanBuilderPrototypeVariant }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, a, [contenteditable='true']") ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      ) {
        return;
      }

      event.preventDefault();
      selectPlanBuilderPrototypeVariant(current, event.key === "ArrowLeft" ? -1 : 1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current]);

  if (!import.meta.env.DEV) {
    return null;
  }

  const currentVariant = planBuilderPrototypeVariants.find((variantOption) => {
    return variantOption.id === current;
  });

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-stone-950/15 bg-stone-950 px-3 py-2 text-sm font-bold text-white shadow-2xl">
      <button
        aria-label="Previous prototype variant"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => selectPlanBuilderPrototypeVariant(current, -1)}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <p className="min-w-40 text-center">
        {current.toUpperCase()} - {currentVariant?.label ?? "Prototype"}
      </p>
      <button
        aria-label="Next prototype variant"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        onClick={() => selectPlanBuilderPrototypeVariant(current, 1)}
        type="button"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </button>
    </div>
  );
}

export function usePlanBuilderPrototypeVariant(): PlanBuilderPrototypeVariant | null {
  const [variant, setVariant] = useState(getPlanBuilderPrototypeVariantFromLocation);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    function handleUrlChange() {
      setVariant(getPlanBuilderPrototypeVariantFromLocation());
    }

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("plan-builder-prototype-change", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("plan-builder-prototype-change", handleUrlChange);
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return variant;
}

export function usePlanBuilderLargeScreenLayout() {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia(planBuilderLargeScreenQuery).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(planBuilderLargeScreenQuery);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return matches;
}

function getPlanBuilderPrototypeVariantFromLocation(): PlanBuilderPrototypeVariant | null {
  if (typeof window === "undefined") {
    return null;
  }

  const requestedVariant = new URLSearchParams(window.location.search).get("variant");
  const matchingVariant = planBuilderPrototypeVariants.find((variant) => {
    return variant.id === requestedVariant;
  });

  return matchingVariant?.id ?? null;
}

function selectPlanBuilderPrototypeVariant(
  current: PlanBuilderPrototypeVariant,
  direction: -1 | 1,
) {
  const currentIndex = planBuilderPrototypeVariants.findIndex((variant) => variant.id === current);
  const nextIndex =
    (currentIndex + direction + planBuilderPrototypeVariants.length) %
    planBuilderPrototypeVariants.length;
  const nextVariant = planBuilderPrototypeVariants[nextIndex] ?? planBuilderPrototypeVariants[0];
  const url = new URL(window.location.href);

  url.searchParams.set("variant", nextVariant.id);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("plan-builder-prototype-change"));
}
