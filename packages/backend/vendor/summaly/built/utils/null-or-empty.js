"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(val) {
    if (val === undefined) {
        return true;
    }
    else if (val === null) {
        return true;
    }
    else if (val.trim() === '') {
        return true;
    }
    else {
        return false;
    }
}
exports.default = default_1;
