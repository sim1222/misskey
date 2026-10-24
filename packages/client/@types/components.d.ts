import 'vue';
import '@vue/runtime-core';

declare module 'vue' {
	interface GlobalComponents {
		I18n: typeof import('@/components/global/i18n')['default'];
		RouterView: typeof import('@/components/global/RouterView.vue')['default'];
		Mfm: typeof import('@/components/global/MkMisskeyFlavoredMarkdown.vue')['default'];
		MkA: typeof import('@/components/global/MkA.vue')['default'];
		MkAcct: typeof import('@/components/global/MkAcct.vue')['default'];
		MkAvatar: typeof import('@/components/global/MkAvatar.vue')['default'];
		MkEmoji: typeof import('@/components/global/MkEmoji.vue')['default'];
		MkUserName: typeof import('@/components/global/MkUserName.vue')['default'];
		MkEllipsis: typeof import('@/components/global/MkEllipsis.vue')['default'];
		MkTime: typeof import('@/components/global/MkTime.vue')['default'];
		MkUrl: typeof import('@/components/global/MkUrl.vue')['default'];
		MkLoading: typeof import('@/components/global/MkLoading.vue')['default'];
		MkError: typeof import('@/components/global/MkError.vue')['default'];
		MkAd: typeof import('@/components/global/MkAd.vue')['default'];
		MkPageHeader: typeof import('@/components/global/MkPageHeader.vue')['default'];
		MkSpacer: typeof import('@/components/global/MkSpacer.vue')['default'];
		MkStickyContainer: typeof import('@/components/global/MkStickyContainer.vue')['default'];
		MkwMemo: typeof import('@/widgets/memo.vue')['default'];
		MkwNotifications: typeof import('@/widgets/notifications.vue')['default'];
		MkwTimeline: typeof import('@/widgets/timeline.vue')['default'];
		MkwCalendar: typeof import('@/widgets/calendar.vue')['default'];
		MkwRss: typeof import('@/widgets/rss.vue')['default'];
		MkwRssTicker: typeof import('@/widgets/rss-ticker.vue')['default'];
		MkwTrends: typeof import('@/widgets/trends.vue')['default'];
		MkwClock: typeof import('@/widgets/clock.vue')['default'];
		MkwActivity: typeof import('@/widgets/activity.vue')['default'];
		MkwPhotos: typeof import('@/widgets/photos.vue')['default'];
		MkwDigitalClock: typeof import('@/widgets/digital-clock.vue')['default'];
		MkwUnixClock: typeof import('@/widgets/unix-clock.vue')['default'];
		MkwFederation: typeof import('@/widgets/federation.vue')['default'];
		MkwPostForm: typeof import('@/widgets/post-form.vue')['default'];
		MkwSlideshow: typeof import('@/widgets/slideshow.vue')['default'];
		MkwServerMetric: typeof import('@/widgets/server-metric/index.vue')['default'];
		MkwOnlineUsers: typeof import('@/widgets/online-users.vue')['default'];
		MkwJobQueue: typeof import('@/widgets/job-queue.vue')['default'];
		MkwInstanceCloud: typeof import('@/widgets/instance-cloud.vue')['default'];
		MkwButton: typeof import('@/widgets/button.vue')['default'];
		MkwAiscript: typeof import('@/widgets/aiscript.vue')['default'];
		MkwAichan: typeof import('@/widgets/aichan.vue')['default'];
	}
	interface GlobalDirectives {
		vAdaptiveBorder: typeof import('@/directives/adaptive-border')['default'];
		vAnim: typeof import('@/directives/anim')['default'];
		vAppear: typeof import('@/directives/appear')['default'];
		vClickAnime: typeof import('@/directives/click-anime')['default'];
		vFollowAppend: typeof import('@/directives/follow-append')['default'];
		vGetSize: typeof import('@/directives/get-size')['default'];
		vHotkey: typeof import('@/directives/hotkey')['default'];
		vPanel: typeof import('@/directives/panel')['default'];
		vRipple: typeof import('@/directives/ripple')['default'];
		vSize: typeof import('@/directives/size')['default'];
		vTooltip: typeof import('@/directives/tooltip')['default'];
		vUserPreview: typeof import('@/directives/user-preview')['default'];
	}
}
declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$i: typeof import('@/account')['$i'];
	}
}
