<template>
<!-- eslint-disable vue/no-mutating-props -->
<XContainer :removable="removable" :error="error" :warn="warn" :draggable="draggable" @remove="() => $emit('remove')">
	<template #header><i v-if="icon" :class="icon"></i> <template v-if="title">{{ title }} <span v-if="typeText" class="turmquns">({{ typeText }})</span></template><template v-else-if="typeText">{{ typeText }}</template></template>
	<template #func>
		<button class="_button" @click="changeType()">
			<i class="fas fa-pencil-alt"></i>
		</button>
	</template>

	<section v-if="modelValue.type === null" class="pbglfege" @click="changeType()">
		{{ $ts._pages.script.emptySlot }}
	</section>
	<section v-else-if="modelValue.type === 'text'" class="tbwccoaw">
		<input v-model="modelValue.value"/>
	</section>
	<section v-else-if="modelValue.type === 'multiLineText'" class="tbwccoaw">
		<textarea v-model="modelValue.value"></textarea>
	</section>
	<section v-else-if="modelValue.type === 'textList'" class="tbwccoaw">
		<textarea v-model="modelValue.value" :placeholder="$ts._pages.script.blocks._textList.info"></textarea>
	</section>
	<section v-else-if="modelValue.type === 'number'" class="tbwccoaw">
		<input v-model="modelValue.value" type="number"/>
	</section>
	<section v-else-if="modelValue.type === 'ref'" class="hpdwcrvs">
		<select v-model="modelValue.value">
			<option v-for="v in hpml.getVarsByType(getExpectedType ? getExpectedType() : null).filter(x => x.name !== name)" :value="v.name">{{ v.name }}</option>
			<optgroup :label="$ts._pages.script.argVariables">
				<option v-for="v in fnSlots" :value="v.name">{{ v.name }}</option>
			</optgroup>
			<optgroup :label="$ts._pages.script.pageVariables">
				<option v-for="v in hpml.getPageVarsByType(getExpectedType ? getExpectedType() : null)" :value="v">{{ v }}</option>
			</optgroup>
			<optgroup :label="$ts._pages.script.enviromentVariables">
				<option v-for="v in hpml.getEnvVarsByType(getExpectedType ? getExpectedType() : null)" :value="v">{{ v }}</option>
			</optgroup>
		</select>
	</section>
	<section v-else-if="modelValue.type === 'aiScriptVar'" class="tbwccoaw">
		<input v-model="modelValue.value"/>
	</section>
	<section v-else-if="modelValue.type === 'fn'" class="" style="padding:0 16px 16px 16px;">
		<MkTextarea v-model="slots">
			<template #label>{{ $ts._pages.script.blocks._fn.slots }}</template>
			<template #caption>{{ $t('_pages.script.blocks._fn.slots-info') }}</template>
		</MkTextarea>
		<XV v-if="modelValue.value.expression" v-model="modelValue.value.expression" :title="$t(`_pages.script.blocks._fn.arg1`)" :get-expected-type="() => null" :hpml="hpml" :fn-slots="modelValue.value.slots" :name="name"/>
	</section>
	<section v-else-if="!isLiteralValue(modelValue) && modelValue.type.startsWith('fn:')" class="" style="padding:16px;">
		<XV v-for="(_x, i) in modelValue.args" :key="i" v-model="modelValue.args[i]" :title="getFunctionSlots(modelValue.type.split(':')[1])[i]?.name" :get-expected-type="() => null" :hpml="hpml" :name="name"/>
	</section>
	<section v-else-if="!isLiteralValue(modelValue)" class="" style="padding:16px;">
		<XV v-for="(_x, i) in modelValue.args" :key="i" v-model="modelValue.args[i]" :title="$t(`_pages.script.blocks._${modelValue.type}.arg${i + 1}`)" :get-expected-type="() => _getExpectedType(i)" :hpml="hpml" :name="name" :fn-slots="fnSlots"/>
	</section>
</XContainer>
</template>

<script lang="ts">
/* eslint-disable vue/no-mutating-props */
import { inject, defineAsyncComponent, defineComponent, type PropType, type VNodeProps } from 'vue';
import { v4 as uuid } from 'uuid';
import XContainer from './page-editor.container.vue';
import MkTextarea from '@/components/form/textarea.vue';
import { blockDefs, type Type } from '@/scripts/hpml/index';
import * as os from '@/os';
import { isLiteralValue, type Expr, type UserFnValue } from '@/scripts/hpml/expr';
import { HpmlTypeChecker } from '@/scripts/hpml/type-checker';
import { funcDefs } from '@/scripts/hpml/lib';

export type ScriptBlockList = (type: Type) => { label: string; items: { value: Expr['type']; text: string }[] }[];

type ScriptBlockProps = {
 modelValue: Expr; getExpectedType?: (() => Type) | null; title?: string; removable?: boolean;
 hpml: HpmlTypeChecker; name: string; fnSlots?: { name: string; type: Type }[]; draggable?: boolean;
 'onUpdate:modelValue'?: (value: Expr) => void; onRemove?: () => void;
};
const XV: new () => { $props: ScriptBlockProps & VNodeProps } = defineAsyncComponent(() => import('./page-editor.script-block.vue'));

export default defineComponent({
    emits: ['remove'],
	components: {
		XContainer, MkTextarea,
		XV,
	},

	setup() {
 const getScriptBlockList = inject<ScriptBlockList>('getScriptBlockList', () => []);
 return { getScriptBlockList, isLiteralValue };
 },

	props: {
		getExpectedType: {
			type: Function as PropType<(() => Type) | null>,
			required: false,
			default: null
		},
		modelValue: {
			type: Object as PropType<Expr>,
			required: true
		},
		title: {
			type: String,
			required: false
		},
		removable: {
			type: Boolean,
			required: false,
			default: false
		},
		hpml: {
			type: Object as PropType<HpmlTypeChecker>,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		fnSlots: {
			type: Array as PropType<{ name: string; type: Type }[]>,
			required: false,
		},
		draggable: {
			type: Boolean,
			required: false,
			default: false
		}
	},

	data(): { error: ReturnType<HpmlTypeChecker["typeCheck"]>; warn: { slot: number } | null; slots: string } {
		return {
			error: null,
			warn: null,
			slots: '',
		};
	},

	computed: {
		icon(): string | null | undefined {
			if (this.modelValue.type === null) return null;
			if (this.modelValue.type.startsWith('fn:')) return 'fas fa-plug';
			return blockDefs.find(x => x.type === this.modelValue.type)?.icon;
		},
		typeText(): string | null {
			if (this.modelValue.type === null) return null;
			if (this.modelValue.type.startsWith('fn:')) return this.modelValue.type.split(':')[1];
			return this.$t(`_pages.script.blocks.${this.modelValue.type}`);
		},
	},

	watch: {
		slots: {
			handler() {
				if (this.modelValue.type !== 'fn') return;
				this.modelValue.value.slots = this.slots.split('\n').map(x => ({
					name: x,
					type: null
				}));
			},
			deep: true
		}
	},

	created() {
		if (this.modelValue.type === null && this.modelValue.value == null) this.modelValue.value = null;

		if (this.modelValue.type === 'fn') this.slots = this.modelValue.value.slots.map(x => x.name).join('\n');

		this.$watch(() => this.modelValue.type, (t) => {
			this.warn = null;

			if (this.modelValue.type === 'fn') {
				const id = uuid();
				this.modelValue.value = {
					slots: [],
					expression: { id, type: null }
				};
				return;
			}

			if (this.modelValue.type && this.modelValue.type.startsWith('fn:')) {
				const fnName = this.modelValue.type.split(':')[1];
				const slots = this.getFunctionSlots(fnName);
 if (isLiteralValue(this.modelValue)) return;

				const empties = [];
				for (let i = 0; i < slots.length; i++) {
					const id = uuid();
					empties.push({ id, type: null });
				}
				this.modelValue.args = empties;
				return;
			}

			if (isLiteralValue(this.modelValue)) return;

			const empties = [];
			for (let i = 0; i < funcDefs[this.modelValue.type].in.length; i++) {
				const id = uuid();
				empties.push({ id, type: null });
			}
			this.modelValue.args = empties;

			for (let i = 0; i < funcDefs[this.modelValue.type].in.length; i++) {
				const inType = funcDefs[this.modelValue.type].in[i];
				if (typeof inType !== 'number') {
					if (inType === 'number') this.modelValue.args[i].type = 'number';
					if (inType === 'string') this.modelValue.args[i].type = 'text';
				}
			}
		});

		this.$watch(() => isLiteralValue(this.modelValue) ? undefined : this.modelValue.args, (args) => {
			if (args == null) {
				this.warn = null;
				return;
			}
			const emptySlotIndex = args.findIndex(x => x.type === null);
			if (emptySlotIndex !== -1 && emptySlotIndex < args.length) {
				this.warn = {
					slot: emptySlotIndex
				};
			} else {
				this.warn = null;
			}
		}, {
			deep: true
		});

		this.$watch(() => this.hpml.variables, () => {
			if (this.modelValue.type != null && this.modelValue) {
				this.error = this.hpml.typeCheck(this.modelValue);
			}
		}, {
			deep: true
		});
	},

	methods: {
 getFunctionSlots(name: string): UserFnValue['value']['slots'] {
 const variable = this.hpml.getVarByName(name);
 if (variable.type !== 'fn') throw new TypeError('Expected a page function');
 return variable.value.slots;
 },
		async changeType() {
			const { canceled, result: type } = await os.select({
				title: this.$ts._pages.selectType,
				groupedItems: this.getScriptBlockList(this.getExpectedType ? this.getExpectedType() : null)
			});
			if (canceled) return;
			this.modelValue.type = type;
		},

		_getExpectedType(slot: number) {
			return this.hpml.getExpectedType(this.modelValue, slot);
		}
	}
});
</script>

<style lang="scss" scoped>
.turmquns {
	opacity: 0.7;
}

.pbglfege {
	opacity: 0.5;
	padding: 16px;
	text-align: center;
	cursor: pointer;
	color: var(--fg);
}

.tbwccoaw {
	> input,
	> textarea {
		display: block;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		width: 100%;
		max-width: 100%;
		min-width: 100%;
		border: none;
		box-shadow: none;
		padding: 16px;
		font-size: 16px;
		background: transparent;
		color: var(--fg);
		box-sizing: border-box;
	}

	> textarea {
		min-height: 100px;
	}
}

.hpdwcrvs {
	padding: 16px;

	> select {
		display: block;
		padding: 4px;
		font-size: 16px;
		width: 100%;
	}
}
</style>
