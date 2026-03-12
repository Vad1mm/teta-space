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
	let s = $derived(1 + beatVal * 0.14);
	let fillOp = $derived(clamp(baseOp + beatVal * 0.55, 0, 1));
	// PERF: Glow via radial gradient ellipse behind heart — zero filter cost.
	// drop-shadow on animated path = filter recompute every frame = GPU killer.
	let glowOp = $derived(clamp(0.12 + beatVal * 0.40 + breath * 0.05, 0, 1));
	let glowR = $derived(12 + breath * 8 + beatVal * 16);
</script>

<g clip-path="url(#irisClip)" {opacity}>
	<!-- Glow behind heart — radial gradient with soft falloff, zero filter cost -->
	<defs>
		<radialGradient id="heartGlow">
			<stop offset="0%" stop-color="rgba(99,102,241,0.5)" />
			<stop offset="55%" stop-color="rgba(99,102,241,0.15)" />
			<stop offset="100%" stop-color="rgba(99,102,241,0)" />
		</radialGradient>
	</defs>
	<ellipse cx="130" cy="91" rx={glowR} ry={glowR * 0.8}
		fill="url(#heartGlow)" opacity={glowOp} />
	<path
		d="M130,102.5 C130,102.5 118,92.5 118,87 C118,82.5 121.5,79.5 125,79.5 C127.8,79.5 129.5,81.5 130,83.5 C130.5,81.5 132.2,79.5 135,79.5 C138.5,79.5 142,82.5 142,87 C142,92.5 130,102.5 130,102.5 Z"
		fill="rgba(99,102,241,{fillOp.toFixed(2)})"
		transform="translate(130,91) scale({s.toFixed(3)}) translate(-130,-91)"
	/>
</g>
