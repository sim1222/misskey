import { ref } from 'vue';
import { DriveFile } from 'misskey-js/built/entities';
import { defaultStore } from '@/store';
import { uploadFile } from '@/scripts/upload';

function select(src: any, label: string | null, multiple: boolean): Promise<DriveFile | DriveFile[]> {
	return new Promise((res, rej) => {
		const keepOriginal = ref(defaultStore.state.keepOriginalUploading);

		const chooseFileFromPc = () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'video/mp4';
			input.multiple = multiple;
			input.onchange = () => {
				const promises = Array.from(input.files).map(file => uploadFile(file, defaultStore.state.uploadFolder, undefined, keepOriginal.value));

				Promise.all(promises).then(driveFiles => {
					res(multiple ? driveFiles : driveFiles[0]);
				}).catch(err => {
					// アップロードのエラーは uploadFile 内でハンドリングされているためアラートダイアログを出したりはしてはいけない
				});

				// 一応廃棄
				(window as any).__misskey_input_ref__ = null;
			};

			// https://qiita.com/fukasawah/items/b9dc732d95d99551013d
			// iOS Safari で正常に動かす為のおまじない
			(window as any).__misskey_input_ref__ = input;

			input.click();
		};

		chooseFileFromPc();
	});
}

export function selectFileEnc(src: any, label: string | null = null): Promise<DriveFile> {
	return select(src, label, false) as Promise<DriveFile>;
}
