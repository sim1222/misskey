import { soundKey, type SoundType } from '@/scripts/sound-settings';
import { ColdDeviceStorage } from '@/store';

const cache = new Map<string, HTMLAudioElement>();

export function getAudio(file: string, useCache = true): HTMLAudioElement {
	const cached = useCache ? cache.get(file) : undefined;
	if (cached) return cached;
	const audio = new Audio(`/client-assets/sounds/${file}.mp3`);
	if (useCache) cache.set(file, audio);
	return audio;
}

export function setVolume(audio: HTMLAudioElement, volume: number): HTMLAudioElement {
	const masterVolume = ColdDeviceStorage.get('sound_masterVolume');
	audio.volume = masterVolume - ((1 - volume) * masterVolume);
	return audio;
}

export function play(type: SoundType) {
	const sound = ColdDeviceStorage.get(soundKey(type));
	if (sound.type == null) return;
	playFile(sound.type, sound.volume);
}

export function playFile(file: string | null, volume: number) {
	const masterVolume = ColdDeviceStorage.get('sound_masterVolume');
	if (masterVolume === 0 || file == null) return;

	const audio = setVolume(getAudio(file), volume);
	audio.play();
}
