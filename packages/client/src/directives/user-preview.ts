import { defineAsyncComponent, ObjectDirective, ref } from 'vue';
import autobind from 'autobind-decorator';
import { popup } from '@/os';

export class UserPreview {
	private el: HTMLElement;
	private user: string;
	private showTimer: number|undefined;
	private hideTimer: number|undefined;
	private checkTimer: number|undefined;
	private promise: { cancel: () => void } | null = null;

	constructor(el: HTMLElement, user: string) {
		this.el = el;
		this.user = user;

		this.attach();
	}

	@autobind
	private show() {
		if (!document.body.contains(this.el)) return;
		if (this.promise) return;

		const showing = ref(true);

		popup(defineAsyncComponent(() => import('@/components/MkUserPreview.vue')), {
			showing,
			q: this.user,
			source: this.el
		}, {
			mouseover: () => {
				window.clearTimeout(this.hideTimer);
			},
			mouseleave: () => {
				window.clearTimeout(this.showTimer);
				this.hideTimer = window.setTimeout(this.close, 500);
			},
		}, 'closed');

		this.promise = {
			cancel: () => {
				showing.value = false;
			}
		};

		this.checkTimer = window.setInterval(() => {
			if (!document.body.contains(this.el)) {
				window.clearTimeout(this.showTimer);
				window.clearTimeout(this.hideTimer);
				this.close();
			}
		}, 1000);
	}

	@autobind
	private close() {
		if (this.promise) {
			window.clearInterval(this.checkTimer);
			this.promise.cancel();
			this.promise = null;
		}
	}

	@autobind
	private onMouseover() {
		window.clearTimeout(this.showTimer);
		window.clearTimeout(this.hideTimer);
		this.showTimer = window.setTimeout(this.show, 500);
	}

	@autobind
	private onMouseleave() {
		window.clearTimeout(this.showTimer);
		window.clearTimeout(this.hideTimer);
		this.hideTimer = window.setTimeout(this.close, 500);
	}

	@autobind
	private onClick() {
		window.clearTimeout(this.showTimer);
		this.close();
	}

	@autobind
	public attach() {
		this.el.addEventListener('mouseover', this.onMouseover);
		this.el.addEventListener('mouseleave', this.onMouseleave);
		this.el.addEventListener('click', this.onClick);
	}

	@autobind
	public detach() {
		this.el.removeEventListener('mouseover', this.onMouseover);
		this.el.removeEventListener('mouseleave', this.onMouseleave);
		this.el.removeEventListener('click', this.onClick);
		window.clearInterval(this.checkTimer);
	}
}

const previews = new WeakMap<HTMLElement, UserPreview>();
export default {
 mounted(el, binding) {
  if (binding.value == null) return;
  const preview = new UserPreview(el, binding.value);
  previews.set(el, preview);
 },
 unmounted(el) {
  previews.get(el)?.detach();
  previews.delete(el);
 },
} satisfies ObjectDirective<HTMLElement, string | null | undefined>;
