"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const escapeRegExp = require('escape-regexp');
function default_1(title, siteName) {
    title = title.trim();
    if (siteName) {
        siteName = siteName.trim();
        const x = escapeRegExp(siteName);
        const patterns = [
            `^(.+?)\\s?[\\-\\|:・]\\s?${x}$`
        ];
        for (let i = 0; i < patterns.length; i++) {
            const pattern = new RegExp(patterns[i]);
            const [, match] = pattern.exec(title) || [null, null];
            if (match) {
                return match;
            }
        }
    }
    return title;
}
exports.default = default_1;
