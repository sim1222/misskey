<template>
<div v-if="show" ref="el" class="fdidabkb" :class="{ slim: narrow, thin: thin_ }" :style="{ background: bg }" @click="onClick">
	<div v-if="narrow" class="buttons left">
		<MkAvatar v-if="props.displayMyAvatar && $i" class="avatar" :user="$i" :disable-preview="true"/>
	</div>
	<template v-if="metadata">
		<div v-if="!hideTitle" class="titleContainer" @click="showTabsPopup">
			<MkAvatar v-if="metadata.avatar" class="avatar" :user="metadata.avatar" :disable-preview="true" :show-indicator="true"/>
			<i v-else-if="metadata.icon" class="icon" :class="metadata.icon"></i>

			<div class="title">
				<MkUserName v-if="metadata.userName" :user="metadata.userName" :nowrap="true" class="title"/>
				<div v-else-if="metadata.title" class="title">{{ metadata.title }}</div>
				<div v-if="!narrow && metadata.subtitle" class="subtitle">
					{{ metadata.subtitle }}
				</div>
				<div v-if="narrow && hasTabs" class="subtitle activeTab">
					{{ visibleTabs.find(tab => tab.key === props.tab)?.title }}
					<i class="chevron fas fa-chevron-down"></i>
				</div>
			</div>
		</div>
		<div v-if="!narrow || hideTitle" class="tabs">
			<button v-for="tab in visibleTabs" :ref="(el) => setTabRef(tab.key, el)" v-tooltip.noDelay="tab.title" class="tab _button" :class="{ active: tab.key != null && tab.key === props.tab }" @mousedown="(ev) => onTabMousedown(tab, ev)" @click="(ev) => onTabClick(tab, ev)">
				<i v-if="tab.icon" class="icon" :class="tab.icon"></i>
				<span v-if="!tab.iconOnly" class="title">{{ tab.title }}</span>
			</button>
			<div ref="tabHighlightEl" class="highlight"></div>
		</div>
	</template>
	<div class="buttons right">
		<button v-tooltip.noDelay="i18n.ts.reload" class="_button button" @click="reload">
			<i class="fa-solid fa-arrow-rotate-right"></i>
		</button>
		<template v-for="action in actions">
			<button v-tooltip.noDelay="action.text" class="_button button" :class="{ highlighted: action.highlighted }" @click.stop="action.handler" @touchstart="preventDrag"><i :class="action.icon"></i></button>
		</template>
	</div>
</div>
</template>

<script lang="ts" setup>
import type { ComponentPublicInstance } from 'vue';
import { computed, onMounted, onUnmounted, ref, inject, watch, nextTick } from 'vue';
import tinycolor from 'tinycolor2';
import { popupMenu } from '@/os';
import { scrollToTop } from '@/scripts/scroll';
import { i18n } from '@/i18n';
import { globalEvents } from '@/events';
import { injectPageMetadata } from '@/scripts/page-metadata';
import { $i } from '@/account';

type Tab = {
	key?: string | null;
	title: string;
	icon?: string;
	iconOnly?: boolean;
	onClick?: (ev: MouseEvent) => void;
};

const props = defineProps<{
 info?: import('@/scripts/page-metadata').PageMetadata;
	tabs?: (Tab | null)[] | null;
	tab?: string;
	actions?: {
		text: string;
		icon: string;
		handler: (ev: MouseEvent) => void;
 highlighted?: boolean;
	}[] | null;
	thin?: boolean;
	displayMyAvatar?: boolean;
}>();

const emit = defineEmits<{
	(ev: 'update:tab', key: string): void;
}>();

const injectedMetadata = injectPageMetadata();
const metadata = computed(() => props.info ?? injectedMetadata?.value);

const hideTitle = inject('shouldOmitHeaderTitle', false);
const thin_ = props.thin || inject('shouldHeaderThin', false);

const el = ref<HTMLElement | null>(null);
const tabRefs: Record<string, HTMLElement | undefined> = {};
const tabHighlightEl = ref<HTMLElement | null>(null);
const bg = ref<string>();
let narrow = ref(false);

const visibleTabs = computed(() => (props.tabs ?? []).filter((tab): tab is Tab => tab != null));
const hasTabs = computed(() => props.tabs && props.tabs.length > 0);
const hasActions = computed(() => props.actions && props.actions.length > 0);
const show = computed(() => {
	return !hideTitle || hasTabs.value || hasActions.value;
});

const reload = () => location.reload();
const showTabsPopup = (ev: MouseEvent) => {
	if (!hasTabs.value) return;
	if (!narrow.value) return;
	ev.preventDefault();
	ev.stopPropagation();
	const menu = ((props.tabs ?? []).filter((tab): tab is Tab => tab != null)).map(tab => ({
		text: tab.title,
		icon: tab.icon,
		active: tab.key != null && tab.key === props.tab,
		action: (ev: MouseEvent) => {
			onTabClick(tab, ev);
		},
	}));
	popupMenu(menu, ev.currentTarget ?? ev.target);
};

const preventDrag = (ev: TouchEvent) => {
	ev.stopPropagation();
};

const onClick = () => {
	if (el.value == null) return;
	scrollToTop(el.value, { behavior: 'smooth' });
};

function onTabMousedown(tab: Tab, ev: MouseEvent): void {
	// ユーザビリティの観点からmousedown時にはonClickは呼ばない
	if (tab.key) {
		if (tab.key != null) emit('update:tab', tab.key);
	}
}

function onTabClick(tab: Tab, ev: MouseEvent): void {
	if (tab.onClick) {
		ev.preventDefault();
		ev.stopPropagation();
		tab.onClick(ev);
	}
	if (tab.key) {
		if (tab.key != null) emit('update:tab', tab.key);
	}
}

const calcBg = () => {
	const rawBg = metadata?.value?.bg || 'var(--bg)';
	const tinyBg = tinycolor(rawBg.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue(rawBg.slice(4, -1)) : rawBg);
	tinyBg.setAlpha(0.85);
	bg.value = tinyBg.toRgbString();
};

function setTabRef(key: string | null | undefined, value: Element | ComponentPublicInstance | null): void {
 if (key != null) tabRefs[key] = value instanceof HTMLElement ? value : undefined;
}

let ro: ResizeObserver | null;

onMounted(() => {
	calcBg();
	globalEvents.on('themeChanged', calcBg);

	watch(() => [props.tab, props.tabs], () => {
		nextTick(() => {
			const tabEl = props.tab == null ? undefined : tabRefs[props.tab];
			if (tabEl?.parentElement && tabHighlightEl.value) {
				// offsetWidth や offsetLeft は少数を丸めてしまうため getBoundingClientRect を使う必要がある
				// https://developer.mozilla.org/ja/docs/Web/API/HTMLElement/offsetWidth#%E5%80%A4
				const parentRect = tabEl.parentElement.getBoundingClientRect();
				const rect = tabEl.getBoundingClientRect();
				tabHighlightEl.value.style.width = rect.width + 'px';
				tabHighlightEl.value.style.left = (rect.left - parentRect.left) + 'px';
			}
		});
	}, {
		immediate: true,
	});

	if (el.value && el.value.parentElement) {
		narrow.value = el.value.parentElement.offsetWidth < 500;
		ro = new ResizeObserver((entries, observer) => {
			if (el.value == null) return;
			if (el.value.parentElement && document.body.contains(el.value)) {
				if (el.value == null) return;
				narrow.value = el.value.parentElement.offsetWidth < 500;
			}
		});
		ro.observe(el.value.parentElement);
	}
});

onUnmounted(() => {
	globalEvents.off('themeChanged', calcBg);
	if (ro) ro.disconnect();
});
</script>

<style lang="scss" scoped>
.fdidabkb {
	--height: 55px;
	display: flex;
	width: 100%;
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
	border-bottom: solid 0.5px var(--divider);
	contain: strict;
	height: var(--height);

	&.thin {
		--height: 45px;

		> .buttons {
			> .button {
				font-size: 0.9em;
			}
		}
	}

	&.slim {
		text-align: center;

		> .titleContainer {
			flex: 1;
			margin: 0 auto;

			> *:first-child {
				margin-left: auto;
			}

			> *:last-child {
				margin-right: auto;
			}
		}
	}

	> .buttons {
		--margin: 8px;
		display: flex;
    align-items: center;
		min-width: var(--height);
		height: var(--height);
		margin: 0 var(--margin);

		&.left {
			margin-right: auto;

			> .avatar {
				$size: 32px;
				display: inline-block;
				width: $size;
				height: $size;
				vertical-align: bottom;
				margin: 0 8px;
				pointer-events: none;
			}
		}

		&.right {
			margin-left: auto;
		}

		&:empty {
			width: var(--height);
		}

		> .button {
			display: flex;
			align-items: center;
			justify-content: center;
			height: calc(var(--height) - (var(--margin) * 2));
			width: calc(var(--height) - (var(--margin) * 2));
			box-sizing: border-box;
			position: relative;
			border-radius: 5px;

			&:hover {
				background: rgba(0, 0, 0, 0.05);
			}

			&.highlighted {
				color: var(--accent);
			}
		}

		> .fullButton {
			& + .fullButton {
				margin-left: 12px;
			}
		}
	}

	> .titleContainer {
		display: flex;
		align-items: center;
		max-width: 400px;
		overflow: auto;
		white-space: nowrap;
		text-align: left;
		font-weight: bold;
		flex-shrink: 0;
		margin-left: 24px;

		> .avatar {
			$size: 32px;
			display: inline-block;
			width: $size;
			height: $size;
			vertical-align: bottom;
			margin: 0 8px;
			pointer-events: none;
		}

		> .icon {
			margin-right: 8px;
			width: 16px;
			text-align: center;
		}

		> .title {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			line-height: 1.1;

			> .subtitle {
				opacity: 0.6;
				font-size: 0.8em;
				font-weight: normal;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;

				&.activeTab {
					text-align: center;

					> .chevron {
						display: inline-block;
						margin-left: 6px;
					}
				}
			}
		}
	}

	> .tabs {
		position: relative;
		margin-left: 16px;
		font-size: 0.8em;
		overflow: auto;
		white-space: nowrap;

		> .tab {
			display: inline-block;
			position: relative;
			padding: 0 10px;
			height: 100%;
			font-weight: normal;
			opacity: 0.7;

			&:hover {
				opacity: 1;
			}

			&.active {
				opacity: 1;
			}

			> .icon + .title {
				margin-left: 8px;
			}
		}

		> .highlight {
			position: absolute;
			bottom: 0;
			height: 3px;
			background: var(--accent);
			border-radius: 999px;
			transition: all 0.2s ease;
			pointer-events: none;
		}
	}
}
</style>
