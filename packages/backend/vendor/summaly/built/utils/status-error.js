"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusError = void 0;
class StatusError extends Error {
    constructor(message, statusCode, statusMessage) {
        super(message);
        this.name = 'StatusError';
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.isPermanentError = typeof this.statusCode === 'number' && this.statusCode >= 400 && this.statusCode < 500;
    }
}
exports.StatusError = StatusError;
