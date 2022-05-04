<template>
<MkSpacer :content-max="700" :margin-min="16" :margin-max="32">
	<FormSuspense :p="init">
		<div class="_formRoot">
			<FormInput v-model="emojiName" class="_formBlock">
				<template #label>{{ $ts.emojiName }}</template>
			</FormInput>

			<FormTextarea v-model="text" class="_formBlock">
				<template #label>{{ $ts.text }}</template>
			</FormTextarea>

			<FormRadios v-model="emojiAlign" class="_formBlock">
				<template #label>{{ $ts.emojiAlign }}</template>
				<option value="left"><i class="fa-solid fa-align-left"/></option>
				<option value="center"><i class="fa-solid fa-align-center"></i></option>
				<option value="right"><i class="fa-solid fa-align-right"/></option>
			</FormRadios>

			<FormSection>
				<template #label>{{ $ts.emojiSizeSetting }}</template>
				<FormSwitch v-model="emojiSizeFixed" class="_formBlock">
					<template #label>{{ $ts.emojiSizeFixed }}</template>
				</FormSwitch>

				<FormSwitch v-model="emojiStretch" class="_formBlock">
					<template #label>{{ $ts.emojiStretch }}</template>
				</FormSwitch>
			</FormSection>

			<FormRadios v-model="font" class="_formBlock">
				<template #label>{{ $ts.font }}</template>
				<option value="notosans-mono-bold">Noto Sans Mono CJK JP Bold</option>
				<option value="mplus-1p-black">M+ 1p black</option>
				<option value="rounded-x-mplus-1p-black">Rounded M+ 1p black</option>
				<option value="ipamjm">IPAmj明朝</option>
				<option value="aoyagireisyoshimo">青柳隷書しも</option>
				<option value="LinLibertine_RBah">LinLibertine Bold</option>
			</FormRadios>

			<FormInput v-model="emojiColor" class="_formBlock">
				<template #prefix><i class="fas fa-palette"></i></template>
				<template #label>{{ $ts.emojiColor }}</template>
				<template #caption>#RRGGBB</template> <!--FFを最後に足すこと-->
			</FormInput>
			<!-- このあとプレビュー＋絵文字登録 -->

			<FormButton primary class="_formBlock" @click="emojiGenerate">{{ $ts.emojiGenerate }}</FormButton>

			<FormSection>
				<template #label>{{ $ts.preview }}</template>
				<img :src="emojiUrl" class="img" :alt="emojiName"/>
				<p>{{ emojiUrl }}</p>
			</FormSection>
			<FormButton primary class="_formBlock" @click="emojiApproval">{{ $ts.emojiApproval }}</FormButton>

		</div>
	</FormSuspense>
</MkSpacer>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import FormSwitch from '@/components/form/switch.vue';
import FormInput from '@/components/form/input.vue';
import FormTextarea from '@/components/form/textarea.vue';
import FormRadios from '@/components/form/radios.vue';
import FormSection from '@/components/form/section.vue';
import FormButton from '@/components/ui/button.vue';
import * as os from '@/os';
import * as symbols from '@/symbols';
import {defaultStore} from "@/store";

export default defineComponent({
	components: {
		FormInput,
		FormTextarea,
		FormRadios,
		FormSection,
		FormSwitch,
		FormButton
	},

	emits: ['info'],

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: this.$ts.emojiGen,
				icon: 'fas fa-laugh',
				bg: 'var(--bg)',
			},
			emojiName: '',
			text: '',
			emojiAlign: 'center',
			emojiSizeFixed: false,
			emojiStretch: false,
			font: 'notosans-mono-bold',
			emojiColor: '38BA91',
			emojiUrl: '',
		}
	},

	methods: {
		async init() {
		},

		emojiGenerate() {
			//https://emoji-gen.ninja/result?text=%E7%B5%B5%E6%96%87%0A%E5%AD%97%E3%80%82&color=EC71A1FF&back_color=00000000&font=notosans-mono-bold&size_fixed=false&align=center&stretch=true&public_fg=true&locale=ja

			const apiUrl = `https://emoji-gen.ninja/emoji`
			let query = {"text": encodeURI(this.text), "color": this.emojiColor + "FF", "back_color": "00000000", "font": this.font, "size_fixed": this.emojiSizeFixed, "align": this.emojiAlign, "stretch": this.emojiStretch, "public_fg": "false", "locale": "ja"}

			this.emojiUrl = apiUrl + '?' + Object.entries(query).map((e) => `${e[0]}=${e[1]}`).join('&');



		},

		emojiApproval() {
			const chooseFileFromPc = async () => {

				const response = await fetch(this.emojiUrl).then(res => res.blob())

				const file = new File([response], `${this.emojiName}.png`);
				return await os.upload(file, defaultStore.state.uploadFolder, undefined,);
			};

			(async () => {
				const fileId = await chooseFileFromPc().then(res => res.id);
				await os.api('admin/emoji/add', {
					fileId,
					name: this.emojiName,
				})
			})();
		},
	},
});


</script>
