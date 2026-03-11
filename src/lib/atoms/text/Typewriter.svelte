<script lang="ts">
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';
	import { hapticSelection } from '$lib/engine/HapticEngine';

	let {
		text = '',
		speed = 1,
		haptic = true,
		ondone,
	}: {
		text?: string;
		speed?: number;
		haptic?: boolean;
		ondone?: () => void;
	} = $props();

	let el: HTMLDivElement;
	let twId = 0;

	function typeText(container: HTMLElement, txt: string, cb?: () => void): void {
		const myId = ++twId;
		container.innerHTML = '<span class="cursor"></span>';
		container.style.opacity = '1';
		let i = 0;

		function next(): void {
			if (myId !== twId) return;
			if (i >= txt.length) {
				const c = container.querySelector('.cursor') as HTMLElement;
				if (c) { c.style.animation = 'none'; c.style.transition = 'opacity 0.4s'; c.style.opacity = '0'; }
				if (cb) setTimeout(() => { if (myId === twId) cb(); }, 300);
				return;
			}
			const ch = txt[i];
			const cursor = container.querySelector('.cursor');
			if (!cursor) return;
			if (ch === '\n') {
				container.insertBefore(document.createElement('br'), cursor);
				i++;
				setTimeout(next, (400 + Math.random() * 200) / speed);
				return;
			}
			container.insertBefore(document.createTextNode(ch), cursor);
			i++;
			let delay: number;
			if (ch === '.' || ch === '?') delay = 518 + Math.random() * 178;
			else if (ch === ',') delay = 305 + Math.random() * 117;
			else if (ch === ' ') delay = 105 + Math.random() * 40;
			else { delay = 51 + Math.random() * 33; if (haptic) hapticSelection(); }
			setTimeout(next, delay / speed);
		}
		next();
	}

	export function cancel(): void { ++twId; }

	export function start(): void {
		if (el && text) {
			const cb = ondone;
			typeText(el, text, cb);
		}
	}

	// Cancel pending typewriters on unmount only
	onMount(() => {
		return () => { ++twId; };
	});

	// Auto-start when text changes; don't re-run on ondone changes
	$effect(() => {
		if (el && text) {
			const cb = untrack(() => ondone);
			typeText(el, text, cb);
		}
	});
</script>

<div class="slogan" bind:this={el}></div>

<style>
	.slogan {
		font-size: 14px; font-weight: 300; font-style: italic;
		letter-spacing: 1px; color: rgba(255,255,255,0.65);
		height: 46px; text-align: center; line-height: 1.6; overflow: hidden;
	}
	.slogan :global(.cursor) {
		display: inline-block; width: 1px; height: 13px;
		background: rgba(255,255,255,0.65); margin-left: 1px;
		vertical-align: middle;
		animation: blink-cursor 0.53s ease-in-out infinite;
	}
</style>
