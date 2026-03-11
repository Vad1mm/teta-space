<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		opacity = 0,
		irisCx = 130, irisCy = 91,
		irisRx = 44, irisRy = 44,
		children
	}: {
		opacity?: number;
		irisCx?: number; irisCy?: number;
		irisRx?: number; irisRy?: number;
		children?: Snippet;
	} = $props();
</script>

<g clip-path="url(#eyeClip)" opacity={opacity > 0.1 ? 1 : opacity / 0.1}>
	<!-- Pupil glow -->
	<ellipse cx={irisCx} cy={irisCy} rx={irisRx} ry={irisRy} fill="url(#pupilGlow)" />

	<!-- Iris ring -->
	<ellipse cx={irisCx} cy={irisCy} rx={irisRx} ry={irisRy}
		fill="none" stroke="rgba(255,255,255,1)" stroke-width="1.5" />

	<!-- Pupil content (heart, wave, etc.) -->
	{#if children}
		{@render children()}
	{/if}
</g>
