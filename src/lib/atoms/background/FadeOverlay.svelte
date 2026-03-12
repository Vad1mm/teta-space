<script lang="ts">
	let { opacity = 0, duration = 2500 }: { opacity?: number; duration?: number } = $props();
</script>

<div class="fade-overlay"
	style:opacity={opacity}
	style:transition="opacity {duration}ms ease">
</div>

<style>
	.fade-overlay {
		position: fixed;
		inset: 0;
		background: #06060b;
		z-index: 100;
		pointer-events: none;
		will-change: opacity;
	}
</style>
