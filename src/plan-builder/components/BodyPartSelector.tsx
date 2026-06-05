import { useId, useMemo, useState } from "react";
import bodyMapFrontBackAsset from "../../assets/body-map/body-map-tight-vector-trace.svg";
import {
  type BodyMapRegionId,
  bodyMapRegions,
  bodyPartSelectorExercises,
  getBodyMapRegionLabel,
  getBodyPartExercises,
} from "./body-part-selector-data";
import "./body-part-selector.css";

type SelectedExerciseIdSet = ReadonlySet<string>;

export function BodyPartSelector() {
  const componentId = useId();
  const [selectedRegionId, setSelectedRegionId] = useState<BodyMapRegionId | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<SelectedExerciseIdSet>(
    () => new Set(),
  );
  const selectedRegionExercises = useMemo(
    () =>
      selectedRegionId ? getBodyPartExercises(bodyPartSelectorExercises, selectedRegionId) : [],
    [selectedRegionId],
  );

  function selectRegion(regionId: BodyMapRegionId) {
    setSelectedRegionId(regionId);
  }

  function toggleExerciseSelection(exerciseId: string) {
    setSelectedExerciseIds((currentSelectedExerciseIds) => {
      const nextSelectedExerciseIds = new Set(currentSelectedExerciseIds);

      if (nextSelectedExerciseIds.has(exerciseId)) {
        nextSelectedExerciseIds.delete(exerciseId);
      } else {
        nextSelectedExerciseIds.add(exerciseId);
      }

      return nextSelectedExerciseIds;
    });
  }

  return (
    <section aria-labelledby={`${componentId}-title`} className="body-part-selector">
      <h4 className="sr-only" id={`${componentId}-title`}>
        Body-part exercise selection
      </h4>

      <div className="body-part-selector__content">
        <div className="body-part-selector__map-panel">
          <fieldset
            aria-describedby={`${componentId}-description`}
            className="body-part-selector__map-frame"
          >
            <legend className="sr-only">
              Front and back body map with selectable body regions
            </legend>
            <span className="sr-only" id={`${componentId}-description`}>
              Select chest, shoulders, upper arms, forearms, core, upper back and lats, glutes,
              quads, hamstrings, or calves.
            </span>
            <img
              alt=""
              aria-hidden="true"
              className="body-part-selector__image"
              draggable={false}
              src={bodyMapFrontBackAsset}
            />
            <svg
              aria-label="Selectable body regions"
              className="body-part-selector__overlay"
              preserveAspectRatio="xMidYMid meet"
              viewBox="0 0 731 1001"
            >
              {bodyMapRegions.map((region) => {
                const isSelected = selectedRegionId === region.id;

                return (
                  // biome-ignore lint/a11y/useSemanticElements: SVG overlay regions must remain SVG groups so the paths align with the PNG.
                  <g
                    aria-label={region.ariaLabel}
                    aria-pressed={isSelected}
                    className="body-part-selector__region"
                    data-region={region.id}
                    focusable="true"
                    key={region.id}
                    onClick={() => selectRegion(region.id)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }

                      event.preventDefault();
                      selectRegion(region.id);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <title>{region.ariaLabel}</title>
                    {region.paths.map((path) => (
                      <path
                        className="body-part-selector__region-shape"
                        d={path}
                        data-region={region.id}
                        key={path}
                        transform={getBodyMapRegionPathTransform(path)}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
          </fieldset>
        </div>

        <aside className="body-part-selector__picker" aria-live="polite">
          {selectedRegionId ? (
            <>
              <div className="body-part-selector__picker-header">
                <div>
                  <h5>{getBodyMapRegionLabel(selectedRegionId)}</h5>
                  <p>
                    {selectedRegionExercises.length} exercises available. Selected exercise IDs are
                    kept in local form state.
                  </p>
                </div>
                <span className="body-part-selector__selection-count">
                  {selectedExerciseIds.size} selected
                </span>
              </div>

              <ul
                aria-label={`${getBodyMapRegionLabel(selectedRegionId)} exercises`}
                className="body-part-selector__exercise-list"
              >
                {selectedRegionExercises.map((exercise) => {
                  const controlId = `${componentId}-${exercise.id}`;
                  const isSelected = selectedExerciseIds.has(exercise.id);

                  return (
                    <li className="body-part-selector__exercise-item" key={exercise.id}>
                      <input
                        checked={isSelected}
                        id={controlId}
                        onChange={() => toggleExerciseSelection(exercise.id)}
                        type="checkbox"
                      />
                      <label htmlFor={controlId}>
                        <span className="body-part-selector__exercise-name">{exercise.name}</span>
                        <span className="body-part-selector__exercise-meta">
                          {exercise.equipment.map(formatEquipmentLabel).join(", ")}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="body-part-selector__empty">
              <h5>Exercise picker</h5>
              <p>Select a body part to choose exercises.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function formatEquipmentLabel(equipmentId: string): string {
  return equipmentId
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getBodyMapRegionPathTransform(path: string): string {
  const firstCoordinateMatch = path.match(/^M(?<x>\d+)/);
  const firstX = Number(firstCoordinateMatch?.groups?.x ?? 0);

  if (firstX > 700) {
    return "matrix(0.9222 0 0 1 -339.16 0)";
  }

  return "matrix(0.9538 0 0 1 -281.14 0)";
}
