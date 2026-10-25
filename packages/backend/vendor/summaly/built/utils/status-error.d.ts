export declare class StatusError extends Error {
    statusCode: number;
    statusMessage?: string;
    isPermanentError: boolean;
    constructor(message: string, statusCode: number, statusMessage?: string);
}
