<script lang="ts">
	import { clamp } from '$lib/engine/easing';

	let {
		progress = 1,
		breath = 0,
		beatVal = 0,
		openness = 1,
		visible = false,
	}: {
		progress?: number;
		breath?: number;
		beatVal?: number;
		openness?: number;
		visible?: boolean;
	} = $props();

	let remaining = $derived(clamp(1 - progress, 0, 1));
	let bv = $derived(beatVal || 0);
	let op = $derived(clamp(openness, 0, 1));

	let fillOpacity = $derived(
		bv > 0
			? (0.7 + bv * 0.3)
			: op < 0.99
				? (0.15 + breath * 0.35) * (0.3 + op * 0.7)
				: (0.3 + breath * 0.6)
	);
	// PERF: Use scaleY instead of height animation — compositor-only, no layout thrash.
	// Base height is 2px, scale range gives us 1.5-3px visual thickness.
	let scaleY = $derived(
		bv > 0
			? (1 + bv * 0.5)
			: op < 0.99
				? (0.75 + breath * 0.75) * (0.4 + op * 0.6)
				: (0.75 + breath * 0.75)
	);
	let glowOp = $derived(
		bv > 0
			? (0.2 + bv * 0.4)
			: op < 0.99
				? (0.1 + breath * 0.2) * op
				: (0.15 + breath * 0.25)
	);
</script>

<div class="progress-bar" style:opacity={visible ? 1 : 0}>
	<div class="progress-fill"
		style:transform="scaleX({remaining}) scaleY({scaleY})"
		style:opacity={fillOpacity}>
	</div>
	<div class="progress-glow"
		style:transform="scaleX({remaining}) scaleY({scaleY})"
		style:opacity={glowOp}>
	</div>
</div>

<style>
	.progress-bar {
		position: fixed;
		bottom: max(env(safe-area-inset-bottom, 40px), 40px);
		left: 24px; right: 24px;
		height: 2px;
		z-index: 10;
		overflow: visible;
		transition: opacity 1s ease;
	}
	.progress-fill {
		width: 100%; height: 100%;
		background: rgba(99,102,241,0.5);
		transform-origin: center;
		border-radius: 1px;
		will-change: transform, opacity;
	}
	/* PERF: Static box-shadow on separate element, animated via opacity only.
	   box-shadow never changes value — GPU caches the shadow layer. */
	.progress-glow {
		position: absolute; inset: 0;
		transform-origin: center;
		border-radius: 1px;
		box-shadow: 0 0 12px rgba(99,102,241,0.6);
		will-change: transform, opacity;
	}
</style>
