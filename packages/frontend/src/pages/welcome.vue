<template>
<div>
	<XEntrance/>
</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import XEntrance from './welcome.entrance.a.vue';
import { instanceName } from '@/config';
import * as os from '@/os';
import { definePageMetadata } from '@/scripts/page-metadata';

// let meta = $ref(null);
const meta = { 'version': '13.6.1-simkey', 'uri': 'https://kokt.club', 'langs': [], 'repositoryUrl': 'https://github.com/misskey-dev/misskey', 'feedbackUrl': 'https://github.com/misskey-dev/misskey/issues/new', 'disableRegistration': false, 'emailRequiredForSignup': false, 'enableHcaptcha': false, 'hcaptchaSiteKey': null, 'enableRecaptcha': true, 'recaptchaSiteKey': '6LcSVvkhAAAAAHfnEeJhfI_XJLnfn8-gPHqZ4K5z', 'enableTurnstile': false, 'turnstileSiteKey': null, 'swPublickey': 'BJO5qBTaw1t5O448MwtH4jikC9JG0V682uVftWHPNU05-PE5-aAuj14zBLPPpgJP_ifpndg0cVn0Ka3oE453ZkA', 'themeColor': null, 'mascotImageUrl': '/assets/ai.png', 'bannerUrl': 'https://s3.kokt.club/files/a952f48b-7720-4b00-9d15-f044150db378.webp', 'errorImageUrl': 'https://xn--931a.moe/aiart/yubitun.png', 'iconUrl': 'https://s3.kokt.club/files/e2149c00-311a-4348-a548-0877831b4b08.png', 'backgroundImageUrl': 'https://s3.kokt.club/files/a952f48b-7720-4b00-9d15-f044150db378.webp', 'logoImageUrl': null, 'maxNoteTextLength': 8192, 'defaultLightTheme': null, 'defaultDarkTheme': null, 'ads': [], 'enableEmail': true, 'enableTwitterIntegration': false, 'enableGithubIntegration': false, 'enableDiscordIntegration': false, 'enableServiceWorker': true, 'translatorAvailable': true, 'policies': { 'gtlAvailable': true, 'ltlAvailable': true, 'canPublicNote': true, 'canInvite': false, 'canManageCustomEmojis': false, 'canHideAds': false, 'driveCapacityMb': 20480, 'pinLimit': 5, 'antennaLimit': 10, 'wordMuteLimit': 200, 'webhookLimit': 10, 'clipLimit': 20, 'noteEachClipsLimit': 2000, 'userListLimit': 15, 'userEachUserListsLimit': 100, 'rateLimitFactor': 1 } };

// os.api('meta', { detail: true }).then(res => {
// 	meta = res;
// });

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata(computed(() => ({
	title: instanceName,
	icon: null,
})));
</script>
