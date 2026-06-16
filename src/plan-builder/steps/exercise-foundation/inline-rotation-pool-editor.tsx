import { Plus } from "lucide-react";
import { Button } from "../../../design-system/button";
import type { CompoundCapableMovementPatternId } from "../../exercise-catalog";
import type { ExerciseFoundationRotationPoolReadModel } from "../../exercise-foundation-read-model";
import { formatMovementPatternLabel } from "../../weekly-movement-coverage";

export function InlineRotationPoolEditor({
  movementPattern,
  onEdit,
  rotationPool,
}: {
  movementPattern: CompoundCapableMovementPatternId;
  onEdit: () => void;
  rotationPool: ExerciseFoundationRotationPoolReadModel;
}) {
  const movementPatternLabel = formatMovementPatternLabel(movementPattern);

  return (
    <section
      aria-label={`${movementPatternLabel} rotation pool summary`}
      className="rotation-pool-inline-preview"
    >
      <div className="rotation-pool-inline-preview__header">
        <span className="rotation-pool-inline-preview__label">Rotation pool</span>
        <span className="rotation-pool-inline-preview__status">{rotationPool.status}</span>
      </div>
      <div className="rotation-pool-inline-preview__actions">
        <Button
          aria-label={`Edit ${movementPatternLabel} rotation pool`}
          disabled={rotationPool.availableOptionCount === 0}
          onClick={onEdit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          Swaps
        </Button>
      </div>
    </section>
  );
}
