export type * from '../../../../shared/page-block';
import type { Block, VarBlock } from '../../../../shared/page-block';
const varBlock = ['numberInput', 'textInput', 'textareaInput', 'switch', 'radioButton', 'counter'];
export function isVarBlock(block: Block): block is VarBlock {
	return varBlock.includes(block.type);
}
