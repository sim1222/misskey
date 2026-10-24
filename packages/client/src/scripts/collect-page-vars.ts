import type { PageVar } from './hpml';
import type { BlockDraft } from './hpml/block';

export function collectPageVars(content: BlockDraft[]): PageVar[] {
 const result: PageVar[] = [];
 for (const block of content) {
  switch (block.type) {
   case 'section': case 'if': result.push(...collectPageVars(block.children ?? [])); break;
   case 'textInput': case 'textareaInput': case 'radioButton':
    if (typeof block.name === 'string') result.push({ name: block.name, type: 'string', value: block.default || '' });
    break;
   case 'numberInput':
    if (typeof block.name === 'string') result.push({ name: block.name, type: 'number', value: block.default || 0 });
    break;
   case 'switch':
    if (typeof block.name === 'string') result.push({ name: block.name, type: 'boolean', value: block.default || false });
    break;
   case 'counter':
    if (typeof block.name === 'string') result.push({ name: block.name, type: 'number', value: 0 });
    break;
  }
 }
 return result;
}
