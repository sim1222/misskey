import { generateKeyPairSync, sign } from 'node:crypto';
import { TwoFactorAuthenticationService } from '@/core/TwoFactorAuthenticationService.js';

describe('Cryptography dependency compatibility', () => {
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
