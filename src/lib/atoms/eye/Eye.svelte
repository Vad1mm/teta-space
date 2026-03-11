<script lang="ts">
	import type { Snippet } from 'svelte';
	import { eyeD, creaseD, breathTopD, breathBotD, CX, CY, IRIS_RY } from '$lib/engine/geometry';
	import { clamp } from '$lib/engine/easing';
	import type { EyeState } from '$lib/engine/BlinkEngine';

	let {
		eyeState,
		irisCx = CX,
		irisCy = CY,
		irisRx = 44,
		irisRy = 44,
		showBreathEdge = false,
		breathEdgeOpacity = 0,
		breathEdgeTopOpacity,
		breathEdgeBotOpacity,
		breathEdgeFilter = 'drop-shadow(0 0 8px rgba(255,255,255,0.35))',
		breathEdgeTopDasharray = '',
		breathEdgeTopDashoffset = '',
		breathEdgeBotDasharray = '',
		breathEdgeBotDashoffset = '',
		contourOpacity = 1,
		children,
	}: {
		eyeState: EyeState;
		irisCx?: number; irisCy?: number;
		irisRx?: number; irisRy?: number;
		showBreathEdge?: boolean;
		breathEdgeOpacity?: number;
		breathEdgeTopOpacity?: number;
		breathEdgeBotOpacity?: number;
		breathEdgeFilter?: string;
		breathEdgeTopDasharray?: string;
		breathEdgeTopDashoffset?: string;
		breathEdgeBotDasharray?: string;
		breathEdgeBotDashoffset?: string;
		contourOpacity?: number;
		children?: Snippet;
	} = $props();

	let topPathEl: SVGPathElement;
	let botPathEl: SVGPathElement;

	export function getPathLengths(): { top: number; bot: number } {
		return {
			top: topPathEl?.getTotalLength() ?? 260,
			bot: botPathEl?.getTotalLength() ?? 260,
		};
	}

	let d = $derived(eyeD(eyeState.topL, eyeState.topR, eyeState.botL, eyeState.botR));
	let crease = $derived(creaseD(eyeState.topL, eyeState.topR));
	let topD = $derived(breathTopD(eyeState.topL, eyeState.topR));
	let botD = $derived(breathBotD(eyeState.botL, eyeState.botR));
	let openness = $derived(clamp((eyeState.iRy - 0.2) / (IRIS_RY - 0.2), 0, 1));
	let creaseOp = $derived(0.08 + openness * 0.08);
	let interiorOp = $derived(openness > 0.1 ? 1 : openness / 0.1);
</script>

<div class="eye-wrap">
	<svg class="eye-svg" viewBox="0 0 260 180">
		<defs>
			<linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="rgba(255,255,255,0.03)" />
				<stop offset="20%" stop-color="rgba(150,155,255,0.55)" />
				<stop offset="50%" stop-color="rgba(255,255,255,0.92)" />
				<stop offset="80%" stop-color="rgba(150,155,255,0.55)" />
				<stop offset="100%" stop-color="rgba(255,255,255,0.03)" />
			</linearGradient>
			<clipPath id="eyeClip"><path d={d} /></clipPath>
			<clipPath id="irisClip">
				<ellipse cx={irisCx} cy={irisCy} rx={irisRx} ry={irisRy} />
			</clipPath>
			<radialGradient id="pupilGlow" cx="50%" cy="50%" r="70%">
				<stop offset="0%" stop-color="rgba(99,102,241,0.31)" />
				<stop offset="52%" stop-color="rgba(99,102,241,0.02)" />
				<stop offset="100%" stop-color="rgba(99,102,241,0)" />
			</radialGradient>
		</defs>

		<!-- Crease -->
		<path d={crease} fill="none" stroke="rgba(255,255,255,0.12)"
			stroke-width="1" stroke-linecap="round" opacity={creaseOp} />

		<!-- Eye outline -->
		<path {d} fill="none" stroke="rgba(255,255,255,{contourOpacity})"
			stroke-width="2" stroke-linejoin="round" />

		<!-- Breath edges -->
		{#if showBreathEdge}
			<path bind:this={topPathEl} d={topD} fill="none" stroke="rgba(255,255,255,0.9)"
				stroke-width="2.8" stroke-linecap="round"
				opacity={breathEdgeTopOpacity !== undefined ? breathEdgeTopOpacity : breathEdgeOpacity}
				style:filter={breathEdgeFilter}
				style:stroke-dasharray={breathEdgeTopDasharray}
				style:stroke-dashoffset={breathEdgeTopDashoffset} />
			<path bind:this={botPathEl} d={botD} fill="none" stroke="rgba(255,255,255,0.9)"
				stroke-width="2.8" stroke-linecap="round"
				opacity={breathEdgeBotOpacity !== undefined ? breathEdgeBotOpacity : breathEdgeOpacity}
				style:filter={breathEdgeFilter}
				style:stroke-dasharray={breathEdgeBotDasharray}
				style:stroke-dashoffset={breathEdgeBotDashoffset} />
		{/if}

		<!-- Interior (clipped to eye) -->
		<g clip-path="url(#eyeClip)" opacity={interiorOp}>
			<!-- Pupil glow -->
			<ellipse cx={irisCx} cy={irisCy} rx={irisRx} ry={irisRy} fill="url(#pupilGlow)" />
			<!-- Iris ring -->
			<ellipse cx={irisCx} cy={irisCy} rx={irisRx} ry={irisRy}
				fill="none" stroke="rgba(255,255,255,1)" stroke-width="1.5" />
			<!-- Pupil content (heart, wave) -->
			{#if children}
				{@render children()}
			{/if}
		</g>
	</svg>
</div>

<style>
	.eye-wrap {
		position: relative;
		width: 260px; height: 180px;
		z-index: 1;
		margin-bottom: 2px;
	}
	.eye-svg {
		position: relative; z-index: 1;
		width: 100%; height: 100%;
		overflow: visible;
	}
</style>
