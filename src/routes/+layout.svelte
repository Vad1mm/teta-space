<script lang="ts">
	import { onMount } from 'svelte';
	let { children } = $props();

	onMount(() => {
		const tg = (window as any).Telegram?.WebApp;
		if (tg) { tg.ready(); tg.expand(); }

	});
</script>

<svelte:head>
	<title>TETA</title>
</svelte:head>

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html, body) {
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: #06060b;
	}

	:global(body) {
		display: flex;
		justify-content: center;
		align-items: center;
		font-family: 'IBM Plex Sans', sans-serif;
		-webkit-font-smoothing: antialiased;
		touch-action: manipulation;
		-webkit-user-select: none;
		user-select: none;
	}

	:global(body::before) {
		content: '';
		position: fixed;
		inset: 0;
		background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
		pointer-events: none;
		z-index: 0;
	}

	@keyframes -global-blink-cursor {
		0%, 100% { opacity: 1; }
		50% { opacity: 0; }
	}

	@keyframes -global-btn-breathe {
		0%, 100% { opacity: 0.7; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.04); }
	}
</style>
