"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInstance = void 0;
const package_json_1 = require("../package.json");
const client = require("cheerio-httpcli");
client.set('headers', {
    'User-Agent': `SummalyBot/${package_json_1.version}`
});
client.set('referer', false);
client.set('timeout', 20000);
client.set('maxDataSize', 10 * 1024 * 1024);
function createInstance() {
    return client.fork();
}
exports.createInstance = createInstance;
