<template>
<XModalWindow
	ref="dialog"
	:width="370"
	:height="400"
	@close="onClose"
	@closed="emit('closed')"
>
	<template #header>{{ i18n.ts.login }}</template>

	<MkSignin :auto-set="autoSet" :message="message" @login="onLogin"/>
</XModalWindow>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkSignin from '@/components/MkSignin.vue';
import XModalWindow from '@/components/MkModalWindow.vue';
import { i18n } from '@/i18n';

withDefaults(defineProps<{
	autoSet?: boolean;
	message?: string,
}>(), {
	autoSet: false,
	message: '',
});

const emit = defineEmits<{
	(ev: 'done', result: { id: string; i: string }): void;
	(ev: 'closed'): void;
	(ev: 'cancelled'): void;
}>();

const dialog = ref<InstanceType<typeof XModalWindow>>();

function onClose() {
	emit('cancelled');
	dialog.value?.close();
}

function onLogin(res: { id: string; i: string }) {
	emit('done', res);
	dialog.value?.close();
}
</script>
