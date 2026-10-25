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
const http = require("http");
const Koa = require("koa");
const __1 = require("../");
const app = new Koa();
app.use((ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!ctx.query.url) {
        ctx.status = 400;
        return;
    }
    try {
        const summary = yield (0, __1.default)(ctx.query.url, {
            lang: ctx.query.lang,
            followRedirects: false
        });
        ctx.body = summary;
    }
    catch (e) {
        ctx.status = 500;
    }
}));
const server = http.createServer(app.callback());
server.listen(process.env.PORT || 80);
