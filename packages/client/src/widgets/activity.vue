<template>
<MkContainer :show-header="widgetProps.showHeader" :naked="widgetProps.transparent" class="mkw-activity">
	<template #header><i class="fas fa-chart-simple"></i>{{ i18n.ts._widgets.activity }}</template>
	<template #func><button class="_button" @click="toggleView()"><i class="fas fa-sort"></i></button></template>

	<div>
		<MkLoading v-if="fetching"/>
		<template v-else-if="activity">
			<XCalendar v-show="widgetProps.view === 0" :activity="[...activity]"/>
			<XChart v-show="widgetProps.view === 1" :activity="[...activity]"/>
		</template>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useWidgetPropsManager, Widget, WidgetComponentExpose } from './widget';
import XCalendar from './activity.calendar.vue';
import XChart from './activity.chart.vue';
import { GetFormResultType } from '@/scripts/form';
import * as os from '@/os';
import MkContainer from '@/components/MkContainer.vue';
import { requireAccount } from '@/account';
import { i18n } from '@/i18n';

const name = 'activity';

const widgetPropsDef = {
	showHeader: {
		type: 'boolean' as const,
		default: true,
	},
	transparent: {
		type: 'boolean' as const,
		default: false,
	},
	view: {
		type: 'number' as const,
		default: 0,
		hidden: true,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

// 現時点ではvueの制限によりimportしたtypeをジェネリックに渡せない
//const props = defineProps<WidgetComponentProps<WidgetProps>>();
//const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();
const props = defineProps<{ widget?: Widget<WidgetProps>; }>();
const emit = defineEmits<{ (ev: 'updateProps', props: WidgetProps): void; }>();

const { widgetProps, configure, save } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const activity = ref<{ total: number; notes: number; replies: number; renotes: number }[] | null>(null);
const fetching = ref(true);

const toggleView = () => {
	if (widgetProps.view === 1) {
		widgetProps.view = 0;
	} else {
		widgetProps.view++;
	}
	save();
};

os.apiGet('charts/user/notes', {
	userId: requireAccount().id,
	span: 'day',
	limit: 7 * 21,
}).then(res => {
	activity.value = res.diffs.normal.map((_, i) => ({
		total: res.diffs.normal[i] + res.diffs.reply[i] + res.diffs.renote[i],
		notes: res.diffs.normal[i],
		replies: res.diffs.reply[i],
		renotes: res.diffs.renote[i],
	}));
	fetching.value = false;
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>
