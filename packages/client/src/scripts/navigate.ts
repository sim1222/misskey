import { inject } from 'vue';
import * as os from '@/os';
import { router } from '@/router';
import { defaultStore } from '@/store';

export type Navigate = (path: string, record?: boolean) => void;

export class MisskeyNavigator {
	public readonly navHook: Navigate | null = null;
	public readonly sideViewHook: Navigate | null = null;

	// It should be constructed during vue creating in order for inject function to work
	constructor() {
		this.navHook = inject<Navigate | null>('navHook', null);
		this.sideViewHook = inject<Navigate | null>('sideViewHook', null);
	}

	// Use this method instead of router.push()
	public push(path: string, record = true) {
		if (this.navHook) {
			this.navHook(path, record);
		} else {
			if (defaultStore.state.defaultNavigationBehaviour === 'sideView' && this.sideViewHook && path !== '/') {
				return this.sideViewHook(path, record);
			} else if (defaultStore.state.defaultNavigationBehaviour === 'window' && path !== '/') {
				return os.pageWindow(path);
			}
	
			if (router.currentRoute.value.path === path) {
				window.scroll({ top: 0, behavior: 'smooth' });
			} else {
				if (record) router.push(path);
				else router.replace(path);
			}
		}
	}
}
