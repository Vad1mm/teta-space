import { clamp } from './easing';

// ── Reusable wander state machine ──
// Used by both AttentionEngine (Module 0 eye) and AttentionPointsEngine (multi-point)

export interface WanderState {
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	phase: 'drift' | 'pause' | 'jump' | 'arrive';
	timer: number;
	phaseDur: number;
	velX: number;
	velY: number;
	speed: number;
	maxX: number;
	maxY: number;
	gentle: boolean;
}

export function createWanderState(maxX = 50, maxY = 30): WanderState {
	return {
		x: 0, y: 0,
		targetX: 0, targetY: 0,
		phase: 'pause', timer: 0, phaseDur: 800,
		velX: 0, velY: 0,
		speed: 0,
		maxX, maxY,
		gentle: true,
	};
}

/** Pick random drift speed — mostly slow, sometimes moderate, rarely brisk */
function pickDriftSpeed(w: WanderState): number {
	if (w.gentle) return 0.0003 + Math.random() * 0.0003;
	const r = Math.random();
	if (r < 0.45) return 0.0003 + Math.random() * 0.0004;
	if (r < 0.75) return 0.0008 + Math.random() * 0.0007;
	if (r < 0.92) return 0.0018 + Math.random() * 0.0012;
	return 0.004 + Math.random() * 0.003;
}

/** Pick drift target — range varies with speed */
function pickDriftTarget(w: WanderState, speed: number): void {
	const baseRange = w.gentle ? 0.3 : 0.25;
	const speedFactor = clamp(speed / 0.003, 0.3, 1.5);
	const range = baseRange + speedFactor * 0.35;
	w.targetX = clamp(w.x + (Math.random() - 0.5) * 2 * w.maxX * range, -w.maxX, w.maxX);
	w.targetY = clamp(w.y + (Math.random() - 0.5) * 2 * w.maxY * range, -w.maxY, w.maxY);
}

function pickJumpTarget(w: WanderState): void {
	const minDist = 0.6 * Math.hypot(w.maxX, w.maxY);
	let tx: number, ty: number, tries = 0;
	do {
		tx = (Math.random() - 0.5) * 2 * w.maxX;
		ty = (Math.random() - 0.5) * 2 * w.maxY;
		tries++;
	} while (Math.hypot(tx - w.x, ty - w.y) < minDist && tries < 20);
	w.targetX = tx;
	w.targetY = ty;
}

export interface WanderCallbacks {
	onJump?: () => void;
	onDriftStart?: () => void;
}

export function updateWanderState(w: WanderState, dt: number, cb?: WanderCallbacks): void {
	const prevX = w.x, prevY = w.y;
	w.timer += dt;

	if (w.phase === 'drift') {
		const f = Math.min(1, w.speed * dt);
		w.x += (w.targetX - w.x) * f;
		w.y += (w.targetY - w.y) * f;
		if (w.timer >= w.phaseDur) {
			w.phase = 'pause';
			w.timer = 0;
			if (w.gentle) {
				w.phaseDur = 800 + Math.random() * 1500;
			} else {
				const r = Math.random();
				if (r < 0.3) w.phaseDur = 200 + Math.random() * 400;
				else if (r < 0.7) w.phaseDur = 500 + Math.random() * 800;
				else w.phaseDur = 1000 + Math.random() * 1500;
			}
		}
	} else if (w.phase === 'pause') {
		if (w.timer >= w.phaseDur) {
			if (!w.gentle && Math.random() < 0.25) {
				pickJumpTarget(w);
				w.phase = 'jump';
				w.timer = 0;
			} else {
				const speed = pickDriftSpeed(w);
				w.speed = speed;
				pickDriftTarget(w, speed);
				w.phase = 'drift';
				w.timer = 0;
				const baseDur = w.gentle ? 3000 : 1800;
				const extraDur = w.gentle ? 3000 : 2500;
				const speedScale = clamp(1.0 - (speed - 0.0003) / 0.005, 0.3, 1.0);
				w.phaseDur = baseDur + Math.random() * extraDur * speedScale;
				if (cb?.onDriftStart) cb.onDriftStart();
			}
		}
	} else if (w.phase === 'jump') {
		if (cb?.onJump) cb.onJump();
		w.phase = 'arrive';
		w.timer = 0;
		w.phaseDur = 300 + Math.random() * 300;
		w.speed = 0.006 + Math.random() * 0.008;
	} else if (w.phase === 'arrive') {
		const f = Math.min(1, w.speed * dt);
		w.x += (w.targetX - w.x) * f;
		w.y += (w.targetY - w.y) * f;
		const dist = Math.hypot(w.targetX - w.x, w.targetY - w.y);
		if (dist < 2 || w.timer >= w.phaseDur) {
			w.phase = 'pause';
			w.timer = 0;
			w.phaseDur = 400 + Math.random() * 800;
		}
	}

	if (dt > 0) {
		w.velX = (w.x - prevX) / dt;
		w.velY = (w.y - prevY) / dt;
	}
}

export function wanderReturnToCenter(w: WanderState): void {
	w.targetX = 0; w.targetY = 0;
	w.phase = 'arrive';
	w.timer = 0;
	w.phaseDur = 600;
	w.speed = 0.005;
}

// ── AttentionEngine — backward-compatible wrapper ──
// Keeps the same API: { a, update, returnToCenter, setOnJump, setOnDriftStart }

export type AttentionState = WanderState;

export function createAttentionEngine() {
	const a = createWanderState(50, 30);
	const cb: WanderCallbacks = {};

	function update(dt: number): void {
		updateWanderState(a, dt, cb);
	}

	function returnToCenter(): void {
		wanderReturnToCenter(a);
	}

	function setOnJump(fn: () => void) { cb.onJump = fn; }
	function setOnDriftStart(fn: () => void) { cb.onDriftStart = fn; }

	return { a, update, returnToCenter, setOnJump, setOnDriftStart };
}
