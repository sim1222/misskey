/// <reference types="node" />
import * as URL from 'url';
import summary from '../summary';
export declare function test(url: URL.Url): boolean;
export declare function summarize(url: URL.Url): Promise<summary>;
