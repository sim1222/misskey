export interface DragPoint { clientX: number; clientY: number }
export function getDragPoint(event: MouseEvent | TouchEvent): DragPoint | null {
 if ('touches' in event) return event.touches[0] ?? event.changedTouches[0] ?? null;
 return event;
}

export function listenDrag(target: Window, onMove: (point: DragPoint) => void, onStop?: () => void): () => void {
 let active = true;
 function move(event: MouseEvent | TouchEvent): void {
  const point = getDragPoint(event);
  if (active && point) onMove(point);
 }
 function stop(): void {
  if (!active) return;
  active = false;
  target.removeEventListener('mousemove', move);
  target.removeEventListener('touchmove', move);
  target.removeEventListener('mouseleave', stop);
  target.removeEventListener('mouseup', stop);
  target.removeEventListener('touchend', stop);
  target.removeEventListener('touchcancel', stop);
  onStop?.();
 }
 target.addEventListener('mousemove', move);
 target.addEventListener('touchmove', move);
 target.addEventListener('mouseleave', stop);
 target.addEventListener('mouseup', stop);
 target.addEventListener('touchend', stop);
 target.addEventListener('touchcancel', stop);
 return stop;
}
