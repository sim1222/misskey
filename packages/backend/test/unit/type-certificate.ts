import fixture from '../../../../scripts/regression/certificate-baseline.json' with { type: 'json' };
import { getCertSubject, verifyCertificateChain } from '@/misc/certificate.js';

const certificates: Readonly<Record<string, string>> = fixture.certificates;

describe('Node X509 compatibility with the previous attestation helpers', () => {
	it.each(fixture.subjects)('preserves subject $name', ({ name, expected }) => {
		if (expected.throws) expect(() => getCertSubject(certificates[name])).toThrow();
		else expect(getCertSubject(certificates[name])).toEqual(expected.value);
	});
	it.each(fixture.chains)('preserves chain $chain', ({ chain, expected }) => {
		const verify = () => verifyCertificateChain(chain.map(name => certificates[name]));
		if (expected.throws) expect(verify).toThrow();
		else expect(verify()).toBe(expected.value);
	});
});
