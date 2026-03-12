import { clamp } from './easing';
import { createWanderState, updateWanderState, type WanderState } from './AttentionEngine';
import type { Phase } from '$lib/types/flow';

// ── Types ──

export type PointRole = 'background' | 'helper' | 'focus';
export type PointBehavior = 'wander' | 'drift' | 'rigid';
export type CoordSpace = 'viewport' | 'eye-svg';

export interface PointAnchor {
	x: number;
	y: number;
	/** Dynamic position — called every frame if set */
	getPosition?: (now: number, breath: number, dt: number) => { x: number; y: number };
}

export interface AttentionPointConfig {
	id: string;
	role: PointRole;
	behavior: PointBehavior;
	coordSpace: CoordSpace;

	// Visual
	size: number;           // px diameter
	baseOpacity: number;    // 0–1
	blur: number;           // CSS blur px
	breathSync: boolean;    // pulse opacity/scale with breath
	beatSync: boolean;      // pulse opacity with heartbeat

	// Anchor + movement
	anchor: PointAnchor;
	wanderRange?: { x: number; y: number };
	driftAmplitude?: { x: number; y: number };

	// Timing
	activePhases: Phase[];
	entryDelay?: number;    // ms after phase entry before fade-in starts
	fadeInDur?: number;     // ms (default 1200)
	fadeOutDur?: number;    // ms (default 800)

	// Position scaling
	useGlowDim?: boolean;  // multiply position offset by global dim factor
}

export interface AttentionPointState {
	config: AttentionPointConfig;
	x: number;
	y: number;
	opacity: number;
	scale: number;
	active: boolean;
	fadeProgress: number;   // 0=invisible, 1=fully visible
	entryTimer: number;     // counts up to entryDelay
	wanderState: WanderState | null;
	driftPhase: number;     // accumulated time for Lissajous
}

// ── Engine ──

export function createAttentionPointsEngine() {
	let points: AttentionPointState[] = [];
	let globalDim = 1;
	let globalBoost = 1;

	function loadPoints(configs: AttentionPointConfig[]): void {
		points = configs.map(config => ({
			config,
			x: config.anchor.x,
			y: config.anchor.y,
			opacity: 0,
			scale: 1,
			active: false,
			fadeProgress: 0,
			entryTimer: 0,
			wanderState: config.behavior === 'wander'
				? createWanderState(config.wanderRange?.x ?? 50, config.wanderRange?.y ?? 30)
				: null,
			driftPhase: Math.random() * 6283,
		}));
	}

	function setPhase(phase: Phase): void {
		for (const pt of points) {
			const wasActive = pt.active;
			pt.active = pt.config.activePhases.includes(phase);
			// Reset entry timer on fresh activation
			if (pt.active && !wasActive) {
				pt.entryTimer = 0;
			}
		}
	}

	function setDim(dim: number): void { globalDim = dim; }
	function setBoost(boost: number): void { globalBoost = boost; }

	function update(dt: number, now: number, breath: number, beatVal: number): void {
		for (const pt of points) {
			const cfg = pt.config;

			// 1. Entry delay + fade
			if (pt.active) {
				const delay = cfg.entryDelay ?? 0;
				if (pt.entryTimer < delay) {
					pt.entryTimer += dt;
					// Still in delay — don't fade in yet
				} else {
					const fadeInDur = cfg.fadeInDur ?? 1200;
					pt.fadeProgress = Math.min(1, pt.fadeProgress + dt / fadeInDur);
				}
			} else {
				const fadeOutDur = cfg.fadeOutDur ?? 800;
				pt.fadeProgress = Math.max(0, pt.fadeProgress - dt / fadeOutDur);
			}

			if (pt.fadeProgress <= 0) continue; // skip invisible points

			// 2. Resolve anchor position
			const anchor = cfg.anchor;
			const anchorPos = anchor.getPosition
				? anchor.getPosition(now, breath, dt)
				: { x: anchor.x, y: anchor.y };

			// 3. Update position based on behavior
			if (cfg.behavior === 'wander' && pt.wanderState) {
				updateWanderState(pt.wanderState, dt);
				pt.x = anchorPos.x + pt.wanderState.x;
				pt.y = anchorPos.y + pt.wanderState.y;
			} else if (cfg.behavior === 'drift') {
				pt.driftPhase += dt * 0.001;
				const amp = cfg.driftAmplitude ?? { x: 8, y: 5 };
				pt.x = anchorPos.x
					+ Math.sin(pt.driftPhase * 0.7) * amp.x
					+ Math.sin(pt.driftPhase * 1.3) * amp.x * 0.3;
				pt.y = anchorPos.y
					+ Math.cos(pt.driftPhase * 0.5) * amp.y
					+ Math.sin(pt.driftPhase * 1.1) * amp.y * 0.2;
			} else {
				// rigid
				pt.x = anchorPos.x;
				pt.y = anchorPos.y;
			}

			// 4. Apply glowDim to position offset (wander/drift only)
			if (cfg.useGlowDim && cfg.behavior !== 'rigid') {
				const dx = pt.x - anchorPos.x;
				const dy = pt.y - anchorPos.y;
				pt.x = anchorPos.x + dx * globalDim;
				pt.y = anchorPos.y + dy * globalDim;
			}

			// 5. Compute opacity
			let op = cfg.baseOpacity * pt.fadeProgress;
			if (cfg.breathSync) {
				op *= (0.6 + breath * 0.4);
			}
			if (cfg.beatSync && beatVal > 0) {
				op += beatVal * 0.15;
			}
			if (cfg.useGlowDim) {
				op *= globalDim;
			}
			op *= globalBoost;
			pt.opacity = clamp(op, 0, 1);

			// 6. Compute scale
			pt.scale = cfg.breathSync ? (0.92 + breath * 0.16) : 1;
		}
	}

	function getPoints(): readonly AttentionPointState[] {
		return points;
	}

	function reset(): void {
		points = [];
		globalDim = 1;
		globalBoost = 1;
	}

	return { loadPoints, setPhase, setDim, setBoost, update, getPoints, reset };
}
