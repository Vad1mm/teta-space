<script lang="ts">
	import { glowValues } from './glowMath';

	let { breath = 0, beatVal = 0, boost = 1 }: { breath?: number; beatVal?: number; boost?: number } = $props();

	let b = $derived(Math.min(boost, 0.75));
	let g = $derived(glowValues(breath, beatVal));
</script>

<div class="glow glow1"
	style:opacity={g.g1op * b}
	style:transform="translate(-50%,-50%) scale({g.g1scale})">
</div>
<div class="glow glow2"
	style:opacity={g.g2op * b}
	style:transform="translate(-50%,-50%) scale({g.g2scale})">
</div>

<style>
	.glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 0;
		will-change: transform, opacity;
	}
	.glow1 {
		width: 1800px; height: 1200px;
		top: 50%; left: 50%;
		background: radial-gradient(ellipse, rgba(99,102,241,0.38) 0%, rgba(120,130,255,0.20) 20%, rgba(110,120,255,0.07) 50%, transparent 85%);
	}
	.glow2 {
		width: 1100px; height: 800px;
		top: 50%; left: 50%;
		background: radial-gradient(ellipse, rgba(130,140,255,0.42) 0%, rgba(99,102,241,0.18) 25%, rgba(110,115,255,0.05) 55%, transparent 80%);
	}
</style>
