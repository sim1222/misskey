export interface SigninResult { id: string; i: string; }
export interface WebAuthnChallenge { challenge: string; challengeId: string; securityKeys: { id: string }[]; }
export interface SigninRequest {
 username: string;
 password?: string;
 token?: string;
 credentialId?: string;
 challengeId?: string;
 signature?: string;
 authenticatorData?: string;
 clientDataJSON?: string;
 'hcaptcha-response'?: string | null;
 'g-recaptcha-response'?: string | null;
}
