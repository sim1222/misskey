import type { NotificationType } from '../../../shared/constants';
import type { WidgetSpec } from './widget';
export const columnTypes = ['main', 'widgets', 'notifications', 'tl', 'antenna', 'list', 'mentions', 'direct'] as const;
export type ColumnWidget = WidgetSpec;
export interface Column {
 id: string; type: typeof columnTypes[number]; name: string | null; width: number;
 widgets?: ColumnWidget[]; active?: boolean; flexible?: boolean; antennaId?: string; listId?: string;
 includingTypes?: NotificationType[] | null;
 tl?: 'home' | 'local' | 'social' | 'global' | null;
}
