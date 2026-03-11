<script lang="ts">
	import { clamp } from '$lib/engine/easing';
	import { THETA_CX, THETA_CY } from '$lib/engine/geometry';

	let {
		breath = 0,
		opacity = 0,
		waveTime = 0,
	}: {
		breath?: number; opacity?: number; waveTime?: number;
	} = $props();

	function buildWavePath(wT: number, br: number): string {
		const amp = 3 + br * 12;
		let d = '';
		for (let x = 78; x <= 182; x += 1.5) {
			const r = Math.abs(x - THETA_CX) / 52;
			const e = Math.cos(clamp(r, 0, 1) * Math.PI * 0.5);
			const y = THETA_CY + Math.sin(x * 0.06 + wT) * amp * e * e;
			d += (d ? ' L ' : 'M ') + x.toFixed(1) + ',' + y.toFixed(1);
		}
		return d;
	}

	let d = $derived(buildWavePath(waveTime, breath));
</script>

<g clip-path="url(#irisClip)">
	<path {d} fill="none" stroke="url(#waveGradient)"
		stroke-width="1.8" stroke-linecap="round" {opacity} />
</g>
