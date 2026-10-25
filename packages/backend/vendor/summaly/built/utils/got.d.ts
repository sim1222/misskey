import * as Got from 'got';
export declare function scpaping(url: string, opts?: {
    lang?: string;
}): Promise<{
    body: string;
    $: CheerioStatic;
    response: Got.Response<string>;
}>;
export declare function get(url: string): Promise<string>;
export declare function head(url: string): Promise<Got.Response<string>>;
