import { useEffect, useRef } from "react";
import { S, render } from "../state/store";
export function ConfirmationDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const confirmation = S.confirmation;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (confirmation && !dialog.open) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("#pintigCancel")?.focus();
    }
    if (!confirmation && dialog.open) dialog.close();
  }, [confirmation]);
  function dismiss() {
    S.confirmation = null;
    render();
    queueMicrotask(() => {
      if (previousFocus.current?.isConnected)
        previousFocus.current.focus({ preventScroll: true });
    });
  }
  return (
    <dialog
      ref={ref}
      id="pintigConfirm"
      className="pintig-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pintigConfirmTitle"
      aria-describedby="pintigConfirmDescription"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          ref.current!.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          ),
        );
        const current = controls.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        e.preventDefault();
        controls[
          (current + (e.shiftKey ? -1 : 1) + controls.length) % controls.length
        ]?.focus();
      }}
    >
      <div className="pintig-confirm__content">
        <div className="pintig-confirm__heading">
          <div className="pintig-confirm__symbol" aria-hidden="true">
            !
          </div>
          <h2 id="pintigConfirmTitle">{confirmation?.title}</h2>
        </div>
        <p id="pintigConfirmDescription">{confirmation?.description}</p>
      </div>
      <div className="pintig-confirm__footer">
        <button
          type="button"
          className="btn"
          id="pintigCancel"
          onClick={dismiss}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn pintig-confirm__danger"
          id="pintigConfirmAction"
          onClick={() => {
            const action = confirmation?.onConfirm;
            dismiss();
            action?.();
          }}
        >
          {confirmation?.actionLabel}
        </button>
      </div>
    </dialog>
  );
}
