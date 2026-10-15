import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { numericInputError } from "../utils/numericValidation";

export function NumericInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const touched = useRef(false);
  const errorId = `${props.id}-error`;
  function validate(input: HTMLInputElement) {
    const message = numericInputError(input);
    input.setCustomValidity(message);
    setError(message);
  }
  function rejectCharacter(input: HTMLInputElement) {
    const message = "Enter a valid number using digits and a decimal point.";
    touched.current = true;
    input.setCustomValidity(message);
    setError(message);
  }
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const report = () => {
      touched.current = true;
      validate(input);
    };
    input.addEventListener("pintig:numeric-validation", report);
    return () => input.removeEventListener("pintig:numeric-validation", report);
  }, []);
  useEffect(() => {
    if (
      ref.current &&
      (touched.current || (props.value !== undefined && props.value !== ""))
    )
      validate(ref.current);
  }, [
    props.value,
    props.defaultValue,
    props.min,
    props.max,
    props.step,
    props.required,
  ]);
  return (
    <div className="numeric-control">
      <input
        {...props}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={
          [props["aria-describedby"], error ? errorId : ""]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onInput={(event) => {
          touched.current = true;
          validate(event.currentTarget);
          props.onInput?.(event);
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (
            !props.readOnly &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            event.key.length === 1 &&
            !/[0-9.\-]/.test(event.key)
          ) {
            event.preventDefault();
            rejectCharacter(event.currentTarget);
          }
        }}
        onPaste={(event) => {
          props.onPaste?.(event);
          if (
            !props.readOnly &&
            /[^0-9.\-]/.test(event.clipboardData.getData("text"))
          ) {
            event.preventDefault();
            rejectCharacter(event.currentTarget);
          }
        }}
        onBlur={(event) => {
          touched.current = true;
          validate(event.currentTarget);
          props.onBlur?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          touched.current = true;
          validate(event.currentTarget);
          if (
            event.currentTarget.form?.querySelector(":invalid") ===
            event.currentTarget
          )
            event.currentTarget.focus();
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
