import { columnTypes, type Column } from '../types/deck.ts';
import { isNotificationTypes } from '../../../shared/constants.ts';
import { isRecord } from './form.ts';
function isWidget(value: unknown): boolean {
 return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && isRecord(value.data);
}
function isColumn(value: unknown): value is Column {
 return isRecord(value) && typeof value.id === 'string' && columnTypes.some(type => type === value.type) &&
  (typeof value.name === 'string' || value.name === null) && typeof value.width === 'number' &&
  (value.widgets === undefined || Array.isArray(value.widgets) && value.widgets.every(isWidget)) &&
  (value.active === undefined || typeof value.active === 'boolean') && (value.flexible === undefined || typeof value.flexible === 'boolean') &&
  (value.antennaId === undefined || typeof value.antennaId === 'string') && (value.listId === undefined || typeof value.listId === 'string') &&
  (value.includingTypes == null || isNotificationTypes(value.includingTypes)) &&
  (value.tl == null || ['home', 'local', 'social', 'global'].some(type => type === value.tl));
}
export function isDeckProfile(value: unknown): value is { columns: Column[]; layout: string[][] } {
 return isRecord(value) && Array.isArray(value.columns) && value.columns.every(isColumn) &&
  Array.isArray(value.layout) && value.layout.every((row: unknown) => Array.isArray(row) && row.every((id: unknown) => typeof id === 'string'));
}
