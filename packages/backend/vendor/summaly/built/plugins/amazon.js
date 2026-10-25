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
exports.summarize = exports.test = void 0;
const got_1 = require("../utils/got");
function test(url) {
    return url.hostname === 'www.amazon.com' ||
        url.hostname === 'www.amazon.co.jp' ||
        url.hostname === 'www.amazon.ca' ||
        url.hostname === 'www.amazon.com.br' ||
        url.hostname === 'www.amazon.com.mx' ||
        url.hostname === 'www.amazon.co.uk' ||
        url.hostname === 'www.amazon.de' ||
        url.hostname === 'www.amazon.fr' ||
        url.hostname === 'www.amazon.it' ||
        url.hostname === 'www.amazon.es' ||
        url.hostname === 'www.amazon.nl' ||
        url.hostname === 'www.amazon.cn' ||
        url.hostname === 'www.amazon.in' ||
        url.hostname === 'www.amazon.au';
}
exports.test = test;
function summarize(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield (0, got_1.scpaping)(url.href);
        const $ = res.$;
        const title = $('#title').text();
        const description = $('#productDescription').text() ||
            $('meta[name="description"]').attr('content');
        const thumbnail = $('#landingImage').attr('src');
        const playerUrl = $('meta[property="twitter:player"]').attr('content') ||
            $('meta[name="twitter:player"]').attr('content');
        const playerWidth = parseInt($('meta[property="twitter:player:width"]').attr('content') ||
            $('meta[name="twitter:player:width"]').attr('content'));
        const playerHeight = parseInt($('meta[property="twitter:player:height"]').attr('content') ||
            $('meta[name="twitter:player:height"]').attr('content'));
        return {
            title: title ? title.trim() : null,
            icon: 'https://www.amazon.com/favicon.ico',
            description: description ? description.trim() : null,
            thumbnail: thumbnail ? thumbnail.trim() : null,
            player: {
                url: playerUrl || null,
                width: playerWidth || null,
                height: playerHeight || null
            },
            sitename: 'Amazon'
        };
    });
}
exports.summarize = summarize;
