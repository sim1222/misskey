export interface WidgetSpec { id: string; name: string; data: Record<string, unknown> }
export type WidgetUpdate = Pick<WidgetSpec, 'id' | 'data'>;
