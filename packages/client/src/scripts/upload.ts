import { reactive, ref } from 'vue';
import * as Misskey from '@/misskey';
import { readAndCompressImage } from 'browser-image-resizer';
import { defaultStore } from '@/store';
import { apiUrl } from '@/config';
import { requireAccount } from '@/account';
import { alert } from '@/os';
import { i18n } from '@/i18n';

type Uploading = {
	id: string;
	name: string;
	progressMax: number | undefined;
	progressValue: number | undefined;
	img: string;
};
export const uploads = ref<Uploading[]>([]);

const compressTypeMap = {
	'image/jpeg': { quality: 0.85, mimeType: 'image/jpeg' },
	'image/webp': { quality: 0.85, mimeType: 'image/jpeg' },
	'image/svg+xml': { quality: 1, mimeType: 'image/png' },
} as const;

const mimeTypeMap = {
	'image/webp': 'webp',
	'image/jpeg': 'jpg',
	'image/png': 'png',
} as const;

export function uploadFile(
	file: File,
	folder?: string | Misskey.entities.DriveFolder | null,
	name?: string,
	keepOriginal: boolean = defaultStore.state.keepOriginalUploading,
): Promise<Misskey.entities.DriveFile> {
	if (folder && typeof folder === 'object') folder = folder.id;
	const account = requireAccount();

	return new Promise((resolve, reject) => {
		const id = Math.random().toString();

		const reader = new FileReader();
		reader.onload = async (ev) => {
			const ctx = reactive<Uploading>({
				id: id,
				name: name || file.name || 'untitled',
				progressMax: undefined,
				progressValue: undefined,
				img: window.URL.createObjectURL(file),
			});

			uploads.value.push(ctx);

			let resizedImage: Blob | undefined;
			if (!keepOriginal && (file.type === "image/jpeg" || file.type === "image/webp" || file.type === "image/svg+xml")) {
				const imgConfig = compressTypeMap[file.type];

				const config = {
					maxWidth: 2048,
					maxHeight: 2048,
					debug: true,
					...imgConfig,
				};

				try {
					resizedImage = await readAndCompressImage(file, config);
					ctx.name = file.type !== imgConfig.mimeType ? `${ctx.name}.${mimeTypeMap[imgConfig.mimeType]}` : ctx.name;
				} catch (err) {
					console.error('Failed to resize image', err);
				}
			}

			const formData = new FormData();
			formData.append('i', account.token);
			formData.append('force', 'true');
			formData.append('file', resizedImage || file);
			formData.append('name', ctx.name);
			if (folder) formData.append('folderId', folder);

			const xhr = new XMLHttpRequest();
			xhr.open('POST', apiUrl + '/drive/files/create', true);
			xhr.onload = (ev) => {
				if (xhr.status !== 200 || ev.target == null || xhr.response == null) {
					// TODO: 消すのではなくて(ネットワーク的なエラーなら)再送できるようにしたい
					uploads.value = uploads.value.filter(x => x.id !== id);

					if (xhr.response) {
						const res = JSON.parse(xhr.response);
						if (res.error?.id === 'bec5bd69-fba3-43c9-b4fb-2894b66ad5d2') {
							alert({
								type: 'error',
								title: i18n.ts.failedToUpload,
								text: i18n.ts.cannotUploadBecauseInappropriate,
							});
						} else if (res.error?.id === 'd08dbc37-a6a9-463a-8c47-96c32ab5f064') {
							alert({
								type: 'error',
								title: i18n.ts.failedToUpload,
								text: i18n.ts.cannotUploadBecauseNoFreeSpace,
							});
						} else {
							alert({
								type: 'error',
								title: i18n.ts.failedToUpload,
								text: `${res.error?.message}\n${res.error?.code}\n${res.error?.id}`,
							});
						}
					} else {
						alert({
							type: 'error',
							title: 'Failed to upload',
							text: `${JSON.stringify(xhr.response)}, ${JSON.stringify(xhr.response)}`,
						});
					}

					reject();
					return;
				}

				const driveFile = JSON.parse(xhr.response);

				resolve(driveFile);

				uploads.value = uploads.value.filter(x => x.id !== id);
			};

			xhr.upload.onprogress = ev => {
				if (ev.lengthComputable) {
					ctx.progressMax = ev.total;
					ctx.progressValue = ev.loaded;
				}
			};

			xhr.send(formData);
		};
		reader.readAsArrayBuffer(file);
	});
}
