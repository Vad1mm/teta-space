<script lang="ts">
	import { clamp } from '$lib/engine/easing';

	let {
		beatVal = 0,
		breath = 0,
		opacity = 0,
		irisCx = 130, irisCy = 91,
		irisRx = 44, irisRy = 44,
	}: {
		beatVal?: number; breath?: number; opacity?: number;
		irisCx?: number; irisCy?: number; irisRx?: number; irisRy?: number;
	} = $props();

	let baseOp = $derived(0.18 + breath * 0.14);
	let baseGlow = $derived(breath * 5);
	let s = $derived(1 + beatVal * 0.14);
	let fillOp = $derived(clamp(baseOp + beatVal * 0.55, 0, 1));
	let glow = $derived(baseGlow + beatVal * 18);
	let glowOp = $derived(0.12 + beatVal * 0.40 + breath * 0.05);
	let filterStr = $derived(
		glow > 1
			? `drop-shadow(0 0 ${glow.toFixed(0)}px rgba(99,102,241,${glowOp.toFixed(2)}))`
			: 'none'
	);
</script>

<g clip-path="url(#irisClip)" {opacity}>
	<path
		d="M130,102.5 C130,102.5 118,92.5 118,87 C118,82.5 121.5,79.5 125,79.5 C127.8,79.5 129.5,81.5 130,83.5 C130.5,81.5 132.2,79.5 135,79.5 C138.5,79.5 142,82.5 142,87 C142,92.5 130,102.5 130,102.5 Z"
		fill="rgba(99,102,241,{fillOp.toFixed(2)})"
		transform="translate(130,91) scale({s.toFixed(3)}) translate(-130,-91)"
		style:filter={filterStr}
	/>
</g>
