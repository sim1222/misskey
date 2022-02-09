<template>
<MkContainer :naked="widgetProps.transparent" :show-header="false">
	<img class="kjhasfa" src="https://raw.githubusercontent.com/Gowee/nyancat-svg/main/nyancat.svg">
</MkContainer>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { GetFormResultType } from '@/scripts/form';
import { useWidgetPropsManager, Widget, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget';

const name = 'nyancat';

const widgetPropsDef = {
	transparent: {
		type: 'boolean' as const,
		default: false,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

// 現時点ではvueの制限によりimportしたtypeをジェネリックに渡せない
//const props = defineProps<WidgetComponentProps<WidgetProps>>();
//const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();
const props = defineProps<{ widget?: Widget<WidgetProps>; }>();
const emit = defineEmits<{ (e: 'updateProps', props: WidgetProps); }>();

const { widgetProps, configure } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);


defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" scoped>
.kjhasfa {
	width: 100%;
	height: auto;
	border: none;
	pointer-events: none;
}
</style>
