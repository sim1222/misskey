<template>
<div>
	<MkButton v-if="!twoFactorData && !account.twoFactorEnabled" @click="register">{{ i18n.ts._2fa.registerDevice }}</MkButton>
	<template v-if="account.twoFactorEnabled">
		<p>{{ i18n.ts._2fa.alreadyRegistered }}</p>
		<MkButton @click="unregister">{{ i18n.ts.unregister }}</MkButton>

		<template v-if="supportsCredentials">
			<hr class="totp-method-sep">

			<h2 class="heading">{{ i18n.ts.securityKey }}</h2>
			<p>{{ i18n.ts._2fa.securityKeyInfo }}</p>
			<div class="key-list">
				<div v-for="key in account.securityKeysList" class="key">
					<h3>{{ key.name }}</h3>
					<div class="last-used">{{ i18n.ts.lastUsed }}<MkTime v-if="key.lastUsed" :time="key.lastUsed"/></div>
					<MkButton @click="unregisterKey(key)">{{ i18n.ts.unregister }}</MkButton>
				</div>
			</div>

			<MkSwitch v-if="account.securityKeysList.length > 0" v-model="usePasswordLessLogin" @update:modelValue="updatePasswordLessLogin">{{ i18n.ts.passwordLessLogin }}</MkSwitch>

			<MkInfo v-if="registration && registration.error" warn>{{ i18n.ts.error }} {{ registration.error }}</MkInfo>
			<MkButton v-if="!registration || registration.error" @click="addSecurityKey">{{ i18n.ts._2fa.registerKey }}</MkButton>

			<ol v-if="registration && !registration.error">
				<li v-if="registration.stage >= 0">
					{{ i18n.ts.tapSecurityKey }}
					<i v-if="registration.saving && registration.stage == 0" class="fas fa-spinner fa-pulse fa-fw"></i>
				</li>
				<li v-if="registration.stage >= 1">
					<fieldset :disabled="registration.stage != 1 || registration.saving" style="border: 0; padding: 0; margin: 0; min-width: 0;">
						<MkInput v-model="keyName">
							<template #label>{{ i18n.ts.securityKeyName }}</template>
						</MkInput>
						<MkButton :disabled="keyName.length == 0" @click="registerKey">{{ i18n.ts.registerSecurityKey }}</MkButton>
						<i v-if="registration.saving && registration.stage == 1" class="fas fa-spinner fa-pulse fa-fw"></i>
					</fieldset>
				</li>
			</ol>
		</template>
	</template>
	<div v-if="twoFactorData && !account.twoFactorEnabled">
		<ol style="margin: 0; padding: 0 0 0 1em;">
			<li>
				<I18n :src="i18n.ts._2fa.step1" tag="span">
					<template #a>
						<a href="https://authy.com/" rel="noopener" target="_blank" class="_link">Authy</a>
					</template>
					<template #b>
						<a href="https://support.google.com/accounts/answer/1066447" rel="noopener" target="_blank" class="_link">Google Authenticator</a>
					</template>
				</I18n>
			</li>
			<li>{{ i18n.ts._2fa.step2 }}<br><img :src="twoFactorData.qr"><p>{{ $ts._2fa.step2Url }}<br>{{ twoFactorData.url }}</p></li>
			<li>
				{{ i18n.ts._2fa.step3 }}<br>
				<MkInput v-model="token" type="text" pattern="^[0-9]{6}$" autocomplete="off" :spellcheck="false"><template #label>{{ i18n.ts.token }}</template></MkInput>
				<MkButton primary @click="submit">{{ i18n.ts.done }}</MkButton>
			</li>
		</ol>
		<MkInfo>{{ i18n.ts._2fa.step4 }}</MkInfo>
	</div>
</div>
</template>

<script lang="ts" setup>
import { requireAccount } from '@/account';
const account = requireAccount();

import { ref } from 'vue';
import { hostname } from '@/config';
import { byteify, hexify, stringify } from '@/scripts/2fa';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/form/input.vue';
import MkSwitch from '@/components/form/switch.vue';
import * as os from '@/os';

import { i18n } from '@/i18n';

const twoFactorData = ref<any>(null);
const supportsCredentials = ref(!!navigator.credentials);
const usePasswordLessLogin = ref(account.usePasswordLessLogin);
const registration = ref<any>(null);
const keyName = ref('');
const token = ref('');

function register() {
	os.inputText({
		title: i18n.ts.password,
		type: 'password'
	}).then(({ canceled, result: password }) => {
		if (canceled || password == null) return;
		os.api('i/2fa/register', {
			password: password
		}).then(data => {
			twoFactorData.value = data;
		});
	});
}

function unregister() {
	os.inputText({
		title: i18n.ts.password,
		type: 'password'
	}).then(({ canceled, result: password }) => {
		if (canceled || password == null) return;
		os.api('i/2fa/unregister', {
			password: password
		}).then(() => {
			usePasswordLessLogin.value = false;
			updatePasswordLessLogin();
		}).then(() => {
			os.success();
			account.twoFactorEnabled = false;
		});
	});
}

function submit() {
	os.api('i/2fa/done', {
		token: token.value
	}).then(() => {
		os.success();
		account.twoFactorEnabled = true;
	}).catch(err => {
		os.alert({
			type: 'error',
			text: err,
		});
	});
}

function registerKey() {
	registration.value.saving = true;
	os.api('i/2fa/key-done', {
		password: registration.value.password,
		name: keyName.value,
		challengeId: registration.value.challengeId,
		// we convert each 16 bits to a string to serialise
		clientDataJSON: stringify(registration.value.credential.response.clientDataJSON),
		attestationObject: hexify(registration.value.credential.response.attestationObject)
	}).then(key => {
		registration.value = null;
		// key-done returns the key ID/name; lastUsed arrives in the account update.
		os.success();
	});
}

function unregisterKey(key: { id: string }) {
	os.inputText({
		title: i18n.ts.password,
		type: 'password'
	}).then(({ canceled, result: password }) => {
		if (canceled || password == null) return;
		return os.api('i/2fa/remove-key', {
			password,
			credentialId: key.id
		}).then(() => {
			usePasswordLessLogin.value = false;
			updatePasswordLessLogin();
		}).then(() => {
			os.success();
		});
	});
}

function addSecurityKey() {
	os.inputText({
		title: i18n.ts.password,
		type: 'password'
	}).then(({ canceled, result: password }) => {
		if (canceled || password == null) return;
		os.api('i/2fa/register-key', {
			password
		}).then(reg => {
			registration.value = {
				password,
				challengeId: reg!.challengeId,
				stage: 0,
				publicKeyOptions: {
					challenge: byteify(reg!.challenge, 'base64'),
					rp: {
						id: hostname,
						name: 'Misskey'
					},
					user: {
						id: byteify(account.id, 'ascii'),
						name: account.username,
						displayName: account.name,
					},
					pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
					timeout: 60000,
					attestation: 'direct'
				},
				saving: true
			};
			return navigator.credentials.create({
				publicKey: registration.value.publicKeyOptions
			});
		}).then(credential => {
			registration.value.credential = credential;
			registration.value.saving = false;
			registration.value.stage = 1;
		}).catch(err => {
			console.warn('Error while registering?', err);
			registration.value.error = err.message;
			registration.value.stage = -1;
		});
	});
}

async function updatePasswordLessLogin() {
	await os.api('i/2fa/password-less', {
		value: !!usePasswordLessLogin.value
	});
}
</script>
