import type { Chart, ChartType, TooltipModel } from 'chart.js';
import { onUnmounted, ref } from 'vue';
import * as os from '@/os';
import MkChartTooltip from '@/components/MkChartTooltip.vue';

export function useChartTooltip() {
	const tooltipShowing = ref(false);
	const tooltipX = ref(0);
	const tooltipY = ref(0);
	const tooltipTitle = ref<string>();
	const tooltipSeries = ref<{ backgroundColor?: string; borderColor?: string; text: string }[]>([]);
	let disposeTooltipComponent: () => void;

	os.popup(MkChartTooltip, {
		showing: tooltipShowing,
		x: tooltipX,
		y: tooltipY,
		title: tooltipTitle,
		series: tooltipSeries,
	}, {}).then(({ dispose }) => {
		disposeTooltipComponent = dispose;
	});

	onUnmounted(() => {
		if (disposeTooltipComponent) disposeTooltipComponent();
	});

	function handler<T extends ChartType>(context: { chart: Chart<T>; tooltip: TooltipModel<T> }) {
		if (context.tooltip.opacity === 0) {
			tooltipShowing.value = false;
			return;
		}

		tooltipTitle.value = context.tooltip.title[0];
		tooltipSeries.value = context.tooltip.body.map((b, i) => ({
			backgroundColor: typeof context.tooltip.labelColors[i].backgroundColor === 'string' ? String(context.tooltip.labelColors[i].backgroundColor) : undefined,
			borderColor: typeof context.tooltip.labelColors[i].borderColor === 'string' ? String(context.tooltip.labelColors[i].borderColor) : undefined,
			text: b.lines[0],
		}));

		const rect = context.chart.canvas.getBoundingClientRect();

		tooltipShowing.value = true;
		tooltipX.value = rect.left + window.pageXOffset + context.tooltip.caretX;
		tooltipY.value = rect.top + window.pageYOffset + context.tooltip.caretY;
	}

	return {
		handler,
	};
}
