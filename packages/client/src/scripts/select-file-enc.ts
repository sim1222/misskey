import { ref } from 'vue';
import * as os from '@/os';
import { stream } from '@/stream';
import { i18n } from '@/i18n';
import { defaultStore } from '@/store';
import { DriveFile } from 'misskey-js/built/entities';
import { VideoConverter } from 'convert-video';

function select(src: any, label: string | null, multiple: boolean): Promise<DriveFile | DriveFile[]> {
	return new Promise((res, rej) => {
		const keepOriginal = ref(defaultStore.state.keepOriginalUploading);

		const chooseFileFromPc = () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.multiple = multiple;
			input.onchange = () => {


				async function convertVideo(input) {
					let sourceVideoFile = input.files[0];
					let targetVideoFormat = 'mp4'
					let convertedVideoDataObj = await VideoConverter.convert(sourceVideoFile, targetVideoFormat);

					let convertedVideoFile = new File([convertedVideoDataObj.data], convertedVideoDataObj.name + "." + convertedVideoDataObj.format);

					os.upload(convertedVideoFile, defaultStore.state.uploadFolder, undefined, keepOriginal.value).then(res).catch(e => { os.alert({ type: 'error', text: e }) });
				}

				Array.from(input.files).map(file => {
					if (file.type.indexOf('video') !== -1) {
						console.log('convert video');
						os.toast('Try convert to mp4');
						convertVideo(file);
					} else {
						os.toast('It is not video file');
						os.upload(file, defaultStore.state.uploadFolder, undefined, keepOriginal.value).then(res).catch(e => { os.alert({ type: 'error', text: e }) });
					}
				});




				// 一応廃棄
				(window as any).__misskey_input_ref__ = null;
			};

			// https://qiita.com/fukasawah/items/b9dc732d95d99551013d
			// iOS Safari で正常に動かす為のおまじない
			(window as any).__misskey_input_ref__ = input;

			input.click();
		};

		const chooseFileFromDrive = () => {
			os.selectDriveFile(multiple).then(files => {
				res(files);
			});
		};

		const chooseFileFromUrl = () => {
			os.inputText({
				title: i18n.ts.uploadFromUrl,
				type: 'url',
				placeholder: i18n.ts.uploadFromUrlDescription
			}).then(({ canceled, result: url }) => {
				if (canceled) return;

				const marker = Math.random().toString(); // TODO: UUIDとか使う

				const connection = stream.useChannel('main');
				connection.on('urlUploadFinished', data => {
					if (data.marker === marker) {
						res(multiple ? [data.file] : data.file);
						connection.dispose();
					}
				});

				os.api('drive/files/upload-from-url', {
					url: url,
					folderId: defaultStore.state.uploadFolder,
					marker
				});

				os.alert({
					title: i18n.ts.uploadFromUrlRequested,
					text: i18n.ts.uploadFromUrlMayTakeTime
				});
			});
		};

		os.popupMenu([label ? {
			text: label,
			type: 'label'
		} : undefined, {
			text: i18n.ts.upload,
			icon: 'fas fa-upload',
			action: chooseFileFromPc
		}], src);
	});
}

export function selectFileEnc(src: any, label: string | null = null): Promise<DriveFile> {
	return select(src, label, false) as Promise<DriveFile>;
}

export function selectFilesEnc(src: any, label: string | null = null): Promise<DriveFile[]> {
	return select(src, label, true) as Promise<DriveFile[]>;
}
