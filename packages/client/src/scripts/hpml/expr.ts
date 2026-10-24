export { isExprType } from '../../../../shared/page-expr';
export type * from '../../../../shared/page-expr';
import type { Expr, Value } from '../../../../shared/page-expr';
import { literalDefs } from '.';

export function isLiteralValue(expr: Expr): expr is Value {
	if (expr.type == null) return true;
	if (literalDefs[expr.type]) return true;
	return false;
}
