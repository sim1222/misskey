export type Type = 'string' | 'number' | 'boolean' | 'stringArray' | 'function' | null;

export type ExprBase = {
	id: string;
};

// value

export type EmptyValue = ExprBase & {
	type: null;
	value?: null;
};

export type TextValue = ExprBase & {
	type: 'text';
	value: string;
};

export type MultiLineTextValue = ExprBase & {
	type: 'multiLineText';
	value: string;
};

export type TextListValue = ExprBase & {
	type: 'textList';
	value: string;
};

export type NumberValue = ExprBase & {
	type: 'number';
	value: number;
};

export type RefValue = ExprBase & {
	type: 'ref';
	value: string; // value is variable name
};

export type AiScriptRefValue = ExprBase & {
	type: 'aiScriptVar';
	value: string; // value is variable name
};

export type UserFnValue = ExprBase & {
	type: 'fn';
	value: UserFnInnerValue;
};
type UserFnInnerValue = {
	slots: {
		name: string;
		type: Type;
	}[];
	expression: Expr;
};

export type Value =
	EmptyValue | TextValue | MultiLineTextValue | TextListValue | NumberValue | RefValue | AiScriptRefValue | UserFnValue;

export type BuiltinFn = 'if' | 'for' | 'not' | 'or' | 'and' | 'add' | 'subtract' | 'multiply' | 'divide' | 'mod' | 'round' | 'eq' | 'notEq' | 'gt' | 'lt' | 'gtEq' | 'ltEq' | 'strLen' | 'strPick' | 'strReplace' | 'strReverse' | 'join' | 'stringToNumber' | 'numberToString' | 'splitStrByLine' | 'pick' | 'listLen' | 'rannum' | 'dailyRannum' | 'seedRannum' | 'random' | 'dailyRandom' | 'seedRandom' | 'randomPick' | 'dailyRandomPick' | 'seedRandomPick' | 'DRPWPM';

// call function

export type CallFn = ExprBase & { // "fn:hoge" or string
	type: BuiltinFn | `fn:${string}`;
	args: Expr[];
	value: null;
};

// variable
export type Variable = (Value | CallFn) & {
	name: string;
};

// expression
export type Expr = Variable | Value | CallFn;

const builtinFnNames = ['if', 'for', 'not', 'or', 'and', 'add', 'subtract', 'multiply', 'divide', 'mod', 'round', 'eq', 'notEq', 'gt', 'lt', 'gtEq', 'ltEq', 'strLen', 'strPick', 'strReplace', 'strReverse', 'join', 'stringToNumber', 'numberToString', 'splitStrByLine', 'pick', 'listLen', 'rannum', 'dailyRannum', 'seedRannum', 'random', 'dailyRandom', 'seedRandom', 'randomPick', 'dailyRandomPick', 'seedRandomPick', 'DRPWPM'] as const;
const literalNames = ['text', 'multiLineText', 'textList', 'number', 'ref', 'aiScriptVar', 'fn'] as const;
export function isExprType(value: unknown): value is Expr['type'] {
 return value === null || typeof value === 'string' && (value.startsWith('fn:') || builtinFnNames.some(name => name === value) || literalNames.some(name => name === value));
}
