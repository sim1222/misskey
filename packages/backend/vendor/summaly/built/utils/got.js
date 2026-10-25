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
exports.head = exports.get = exports.scpaping = void 0;
const package_json_1 = require("../../package.json");
const got_1 = require("got"), Got = got_1;
const status_error_1 = require("./status-error");
const encoding_1 = require("./encoding");
const cheerio = require("cheerio");
const requestContext = require("./request-context");
const ipaddr = require("ipaddr.js");
const PrivateIp = value => ipaddr.process(value).range() !== "unicast";
const RESPONSE_TIMEOUT = 20 * 1000;
const OPERATION_TIMEOUT = 60 * 1000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const BOT_UA = "SummalyBot/2.7.0";
function scpaping(url, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield getResponse({
            url,
            method: 'GET',
            headers: {
                'accept': 'text/html,application/xhtml+xml',
                'user-agent': BOT_UA,
                'accept-language': opts === null || opts === void 0 ? void 0 : opts.lang
            },
            typeFilter: /^(text\/html|application\/xhtml\+xml)/,
        });
        // テスト用
        const allowPrivateIp = !!requestContext.getStore() || process.env.SUMMALY_ALLOW_PRIVATE_IP === 'true';
        if (!allowPrivateIp && response.ip && PrivateIp(response.ip)) {
            throw new status_error_1.StatusError(`Private IP rejected ${response.ip}`, 400, 'Private IP Rejected');
        }
        const encoding = (0, encoding_1.detectEncoding)(response.rawBody);
        const body = (0, encoding_1.toUtf8)(response.rawBody, encoding);
        const $ = cheerio.load(body);
        return {
            body,
            $,
            response,
        };
    });
}
exports.scpaping = scpaping;
function get(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield getResponse({
            url,
            method: 'GET',
            headers: {
                'accept': '*/*',
            }
        });
        return yield res.body;
    });
}
exports.get = get;
function head(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield getResponse({
            url,
            method: 'HEAD',
            headers: {
                'accept': '*/*',
            }
        });
        return yield res;
    });
}
exports.head = head;
function getResponse(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const timeout = RESPONSE_TIMEOUT;
        const operationTimeout = OPERATION_TIMEOUT;
        const req = (0, got_1.default)(args.url, {
            method: args.method,
            headers: args.headers,
            body: args.body,
            timeout: {
                lookup: timeout,
                connect: timeout,
                secureConnect: timeout,
                socket: timeout,
                response: timeout,
                send: timeout,
                request: operationTimeout, // whole operation timeout
            },
            agent: requestContext.getStore(),
            http2: false,
            retry: 0,
        });
        return yield receiveResponce({ req, typeFilter: args.typeFilter });
    });
}
function receiveResponce(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const req = args.req;
        const maxSize = MAX_RESPONSE_SIZE;
        req.on('response', (res) => {
            var _a;
            // Check html
            if (args.typeFilter && !((_a = res.headers['content-type']) === null || _a === void 0 ? void 0 : _a.match(args.typeFilter))) {
                req.cancel(`Rejected by type filter ${res.headers['content-type']}`);
                return;
            }
            // 応答ヘッダでサイズチェック
            const contentLength = res.headers['content-length'];
            if (contentLength != null) {
                const size = Number(contentLength);
                if (size > maxSize) {
                    req.cancel(`maxSize exceeded (${size} > ${maxSize}) on response`);
                }
            }
        });
        // 受信中のデータでサイズチェック
        req.on('downloadProgress', (progress) => {
            if (progress.transferred > maxSize && progress.percent !== 1) {
                req.cancel(`maxSize exceeded (${progress.transferred} > ${maxSize}) on response`);
            }
        });
        // 応答取得 with ステータスコードエラーの整形
        const res = yield req.catch(e => {
            if (e instanceof Got.HTTPError) {
                throw new status_error_1.StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
            }
            else {
                throw e;
            }
        });
        return res;
    });
}
