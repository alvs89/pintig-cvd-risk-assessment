import { useEffect, useRef, useState, type SelectHTMLAttributes } from "react";
import { selectionError } from "../utils/assessmentValidation";

export function ValidatedSelect(
  props: SelectHTMLAttributes<HTMLSelectElement>,
) {
  const ref = useRef<HTMLSelectElement>(null);
  const [error, setError] = useState("");
  const touched = useRef(false);
  const errorId = `${props.id}-error`;
  function validate(select: HTMLSelectElement) {
    const message = selectionError(
      select.name,
      select.value,
      select.getAttribute("aria-required") === "true",
    );
    select.setCustomValidity(message);
    setError(message);
  }
  useEffect(() => {
    const select = ref.current;
    if (!select) return;
    const report = () => {
      touched.current = true;
      validate(select);
    };
    select.addEventListener("pintig:assessment-validation", report);
    return () =>
      select.removeEventListener("pintig:assessment-validation", report);
  }, []);
  useEffect(() => {
    if (touched.current && ref.current) validate(ref.current);
  }, [props.value, props["aria-required"]]);
  return (
    <div className="select-control">
      <select
        {...props}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          [props["aria-describedby"], error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onFocus={(event) => {
          if (props.id === "pid" && event.currentTarget.value === "") {
            touched.current = true;
            validate(event.currentTarget);
          }
          props.onFocus?.(event);
        }}
        onChange={(event) => {
          if (touched.current) validate(event.currentTarget);
          props.onChange?.(event);
        }}
      />
      {error && (
        <small id={errorId} className="field-error" aria-live="polite">
          {error}
        </small>
      )}
    </div>
  );
}
