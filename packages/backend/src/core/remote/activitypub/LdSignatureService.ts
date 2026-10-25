import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { ACTIVITY_CONTEXT, CONTEXTS } from './misc/contexts.js';
import type { JsonLdDocument } from 'jsonld';

// RsaSignature2017 based from https://github.com/transmute-industries/RsaSignature2017

@Injectable()
export class LdSignatureService {
	constructor(
		private httpRequestService: HttpRequestService,
	) {
	}

	public use(): LdSignature {
		return new LdSignature(this.httpRequestService);
	}
}

class LdSignature {
	private frozen = false;
	private readonly documents = new Map<string, Promise<{ contextUrl: null; document: unknown; documentUrl: string }>>();
	public debug = false;
	public preLoad = true;
	public loderTimeout = 10 * 1000;

	constructor(
		private httpRequestService: HttpRequestService,
	) {
	}

	public async signRsaSignature2017(data: any, privateKey: string, creator: string, domain?: string, created?: Date): Promise<any> {
		const options = {
			type: 'RsaSignature2017',
			creator,
			domain,
			nonce: crypto.randomBytes(16).toString('hex'),
			created: (created ?? new Date()).toISOString(),
		} as {
			type: string;
			creator: string;
			domain?: string;
			nonce: string;
			created: string;
		};

		if (!domain) {
			delete options.domain;
		}

		const toBeSigned = await this.createVerifyData(data, options);

		const signer = crypto.createSign('sha256');
		signer.update(toBeSigned);
		signer.end();

		const signature = signer.sign(privateKey);

		return {
			...data,
			signature: {
				...options,
				signatureValue: signature.toString('base64'),
			},
		};
	}

	public async verifyRsaSignature2017(data: any, publicKey: string): Promise<boolean> {
		const toBeSigned = await this.createVerifyData(data, data.signature);
		const verifier = crypto.createVerify('sha256');
		verifier.update(toBeSigned);
		return verifier.verify(publicKey, data.signature.signatureValue, 'base64');
	}

	public async createVerifyData(data: any, options: any) {
		const transformedOptions = {
			...options,
			'@context': 'https://w3id.org/identity/v1',
		};
		delete transformedOptions['type'];
		delete transformedOptions['id'];
		delete transformedOptions['signatureValue'];
		const canonizedOptions = await this.normalize(transformedOptions);
		const optionsHash = this.sha256(canonizedOptions.toString());
		const transformedData = { ...data };
		delete transformedData['signature'];
		const cannonidedData = await this.normalize(transformedData);
		if (this.debug) console.debug(`cannonidedData: ${cannonidedData}`);
		const documentHash = this.sha256(cannonidedData.toString());
		const verifyData = `${optionsHash}${documentHash}`;
		return verifyData;
	}

	public async normalize(data: JsonLdDocument): Promise<string> {
		const customLoader = this.getLoader();
		return (await import('jsonld')).default.canonize(data, {
			algorithm: 'URDNA2015', format: 'application/n-quads', documentLoader: customLoader, maxDeepIterations: 1000,
		});
	}

	public async compact(data: JsonLdDocument): Promise<JsonLdDocument> {
		return (await import('jsonld')).default.compact(data, ACTIVITY_CONTEXT, { documentLoader: this.getLoader() });
	}

	public freeze(): void {
		this.frozen = true;
	}

	public checkForForbiddenDirectives(value: unknown): void {
		const pending = [value];
		while (pending.length) {
			const item = pending.pop();
			if (item === null || typeof item !== 'object') continue;
			for (const [key, child] of Object.entries(item)) {
				if (['@included', '@graph', '@reverse'].includes(key)) throw new Error(`Forbidden JSON-LD directive ${key}`);
				pending.push(child);
			}
		}
	}

	private getLoader() {
		return async (url: string): Promise<any> => {
			if (!/^https?:\/\//.test(url)) throw new Error(`Invalid URL ${url}`);

			if (this.preLoad) {
				if (url in CONTEXTS) {
					if (this.debug) console.debug(`HIT: ${url}`);
					return {
						contextUrl: null,
						document: CONTEXTS[url],
						documentUrl: url,
					};
				}
			}

			if (this.debug) console.debug(`MISS: ${url}`);
			const cached = this.documents.get(url);
			if (cached) return structuredClone(await cached);
			if (this.frozen) throw new Error('Uncached JSON-LD context after compaction');
			if (this.documents.size >= 256) throw new Error('Too many JSON-LD contexts');
			const loading = this.fetchDocument(url).then(document => {
				this.checkForForbiddenDirectives(document);
				return { contextUrl: null, document, documentUrl: url };
			});
			this.documents.set(url, loading);
			return structuredClone(await loading);
		};
	}

	private async fetchDocument(url: string) {
		const json = await this.httpRequestService.getResponse({
			url,
			method: 'GET',
			headers: {
				Accept: 'application/ld+json, application/json',
			},
			timeout: this.loderTimeout,
			size: 1024 * 1024,
		}).then(res => {
			if (!res.ok) {
				throw `${res.status} ${res.statusText}`;
			} else {
				return res.json();
			}
		});

		return json;
	}

	public sha256(data: string): string {
		const hash = crypto.createHash('sha256');
		hash.update(data);
		return hash.digest('hex');
	}
}
