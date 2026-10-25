"use strict";
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
const clip_1 = require("./utils/clip");
const cleanup_title_1 = require("./utils/cleanup-title");
const html_entities_1 = require("html-entities");
const got_1 = require("./utils/got");
exports.default = (url, lang = null) => __awaiter(void 0, void 0, void 0, function* () {
    if (lang && !lang.match(/^[\w-]+(\s*,\s*[\w-]+)*$/))
        lang = null;
    const res = yield (0, got_1.scpaping)(url.href, { lang: lang || undefined });
    const $ = res.$;
    const twitterCard = $('meta[property="twitter:card"]').attr('content');
    let title = $('meta[property="og:title"]').attr('content') ||
        $('meta[property="twitter:title"]').attr('content') ||
        $('title').text();
    if (title === undefined || title === null) {
        return null;
    }
    title = (0, clip_1.default)((0, html_entities_1.decode)(title), 100);
    let image = $('meta[property="og:image"]').attr('content') ||
        $('meta[property="twitter:image"]').attr('content') ||
        $('link[rel="image_src"]').attr('href') ||
        $('link[rel="apple-touch-icon"]').attr('href') ||
        $('link[rel="apple-touch-icon image_src"]').attr('href');
    image = image ? URL.resolve(url.href, image) : null;
    const playerUrl = (twitterCard !== 'summary_large_image' && $('meta[property="twitter:player"]').attr('content')) ||
        (twitterCard !== 'summary_large_image' && $('meta[name="twitter:player"]').attr('content')) ||
        $('meta[property="og:video"]').attr('content') ||
        $('meta[property="og:video:secure_url"]').attr('content') ||
        $('meta[property="og:video:url"]').attr('content');
    const playerWidth = parseInt($('meta[property="twitter:player:width"]').attr('content') ||
        $('meta[name="twitter:player:width"]').attr('content') ||
        $('meta[property="og:video:width"]').attr('content') ||
        '');
    const playerHeight = parseInt($('meta[property="twitter:player:height"]').attr('content') ||
        $('meta[name="twitter:player:height"]').attr('content') ||
        $('meta[property="og:video:height"]').attr('content') ||
        '');
    let description = $('meta[property="og:description"]').attr('content') ||
        $('meta[property="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content');
    description = description
        ? (0, clip_1.default)((0, html_entities_1.decode)(description), 300)
        : null;
    if (title === description) {
        description = null;
    }
    let siteName = $('meta[property="og:site_name"]').attr('content') ||
        $('meta[name="application-name"]').attr('content') ||
        url.hostname;
    siteName = siteName ? (0, html_entities_1.decode)(siteName) : null;
    const favicon = $('link[rel="shortcut icon"]').attr('href') ||
        $('link[rel="icon"]').attr('href') ||
        '/favicon.ico';
    const sensitive = $('.tweet').attr('data-possibly-sensitive') === 'true';
    const find = (path) => __awaiter(void 0, void 0, void 0, function* () {
        const target = URL.resolve(url.href, path);
        try {
            yield (0, got_1.head)(target);
            return target;
        }
        catch (e) {
            return null;
        }
    });
    // 相対的なURL (ex. test) を絶対的 (ex. /test) に変換
    const toAbsolute = (relativeURLString) => {
        const relativeURL = URL.parse(relativeURLString);
        const isAbsolute = relativeURL.slashes || relativeURL.path[0] === '/';
        // 既に絶対的なら、即座に値を返却
        if (isAbsolute) {
            return relativeURLString;
        }
        // スラッシュを付けて返却
        return '/' + relativeURLString;
    };
    const icon = (yield find(favicon)) ||
        (
        // 相対指定を絶対指定に変換し再試行
        yield find(toAbsolute(favicon))) ||
        null;
    // Clean up the title
    title = (0, cleanup_title_1.default)(title, siteName);
    if (title === '') {
        title = siteName;
    }
    return {
        title: title || null,
        icon: icon || null,
        description: description || null,
        thumbnail: image || null,
        player: {
            url: playerUrl || null,
            width: Number.isNaN(playerWidth) ? null : playerWidth,
            height: Number.isNaN(playerHeight) ? null : playerHeight
        },
        sitename: siteName || null,
        sensitive,
    };
});
