<script lang="ts">
	import { clamp } from '$lib/engine/easing';

	let {
		progress = 1,
		breath = 0,
		beatVal = 0,
		visible = false,
	}: {
		progress?: number;
		breath?: number;
		beatVal?: number;
		visible?: boolean;
	} = $props();

	let remaining = $derived(clamp(1 - progress, 0, 1));
	let bv = $derived(beatVal || 0);

	let fillOpacity = $derived(
		bv > 0
			? (0.3 + breath * 0.4 + bv * 0.3)
			: (0.3 + breath * 0.6)
	);
	let height = $derived(
		bv > 0
			? (1.5 + breath * 1 + bv * 1.5)
			: (1.5 + breath * 1.5)
	);
	let glowOp = $derived(
		bv > 0
			? (0.15 + breath * 0.15 + bv * 0.25)
			: (0.15 + breath * 0.25)
	);
	let glowSz = $derived(
		bv > 0
			? (6 + breath * 6 + bv * 12)
			: (6 + breath * 10)
	);
</script>

<div class="progress-bar" style:opacity={visible ? 1 : 0} style:height="{height}px">
	<div class="progress-fill"
		style:transform="scaleX({remaining})"
		style:opacity={fillOpacity}
		style:box-shadow="0 0 {glowSz}px rgba(99,102,241,{glowOp.toFixed(2)})">
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
	}
</style>
