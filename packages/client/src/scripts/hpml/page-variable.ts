import type { Hpml } from './evaluator';
export function pageVariable(hpml: Hpml, name: string | null | undefined): unknown {
 return name == null ? undefined : hpml.vars.value[name];
}
