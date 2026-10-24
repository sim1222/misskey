<template>
<svg :viewBox="`0 0 ${ viewBoxX } ${ viewBoxY }`" @mousedown.prevent="onMousedown">
	<polyline
		:points="pointsNote"
		fill="none"
		stroke-width="1"
		stroke="#41ddde"/>
	<polyline
		:points="pointsReply"
		fill="none"
		stroke-width="1"
		stroke="#f7796c"/>
	<polyline
		:points="pointsRenote"
		fill="none"
		stroke-width="1"
		stroke="#a1de41"/>
	<polyline
		:points="pointsTotal"
		fill="none"
		stroke-width="1"
		stroke="#555"
		stroke-dasharray="2 2"/>
</svg>
</template>

<script lang="ts" setup>
import { listenDrag, type DragPoint } from '@/scripts/drag';
import { ref } from 'vue'

const props = defineProps<{
	activity: { total: number; notes: number; replies: number; renotes: number }[]
}>();

let viewBoxX = ref<number>(147);
let viewBoxY = ref<number>(60);
let zoom = ref<number>(1);
let pos = ref<number>(0);
let pointsNote: any = ref(null);
let pointsReply: any = ref(null);
let pointsRenote: any = ref(null);
let pointsTotal: any = ref(null);

function dragListen(fn: (event: DragPoint) => void) { listenDrag(window, fn); }

function onMousedown(ev: MouseEvent) {
	const clickX = ev.clientX;
	const clickY = ev.clientY;
	const baseZoom = zoom.value;
	const basePos = pos.value;

	// 動かした時
	dragListen(me => {
		let moveLeft = me.clientX - clickX;
		let moveTop = me.clientY - clickY;

		zoom.value = Math.max(1, baseZoom + (-moveTop / 20));
		pos.value = Math.min(0, basePos + moveLeft);
		if (pos.value < -(((props.activity.length - 1) * zoom.value) - viewBoxX.value)) pos.value = -(((props.activity.length - 1) * zoom.value) - viewBoxX.value);

		render();
	});
}

function render() {
	const peak = Math.max(...props.activity.map(d => d.total));
	if (peak !== 0) {
		const activity = props.activity.slice().reverse();
		pointsNote.value = activity.map((d, i) => `${(i * zoom.value) + pos.value},${(1 - (d.notes / peak)) * viewBoxY.value}`).join(' ');
		pointsReply.value = activity.map((d, i) => `${(i * zoom.value) + pos.value},${(1 - (d.replies / peak)) * viewBoxY.value}`).join(' ');
		pointsRenote.value = activity.map((d, i) => `${(i * zoom.value) + pos.value},${(1 - (d.renotes / peak)) * viewBoxY.value}`).join(' ');
		pointsTotal.value = activity.map((d, i) => `${(i * zoom.value) + pos.value},${(1 - (d.total / peak)) * viewBoxY.value}`).join(' ');
	}
}
</script>

<style lang="scss" scoped>
svg {
	display: block;
	padding: 16px;
	width: 100%;
	box-sizing: border-box;
	cursor: all-scroll;
}
</style>
