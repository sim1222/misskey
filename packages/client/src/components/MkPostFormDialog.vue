<template>
<MkModal ref="modal" :prefer-type="'dialog:top'" @click="modal?.close()" @closed="$emit('closed')">
	<MkPostForm v-bind="props" @posted="modal?.close()" @cancel="modal?.close()" @esc="modal?.close()"/>
</MkModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import type { PostFormProps } from '@/types/post';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<PostFormProps>(), { initialLocalOnly: undefined, autofocus: true });
const modal = ref<InstanceType<typeof MkModal>>();
defineEmits<{ (event: 'closed'): void }>();
</script>
