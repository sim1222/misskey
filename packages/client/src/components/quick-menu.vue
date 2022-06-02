<template>
<MkModal ref="modal" v-slot="{ type, maxHeight }" :prefer-type="preferedModalType" :anchor="anchor" :transparent-bg="true" :src="src" @click="modal.close()" @closed="emit('closed')">
	<div class="szkkfdyq _popup _shadow" :class="{ asDrawer: type === 'drawer' }" :style="{ maxHeight: maxHeight ? maxHeight + 'px' : '' }">
		<div v-if="antennaItems.length || listItems.length" class="ghredhe">
			<div class="column">
				<MkMenu :items="antennaItems" @click="close"/>
			</div>
			<div class="column">
				<MkMenu :items="listItems" @click="close"/>
			</div>
		</div>
		<div class="quick-access">
			<template v-for="item in quickAccessItems">
				<button v-if="item.action" v-click-anime class="_button" @click="$event => { item.action($event); close(); }">
					<i class="icon" :class="item.icon"></i>
					<span v-if="item.indicate" class="indicator"><i class="fas fa-circle"></i></span>
				</button>
				<MkA v-else v-click-anime :to="item.to" @click.passive="close()">
					<i class="icon" :class="item.icon"></i>
					<span v-if="item.indicate" class="indicator"><i class="fas fa-circle"></i></span>
				</MkA>
			</template>
			<div v-for="account in accountItems" :key="account.id" @click="switchAccount(account)">
				<img class="avatar" :src="account.avatarUrl" :alt="account.name || account.username"/>
			</div>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import * as os from '@/os';
import { i18n } from '@/i18n';
import { onMounted, Ref, ref } from 'vue';
import { quickAccessDef } from '@/menu';
import { deviceKind } from '@/scripts/device-kind';
import { MenuItem } from '@/types/menu';
import MkModal from '@/components/ui/modal.vue';
import MkMenu from '@/components/ui/menu.vue';
import { $i, getAccounts, login } from '@/account';
import { UserDetailed } from 'misskey-js/built/entities';

const props = withDefaults(defineProps<{
	src?: HTMLElement;
	anchor?: { x: string; y: string; };
}>(), {
	anchor: () => ({ x: 'right', y: 'center' }),
});

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const preferedModalType = (deviceKind === 'desktop' && props.src != null) ? 'popup' :
	deviceKind === 'smartphone' ? 'drawer' :
	'dialog';

const modal = $ref<InstanceType<typeof MkModal>>();

const quickAccessItems = Object.keys(quickAccessDef).map(k => quickAccessDef[k]).filter(def => def.show == null ? true : def.show).map(def => ({
	type: def.to ? 'link' : 'button',
	icon: def.icon,
	to: def.to,
	action: def.action,
	indicate: def.indicated,
}));

const antennaItems: Ref<MenuItem[]> = ref([])
const listItems: Ref<MenuItem[]> = ref([])
const accountItems: Ref<UserDetailed[]> = ref([])

onMounted(async () => {
	antennaItems.value = await getItemsOfAntennas()
	listItems.value = await getItemsOfLists()
	accountItems.value = await getItemsOfAccounts()
})

const getItemsOfAntennas = async (): Promise<MenuItem[]> => {
	const antennas = await os.api('antennas/list')
	if (!antennas.length) return []

	const items = antennas.map(antenna => ({
		type: 'link' as const,
		text: antenna.name,
		indicate: antenna.hasUnreadNote,
		to: `/timeline/antenna/${antenna.id}`,
	}))

	return [{
		type: 'label' as const,
		text: i18n.ts.antennas,
	}, ...items]
}

const getItemsOfLists = async (): Promise<MenuItem[]> => {
	const lists = await os.api('users/lists/list')
	if (!lists.length) return []

	const items = lists.map(list => ({
		type: 'link' as const,
		text: list.name,
		to: `/timeline/list/${list.id}`,
	}))

	return [{
		type: 'label' as const,
		text: i18n.ts.lists,
	}, ...items]
}

const getItemsOfAccounts = async (): Promise<UserDetailed[]> => {
	const accounts = await getAccounts()
	const accountsWithoutCurrentUser = accounts.filter(account => account.id !== $i?.id)

	const items = await os.api('users/show', {
		userIds: accountsWithoutCurrentUser.map(account => account.id)
	})

	return items
}

const switchAccount = async (account): Promise<void> => {
	const storedAccounts = await getAccounts()
	const token = storedAccounts.find(x => x.id === account.id)?.token
	
	login(token)
}

const close = (): void => {
	modal.close()
}
</script>

<style lang="scss" scoped>
.szkkfdyq {
	max-height: 100%;
	width: min(460px, 100vw);
	padding: 24px;
	box-sizing: border-box;
	overflow: auto;
	overscroll-behavior: contain;
	text-align: left;
	border-radius: 16px;

	&.asDrawer {
		width: 100%;
		padding: 16px 16px calc(env(safe-area-inset-bottom, 0px) + 16px) 16px;
		border-radius: 24px;
		border-bottom-right-radius: 0;
		border-bottom-left-radius: 0;
		text-align: center;
	}

	> .ghredhe {
		display: flex;
		flex-direction: row;

		> .column {
			width: 50%;
		}
	}

	> .quick-access, > .sub {
    display: flex;
    flex-direction: row;
    justify-content: space-around;

		.avatar {
			border-radius: 50%;
			width: 32px;
		}

		> * {
			align-items: center;
			border-radius: 10px;
			display: flex;
			width: 64px;
			height: 64px;
			justify-content: center;
			position: relative;
			vertical-align: bottom;

			&:hover {
				color: var(--accent);
				background: var(--accentedBg);
				text-decoration: none;
			}

			> .icon {
				font-size: 24px;
				height: 24px;
			}

			> .indicator {
				position: absolute;
				top: 32px;
				left: 32px;
				color: var(--indicator);
				font-size: 8px;
				animation: blink 1s infinite;

				@media (max-width: 500px) {
					top: 16px;
					left: 16px;
				}
			}
		}
	}
}
</style>
