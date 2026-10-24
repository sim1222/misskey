export interface ModalAnchor { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom' }
export function modalAnchorPosition(source: { left: number; top: number; width: number; height: number }, content: { width: number; height: number }, anchor: ModalAnchor): { left: number; top: number } {
 return {
  left: anchor.x === 'center' ? source.left + source.width / 2 - content.width / 2 : anchor.x === 'right' ? source.left + source.width : source.left - content.width,
  top: anchor.y === 'center' ? source.top - content.height / 2 : anchor.y === 'bottom' ? source.top + source.height : source.top - content.height,
 };
}
