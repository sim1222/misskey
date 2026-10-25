/// <reference types="node" />
/**
 * Detect HTML encoding
 * @param body Body in Buffer
 * @returns encoding
 */
export declare function detectEncoding(body: Buffer): string;
export declare function toUtf8(body: Buffer, encoding: string): string;
