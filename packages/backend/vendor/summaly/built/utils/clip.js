"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const null_or_empty_1 = require("./null-or-empty");
function default_1(s, max) {
    if ((0, null_or_empty_1.default)(s)) {
        return s;
    }
    s = s.trim();
    if (s.length > max) {
        return s.substr(0, max) + '...';
    }
    else {
        return s;
    }
}
exports.default = default_1;
