<script lang="ts">
	let {
		text = 'ТЕТА',
		glowSize = 16,
		glowOpacity = 0.04,
	}: {
		text?: string;
		glowSize?: number;
		glowOpacity?: number;
	} = $props();

	let chars = $derived(text.split(''));
</script>

<div class="brand-name" style:text-shadow="0 0 {glowSize}px rgba(99,102,241,{glowOpacity})">
	{#each chars as ch}
		<span class="anim-char">{ch}</span>
	{/each}
</div>

<style>
	.brand-name {
		font-size: 32px;
		font-weight: 300;
		color: rgba(255,255,255,1);
		display: flex;
		justify-content: center;
		transition: transform 1s ease;
	}
	.anim-char {
		display: block;
		width: 24px;
		text-align: center;
		margin: 0 10px;
		transition: opacity 0.4s ease, color 0.4s ease, text-shadow 0.8s ease;
	}
</style>
