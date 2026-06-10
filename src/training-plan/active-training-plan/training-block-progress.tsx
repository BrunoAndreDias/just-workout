export function TrainingBlockProgress({
  blockProgressPercent,
  blockWeek,
  trainingBlockWeeks,
}: {
  blockProgressPercent: number;
  blockWeek: number;
  trainingBlockWeeks: number;
}) {
  return (
    <div className="active-training-plan-progress">
      <h2>Block progress</h2>
      <p>
        Week {blockWeek} of {trainingBlockWeeks}
      </p>
      <div className="active-training-plan-progress__row">
        <div
          className="active-training-plan-progress__track"
          aria-label={`Block progress ${blockProgressPercent}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={blockProgressPercent}
          role="progressbar"
        >
          <span style={{ width: `${blockProgressPercent}%` }} />
        </div>
        <span>{blockProgressPercent}%</span>
      </div>
    </div>
  );
}

export function getCurrentBlockWeek(): number {
  return 2;
}

export function getBlockProgressPercent({
  blockWeek,
  trainingBlockWeeks,
}: {
  blockWeek: number;
  trainingBlockWeeks: number;
}): number {
  return Math.round((blockWeek / trainingBlockWeeks) * 100);
}
