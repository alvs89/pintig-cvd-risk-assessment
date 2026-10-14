/** Necessary clinical interpretation context, shared by live and historical results. */
export function ModelStatus() {
  return (
    <div className="notice warn">
      <b>Model status:</b> Illustrative estimate; not a clinically validated
      prediction. This estimate is not for clinical decision-making.
    </div>
  );
}
