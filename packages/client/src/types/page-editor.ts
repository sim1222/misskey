import type { Block } from '@/scripts/hpml/block';
export type PageBlockList = () => { label: string; items: { value: Block['type']; text: string }[] }[];
