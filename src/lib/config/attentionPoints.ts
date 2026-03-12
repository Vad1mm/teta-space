import type { AttentionPointConfig } from '$lib/engine/AttentionPointsEngine';
import type { Phase } from '$lib/types/flow';
import type { WanderState } from '$lib/engine/AttentionEngine';

const LIVE: Phase[] = ['opening', 'live', 'closing'];
const ALL_OPEN: Phase[] = ['splash', 'morph', 'slogan', 'waitPlay', 'opening', 'live', 'closing'];

// ── Module 0: ВХІД — attention wander + spotlight ──

export function module0Points(attState: WanderState): AttentionPointConfig[] {
	return [
		{
			id: 'm0-glow',
			role: 'background',
			behavior: 'rigid',     // position comes from getPosition (existing AttentionEngine)
			coordSpace: 'viewport',
			size: 1000,
			baseOpacity: 0.3,
			blur: 0,
			breathSync: true,
			beatSync: false,
			anchor: {
				x: 0, y: 0,
				getPosition: () => ({ x: attState.x * 2.5, y: attState.y * 2.5 }),
			},
			activePhases: ALL_OPEN,
			fadeInDur: 600,
			fadeOutDur: 1000,
			useGlowDim: true,
		},
		{
			id: 'm0-spot',
			role: 'background',
			behavior: 'rigid',     // follows same attention but amplified
			coordSpace: 'viewport',
			size: 500,
			baseOpacity: 0.5,
			blur: 0,
			breathSync: true,
			beatSync: false,
			anchor: {
				x: 0, y: 0,
				getPosition: () => ({ x: attState.x * 4, y: attState.y * 4 }),
			},
			activePhases: ALL_OPEN,
			fadeInDur: 600,
			fadeOutDur: 800,
			useGlowDim: true,
		},
	];
}

// ── Module 1: ЕНЕРГІЯ — background glow with heartbeat sync ──

export function module1Points(): AttentionPointConfig[] {
	return [
		{
			id: 'm1-glow',
			role: 'background',
			behavior: 'drift',
			coordSpace: 'viewport',
			size: 800,
			baseOpacity: 0.28,
			blur: 0,
			breathSync: true,
			beatSync: true,
			anchor: { x: 0, y: 0 },
			driftAmplitude: { x: 12, y: 8 },
			activePhases: ALL_OPEN,
			fadeInDur: 1200,
			fadeOutDur: 800,
		},
	];
}

// ── Module 2: ТИША — chaotic glow wander ──

export function module2Points(): AttentionPointConfig[] {
	return [
		{
			id: 'm2-glow',
			role: 'background',
			behavior: 'rigid',   // anchor itself moves via getPosition
			coordSpace: 'viewport',
			size: 800,
			baseOpacity: 0.28,
			blur: 0,
			breathSync: true,
			beatSync: false,
			anchor: {
				x: 0, y: 0,
				getPosition: (now, breath) => {
					const t = now * 0.001;
					const jitter = Math.sin(t * 3.7) * Math.sin(t * 2.1) * 8;
					return {
						x: Math.sin(t * 0.19) * 35 + Math.sin(t * 0.67) * 22 + Math.sin(t * 1.41) * 9 + jitter,
						y: 80 + Math.sin(t * 0.14) * 28 + Math.cos(t * 0.51) * 18 + Math.sin(t * 1.17) * 7
							+ Math.sin(t * 2.9) * Math.cos(t * 1.7) * 6 - breath * 12,
					};
				},
			},
			activePhases: LIVE,
			fadeInDur: 1200,
			fadeOutDur: 800,
			useGlowDim: true,
		},
	];
}

// ── Module 3: АВТОР — glow + helper near progress ──

export function module3Points(): AttentionPointConfig[] {
	return [
		{
			id: 'm3-glow',
			role: 'background',
			behavior: 'drift',
			coordSpace: 'viewport',
			size: 800,
			baseOpacity: 0.28,
			blur: 0,
			breathSync: true,
			beatSync: false,
			anchor: { x: 0, y: 0 },
			driftAmplitude: { x: 6, y: 4 },
			activePhases: ALL_OPEN,
			fadeInDur: 1200,
			fadeOutDur: 800,
		},
		{
			id: 'm3-progress',
			role: 'helper',
			behavior: 'drift',
			coordSpace: 'viewport',
			size: 140,
			baseOpacity: 0.18,
			blur: 20,
			breathSync: true,
			beatSync: false,
			anchor: {
				x: 0, y: -20,  // near the eye (breath-edge progress)
			},
			driftAmplitude: { x: 15, y: 6 },
			activePhases: ['live'] as Phase[],
			entryDelay: 1000,
			fadeInDur: 2500,
			fadeOutDur: 600,
		},
	];
}

// ── Module 4: ДО ЗУСТРІЧІ — glow with heartbeat ──

export function module4Points(): AttentionPointConfig[] {
	return [
		{
			id: 'm4-glow',
			role: 'background',
			behavior: 'drift',
			coordSpace: 'viewport',
			size: 800,
			baseOpacity: 0.28,
			blur: 0,
			breathSync: true,
			beatSync: true,
			anchor: { x: 0, y: 0 },
			driftAmplitude: { x: 8, y: 5 },
			activePhases: ALL_OPEN,
			fadeInDur: 1200,
			fadeOutDur: 2000,
		},
	];
}
