/** Keep saved-record provenance honest without changing the live illustrative warning. */
export function ModelStatus({ modelVersion }: { modelVersion?: string }) {
  const illustrative = !modelVersion || modelVersion.startsWith("ILLUSTRATIVE");
  return (
    <div className="notice warn">
      {illustrative ? (
        <>
          <b>Model status:</b> Illustrative estimate; not a clinically validated
          prediction. This estimate is not for clinical decision-making.
        </>
      ) : (
        <>
          <b>Model status:</b> This saved result references a prediction model,
          but this record alone does not establish clinical validation. Do not
          use the estimate for clinical decision-making.
        </>
      )}
    </div>
  );
}
