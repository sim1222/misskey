<template>
<MkSpacer :content-max="800">
	<div v-if="$i">
		<div v-if="state == 'waiting'" class="waiting _section">
			<div class="_content">
				<MkLoading/>
			</div>
		</div>
		<div v-if="state == 'denied'" class="denied _section">
			<div class="_content">
				<p>{{ i18n.ts._auth.denied }}</p>
			</div>
		</div>
		<div v-else-if="state == 'accepted'" class="accepted _section">
			<div class="_content">
				<p v-if="callback">{{ i18n.ts._auth.callback }}<MkEllipsis/></p>
				<p v-else>{{ i18n.ts._auth.pleaseGoBack }}</p>
			</div>
		</div>
		<div v-else class="_section">
			<div v-if="name" class="_title">{{ $t('_auth.shareAccess', { name: name }) }}</div>
			<div v-else class="_title">{{ i18n.ts._auth.shareAccessAsk }}</div>
			<div class="_content">
				<p>{{ i18n.ts._auth.permissionAsk }}</p>
				<ul>
					<li v-for="p in _permissions" :key="p">{{ $t(`_permissions.${p}`) }}</li>
				</ul>
			</div>
			<div class="_footer">
				<MkButton inline @click="deny">{{ i18n.ts.cancel }}</MkButton>
				<MkButton inline primary @click="accept">{{ i18n.ts.accept }}</MkButton>
			</div>
		</div>
	</div>
	<div v-else class="signin">
		<MkSignin @login="onLogin"/>
	</div>
</MkSpacer>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkSignin from '@/components/MkSignin.vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os';
import { $i, login } from '@/account';
import { createMiAuthCallbackUrl } from '@/scripts/url';
import { i18n } from '@/i18n';

const props = defineProps<{
	session: string;
	callback?: string;
	name: string;
	icon: string;
	permission: string; // コンマ区切り
}>();

const _permissions = props.permission.split(',');

let state = ref<string | null>(null);

async function accept(): Promise<void> {
	// Validate before issuing a token, as callback URLs are controlled by the app.
	const callback = props.callback ? createMiAuthCallbackUrl(props.callback, props.session) : null;
	state.value = 'waiting';
	await os.api('miauth/gen-token', {
		session: props.session,
		name: props.name,
		iconUrl: props.icon,
		permission: _permissions,
	});

	state.value = 'accepted';
	if (callback) {
		location.href = callback;
	}
}

function deny(): void {
	state.value = 'denied';
}

function onLogin(res: { i: string; }): void {
	login(res.i);
}
</script>

<style lang="scss" scoped>

</style>
