export type DragMove = {
  event: PointerEvent;
  offsetX: number;
  offsetY: number;
};

type DragOptions = {
  onDragStart?: (event: PointerEvent) => void;
  onDragMove: (move: DragMove) => void;
};

export function makeDraggable(panel: HTMLDivElement, options: DragOptions) {
  const handle = panel.querySelector<HTMLElement>("[data-drag-handle]");
  if (!handle) {
    return;
  }

  handle.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, label")) {
      return;
    }

    options.onDragStart?.(event);

    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    panel.setPointerCapture(event.pointerId);
    panel.classList.add("is-dragging");

    const move = (moveEvent: PointerEvent) =>
      options.onDragMove({ event: moveEvent, offsetX, offsetY });

    const stop = (pointerId: number) => {
      panel.classList.remove("is-dragging");
      if (panel.hasPointerCapture(pointerId)) {
        panel.releasePointerCapture(pointerId);
      }
      panel.removeEventListener("pointermove", move);
      panel.removeEventListener("pointerup", handlePointerUp);
      panel.removeEventListener("pointercancel", handlePointerUp);
    };

    const handlePointerUp = (upEvent: PointerEvent) => stop(upEvent.pointerId);

    panel.addEventListener("pointermove", move);
    panel.addEventListener("pointerup", handlePointerUp);
    panel.addEventListener("pointercancel", handlePointerUp);
  });
}
