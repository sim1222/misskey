<template>
<MkSpacer :content-max="500">
	<FormTextarea v-model="text" class="_formBlock">
		<template #label>{{ $ts.text }}</template>
	</FormTextarea>

	<FormButton primary class="_formBlock" @click="uploadEmoji">{{ $ts.generateEmoji }}</FormButton>
</MkSpacer>
</template>

<script lang="ts" setup>
import * as symbols from "@/symbols"
import * as os from "@/os"
import {v4 as uuid} from "uuid"
import {computed, ref} from "vue"
import {i18n} from "@/i18n"
import { defaultStore } from "@/store"
import { stream } from "@/stream"
import FormTextarea from "@/components/form/textarea.vue"
import FormButton from "@/components/ui/button.vue"

const text = ref("")

const makeUrl = (): string => {
	const API_URL = "https://emoji-gen.ninja/emoji"

	const query = {
		text: encodeURI(text.value),
		color: "D55353FF",
		back_color: "00000000",
		font: "rounded-x-mplus-1p-black",
		size_fixed: false,
		align: "center",
		stretch: true,
		public_fg: "false",
		locale: "ja",
	}

	return API_URL + "?" + Object.entries(query).map(([key, value]) => `${key}=${value}`).join("&")
}

const uploadFileFromUrlWithId = (url: string) => new Promise<string>(async resolve => {
	const marker = uuid()

	// 先にコネクションを貼り、アップロードが完了したかどうかを監視する
	const connection = stream.useChannel("main")

	connection.on("urlUploadFinished", async response => {
		if (response.marker === marker) {
			resolve(response.file.id)
			connection.dispose()
		}
	})

	// 絵文字をアップロード
	await os.api("drive/files/upload-from-url", {
		url,
		folderId: defaultStore.state.uploadFolder,
		marker,
	})
})

const getEmojiObject = emojiId => new Promise<Record<string, any> | null>(async resolve => {
	const sinceId = await os.api("admin/emoji/list", {
		limit: 1,
		untilId: emojiId.id,
	})

	if (!sinceId || !sinceId[0] || !sinceId[0].id) {
		resolve(null)
		return
	}

	const id = await os.api("admin/emoji/list", {
		limit: 1,
		sinceId: sinceId[0].id,
	})

	if (!id || !id[0]) {
		resolve(null)
		return
	}

	resolve(id[0])
})

const uploadEmoji = async () => {
	const emojiUrl = makeUrl()
	const fileId = await uploadFileFromUrlWithId(emojiUrl)

	// ドライブにアップロードされたファイルをリネーム
	await os.api("drive/files/update", {
		fileId,
		name: uuid() + ".png",
	})

	const emojiId = await os.api("admin/emoji/add", { fileId })
	const emoji = await getEmojiObject(emojiId)

	if (!emoji) {
		os.alert({
			type: "error",
			text: i18n.ts.failedToUploadEmoji,
		})
	}

	os.popup(import("./emoji-edit-dialog.vue"), { emoji	})
}

defineExpose({
	[symbols.PAGE_INFO]: computed(() => ({
		title: i18n.ts.emojiGen,
		icon: "fas fa-kiss-wink-heart",
		bg: "var(--bg)",
	})),
})
</script>
