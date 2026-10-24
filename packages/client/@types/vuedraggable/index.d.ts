// vuedraggable 4.0.1 shipped a Vue 2 declaration; 4.1.0 uses broad any types.
// Keep modelValue, itemKey, event payloads and slots correlated with the element type.
import type { AllowedComponentProps, ComponentCustomProps, ComponentPublicInstance, VNode, VNodeProps } from 'vue';
export interface DraggedContext<T> { index: number; futureIndex: number; element: T; }
export interface DropContext<T> { index: number; component: ComponentPublicInstance; element: T; }
export interface MoveEvent<T> { originalEvent: DragEvent; dragged: Element; draggedContext: DraggedContext<T>; draggedRect: DOMRect; related: Element; relatedContext: DropContext<T>; relatedRect: DOMRect; from: Element; to: Element; willInsertAfter: boolean; isTrusted: boolean; }
export interface ChangeEvent<T> { added?: { newIndex: number; element: T }; removed?: { oldIndex: number; element: T }; moved?: { oldIndex: number; newIndex: number; element: T }; }
export interface DraggableProps<T> {
 modelValue?: T[] | null;
 list?: T[] | null;
 itemKey: string | ((element: T) => string | number);
 clone?: (element: T) => T;
 tag?: string;
 move?: (event: MoveEvent<T>, original: Event) => boolean | undefined;
 componentData?: Record<string, unknown> | null;
 animation?: number | string;
 handle?: string;
 group?: string | { name: string; pull?: boolean | 'clone'; put?: boolean | string[] };
 disabled?: boolean;
 fallbackOnBody?: boolean;
 swapThreshold?: number;
 delay?: number;
 delayOnTouchOnly?: boolean;
 touchStartThreshold?: number;
 forceFallback?: boolean;
 ghostClass?: string;
 chosenClass?: string;
 dragClass?: string;
 'onUpdate:modelValue'?: (value: T[]) => void;
 onChange?: (event: ChangeEvent<T>) => void;
 onStart?: (event: Event) => void;
 onEnd?: (event: Event) => void;
}
export default class Draggable<T> {
 constructor(props: DraggableProps<T> & VNodeProps & AllowedComponentProps & ComponentCustomProps);
 $props: DraggableProps<T> & VNodeProps & AllowedComponentProps & ComponentCustomProps;
 $slots: { item(props: { element: T; index: number }): VNode[]; header?: () => VNode[]; footer?: () => VNode[]; };
 $el: HTMLElement;
}
