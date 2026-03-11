<script lang="ts">
	let {
		text = '',
		opacity = 0,
	}: {
		text?: string;
		opacity?: number;
	} = $props();
</script>

<div class="label" style:opacity={opacity}>
	{text}
</div>

<style>
	.label {
		font-size: 14px; font-weight: 300; font-style: italic;
		letter-spacing: 1px; color: rgba(255,255,255,0.65);
		text-align: center; line-height: 1.6;
		max-height: 60px; overflow: hidden;
		z-index: 1;
		transition: opacity 1s ease;
		pointer-events: none;
	}
	.label :global(.cursor) {
		display: inline-block; width: 1px; height: 13px;
		background: rgba(255,255,255,0.65); margin-left: 1px;
		vertical-align: middle;
		animation: blink-cursor 0.53s ease-in-out infinite;
	}
</style>
