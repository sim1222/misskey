import { ref } from 'vue';
import * as os from '@/os';
import { stream } from '@/stream';
import { i18n } from '@/i18n';
import { defaultStore } from '@/store';
import { DriveFile } from 'misskey-js/built/entities';

function select(src: any, label: string | null, multiple: boolean): Promise<DriveFile | DriveFile[]> {
	return new Promise((res, rej) => {
		const keepOriginal = ref(defaultStore.state.keepOriginalUploading);

		const chooseFileFromPc = () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.multiple = multiple;
			input.onchange = () => {

				//ここから
				// @ts-ignore
				function VideoConverter (videoFileData, targetFormat) {
					try {
						targetFormat = targetFormat.toLowerCase();
						let reader = new FileReader();
						return new Promise(resolve => {
							reader.onload = function (event) {
								let contentType = 'video/'+targetFormat;

								// @ts-ignore
								let fileData: ArrayBuffer = event.target.result.split(',');
								let b64Data = fileData[1];
								let blob = getBlobFromBase64Data(b64Data, contentType);
								let blobUrl = URL.createObjectURL(blob);

								let convertedVideo: any = {
									name: videoFileData.name.substring(0, videoFileData.name.lastIndexOf(".")),
									format: targetFormat,
									data: blob
								}
								// console.log("convertedVideo: ", convertedVideo);
								resolve(convertedVideo);
							}
							reader.readAsDataURL(videoFileData);
						});

					} catch (e) {
						console.log("Error occurred while converting : ", e);
					}
				}

				function getBlobFromBase64Data(b64Data, contentType, sliceSize=512) {
					const byteCharacters = atob(b64Data);
					const byteArrays = [];

					for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
						const slice = byteCharacters.slice(offset, offset + sliceSize);

						const byteNumbers = new Array(slice.length);
						for (let i = 0; i < slice.length; i++) {
							byteNumbers[i] = slice.charCodeAt(i);
						}

						const byteArray = new Uint8Array(byteNumbers);
						// @ts-ignore
						byteArrays.push(byteArray);
					}

					const blob = new Blob(byteArrays, {type: contentType});
					return blob;
				}

				//ここまで

				/*
				MIT License

				Copyright (c) 2021 Suvro Debnath

				Permission is hereby granted, free of charge, to any person obtaining a copy
				of this software and associated documentation files (the "Software"), to deal
				in the Software without restriction, including without limitation the rights
				to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
				copies of the Software, and to permit persons to whom the Software is
				furnished to do so, subject to the following conditions:

				The above copyright notice and this permission notice shall be included in all
				copies or substantial portions of the Software.

				THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
				IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
				FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
				AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
				LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
				OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
				SOFTWARE.
				 */

				async function convertVideo(input) {
					let sourceVideoFile = input;
					let targetVideoFormat = 'mp4'
					console.log('start convert video');
					let convertedVideoDataObj = await VideoConverter(sourceVideoFile, targetVideoFormat);
					console.log('end convert video');

					// @ts-ignore
					let convertedVideoFile = new File([convertedVideoDataObj.data], convertedVideoDataObj.name + "." + convertedVideoDataObj.format);

					os.upload(convertedVideoFile, defaultStore.state.uploadFolder, undefined, keepOriginal.value).then(res).catch(e => { os.alert({ type: 'error', text: e }) });
				}

				const promises = Array.from(input.files).map(file => {
					if (file.type.indexOf('video') !== -1) {
						console.log('convert video');
						os.toast('Try convert to mp4');
						convertVideo(file);
					} else {
						os.toast('It is not video file');
						os.upload(file, defaultStore.state.uploadFolder, undefined, keepOriginal.value).then(res).catch(e => { os.alert({ type: 'error', text: e }) });
					}
				});


				Promise.all(promises).then(driveFiles => {
					res(multiple ? driveFiles : driveFiles[0]);
				}).catch(e => {
					os.alert({
						type: 'error',
						text: e
					});
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
