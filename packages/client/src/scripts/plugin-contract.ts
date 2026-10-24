import type { Plugin } from '@/store';
import { matchesRuntimeShape } from './runtime-shape.ts';
import { preferenceShapes, pluginShape } from './preference-shapes.ts';
export function isPlugin(value: unknown): value is Plugin { return matchesRuntimeShape(value, pluginShape, preferenceShapes); }
