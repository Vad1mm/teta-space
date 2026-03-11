<script lang="ts">
	import { eyeD, creaseD } from '$lib/engine/geometry';
	import { clamp } from '$lib/engine/easing';
	import type { EyeState } from '$lib/engine/BlinkEngine';
	import { IRIS_RY } from '$lib/engine/geometry';

	let { eyeState }: { eyeState: EyeState } = $props();

	let d = $derived(eyeD(eyeState.topL, eyeState.topR, eyeState.botL, eyeState.botR));
	let crease = $derived(creaseD(eyeState.topL, eyeState.topR));
	let openness = $derived(clamp((eyeState.iRy - 0.2) / (IRIS_RY - 0.2), 0, 1));
	let creaseOp = $derived(0.08 + openness * 0.08);
</script>

<!-- Crease -->
<path d={crease} fill="none" stroke="rgba(255,255,255,0.12)"
	stroke-width="1" stroke-linecap="round" opacity={creaseOp} />

<!-- Eye outline -->
<path {d} fill="none" stroke="rgba(255,255,255,1)"
	stroke-width="2" stroke-linejoin="round" />

<!-- Clip path (used by parent SVG defs) -->
