<script lang="ts">
	let {
		text = '',
		visible = false,
	}: {
		text?: string;
		visible?: boolean;
	} = $props();
</script>

<div class="hint" style:opacity={visible ? 1 : 0} style:transform={visible ? 'translateY(0)' : 'translateY(8px)'}>
	{text}
</div>

<style>
	.hint {
		font-size: 11px; font-weight: 300; font-style: italic;
		letter-spacing: 1.5px; color: rgba(255,255,255,0.25);
		text-align: center;
		transition: opacity 1.2s ease, transform 1.2s ease;
	}
</style>
