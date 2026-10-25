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
const debug = require("debug");
const clip_1 = require("./../utils/clip");
const log = debug('summaly:plugins:wikipedia');
function test(url) {
    return /\.wikipedia\.org$/.test(url.hostname);
}
exports.test = test;
function summarize(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const lang = url.host.split('.')[0];
        const title = url.pathname.split('/')[2];
        const endpoint = `https://${lang}.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${title}`;
        log(`lang is ${lang}`);
        log(`title is ${title}`);
        log(`endpoint is ${endpoint}`);
        let body = yield (0, got_1.get)(endpoint);
        body = JSON.parse(body);
        log(body);
        if (!('query' in body) || !('pages' in body.query)) {
            throw 'fetch failed';
        }
        const info = body.query.pages[Object.keys(body.query.pages)[0]];
        return {
            title: info.title,
            icon: 'https://wikipedia.org/static/favicon/wikipedia.ico',
            description: (0, clip_1.default)(info.extract, 300),
            thumbnail: `https://wikipedia.org/static/images/project-logos/${lang}wiki.png`,
            player: {
                url: null,
                width: null,
                height: null
            },
            sitename: 'Wikipedia'
        };
    });
}
exports.summarize = summarize;
