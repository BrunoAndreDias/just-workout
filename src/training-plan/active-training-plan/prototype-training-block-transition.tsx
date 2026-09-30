import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  History,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  createPrototypeActionButton,
  setPrototypeUrlVariantSearchParam,
} from "../../dev/prototype-ui";
import type { NextTrainingBlockLoadSuggestion, NextTrainingBlockPreview } from "../training-block";
import type { NextTrainingBlockTransitionWorkflow } from "../training-block-transition";
import "./prototype-training-block-transition.css";

// PROTOTYPE: Three variants of the Active Training Plan block transition, switchable via
// ?variant=, mounted on the existing Training Plan route.

const prototypeVariants = [
  { id: "A", name: "Inline checklist" },
  { id: "B", name: "Transition workspace" },
  { id: "C", name: "Auto with undo" },
] as const;

const PrototypeAction = createPrototypeActionButton("tb-transition-prototype");

type PrototypeVariantId = (typeof prototypeVariants)[number]["id"];
type PrototypeOutcome = "accepted" | "editing" | "pending" | "skipped" | "undone";
type ReviewTrainingBlockTransitionWorkflow = Extract<
  NextTrainingBlockTransitionWorkflow,
  { kind: "review" }
>;

type TrainingBlockTransitionPrototypeProps = {
  blockWeek: number;
  cycleNumber: number;
  trainingBlockWeeks: number;
  transition: ReviewTrainingBlockTransitionWorkflow;
};

export function TrainingBlockTransitionPrototype({
  blockWeek,
  cycleNumber,
  trainingBlockWeeks,
  transition,
}: TrainingBlockTransitionPrototypeProps) {
  const [variant, setVariant] = useState<PrototypeVariantId>(getVariantFromLocation);
  const [outcome, setOutcome] = useState<PrototypeOutcome>("pending");
  const summary = useMemo(() => getTransitionSummary(transition.preview), [transition.preview]);

  const setUrlVariant = (nextVariant: PrototypeVariantId) => {
    setVariant(nextVariant);
    setOutcome("pending");
    setPrototypeUrlVariantSearchParam(nextVariant);
  };

  return (
    <>
      {variant === "A" ? (
        <InlineChecklistVariant
          blockWeek={blockWeek}
          cycleNumber={cycleNumber}
          outcome={outcome}
          setOutcome={setOutcome}
          summary={summary}
          trainingBlockWeeks={trainingBlockWeeks}
          transition={transition}
        />
      ) : null}
      {variant === "B" ? (
        <TransitionWorkspaceVariant
          outcome={outcome}
          setOutcome={setOutcome}
          summary={summary}
          transition={transition}
        />
      ) : null}
      {variant === "C" ? (
        <AutoWithUndoVariant
          outcome={outcome}
          setOutcome={setOutcome}
          summary={summary}
          transition={transition}
        />
      ) : null}
      <PrototypeSwitcher setVariant={setUrlVariant} variant={variant} />
    </>
  );
}

function InlineChecklistVariant({
  blockWeek,
  cycleNumber,
  outcome,
  setOutcome,
  summary,
  trainingBlockWeeks,
  transition,
}: TrainingBlockTransitionPrototypeProps & {
  outcome: PrototypeOutcome;
  setOutcome: (outcome: PrototypeOutcome) => void;
  summary: TransitionSummary;
}) {
  return (
    <section className="tb-transition-prototype tb-transition-prototype--inline">
      <PrototypeHeader
        eyebrow={`Cycle ${cycleNumber} - Week ${blockWeek} of ${trainingBlockWeeks}`}
        title="Review next Training Block"
      >
        The current block stays the Training Surface. The next block is reviewed only when it is
        ready, then accepted from here.
      </PrototypeHeader>

      <div className="tb-transition-prototype__inline-grid">
        <section className="tb-transition-prototype__decision-panel">
          <OutcomeBanner outcome={outcome} />
          <MetricRow summary={summary} />
          <div className="tb-transition-prototype__action-row">
            <PrototypeAction
              icon={<SlidersHorizontal aria-hidden="true" />}
              label="Review swaps"
              onClick={() => setOutcome("editing")}
              variant="secondary"
            />
            <PrototypeAction
              icon={<X aria-hidden="true" />}
              label="Skip rotations"
              onClick={() => setOutcome("skipped")}
              variant="outline"
            />
            <PrototypeAction
              icon={<Check aria-hidden="true" />}
              label="Accept next block"
              onClick={() => setOutcome("accepted")}
              variant="primary"
            />
          </div>
        </section>

        <section className="tb-transition-prototype__checklist" aria-label="Transition checklist">
          <h3>Before accepting</h3>
          <ChecklistItem
            icon={<ShieldCheck aria-hidden="true" />}
            label="Exercise rotation is optional"
            value={`${summary.rotatedCount} proposed, ${summary.keptCount} kept`}
          />
          <ChecklistItem
            icon={<ClipboardCheck aria-hidden="true" />}
            label="Starting loads are editable"
            value={`${summary.prefilledLoadCount} prefilled, ${summary.emptyLoadCount} empty`}
          />
          <ChecklistItem
            icon={<History aria-hidden="true" />}
            label="Progress context links back"
            value={summary.weekReferenceLabel}
          />
        </section>
      </div>

      <RotationSummary preview={transition.preview} />
      <LoadPrefillSummary suggestions={transition.preview.loadSuggestions} />
    </section>
  );
}

function TransitionWorkspaceVariant({
  outcome,
  setOutcome,
  summary,
  transition,
}: {
  outcome: PrototypeOutcome;
  setOutcome: (outcome: PrototypeOutcome) => void;
  summary: TransitionSummary;
  transition: ReviewTrainingBlockTransitionWorkflow;
}) {
  return (
    <section className="tb-transition-prototype tb-transition-prototype--workspace">
      <PrototypeHeader eyebrow="Dedicated review mode" title="Next Training Block workspace">
        The Active Training Plan opens a focused review workspace for the transition. The workspace
        is still anchored to the Training Surface, not the Plan Builder.
      </PrototypeHeader>

      <div className="tb-transition-prototype__workspace-shell">
        <nav className="tb-transition-prototype__workspace-nav" aria-label="Transition steps">
          <StepPill active icon={<Sparkles aria-hidden="true" />} label="Preview" value="Ready" />
          <StepPill
            active
            icon={<SlidersHorizontal aria-hidden="true" />}
            label="Exercises"
            value={`${summary.rotatedCount} swaps`}
          />
          <StepPill
            active={summary.emptyLoadCount > 0}
            icon={<ClipboardCheck aria-hidden="true" />}
            label="Starting loads"
            value={`${summary.emptyLoadCount} empty`}
          />
          <StepPill icon={<History aria-hidden="true" />} label="Volume reference" value="Review" />
        </nav>

        <div className="tb-transition-prototype__workspace-main">
          <OutcomeBanner outcome={outcome} />
          <RotationSummary preview={transition.preview} compact />
          <LoadPrefillSummary compact suggestions={transition.preview.loadSuggestions} />
        </div>

        <aside className="tb-transition-prototype__workspace-decision">
          <h3>Decision</h3>
          <p>
            Keep this review short enough to finish in one pass, but expose enough detail to avoid a
            hidden automatic block change.
          </p>
          <div className="tb-transition-prototype__decision-stack">
            <PrototypeAction
              icon={<Check aria-hidden="true" />}
              label="Accept reviewed block"
              onClick={() => setOutcome("accepted")}
              variant="primary"
            />
            <PrototypeAction
              icon={<X aria-hidden="true" />}
              label="Keep exercises"
              onClick={() => setOutcome("skipped")}
              variant="outline"
            />
            <PrototypeAction
              icon={<Undo2 aria-hidden="true" />}
              label="Undo after accept"
              onClick={() => setOutcome("undone")}
              variant="secondary"
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

function AutoWithUndoVariant({
  outcome,
  setOutcome,
  summary,
  transition,
}: {
  outcome: PrototypeOutcome;
  setOutcome: (outcome: PrototypeOutcome) => void;
  summary: TransitionSummary;
  transition: ReviewTrainingBlockTransitionWorkflow;
}) {
  return (
    <section className="tb-transition-prototype tb-transition-prototype--auto">
      <PrototypeHeader eyebrow="Automation-first option" title="Next block is prepared">
        Just Workout can prepare the next Training Block, but the user still gets a visible review
        and an undo window before training starts.
      </PrototypeHeader>

      <div className="tb-transition-prototype__auto-hero">
        <OutcomeBanner outcome={outcome} />
        <div className="tb-transition-prototype__auto-copy">
          <h3>Prepared for {summary.dateRange}</h3>
          <p>
            The proposal keeps planned Training Volume stable, resets effort through week-one RIR,
            and leaves unknown first-time loads empty.
          </p>
        </div>
        <div className="tb-transition-prototype__auto-actions">
          <PrototypeAction
            icon={<Sparkles aria-hidden="true" />}
            label="Use prepared block"
            onClick={() => setOutcome("accepted")}
            variant="primary"
          />
          <PrototypeAction
            icon={<SlidersHorizontal aria-hidden="true" />}
            label="Review first"
            onClick={() => setOutcome("editing")}
            variant="secondary"
          />
        </div>
      </div>

      <div className="tb-transition-prototype__auto-grid">
        <CompactStat label="Rotation proposal" value={`${summary.rotatedCount} changes`} />
        <CompactStat label="Starting loads" value={summary.loadStatusLabel} />
        <CompactStat label="Week 1 effort" value={summary.weekOneRirLabel} />
        <CompactStat label="Undo window" value="Until first session" />
      </div>

      <RotationSummary preview={transition.preview} compact />
    </section>
  );
}

function PrototypeHeader({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="tb-transition-prototype__header">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{children}</span>
    </header>
  );
}

function OutcomeBanner({ outcome }: { outcome: PrototypeOutcome }) {
  const copyByOutcome: Record<PrototypeOutcome, { label: string; tone: "default" | "success" }> = {
    accepted: {
      label:
        "Prototype state: next Training Block accepted; undo stays available until a new Training Session starts.",
      tone: "success",
    },
    editing: {
      label: "Prototype state: editing the proposal before accepting.",
      tone: "default",
    },
    pending: {
      label: "Prototype state: review pending; current Training Block is unchanged.",
      tone: "default",
    },
    skipped: {
      label: "Prototype state: rotations skipped; next Training Block keeps current exercises.",
      tone: "default",
    },
    undone: {
      label: "Prototype state: accepted block undone; return to the previous Active Training Plan.",
      tone: "success",
    },
  };
  const copy = copyByOutcome[outcome];

  return (
    <p
      className={
        "tb-transition-prototype__outcome" +
        (copy.tone === "success" ? " tb-transition-prototype__outcome--success" : "")
      }
    >
      {copy.label}
    </p>
  );
}

function MetricRow({ summary }: { summary: TransitionSummary }) {
  return (
    <div className="tb-transition-prototype__metrics">
      <CompactStat label="Starts" value={summary.dateRange} />
      <CompactStat label="Changes" value={`${summary.rotatedCount}`} />
      <CompactStat label="Loads" value={summary.loadStatusLabel} />
      <CompactStat label="Week 1 RIR" value={summary.weekOneRirLabel} />
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="tb-transition-prototype__stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

function ChecklistItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="tb-transition-prototype__checklist-item">
      <span className="tb-transition-prototype__icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        <span>{value}</span>
      </span>
    </div>
  );
}

function StepPill({
  active,
  icon,
  label,
  value,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span
      className={`tb-transition-prototype__step${active ? " tb-transition-prototype__step--active" : ""}`}
    >
      <span className="tb-transition-prototype__icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        <span>{value}</span>
      </span>
    </span>
  );
}

function RotationSummary({
  compact,
  preview,
}: {
  compact?: boolean;
  preview: NextTrainingBlockPreview;
}) {
  const rows = compact ? preview.rotation.rotated.slice(0, 4) : preview.rotation.rotated;

  return (
    <section className="tb-transition-prototype__section" aria-label="Exercise rotation proposal">
      <div className="tb-transition-prototype__section-heading">
        <h3>Exercise rotation proposal</h3>
        <p>{preview.rotation.kept.length} exercises stay unchanged.</p>
      </div>
      <div className="tb-transition-prototype__rotation-list">
        {rows.map((rotation) => (
          <div
            className="tb-transition-prototype__rotation-row"
            key={`${rotation.previousExerciseId}-${rotation.nextExerciseId}`}
          >
            <span>
              <strong>{rotation.previousExerciseName}</strong>
              <span>Previous exercise</span>
            </span>
            <span>
              <strong>{rotation.nextExerciseName}</strong>
              <span>{rotation.reason}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadPrefillSummary({
  compact,
  suggestions,
}: {
  compact?: boolean;
  suggestions: ReadonlyArray<NextTrainingBlockLoadSuggestion>;
}) {
  const visibleSuggestions = compact ? suggestions.slice(0, 5) : suggestions;

  return (
    <section className="tb-transition-prototype__section" aria-label="Starting load review">
      <div className="tb-transition-prototype__section-heading">
        <h3>Starting load review</h3>
        <p>Exact exercise history can prefill; first-time exercise loads stay empty.</p>
      </div>
      <div className="tb-transition-prototype__load-list">
        {visibleSuggestions.map((suggestion) => (
          <div className="tb-transition-prototype__load-row" key={suggestion.exerciseId}>
            <span>
              <strong>{suggestion.exerciseName}</strong>
              <span>{formatMovementPatternLabel(suggestion.movementPattern)}</span>
            </span>
            <span>{getLoadReviewLabel(suggestion)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrototypeSwitcher({
  setVariant,
  variant,
}: {
  setVariant: (variant: PrototypeVariantId) => void;
  variant: PrototypeVariantId;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setVariant(getAdjacentVariant(variant, event.key === "ArrowRight" ? 1 : -1));
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setVariant, variant]);

  if (!import.meta.env.DEV) {
    return null;
  }

  const currentVariant = prototypeVariants.find((candidate) => candidate.id === variant);

  return (
    <div
      className="tb-transition-prototype-switcher"
      role="toolbar"
      aria-label="Prototype variant switcher"
    >
      <button
        aria-label="Previous prototype variant"
        onClick={() => setVariant(getAdjacentVariant(variant, -1))}
        type="button"
      >
        <ArrowLeft aria-hidden="true" />
      </button>
      <span>
        {currentVariant?.id} - {currentVariant?.name}
      </span>
      <button
        aria-label="Next prototype variant"
        onClick={() => setVariant(getAdjacentVariant(variant, 1))}
        type="button"
      >
        <ArrowRight aria-hidden="true" />
      </button>
    </div>
  );
}

type TransitionSummary = {
  dateRange: string;
  emptyLoadCount: number;
  keptCount: number;
  loadStatusLabel: string;
  prefilledLoadCount: number;
  rotatedCount: number;
  weekOneRirLabel: string;
  weekReferenceLabel: string;
};

function getTransitionSummary(preview: NextTrainingBlockPreview): TransitionSummary {
  const emptyLoadCount = preview.loadSuggestions.filter(isFirstTimeLoadSuggestion).length;
  const prefilledLoadCount = preview.loadSuggestions.length - emptyLoadCount;
  const weekOneTarget = preview.weeklyIntensityTargets.find((target) => target.weekNumber === 1);

  return {
    dateRange: `${formatDate(preview.trainingBlock.startDate)} - ${formatDate(
      preview.trainingBlock.endDate,
    )}`,
    emptyLoadCount,
    keptCount: preview.rotation.kept.length,
    loadStatusLabel:
      emptyLoadCount === 0
        ? `${prefilledLoadCount} prefilled`
        : `${emptyLoadCount} empty, ${prefilledLoadCount} prefilled`,
    prefilledLoadCount,
    rotatedCount: preview.rotation.rotated.length,
    weekOneRirLabel: weekOneTarget
      ? `${weekOneTarget.minTargetRir}-${weekOneTarget.maxTargetRir}`
      : "Not set",
    weekReferenceLabel: "Previous Training Week volume",
  };
}

function getVariantFromLocation(): PrototypeVariantId {
  if (typeof window === "undefined") {
    return "A";
  }

  const variant = new URLSearchParams(window.location.search).get("variant");

  return isPrototypeVariant(variant) ? variant : "A";
}

function getAdjacentVariant(
  currentVariant: PrototypeVariantId,
  offset: 1 | -1,
): PrototypeVariantId {
  const currentIndex = prototypeVariants.findIndex((variant) => variant.id === currentVariant);
  const nextIndex = (currentIndex + offset + prototypeVariants.length) % prototypeVariants.length;

  return prototypeVariants[nextIndex]?.id ?? "A";
}

function isPrototypeVariant(value: string | null): value is PrototypeVariantId {
  return prototypeVariants.some((variant) => variant.id === value);
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function getLoadReviewLabel(suggestion: NextTrainingBlockLoadSuggestion): string {
  if (isFirstTimeLoadSuggestion(suggestion)) {
    return "Empty first load";
  }

  if (suggestion.previousLoad === null) {
    return "No exact history";
  }

  return `Prefill ${formatLoad(suggestion.previousLoad)}`;
}

function isFirstTimeLoadSuggestion(suggestion: NextTrainingBlockLoadSuggestion): boolean {
  const reason = suggestion.reason.toLowerCase();

  if (reason.includes("bodyweight only")) {
    return false;
  }

  return suggestion.previousLoad === null || reason.includes("movement pattern");
}

function formatLoad(load: number): string {
  return `${load} kg`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
    new Date(`${date}T00:00:00.000Z`),
  );
}

function formatMovementPatternLabel(movementPattern: string): string {
  return movementPattern
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
