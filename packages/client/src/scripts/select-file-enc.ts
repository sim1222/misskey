import * as os from '@/os';
import { stream } from '@/stream';
import { i18n } from '@/i18n';
import { defaultStore } from '@/store';
import { DriveFile } from 'misskey-js/built/entities';
import { fs } from 'fs';
import { defineComponent, ref } from 'vue';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import * as ffmpegcore from '@ffmpeg/core';


function select(src: any, label: string | null, multiple: boolean): Promise<DriveFile | DriveFile[]> {
	return new Promise((res, rej) => {

		
		const chooseFileFromPc = () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.onchange = () => {





				const readFromBlobOrFile = (blob: any) => (
					new Promise<ArrayBuffer>((resolve, reject) => {
						const reader = new FileReader();
						reader.onload = () => {
							resolve(<ArrayBuffer>reader.result);
						};
						reader.onerror = ({ target: { error: { code } } }) => {
							reject(os.alert({ type: 'error', text: 'file could not be read! ' + code }));
						};
						reader.readAsArrayBuffer(blob);
					}
				));


					
				
				const ffmpeg = createFFmpeg({ log: true });
				
				async function ffmpegconv() {
					if (input.files == null) return;
					
					if (!ffmpeg.isLoaded()) {
						os.toast('Loading FFmpeg.wasm-core');
						console.log('Loading FFmpeg.wasm-core');
						//ここでストップ
						await ffmpeg.load();
					}


					os.toast('Start const ffmpegconv');
					console.log('Start const ffmpegconv');
					var infilename = Array.from(input.files[0].name);
					let video = ref(null);
					var outfilename = 'out.mp4';
					os.toast('Start await beffile');
						
					console.log('Start await beffile');
					const befFile = new Uint8Array(await readFromBlobOrFile(input.files[0]));



					os.toast('Set ffmpeg files');
					console.log('Set ffmpeg files');
					ffmpeg.FS('writeFile', 'input.mov', await fetchFile(infilename[0]));
					os.toast('Converting')
					await ffmpeg.run('-i', `input.mov`, '-c:v', 'copy', '-c:a', 'copy', `video.mp4`);
					os.toast('Converted')
					const aftFile = ffmpeg.FS('readFile', outfilename);
					os.toast('Uploading')
					video.value = URL.createObjectURL(new Blob([aftFile.buffer], { type: 'video/mp4' }));
					os.upload(video, defaultStore.state.uploadFolder).then(res).catch(e => { os.alert({ type: 'error', text: e }) });
				};
					

				//const promises = Array.from(input.files).map(file => os.upload(file, defaultStore.state.uploadFolder));

				//Promise.all(promises).then(driveFiles => {
				//	res(multiple ? driveFiles : driveFiles[0]);
				//}).catch(e => {
				//	os.alert({
				//		type: 'error',
				//		text: e
				//	});
				//});
				os.toast('Try use FFmpeg.wasm')
				ffmpegconv();
				


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
				title: i18n.locale.uploadFromUrl,
				type: 'url',
				placeholder: i18n.locale.uploadFromUrlDescription
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
					title: i18n.locale.uploadFromUrlRequested,
					text: i18n.locale.uploadFromUrlMayTakeTime
				});
			});
		};

		os.popupMenu([label ? {
			text: label,
			type: 'label'
		} : undefined, {
			text: i18n.locale.upload,
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
