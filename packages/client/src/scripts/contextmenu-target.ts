/** Preserve the browser menu for links, editable fields and embedded media. */
export function keepsBrowserMenu(target: EventTarget | null): boolean {
 if (!(target instanceof Element)) return true;
 return target.closest('a') !== null || ['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes(target.tagName) || target.hasAttribute('contenteditable');
}
