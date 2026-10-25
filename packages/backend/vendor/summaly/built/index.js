"use strict";
/**
 * summaly
 * https://github.com/syuilo/summaly
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const URL = require("url");
const requestContext = require("./utils/request-context");
const requireAll = require("require-all");
const trace_redirect_1 = require("trace-redirect");
const general_1 = require("./general");
// Load builtin plugins
const _builtinPlugins = requireAll({
    dirname: __dirname + '/plugins'
});
const builtinPlugins = Object.keys(_builtinPlugins)
    .map(key => _builtinPlugins[key]);
const defaultOptions = {
    lang: null,
    followRedirects: true,
    plugins: null
};
/**
 * Summarize an web page
 */
exports.default = (url, options) => requestContext.run(options && options.agents, () => __awaiter(void 0, void 0, void 0, function* () {
    const opts = Object.assign(defaultOptions, options);
    const plugins = builtinPlugins.concat(opts.plugins || []);
    const actualUrl = opts.followRedirects ? yield (0, trace_redirect_1.default)(url).catch(() => url) : url;
    const _url = URL.parse(actualUrl, true);
    // Find matching plugin
    const match = plugins.filter(plugin => plugin.test(_url))[0];
    // Get summary
    const summary = yield (match ? match.summarize : general_1.default)(_url, opts.lang);
    if (summary == null) {
        throw 'failed summarize';
    }
    return Object.assign(summary, {
        url: actualUrl
    });
}));
