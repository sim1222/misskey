import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fixture = JSON.parse(await readFile(new URL('./certificate-baseline.json', import.meta.url), 'utf8'));
const { getCertSubject, verifyCertificateChain } = await import(pathToFileURL(resolve(process.argv[2], 'misc/certificate.js')));
const observe = operation => { try { return { value: operation() }; } catch { return { throws: true }; } };

for (const { name, expected } of fixture.subjects) {
	assert.deepEqual(observe(() => getCertSubject(fixture.certificates[name])), expected, `Certificate subject: ${name}`);
}
for (const { chain, expected } of fixture.chains) {
	assert.deepEqual(observe(() => verifyCertificateChain(chain.map(name => fixture.certificates[name]))), expected, `Certificate chain: ${chain.join(',')}`);
}
console.log(`Verified ${fixture.subjects.length} certificate subjects and ${fixture.chains.length} signature chains against the pre-update implementation`);
