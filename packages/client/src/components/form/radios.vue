<script lang="ts">
import { defineComponent, h, isVNode } from 'vue';
import MkRadio from './radio.vue';

export default defineComponent({
	components: {
		MkRadio,
	},
	props: {
		modelValue: {
			type: null,
            required: false,
		},
	},
	data() {
		return {
			value: this.modelValue,
		};
	},
	watch: {
		value() {
			this.$emit('update:modelValue', this.value);
		},
	},
	render() {
		let options = this.$slots.default?.() ?? [];
		const label = this.$slots.label && this.$slots.label();
		const caption = this.$slots.caption && this.$slots.caption();

		// なぜかFragmentになることがあるため
		if (options.length === 1 && options[0].props == null) options = Array.isArray(options[0].children) ? options[0].children.filter(isVNode) : [];

		return h('div', {
			class: 'novjtcto',
		}, [
			...(label ? [h('div', {
				class: 'label',
			}, [label])] : []),
			h('div', {
				class: 'body',
			}, options.filter(option => option.props != null).map(option => h(MkRadio<unknown>, {
				key: option.key ?? undefined,
				value: option.props?.value,
				modelValue: this.value,
				'onUpdate:modelValue': value => this.value = value,
			}, { default: () => option.children })),
			),
			...(caption ? [h('div', {
				class: 'caption',
			}, [caption])] : []),
		]);
	},
});
</script>

<style lang="scss">
.novjtcto {
	> .label {
		font-size: 0.85em;
		padding: 0 0 8px 0;
		user-select: none;

		&:empty {
			display: none;
		}
	}

	> .body {
		display: flex;
    gap: 12px;
    flex-wrap: wrap;
	}

	> .caption {
		font-size: 0.85em;
		padding: 8px 0 0 0;
		color: var(--fgTransparentWeak);

		&:empty {
			display: none;
		}
	}
}
</style>
