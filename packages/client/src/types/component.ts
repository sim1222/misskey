import type { Component, FunctionalComponent, Ref } from 'vue';

export type ComponentProps<C extends Component> =
	C extends new (...args: never[]) => { $props: infer P } ? P :
	C extends FunctionalComponent<infer P> ? P : never;

export type ComponentEvents<C extends Component> = {
	[K in keyof ComponentProps<C> as K extends `on${infer Event}` ? Uncapitalize<Event> : never]?: ComponentProps<C>[K];
};

/** Popup state deliberately retains refs so changes propagate while open. */
export type PopupProps<C extends Component> = { [K in keyof ComponentProps<C>]: ComponentProps<C>[K] | Ref<ComponentProps<C>[K]> };
