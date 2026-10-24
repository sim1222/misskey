import type { InputHTMLAttributes } from 'vue';
export type TextInputType = 'text' | 'password' | 'email' | 'url' | 'date' | 'time' | 'search';
export type InputValue = string | number | null | undefined;
export interface InputCommonProps {
 required?: boolean; readonly?: boolean; disabled?: boolean; pattern?: string; placeholder?: string;
 autofocus?: boolean; autocomplete?: 'on' | 'off' | 'username' | 'current-password' | 'new-password' | 'email' | 'one-time-code' | boolean;
 spellcheck?: InputHTMLAttributes['spellcheck']; step?: string | number; datalist?: string[];
 inline?: boolean; debounce?: boolean; manualSave?: boolean; small?: boolean; large?: boolean;
 withPasswordToggle?: boolean;
}
export interface InputExpose { focus(): void; getInputElement(): HTMLInputElement | undefined }
