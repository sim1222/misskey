import { generateKeyPairSync, sign, X509Certificate } from 'node:crypto';
import * as jsrsasign from 'jsrsasign';
import { TwoFactorAuthenticationService } from '@/core/TwoFactorAuthenticationService.js';

describe('Cryptography dependency compatibility', () => {
	it('reads and verifies an RSA certificate with both jsrsasign and Node', () => {
		const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
		const certificate = new jsrsasign.KJUR.asn1.x509.Certificate({
			version: 3,
			serial: { int: 1 },
			sigalg: 'SHA256withRSA',
			issuer: { str: '/CN=Maintenance fixture' },
			subject: { str: '/CN=Maintenance fixture' },
			notbefore: '20260101000000Z',
			notafter: '20300101000000Z',
			sbjpubkey: keys.publicKey.export({ type: 'spki', format: 'pem' }),
			cakey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
		});
		const pem = certificate.getPEM();
		expect(new X509Certificate(pem).verify(keys.publicKey)).toBe(true);
		const parsed = new jsrsasign.X509();
		parsed.readCertPEM(pem);
		expect(parsed.getSubjectString()).toBe('/CN=Maintenance fixture');
		const signature = new jsrsasign.KJUR.crypto.Signature({ alg: parsed.getSignatureAlgorithmField() });
		signature.init(pem);
		signature.updateHex(jsrsasign.ASN1HEX.getTLVbyList(parsed.hex!, 0, [0])!);
		expect(signature.verify(parsed.getSignatureValueHex())).toBe(true);
		const invalid = new jsrsasign.KJUR.crypto.Signature({ alg: parsed.getSignatureAlgorithmField() });
		invalid.init(pem);
		invalid.updateString('tampered certificate');
		expect(invalid.verify(parsed.getSignatureValueHex())).toBe(false);
	});

	it('continues to verify existing P-256 WebAuthn keys and rejects altered data', () => {
		const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
		const jwk = keys.publicKey.export({ format: 'jwk' });
		const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, 'base64url'), Buffer.from(jwk.y!, 'base64url')]);
		const service = new TwoFactorAuthenticationService({ scheme: 'https', host: 'fixture.invalid' } as any, {} as any);
		const clientData = { type: 'webauthn.get', origin: 'https://fixture.invalid', challenge: 'fixture-challenge' };
		const clientDataJSON = Buffer.from(JSON.stringify(clientData));
		const authenticatorData = Buffer.alloc(37);
		const signature = sign('sha256', Buffer.concat([authenticatorData, service.hash(clientDataJSON)]), keys.privateKey);
		const request = { publicKey, authenticatorData, clientDataJSON, clientData, signature, challenge: service.hash(Buffer.from(clientData.challenge)).toString('hex') };
		expect(service.verifySignin(request)).toBe(true);
		expect(service.verifySignin({ ...request, clientDataJSON: Buffer.from('{}') })).toBe(false);
	});
});
