import {
  Activity,
  Check,
  Dumbbell,
  Plus,
  RefreshCcw,
  Shuffle,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  createPrototypeActionButton,
  setPrototypeUrlVariantSearchParam,
} from "../../../dev/prototype-ui";
import type { PlanBlueprintSummary } from "../../plan-blueprint";
import "./prototype-training-plan-draft-review.css";

// PROTOTYPE: Editable Training Plan Draft review, switchable via
// /plan-builder?prototype=training-plan-draft&variant=A|B|C.

const prototypeVariants = [
  { id: "A", name: "Hybrid review" },
  { id: "B", name: "Dense editor" },
  { id: "C", name: "Template board" },
] as const;

const PrototypeAction = createPrototypeActionButton("tp-draft-prototype");

type PrototypeVariantId = (typeof prototypeVariants)[number]["id"];
type TemplatePurpose = "strength" | "custom-focus";

type DraftExercise = {
  id: string;
  name: string;
  prescription: string;
  role: string;
};

type DraftSlot = {
  exercises: ReadonlyArray<DraftExercise>;
  id: string;
  label: string;
};

type DraftTemplate = {
  id: string;
  label: string;
  purpose: TemplatePurpose;
  slots: ReadonlyArray<DraftSlot>;
  subtitle: string;
};

type PrototypeSlot = DraftSlot & { isCustom?: boolean };

type TrainingPlanDraftReviewPrototypeProps = {
  summary: PlanBlueprintSummary | null;
};

const draftTemplates: readonly [DraftTemplate, ...DraftTemplate[]] = [
  {
    id: "upper-a",
    label: "Upper A",
    purpose: "strength",
    slots: [
      {
        exercises: [
          {
            id: "flat-dumbbell-bench-press",
            name: "Flat Dumbbell Bench Press",
            prescription: "3 x 6-8",
            role: "Main compound",
          },
          {
            id: "chest-supported-row",
            name: "Chest-Supported Row",
            prescription: "3 x 6-8",
            role: "Main compound",
          },
          {
            id: "hanging-knee-raise",
            name: "Hanging Knee Raise",
            prescription: "3 x 10-15",
            role: "Abs",
          },
        ],
        id: "main-upper-superset",
        label: "Main upper superset",
      },
      {
        exercises: [
          {
            id: "cable-lateral-raise",
            name: "Cable Lateral Raise",
            prescription: "3 x 10-15",
            role: "Isolation",
          },
          {
            id: "incline-dumbbell-curl",
            name: "Incline Dumbbell Curl",
            prescription: "3 x 10-15",
            role: "Isolation",
          },
        ],
        id: "isolation-finisher",
        label: "Isolation finisher",
      },
    ],
    subtitle: "Chest, back, shoulders, arms",
  },
  {
    id: "lower-a",
    label: "Lower A",
    purpose: "strength",
    slots: [
      {
        exercises: [
          {
            id: "front-squat",
            name: "Front Squat",
            prescription: "3 x 5-8",
            role: "Main compound",
          },
          {
            id: "romanian-deadlift",
            name: "Romanian Deadlift",
            prescription: "3 x 6-10",
            role: "Main compound",
          },
        ],
        id: "lower-strength-pair",
        label: "Lower strength pair",
      },
      {
        exercises: [
          {
            id: "seated-calf-raise",
            name: "Seated Calf Raise",
            prescription: "4 x 10-15",
            role: "Isolation",
          },
          {
            id: "cable-crunch",
            name: "Cable Crunch",
            prescription: "3 x 10-15",
            role: "Abs",
          },
        ],
        id: "lower-accessories",
        label: "Lower accessories",
      },
    ],
    subtitle: "Squat, hinge, calves, abs",
  },
  {
    id: "full-body-a",
    label: "Full Body A",
    purpose: "strength",
    slots: [
      {
        exercises: [
          {
            id: "trap-bar-deadlift",
            name: "Trap Bar Deadlift",
            prescription: "3 x 4-6",
            role: "Main compound",
          },
          {
            id: "incline-dumbbell-press",
            name: "Incline Dumbbell Press",
            prescription: "3 x 6-10",
            role: "Main compound",
          },
          {
            id: "lat-pulldown",
            name: "Lat Pulldown",
            prescription: "3 x 8-12",
            role: "Main compound",
          },
        ],
        id: "full-body-strength",
        label: "Full-body strength block",
      },
    ],
    subtitle: "Hinge, push, pull",
  },
  {
    id: "cardio-focus",
    label: "Cardio Focus",
    purpose: "custom-focus",
    slots: [
      {
        exercises: [
          {
            id: "bike-intervals",
            name: "Bike Intervals",
            prescription: "8 x 45s",
            role: "Conditioning",
          },
          {
            id: "sled-push",
            name: "Sled Push",
            prescription: "6 x 20m",
            role: "Conditioning",
          },
        ],
        id: "conditioning-block",
        label: "Conditioning block",
      },
    ],
    subtitle: "Conditioning without strength coverage",
  },
];

export function shouldShowTrainingPlanDraftReviewPrototype(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("prototype") === "training-plan-draft"
  );
}

export function TrainingPlanDraftReviewPrototype({
  summary,
}: TrainingPlanDraftReviewPrototypeProps) {
  const [variant, setVariant] = useState<PrototypeVariantId>(getVariantFromLocation);
  const [selectedTemplateId, setSelectedTemplateId] = useState(draftTemplates[0].id);
  const [customFocusTemplateIds, setCustomFocusTemplateIds] = useState<ReadonlyArray<string>>([]);
  const [removedSlotIds, setRemovedSlotIds] = useState<ReadonlyArray<string>>([]);
  const [customSlotsByTemplate, setCustomSlotsByTemplate] = useState<
    Record<string, ReadonlyArray<PrototypeSlot>>
  >({});

  const selectedTemplate =
    draftTemplates.find((template) => template.id === selectedTemplateId) ?? draftTemplates[0];
  const templatePurpose = customFocusTemplateIds.includes(selectedTemplate.id)
    ? "custom-focus"
    : selectedTemplate.purpose;
  const customSlots = customSlotsByTemplate[selectedTemplate.id] ?? [];
  const visibleSlots = [
    ...selectedTemplate.slots.filter((slot) => !removedSlotIds.includes(slot.id)),
    ...customSlots,
  ];

  const setUrlVariant = (nextVariant: PrototypeVariantId) => {
    setVariant(nextVariant);
    setPrototypeUrlVariantSearchParam(nextVariant);
  };

  const toggleSelectedTemplatePurpose = () => {
    setCustomFocusTemplateIds((templateIds) =>
      templateIds.includes(selectedTemplate.id)
        ? templateIds.filter((templateId) => templateId !== selectedTemplate.id)
        : [...templateIds, selectedTemplate.id],
    );
  };

  const addSlot = () => {
    const nextSlotNumber = customSlots.length + 1;
    const nextSlot: PrototypeSlot = {
      exercises: [
        {
          id: `${selectedTemplate.id}-custom-exercise-${nextSlotNumber}`,
          name: "New Exercise",
          prescription: "3 x 8-12",
          role: "Accessory",
        },
      ],
      id: `${selectedTemplate.id}-custom-slot-${Date.now()}`,
      isCustom: true,
      label: `Added slot ${nextSlotNumber}`,
    };

    setCustomSlotsByTemplate((slotsByTemplate) => ({
      ...slotsByTemplate,
      [selectedTemplate.id]: [...customSlots, nextSlot],
    }));
  };

  const deleteSlot = (slot: PrototypeSlot) => {
    if (slot.isCustom) {
      setCustomSlotsByTemplate((slotsByTemplate) => ({
        ...slotsByTemplate,
        [selectedTemplate.id]: customSlots.filter((customSlot) => customSlot.id !== slot.id),
      }));
      return;
    }

    setRemovedSlotIds((slotIds) => [...slotIds, slot.id]);
  };

  const resetLocalDraftEdits = () => {
    setCustomFocusTemplateIds([]);
    setRemovedSlotIds([]);
    setCustomSlotsByTemplate({});
    setSelectedTemplateId(draftTemplates[0].id);
  };

  return (
    <section className="tp-draft-prototype">
      {variant === "A" ? (
        <HybridReviewVariant
          onAddSlot={addSlot}
          onDeleteSlot={deleteSlot}
          onResetLocalDraftEdits={resetLocalDraftEdits}
          onSelectTemplate={setSelectedTemplateId}
          onTogglePurpose={toggleSelectedTemplatePurpose}
          selectedTemplate={selectedTemplate}
          selectedTemplateId={selectedTemplateId}
          slots={visibleSlots}
          summary={summary}
          templatePurpose={templatePurpose}
        />
      ) : null}
      {variant === "B" ? (
        <DenseEditorVariant
          onAddSlot={addSlot}
          onDeleteSlot={deleteSlot}
          onResetLocalDraftEdits={resetLocalDraftEdits}
          onSelectTemplate={setSelectedTemplateId}
          onTogglePurpose={toggleSelectedTemplatePurpose}
          selectedTemplate={selectedTemplate}
          selectedTemplateId={selectedTemplateId}
          slots={visibleSlots}
          templatePurpose={templatePurpose}
        />
      ) : null}
      {variant === "C" ? (
        <TemplateBoardVariant
          onSelectTemplate={setSelectedTemplateId}
          selectedTemplateId={selectedTemplateId}
          summary={summary}
        />
      ) : null}

      <PrototypeSwitcher setVariant={setUrlVariant} variant={variant} />
    </section>
  );
}

function HybridReviewVariant({
  onAddSlot,
  onDeleteSlot,
  onResetLocalDraftEdits,
  onSelectTemplate,
  onTogglePurpose,
  selectedTemplate,
  selectedTemplateId,
  slots,
  summary,
  templatePurpose,
}: {
  onAddSlot: () => void;
  onDeleteSlot: (slot: PrototypeSlot) => void;
  onResetLocalDraftEdits: () => void;
  onSelectTemplate: (templateId: string) => void;
  onTogglePurpose: () => void;
  selectedTemplate: DraftTemplate;
  selectedTemplateId: string;
  slots: ReadonlyArray<PrototypeSlot>;
  summary: PlanBlueprintSummary | null;
  templatePurpose: TemplatePurpose;
}) {
  return (
    <div className="tp-draft-prototype__shell">
      <header className="tp-draft-prototype__header">
        <div>
          <p>Generate Step prototype</p>
          <h2>Training Plan Draft</h2>
        </div>
        <div className="tp-draft-prototype__header-actions">
          <PrototypeAction
            icon={<RefreshCcw aria-hidden="true" />}
            label="Reset draft"
            onClick={onResetLocalDraftEdits}
            variant="secondary"
          />
          <PrototypeAction
            icon={<Check aria-hidden="true" />}
            label="Accept draft"
            onClick={() => undefined}
            variant="primary"
          />
        </div>
      </header>

      <BuilderChoiceStrip summary={summary} />

      <div className="tp-draft-prototype__workspace">
        <TemplateOverview
          onSelectTemplate={onSelectTemplate}
          selectedTemplateId={selectedTemplateId}
          templates={draftTemplates}
        />
        <TemplateEditor
          onAddSlot={onAddSlot}
          onDeleteSlot={onDeleteSlot}
          onTogglePurpose={onTogglePurpose}
          slots={slots}
          template={selectedTemplate}
          templatePurpose={templatePurpose}
        />
      </div>
    </div>
  );
}

function DenseEditorVariant({
  onAddSlot,
  onDeleteSlot,
  onResetLocalDraftEdits,
  onSelectTemplate,
  onTogglePurpose,
  selectedTemplate,
  selectedTemplateId,
  slots,
  templatePurpose,
}: {
  onAddSlot: () => void;
  onDeleteSlot: (slot: PrototypeSlot) => void;
  onResetLocalDraftEdits: () => void;
  onSelectTemplate: (templateId: string) => void;
  onTogglePurpose: () => void;
  selectedTemplate: DraftTemplate;
  selectedTemplateId: string;
  slots: ReadonlyArray<PrototypeSlot>;
  templatePurpose: TemplatePurpose;
}) {
  return (
    <div className="tp-draft-prototype__shell tp-draft-prototype__shell--dense">
      <div className="tp-draft-prototype__dense-toolbar">
        <TemplateTabs
          onSelectTemplate={onSelectTemplate}
          selectedTemplateId={selectedTemplateId}
          templates={draftTemplates}
        />
        <PrototypeAction
          icon={<RefreshCcw aria-hidden="true" />}
          label="Reset draft"
          onClick={onResetLocalDraftEdits}
          variant="secondary"
        />
      </div>
      <TemplateEditor
        onAddSlot={onAddSlot}
        onDeleteSlot={onDeleteSlot}
        onTogglePurpose={onTogglePurpose}
        slots={slots}
        template={selectedTemplate}
        templatePurpose={templatePurpose}
      />
    </div>
  );
}

function TemplateBoardVariant({
  onSelectTemplate,
  selectedTemplateId,
  summary,
}: {
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId: string;
  summary: PlanBlueprintSummary | null;
}) {
  return (
    <div className="tp-draft-prototype__shell">
      <header className="tp-draft-prototype__header">
        <div>
          <p>Generate Step prototype</p>
          <h2>Draft template board</h2>
        </div>
      </header>
      <BuilderChoiceStrip summary={summary} />
      <div className="tp-draft-prototype__board">
        {draftTemplates.map((template) => (
          <TemplateSelectionCard
            activeClassName="tp-draft-prototype__board-card--active"
            baseClassName="tp-draft-prototype__board-card"
            key={template.id}
            onSelectTemplate={onSelectTemplate}
            selectedTemplateId={selectedTemplateId}
            showSlotCount
            template={template}
          />
        ))}
      </div>
    </div>
  );
}

function BuilderChoiceStrip({ summary }: { summary: PlanBlueprintSummary | null }) {
  const fields = [
    {
      icon: <Dumbbell aria-hidden="true" />,
      label: "Training frequency",
      value: summary?.trainingFrequency ?? "4 days / week",
    },
    {
      icon: <Shuffle aria-hidden="true" />,
      label: "Split",
      value: summary?.split ?? "Upper / Lower / Full Body + Cardio",
    },
    {
      icon: <SlidersHorizontal aria-hidden="true" />,
      label: "Range style",
      value: summary?.repRanges ?? "Strength plus hypertrophy",
    },
    {
      icon: <Activity aria-hidden="true" />,
      label: "Weekly rep targets",
      value: summary?.volumePreset ? `${summary.volumePreset} targets` : "Balanced weekly targets",
    },
  ];

  return (
    <div className="tp-draft-prototype__builder-strip">
      {fields.map((field) => (
        <div className="tp-draft-prototype__builder-field" key={field.label}>
          <span>{field.icon}</span>
          <div>
            <p>{field.label}</p>
            <strong>{field.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateOverview({
  onSelectTemplate,
  selectedTemplateId,
  templates,
}: {
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId: string;
  templates: ReadonlyArray<DraftTemplate>;
}) {
  return (
    <aside className="tp-draft-prototype__template-overview" aria-label="Draft templates">
      {templates.map((template) => (
        <TemplateSelectionCard
          activeClassName="tp-draft-prototype__template-card--active"
          baseClassName="tp-draft-prototype__template-card"
          key={template.id}
          onSelectTemplate={onSelectTemplate}
          selectedTemplateId={selectedTemplateId}
          template={template}
        />
      ))}
    </aside>
  );
}

function TemplateSelectionCard({
  activeClassName,
  baseClassName,
  onSelectTemplate,
  selectedTemplateId,
  showSlotCount = false,
  template,
}: {
  activeClassName: string;
  baseClassName: string;
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId: string;
  showSlotCount?: boolean;
  template: DraftTemplate;
}) {
  const className =
    template.id === selectedTemplateId ? `${baseClassName} ${activeClassName}` : baseClassName;

  return (
    <button className={className} onClick={() => onSelectTemplate(template.id)} type="button">
      <span>{getTemplatePurposeLabel(template.purpose)}</span>
      <strong>{template.label}</strong>
      <small>{template.subtitle}</small>
      {showSlotCount ? <em>{template.slots.length} slots</em> : null}
    </button>
  );
}

function TemplateTabs({
  onSelectTemplate,
  selectedTemplateId,
  templates,
}: {
  onSelectTemplate: (templateId: string) => void;
  selectedTemplateId: string;
  templates: ReadonlyArray<DraftTemplate>;
}) {
  return (
    <div className="tp-draft-prototype__tabs" role="tablist">
      {templates.map((template) => (
        <button
          aria-selected={template.id === selectedTemplateId}
          className={
            "tp-draft-prototype__tab" +
            (template.id === selectedTemplateId ? " tp-draft-prototype__tab--active" : "")
          }
          key={template.id}
          onClick={() => onSelectTemplate(template.id)}
          role="tab"
          type="button"
        >
          {template.label}
        </button>
      ))}
    </div>
  );
}

function TemplateEditor({
  onAddSlot,
  onDeleteSlot,
  onTogglePurpose,
  slots,
  template,
  templatePurpose,
}: {
  onAddSlot: () => void;
  onDeleteSlot: (slot: PrototypeSlot) => void;
  onTogglePurpose: () => void;
  slots: ReadonlyArray<PrototypeSlot>;
  template: DraftTemplate;
  templatePurpose: TemplatePurpose;
}) {
  return (
    <section
      className="tp-draft-prototype__template-editor"
      aria-label={`${template.label} editor`}
    >
      <div className="tp-draft-prototype__template-editor-header">
        <div>
          <span>{getTemplatePurposeLabel(templatePurpose)}</span>
          <h3>{template.label}</h3>
        </div>
        <div className="tp-draft-prototype__template-editor-actions">
          <PrototypeAction
            icon={<Shuffle aria-hidden="true" />}
            label={templatePurpose === "custom-focus" ? "Make strength focus" : "Make cardio focus"}
            onClick={onTogglePurpose}
            variant="secondary"
          />
          <PrototypeAction
            icon={<Plus aria-hidden="true" />}
            label="Add slot"
            onClick={onAddSlot}
            variant="outline"
          />
        </div>
      </div>

      <div className="tp-draft-prototype__slot-list">
        {slots.map((slot) => (
          <SlotEditor key={slot.id} onDeleteSlot={onDeleteSlot} slot={slot} />
        ))}
      </div>
    </section>
  );
}

function SlotEditor({
  onDeleteSlot,
  slot,
}: {
  onDeleteSlot: (slot: PrototypeSlot) => void;
  slot: PrototypeSlot;
}) {
  return (
    <section className="tp-draft-prototype__slot">
      <div className="tp-draft-prototype__slot-header">
        <label>
          <span className="sr-only">Slot name</span>
          <input defaultValue={slot.label} />
        </label>
        <PrototypeAction
          icon={<Trash2 aria-hidden="true" />}
          label="Delete slot"
          onClick={() => onDeleteSlot(slot)}
          variant="outline"
        />
      </div>

      <div className="tp-draft-prototype__exercise-list">
        {slot.exercises.map((exercise) => (
          <div className="tp-draft-prototype__exercise-row" key={exercise.id}>
            <label className="tp-draft-prototype__exercise-name">
              <span className="sr-only">Exercise name</span>
              <input defaultValue={exercise.name} />
            </label>
            <label className="tp-draft-prototype__exercise-role">
              <span className="sr-only">Exercise role</span>
              <select defaultValue={exercise.role}>
                <option>Abs</option>
                <option>Accessory</option>
                <option>Conditioning</option>
                <option>Isolation</option>
                <option>Main compound</option>
              </select>
            </label>
            <label className="tp-draft-prototype__exercise-prescription">
              <span className="sr-only">Training prescription</span>
              <input defaultValue={exercise.prescription} />
            </label>
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
  return (
    <fieldset className="tp-draft-prototype__switcher" aria-label="Prototype variant">
      {prototypeVariants.map((prototypeVariant) => (
        <button
          className={
            "tp-draft-prototype__switcher-button" +
            (variant === prototypeVariant.id ? " tp-draft-prototype__switcher-button--active" : "")
          }
          key={prototypeVariant.id}
          onClick={() => setVariant(prototypeVariant.id)}
          type="button"
        >
          {prototypeVariant.name}
        </button>
      ))}
    </fieldset>
  );
}

function getTemplatePurposeLabel(purpose: TemplatePurpose) {
  return purpose === "custom-focus" ? "Custom focus" : "Strength";
}

function getVariantFromLocation(): PrototypeVariantId {
  if (typeof window === "undefined") {
    return "A";
  }

  const variant = new URLSearchParams(window.location.search).get("variant");
  return prototypeVariants.some((prototypeVariant) => prototypeVariant.id === variant)
    ? (variant as PrototypeVariantId)
    : "A";
}
