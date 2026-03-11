import { clamp } from './easing';

export interface WanderState {
	offX: number;
	offY: number;
	targetX: number;
	targetY: number;
	phase: 'drift' | 'pause' | 'center' | 'pause2';
	timer: number;
	maxX: number;
	maxY: number;
	velX: number;
	velY: number;
}

export function createWanderEngine() {
	const w: WanderState = {
		offX: 0, offY: 0,
		targetX: 0, targetY: 0,
		phase: 'drift', timer: 0,
		maxX: 16, maxY: 8,
		velX: 0, velY: 0,
	};
	let prevX = 0, prevY = 0;

	function pickTarget(): void {
		w.targetX = (Math.random() - 0.5) * 2 * w.maxX;
		w.targetY = (Math.random() - 0.5) * 2 * w.maxY;
	}
	pickTarget();

	function update(dt: number): void {
		prevX = w.offX; prevY = w.offY;
		w.timer += dt;

		if (w.phase === 'drift') {
			const spd = 0.0015;
			w.offX += (w.targetX - w.offX) * spd * dt;
			w.offY += (w.targetY - w.offY) * spd * dt;
			if (w.timer > 1800 + Math.random() * 1200) { w.phase = 'pause'; w.timer = 0; }
		} else if (w.phase === 'pause') {
			if (w.timer > 400 + Math.random() * 600) {
				if (Math.random() < 0.4) { w.targetX = 0; w.targetY = 0; w.phase = 'center'; }
				else { pickTarget(); w.phase = 'drift'; }
				w.timer = 0;
			}
		} else if (w.phase === 'center') {
			const spd = 0.003;
			w.offX += (0 - w.offX) * spd * dt;
			w.offY += (0 - w.offY) * spd * dt;
			if (w.timer > 1200 + Math.random() * 800) { w.phase = 'pause2'; w.timer = 0; }
		} else if (w.phase === 'pause2') {
			if (w.timer > 600 + Math.random() * 1000) { pickTarget(); w.phase = 'drift'; w.timer = 0; }
		}

		if (dt > 0) {
			w.velX = (w.offX - prevX) / dt;
			w.velY = (w.offY - prevY) / dt;
		}
	}

	function returnToCenter(): void {
		w.targetX = 0; w.targetY = 0;
		w.phase = 'center'; w.timer = 0;
	}

	return { w, update, returnToCenter };
}

export function createDilationEngine(wander: ReturnType<typeof createWanderEngine>) {
	let dilation = 1, target = 1;
	const BASE_RX = 44, BASE_RY = 44;
	const CENTER_D = 1.08, WANDER_D = 0.92, SPEED = 0.003;

	function update(dt: number): void {
		const dist = Math.hypot(wander.w.offX, wander.w.offY);
		const maxDist = Math.hypot(wander.w.maxX, wander.w.maxY);
		const centeredness = 1 - clamp(dist / maxDist, 0, 1);
		target = WANDER_D + (CENTER_D - WANDER_D) * centeredness;
		dilation += (target - dilation) * SPEED * dt;
	}

	function getRx(): number { return BASE_RX * dilation; }
	function getRy(): number { return BASE_RY * dilation; }

	return { update, getRx, getRy };
}
