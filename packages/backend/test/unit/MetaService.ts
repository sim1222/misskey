process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import type { MetasRepository } from '@/models/index.js';
import type { TestingModule } from '@nestjs/testing';

describe('MetaService', () => {
	let app: TestingModule;
	let service: MetaService;
	let repository: MetasRepository;
	const publishInternalEvent = jest.fn();

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule],
			providers: [MetaService, {
				provide: GlobalEventService,
				useValue: { publishInternalEvent },
			}],
		}).compile();
		service = app.get(MetaService);
		repository = app.get(DI.metasRepository);
	});

	beforeEach(async () => {
		await repository.clear();
		publishInternalEvent.mockClear();
		await service.fetch(true);
	});

	afterAll(async () => {
		await app?.close();
	});

	it('initializes an empty database with one metadata record', async () => {
		expect((await service.fetch()).id).toBe('x');
		expect(await repository.count()).toBe(1);
	});

	it('keeps cached settings until explicitly refreshed', async () => {
		const cached = await service.fetch();
		await repository.update('x', { name: 'Changed in database' });
		expect(await service.fetch()).toBe(cached);
		expect((await service.fetch(true)).name).toBe('Changed in database');
		expect((await service.fetch()).name).toBe('Changed in database');
	});

	it('updates persisted settings and publishes the update', async () => {
		const updated = await service.update({ name: 'Maintained instance' });
		expect(updated.name).toBe('Maintained instance');
		expect((await repository.findOneByOrFail({ id: 'x' })).name).toBe('Maintained instance');
		expect(publishInternalEvent).toHaveBeenCalledWith('metaUpdated', updated);
	});

	it('preserves the legacy preference for the newest metadata id', async () => {
		await repository.insert({ id: 'z', name: 'Legacy settings' });
		expect((await service.fetch(true)).name).toBe('Legacy settings');
		expect(await repository.count()).toBe(2);
	});
});
