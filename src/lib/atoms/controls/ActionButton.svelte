<script lang="ts">
	let {
		type = 'play' as 'play' | 'pause' | 'stop',
		visible = false,
		breathe = true,
		onclick,
	}: {
		type?: 'play' | 'pause' | 'stop';
		visible?: boolean;
		breathe?: boolean;
		onclick?: () => void;
	} = $props();
</script>

<div class="cta" style:opacity={visible ? 1 : 0}
	style:transform={visible ? 'translateY(0)' : 'translateY(12px)'}
	style:pointer-events={visible ? 'auto' : 'none'}>
	<button class:breathe onclick={onclick} aria-label={type}>
		{#if type === 'play'}
			<span class="p-play"></span>
		{:else if type === 'pause'}
			<span class="p-pause">
				<span class="p-bar"></span>
				<span class="p-bar"></span>
			</span>
		{:else}
			<span class="p-stop"></span>
		{/if}
	</button>
</div>

<style>
	.cta {
		display: flex; gap: 16px; align-items: center; justify-content: center;
		z-index: 1;
		transition: opacity 1s ease, transform 1s ease;
	}
	button {
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.07);
		color: rgba(255,255,255,0.45);
		padding: 14px 20px;
		display: inline-flex; align-items: center; justify-content: center;
		gap: 5px; cursor: pointer; border-radius: 14px;
		transition: all 0.4s ease;
		-webkit-tap-highlight-color: transparent;
	}
	button.breathe {
		animation: btn-breathe 3.5s ease-in-out infinite;
	}
	button:active { transform: scale(0.95); }

	.p-play {
		display: block; width: 0; height: 0;
		border-style: solid; border-width: 8px 0 8px 14px;
		border-color: transparent transparent transparent currentColor;
		margin-left: 2px;
	}
	.p-pause {
		display: flex; gap: 5px;
	}
	.p-bar {
		display: block; width: 2.5px; height: 16px;
		background: currentColor; border-radius: 1px;
	}
	.p-stop {
		display: block; width: 14px; height: 14px;
		background: currentColor; border-radius: 2px;
	}
</style>
