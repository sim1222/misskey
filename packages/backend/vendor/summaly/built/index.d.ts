/**
 * summaly
 * https://github.com/syuilo/summaly
 */
import Summary from './summary';
import IPlugin from './iplugin';
declare type Options = {
    /** Per-request guarded agents; shared by scraping, plugins and image HEAD requests. */
    agents?: { http: import("http").Agent; https: import("https").Agent };
    /**
     * Accept-Language for the request
     */
    lang?: string;
    /**
     * Whether follow redirects
     */
    followRedirects?: boolean;
    /**
     * Custom Plugins
     */
    plugins?: IPlugin[];
};
declare type Result = Summary & {
    /**
     * The actual url of that web page
     */
    url: string;
};
declare const _default: (url: string, options?: Options) => Promise<Result>;
/**
 * Summarize an web page
 */
export default _default;
