<template>
<div class="ngbfujlo">
	<MkTextarea :model-value="text" readonly style="margin: 0;"></MkTextarea>
	<MkButton class="button" primary :disabled="posting || posted" @click="post()">
		<i v-if="posted" class="fas fa-check"></i>
		<i v-else class="fas fa-paper-plane"></i>
	</MkButton>
</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import MkTextarea from '../form/textarea.vue';
import MkButton from '../MkButton.vue';
import { apiUrl } from '@/config';
import { requireAccount } from '@/account';
import { noteRequest } from '@/scripts/note-request';
import * as os from '@/os';
import { PostBlock } from '@/scripts/hpml/block';
import { Hpml } from '@/scripts/hpml/evaluator';

export default defineComponent({
	components: {
		MkTextarea,
		MkButton,
	},
	props: {
		block: {
			type: Object as PropType<PostBlock>,
			required: true
		},
		hpml: {
			type: Object as PropType<Hpml>,
			required: true
		}
	},
	data() {
		return {
			text: this.hpml.interpolate(this.block.text),
			posted: false,
			posting: false,
		};
	},
	watch: {
		'hpml.vars': {
			handler() {
				this.text = this.hpml.interpolate(this.block.text);
			},
			deep: true
		}
	},
	methods: {
        upload(): Promise<{ id: string }> {
            const account = requireAccount();
            const canvasId = this.block.canvasId;
            const canvas = canvasId ? this.hpml.canvases[canvasId] : undefined;
            const promise = (async () => {
                if (!canvas) throw new Error('Page canvas is unavailable');
                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Cannot encode page canvas')));
                });
                const formData = new FormData();
                formData.append('file', blob);
                formData.append('i', account.token);
                if (this.$store.state.uploadFolder) formData.append('folderId', this.$store.state.uploadFolder);
                const response = await fetch(apiUrl + '/drive/files/create', { method: 'POST', body: formData });
                if (!response.ok) throw new Error(`Canvas upload failed: ${response.status}`);
                const file: unknown = await response.json();
                if (!file || typeof file !== 'object' || !('id' in file) || typeof file.id !== 'string') {
                    throw new TypeError('Canvas upload returned an invalid file');
                }
                return { id: file.id };
            })();
            os.promiseDialog(promise);
            return promise;
        },
        async post() {
            this.posting = true;
            try {
                const file = this.block.attachCanvasImage ? await this.upload() : null;
                const request = noteRequest({ text: this.text === '' ? null : this.text, fileIds: file ? [file.id] : undefined });
                if (!request) return;
                await os.apiWithDialog('notes/create', request);
                this.posted = true;
            } finally {
                this.posting = false;
            }
        }
	}
});
</script>

<style lang="scss" scoped>
.ngbfujlo {
	position: relative;
	padding: 32px;
	border-radius: 6px;
	box-shadow: 0 2px 8px var(--shadow);
	z-index: 1;

	> .button {
		margin-top: 32px;
	}

	@media (max-width: 600px) {
		padding: 16px;

		> .button {
			margin-top: 16px;
		}
	}
}
</style>
