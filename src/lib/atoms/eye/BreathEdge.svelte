<script lang="ts">
	import { breathTopD, breathBotD } from '$lib/engine/geometry';

	let {
		topL, topR, botL, botR,
		opacity = 0,
		filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.35))'
	}: {
		topL: number; topR: number; botL: number; botR: number;
		opacity?: number;
		filter?: string;
	} = $props();

	let topD = $derived(breathTopD(topL, topR));
	let botD = $derived(breathBotD(botL, botR));
</script>

<!-- Top breath edge -->
<path d={topD} fill="none" stroke="rgba(255,255,255,0.9)"
	stroke-width="2.8" stroke-linecap="round"
	{opacity} style:filter={filter} />

<!-- Bottom breath edge -->
<path d={botD} fill="none" stroke="rgba(255,255,255,0.9)"
	stroke-width="2.8" stroke-linecap="round"
	{opacity} style:filter={filter} />
