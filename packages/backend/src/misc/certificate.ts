import { X509Certificate } from 'node:crypto';

export function getCertSubject(pem: string): Readonly<Record<string, string | undefined>> {
	const subject = new X509Certificate(pem).toLegacyObject().subject;
	// Preserve the previous parser's last value for repeated subject attributes.
	return Object.fromEntries(Object.entries(subject).map(([name, value]) => [
		name, Array.isArray(value) ? value.at(-1) : value,
	]));
}

// This verifies signatures only, matching the previous attestation helper.
// It does not add certificate lifetime, hostname or trust-store validation.
export function verifyCertificateChain(certificates: readonly string[]): boolean {
	let valid = true;
	for (let i = 0; i < certificates.length; i++) {
		const certificate = new X509Certificate(certificates[i]);
		const issuer = new X509Certificate(certificates[i + 1] ?? certificates[i]);
		valid = valid && certificate.verify(issuer.publicKey);
	}
	return valid;
}
