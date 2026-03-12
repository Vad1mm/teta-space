import { clamp } from './easing';

// ── Contemplative gaze engine ──
// Eye is mostly still. Rare, smooth repositions.
// No tremor, no micro-saccades — calm, living gaze.
//
// Phases:
//  • gaze  — still, looking at one point (2-6s)
//  • glide — smooth slow move to new point (1-3s)

export interface WanderState {
	offX: number;
	offY: number;
	targetX: number;
	targetY: number;
	phase: 'gaze' | 'glide' | 'fixate' | 'drift' | 'saccade' | 'settle' | 'pause';
	timer: number;
	maxX: number;
	maxY: number;
	velX: number;
	velY: number;
	externalTarget: boolean;
	lerpSpeed: number;
}

export function createWanderEngine() {
	const w: WanderState = {
		offX: 0, offY: 0,
		targetX: 0, targetY: 0,
		phase: 'gaze', timer: 0,
		maxX: 16, maxY: 8,
		velX: 0, velY: 0,
		externalTarget: false,
		lerpSpeed: 0.0015,
	};

	let prevX = 0, prevY = 0;
	let gazeDur = 3000 + Math.random() * 3000;
	let glideSpeed = 0;

	/** Pick where to look next — center-biased, horizontal-dominant */
	function pickTarget(): void {
		const r = Math.random();
		let range: number;
		if (r < 0.4) range = 0.15 + Math.random() * 0.25;       // near center (most common)
		else if (r < 0.75) range = 0.35 + Math.random() * 0.3;   // mid
		else range = 0.6 + Math.random() * 0.35;                  // far glance (rare)

		const angle = Math.random() * Math.PI * 2;
		w.targetX = clamp(Math.cos(angle) * w.maxX * range, -w.maxX, w.maxX);
		w.targetY = clamp(Math.sin(angle) * w.maxY * range * 0.65, -w.maxY, w.maxY);
	}

	function pickGazeDur(): number {
		const r = Math.random();
		if (r < 0.3) return 2000 + Math.random() * 1500;   // short look
		if (r < 0.7) return 3500 + Math.random() * 3000;   // medium contemplation
		return 6000 + Math.random() * 4000;                 // long stare
	}

	function startGlide(): void {
		pickTarget();
		const dist = Math.hypot(w.targetX - w.offX, w.targetY - w.offY);
		// Smooth glide: speed depends on distance — far moves take longer but not linearly
		glideSpeed = 0.0012 + dist * 0.00015;
		w.phase = 'glide';
		w.timer = 0;
	}

	function setTarget(x: number, y: number, speed: number): void {
		w.targetX = x;
		w.targetY = y;
		w.lerpSpeed = speed;
		w.externalTarget = true;
	}

	function update(dt: number): void {
		prevX = w.offX; prevY = w.offY;
		w.timer += dt;

		if (w.externalTarget) {
			// Attention-driven: smooth follow, no tremor
			const f = Math.min(1, w.lerpSpeed * dt);
			w.offX += (w.targetX - w.offX) * f;
			w.offY += (w.targetY - w.offY) * f;
		} else if (w.phase === 'gaze') {
			// Perfectly still — just holding position
			if (w.timer >= gazeDur) {
				startGlide();
			}
		} else if (w.phase === 'glide') {
			// Smooth ease-in-out movement toward target
			const dist = Math.hypot(w.targetX - w.offX, w.targetY - w.offY);

			if (dist < 0.3) {
				// Arrived — start new gaze
				w.offX = w.targetX;
				w.offY = w.targetY;
				w.phase = 'gaze';
				w.timer = 0;
				gazeDur = pickGazeDur();
			} else {
				// Ease: faster in middle of movement, slower at start/end
				const dx = w.targetX - w.offX;
				const dy = w.targetY - w.offY;
				// Approach factor: accelerates then decelerates
				const f = Math.min(1, glideSpeed * dt);
				w.offX += dx * f;
				w.offY += dy * f;
			}
		} else {
			// Legacy phases — redirect to gaze
			w.phase = 'gaze';
			w.timer = 0;
			gazeDur = pickGazeDur();
		}

		// Clamp
		w.offX = clamp(w.offX, -w.maxX, w.maxX);
		w.offY = clamp(w.offY, -w.maxY, w.maxY);

		// Velocity
		if (dt > 0) {
			w.velX = (w.offX - prevX) / dt;
			w.velY = (w.offY - prevY) / dt;
		}
	}

	function returnToCenter(): void {
		w.targetX = 0; w.targetY = 0;
		glideSpeed = 0.003;
		w.phase = 'glide';
		w.timer = 0;
	}

	return { w, update, returnToCenter, setTarget };
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
		dilation += (target - dilation) * Math.min(1, SPEED * dt);
	}

	function getRx(): number { return BASE_RX * dilation; }
	function getRy(): number { return BASE_RY * dilation; }

	return { update, getRx, getRy };
}
