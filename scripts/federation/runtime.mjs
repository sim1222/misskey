import { appendFileSync } from 'node:fs';
import { takeCoverage } from 'node:v8';
const record = (kind, reason) => appendFileSync(`/evidence/${process.env.FEDERATION_PEER}-errors.jsonl`, JSON.stringify({ kind, name: reason instanceof Error ? reason.name : typeof reason, message: reason instanceof Error ? reason.message : String(reason), stack: reason instanceof Error ? reason.stack : null }) + '\n');
process.on('unhandledRejection', reason => record('unhandledRejection', reason));
process.on('uncaughtExceptionMonitor', reason => record('uncaughtException', reason));
process.once('SIGTERM', () => takeCoverage());
