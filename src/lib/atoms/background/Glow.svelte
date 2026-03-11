<script lang="ts">
	import { glowValues } from './glowMath';

	let { breath = 0, beatVal = 0 }: { breath?: number; beatVal?: number } = $props();

	let g = $derived(glowValues(breath, beatVal));
</script>

<div class="glow glow1"
	style:opacity={g.g1op}
	style:transform="translate(-50%,-50%) scale({g.g1scale})">
</div>
<div class="glow glow2"
	style:opacity={g.g2op}
	style:transform="translate(-50%,-50%) scale({g.g2scale})">
</div>

<style>
	.glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
		z-index: 0;
	}
	.glow1 {
		width: 1000px; height: 700px;
		top: 50%; left: 50%;
		background: radial-gradient(ellipse, rgba(99,102,241,0.16) 0%, rgba(120,130,255,0.06) 30%, transparent 65%);
	}
	.glow2 {
		width: 600px; height: 420px;
		top: 50%; left: 50%;
		background: radial-gradient(ellipse, rgba(130,140,255,0.20) 0%, rgba(99,102,241,0.05) 40%, transparent 60%);
	}
</style>
