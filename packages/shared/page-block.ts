// blocks

export type BlockBase = {
	id: string;
	type: string;
};

export type TextBlock = BlockBase & {
	type: 'text';
	text?: string | null;
};

export type SectionBlock = BlockBase & {
	type: 'section';
	title?: string | null;
	children?: (Block | VarBlock)[];
};

export type ImageBlock = BlockBase & {
	type: 'image';
	fileId?: string | null;
};

export type ButtonBlock = BlockBase & {
	type: 'button';
	text?: string | null;
	primary?: boolean;
	action?: string | null;
	content?: string | null;
	event?: string | null;
	message?: string | null;
	var?: string | null;
	fn?: string | null;
};

export type IfBlock = BlockBase & {
	type: 'if';
	var?: string | null;
	children?: Block[];
};

export type TextareaBlock = BlockBase & {
	type: 'textarea';
	text?: string | null;
};

export type PostBlock = BlockBase & {
	type: 'post';
	text?: string | null;
	attachCanvasImage?: boolean;
	canvasId?: string | null;
};

export type CanvasBlock = BlockBase & {
	type: 'canvas';
	name?: string | null; // canvas id
	width?: number;
	height?: number;
};

export type NoteBlock = BlockBase & {
	type: 'note';
	detailed?: boolean;
	note?: string | null;
};

export type Block =
	TextBlock | SectionBlock | ImageBlock | ButtonBlock | IfBlock | TextareaBlock | PostBlock | CanvasBlock | NoteBlock | VarBlock;

// variable blocks

export type VarBlockBase = BlockBase & {
	name?: string | null;
};

export type NumberInputVarBlock = VarBlockBase & {
	type: 'numberInput';
 default?: number | null;
	text?: string | null;
};

export type TextInputVarBlock = VarBlockBase & {
	type: 'textInput';
 default?: string | null;
	text?: string | null;
};

export type SwitchVarBlock = VarBlockBase & {
	type: 'switch';
 default?: boolean | null;
	text?: string | null;
};

export type RadioButtonVarBlock = VarBlockBase & {
	type: 'radioButton';
 default?: string | null;
	title?: string | null;
	values?: string[];
};

export type CounterVarBlock = VarBlockBase & {
	type: 'counter';
	text?: string | null;
	inc?: number;
};

export type VarBlock =
	NumberInputVarBlock | TextInputVarBlock | TextareaInputVarBlock | SwitchVarBlock | RadioButtonVarBlock | CounterVarBlock;


export type TextareaInputVarBlock = Omit<TextInputVarBlock, 'type'> & { type: 'textareaInput' };
type Draft<T> = T extends Block ? Pick<T, 'id' | 'type'> & Partial<Omit<T, 'id' | 'type'>> : never;
export type BlockDraft = Draft<Block>;
export type BlockDraftOf<T extends Block['type']> = Extract<BlockDraft, { type: T }>;
