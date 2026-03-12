<script lang="ts">
	import type { AttentionPointState } from '$lib/engine/AttentionPointsEngine';

	let { points = [] as AttentionPointState[] }: { points?: readonly AttentionPointState[] } = $props();

	let viewportPoints = $derived(
		points.filter(p => p.config.coordSpace === 'viewport' && p.opacity > 0.001)
	);
</script>

{#each viewportPoints as pt (pt.config.id)}
	<div class="att-point att-{pt.config.role}"
		style:width="{pt.config.size}px"
		style:height="{pt.config.size * 0.7}px"
		style:opacity={pt.opacity}
		style:transform="translate(calc(-50% + {pt.x}px), calc(-50% + {pt.y}px)) scale({pt.scale})"
		>
	</div>
{/each}

<style>
	.att-point {
		position: absolute;
		top: 50%; left: 50%;
		border-radius: 50%;
		pointer-events: none;
		will-change: transform, opacity;
		z-index: 0;
	}
	.att-background {
		background: radial-gradient(ellipse,
			rgba(99,102,241,0.16) 0%,
			rgba(120,130,255,0.06) 30%,
			transparent 65%);
	}
	.att-helper {
		background: radial-gradient(ellipse,
			rgba(99,102,241,0.35) 0%,
			rgba(99,102,241,0.12) 35%,
			transparent 65%);
	}
	.att-focus {
		background: radial-gradient(circle,
			rgba(99,102,241,0.45) 0%,
			rgba(99,102,241,0.12) 40%,
			transparent 70%);
	}
</style>
