<template>
<div class="oxxrhrto">
	<svg :viewBox="`0 0 ${ viewBoxX } ${ viewBoxY }`">
		<polygon
			:points="inPolygonPoints"
			fill="#94a029"
			fill-opacity="0.5"
		/>
		<polyline
			:points="inPolylinePoints"
			fill="none"
			stroke="#94a029"
			stroke-width="1"
		/>
		<circle
			:cx="inHeadX"
			:cy="inHeadY"
			r="1.5"
			fill="#94a029"
		/>
		<text x="1" y="5">NET rx <tspan>{{ bytes(inRecent) }}</tspan></text>
	</svg>
	<svg :viewBox="`0 0 ${ viewBoxX } ${ viewBoxY }`">
		<polygon
			:points="outPolygonPoints"
			fill="#ff9156"
			fill-opacity="0.5"
		/>
		<polyline
			:points="outPolylinePoints"
			fill="none"
			stroke="#ff9156"
			stroke-width="1"
		/>
		<circle
			:cx="outHeadX"
			:cy="outHeadY"
			r="1.5"
			fill="#ff9156"
		/>
		<text x="1" y="5">NET tx <tspan>{{ bytes(outRecent) }}</tspan></text>
	</svg>
</div>
</template>

<script lang="ts" setup>
import type { ChannelConnection, Channels, ServerStats } from '@/misskey';
import type { ApiResponse } from '@/types/api';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import bytes from '@/filters/bytes';

const props = defineProps<{
	connection: ChannelConnection<Channels['serverStats']>,
	meta: ApiResponse<'server-info'>
}>();

let viewBoxX = ref<number>(50);
let viewBoxY = ref<number>(30);
let stats = ref<ServerStats[]>([]);
let inPolylinePoints = ref<string>('');
let outPolylinePoints = ref<string>('');
let inPolygonPoints = ref<string>('');
let outPolygonPoints = ref<string>('');
let inHeadX: any = ref(null);
let inHeadY: any = ref(null);
let outHeadX: any = ref(null);
let outHeadY: any = ref(null);
let inRecent = ref<number>(0);
let outRecent = ref<number>(0);

onMounted(() => {
	props.connection.on('stats', onStats);
	props.connection.on('statsLog', onStatsLog);
	props.connection.send('requestLog', {
		id: Math.random().toString().substr(2, 8)
	});
});

onBeforeUnmount(() => {
	props.connection.off('stats', onStats);
	props.connection.off('statsLog', onStatsLog);
});

function onStats(connStats: ServerStats) {
	stats.value.push(connStats);
	if (stats.value.length > 50) stats.value.shift();

	const inPeak = Math.max(1024 * 64, Math.max(...stats.value.map(s => s.net.rx)));
	const outPeak = Math.max(1024 * 64, Math.max(...stats.value.map(s => s.net.tx)));

	let inPolylinePointsStats = stats.value.map((s, i) => [viewBoxX.value - ((stats.value.length - 1) - i), (1 - (s.net.rx / inPeak)) * viewBoxY.value]);
	let outPolylinePointsStats = stats.value.map((s, i) => [viewBoxX.value - ((stats.value.length - 1) - i), (1 - (s.net.tx / outPeak)) * viewBoxY.value]);
	inPolylinePoints.value = inPolylinePointsStats.map(xy => `${xy[0]},${xy[1]}`).join(' ');
	outPolylinePoints.value = outPolylinePointsStats.map(xy => `${xy[0]},${xy[1]}`).join(' ');

	inPolygonPoints.value = `${viewBoxX.value - (stats.value.length - 1)},${viewBoxY.value} ${inPolylinePoints.value} ${viewBoxX.value},${viewBoxY.value}`;
	outPolygonPoints.value = `${viewBoxX.value - (stats.value.length - 1)},${viewBoxY.value} ${outPolylinePoints.value} ${viewBoxX.value},${viewBoxY.value}`;

	inHeadX.value = inPolylinePointsStats[inPolylinePointsStats.length - 1][0];
	inHeadY.value = inPolylinePointsStats[inPolylinePointsStats.length - 1][1];
	outHeadX.value = outPolylinePointsStats[outPolylinePointsStats.length - 1][0];
	outHeadY.value = outPolylinePointsStats[outPolylinePointsStats.length - 1][1];

	inRecent.value = connStats.net.rx;
	outRecent.value = connStats.net.tx;
}

function onStatsLog(statsLog: ServerStats[]) {
	for (const revStats of [...statsLog].reverse()) {
		onStats(revStats);
	}
}
</script>

<style lang="scss" scoped>
.oxxrhrto {
	display: flex;

	> svg {
		display: block;
		padding: 10px;
		width: 50%;

		&:first-child {
			padding-right: 5px;
		}

		&:last-child {
			padding-left: 5px;
		}

		> text {
			font-size: 5px;
			fill: currentColor;

			> tspan {
				opacity: 0.5;
			}
		}
	}
}
</style>
