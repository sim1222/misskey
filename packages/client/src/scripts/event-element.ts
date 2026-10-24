export function eventElement(event: { currentTarget: EventTarget | null; target: EventTarget | null }): HTMLElement | undefined {
 const target = event.currentTarget ?? event.target;
 return target instanceof HTMLElement ? target : undefined;
}
