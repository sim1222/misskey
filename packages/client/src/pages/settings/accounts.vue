<template>
<div class="_formRoot">
	<FormSuspense :p="init">
		<FormButton primary @click="addAccount"><i class="fas fa-plus"></i> {{ i18n.ts.addAccount }}</FormButton>

		<div v-for="account in accounts" :key="account.id" class="_panel blur _button lcjjdxlm" @click="menu(account, $event)">
			<div class="avatar">
				<MkAvatar :user="account" class="avatar"/>
			</div>
			<div class="body">
				<div class="name">
					<MkUserName :user="account"/>
				</div>
				<div class="acct">
					<MkAcct :user="account"/>
				</div>
			</div>
		</div>
	</FormSuspense>
</div>
</template>

<script lang="ts" setup>
import { requireAccount } from '@/account';
const account = requireAccount();

import { defineAsyncComponent, ref } from 'vue';
import FormSuspense from '@/components/form/suspense.vue';
import FormButton from '@/components/MkButton.vue';
import * as os from '@/os';
import { getAccounts, addAccount as addAccounts, removeAccount as _removeAccount, login } from '@/account';
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

const storedAccounts = ref<Awaited<ReturnType<typeof getAccounts>>>([]);
const accounts = ref<import('@/misskey').entities.UserDetailed[]>([]);

const init = async () => {
	getAccounts().then(accounts => {
		storedAccounts.value = accounts.filter(x => x.id !== account.id);

		console.log(storedAccounts.value);

		return os.api('users/show', {
			userIds: storedAccounts.value.map(x => x.id),
		});
	}).then(response => {
		accounts.value = response;
		console.log(accounts.value);
	});
};

function menu(account: { id: string }, ev: MouseEvent) {
	os.popupMenu([{
		text: i18n.ts.switch,
		icon: 'fas fa-exchange-alt',
		action: () => switchAccount(account),
	}, {
		text: i18n.ts.remove,
		icon: 'fas fa-trash-alt',
		danger: true,
		action: () => removeAccount(account),
	}], ev.currentTarget ?? ev.target);
}

function addAccount(ev: MouseEvent) {
	os.popupMenu([{
		text: i18n.ts.existingAccount,
		action: () => { addExistingAccount(); },
	}, {
		text: i18n.ts.createAccount,
		action: () => { createAccount(); },
	}], ev.currentTarget ?? ev.target);
}

function removeAccount(account: { id: string; }) {
	_removeAccount(account.id);
}

function addExistingAccount() {
	os.popup(defineAsyncComponent(() => import('@/components/MkSigninDialog.vue')), {}, {
		done: (res: { id: string; i: string }) => {
			addAccounts(res.id, res.i);
			os.success();
		},
	}, 'closed');
}

function createAccount() {
	os.popup(defineAsyncComponent(() => import('@/components/MkSignupDialog.vue')), {}, {
		done: (res: { id: string; i: string }) => {
			addAccounts(res.id, res.i);
			switchAccountWithToken(res.i);
		},
	}, 'closed');
}

async function switchAccount(account: { id: string }) {
	const fetchedAccounts = await getAccounts();
	const token = fetchedAccounts.find(x => x.id === account.id)?.token;
    if (!token) return;
	switchAccountWithToken(token);
}

function switchAccountWithToken(token: string) {
	login(token);
}





definePageMetadata({
	title: i18n.ts.accounts,
	icon: 'fas fa-users',
});
</script>

<style lang="scss" scoped>
.lcjjdxlm {
	display: flex;
	padding: 16px;

	> .avatar {
		display: block;
		flex-shrink: 0;
		margin: 0 12px 0 0;

		> .avatar {
			width: 50px;
			height: 50px;
		}
	}

	> .body {
		display: flex;
		flex-direction: column;
		justify-content: center;
		width: calc(100% - 62px);
		position: relative;

		> .name {
			font-weight: bold;
		}
	}
}
</style>
