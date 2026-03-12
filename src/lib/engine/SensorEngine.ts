/**
 * SensorEngine.ts — Full sensor-fusion pipeline.
 * Ported from sensor-pulse.html: gravity filter, spectral analysis,
 * adaptive baseline, 5-state classification, multi-model pulse, confidence.
 */

import { clamp } from './easing';
import {
	clamp01, softStep, mean, variance, std, rms,
	trimTimedBuffer, resampleTimedSeries, analyzeSpectralBand,
	estimateObservedRate,
} from './signal';

// ── Constants ───────────────────────────────────────────────

const SAMPLE_RATE = 20;
const WINDOW_SEC = 5;
const STATE_HOLD_MS = 3200;
const EMA_ALPHA = 0.12;
const GRAVITY_TAU = 0.85;
const CALIBRATION_MS = 12000;

// ── Interfaces ──────────────────────────────────────────────

interface AccSample {
	x: number; y: number; z: number;
	lx: number; ly: number; lz: number;
	linMag: number; jerkMag?: number;
	t: number;
}

interface GyroSample {
	x: number; y: number; z: number;
	mag: number; t: number;
}

interface TouchSample {
	t: number;
	type: 'start' | 'move' | 'end';
	force: number;
	x: number; y: number;
}

export interface SensorFeatures {
	motionRMS: number; motionStd: number; jerk: number;
	gyroRMS: number; gyroStd: number;
	tremorBandPower: number; tremorPeakHz: number; tremorSharpness: number; tremorIndex: number;
	walkBandPower: number; walkPeakHz: number; walkSharpness: number; walkRhythm: number;
	touchRate: number; touchBurst: number; touchMoveRate: number; touchHesitation: number;
}

export interface SensorScores {
	motion: number; jerk: number; rotation: number; touch: number; tremor: number;
	activity: number; arousal: number; rhythm: number;
}

interface SensorBaseline {
	startedAt: number; progress: number; ready: boolean;
	motion: number; jerk: number; rotation: number; tremor: number; touch: number;
}

export type SensorStateName = 'rest' | 'walking' | 'active' | 'rush' | 'tense';

export interface StateWeights {
	rest: number; walking: number; active: number; rush: number; tense: number;
	[key: string]: number;
}

interface PulseModel {
	mode: string;
	activityPulse: number; arousalPulse: number;
	locomotionPulse: number; statePulse: number; finalPulse: number;
}

interface ConfidenceLayers {
	sensor: number; signal: number; classification: number;
}

export interface SensorState {
	features: SensorFeatures;
	scores: SensorScores;
	baseline: SensorBaseline;
	weights: StateWeights;
	currentState: SensorStateName;
	confidence: number;
	confidenceLayers: ConfidenceLayers;
	pulseModel: PulseModel;
	smoothBPM: number;
	// Legacy-compatible fields
	activityLevel: number;
	baselineActivity: number;
	calibrated: boolean;
	available: boolean;
	spikeCount: number;
	inSpike: boolean;
}

// ── Factory ─────────────────────────────────────────────────

export function createSensorEngine() {
	// ── Internal buffers ──
	let accSamples: AccSample[] = [];
	let gyroSamples: GyroSample[] = [];
	let touchEvents: TouchSample[] = [];
	let listening = false;
	let computeTimer: ReturnType<typeof setInterval> | null = null;

	// Gravity filter state
	const gravity = { x: 0, y: 0, z: 9.81, ready: false, lastTime: 0 };
	let prevLinear: { x: number; y: number; z: number } | null = null;
	let prevLinearTime = 0;

	// State transition timing
	let stateStartTime = 0;

	// ── State ──
	const state: SensorState = {
		features: {
			motionRMS: 0, motionStd: 0, jerk: 0,
			gyroRMS: 0, gyroStd: 0,
			tremorBandPower: 0, tremorPeakHz: 0, tremorSharpness: 0, tremorIndex: 0,
			walkBandPower: 0, walkPeakHz: 0, walkSharpness: 0, walkRhythm: 0,
			touchRate: 0, touchBurst: 0, touchMoveRate: 0, touchHesitation: 0,
		},
		scores: { motion: 0, jerk: 0, rotation: 0, touch: 0, tremor: 0, activity: 0, arousal: 0, rhythm: 0 },
		baseline: {
			startedAt: 0, progress: 0, ready: false,
			motion: 0.08, jerk: 1.8, rotation: 4.0, tremor: 0.04, touch: 0.10,
		},
		weights: { rest: 1, walking: 0, active: 0, rush: 0, tense: 0 },
		currentState: 'rest',
		confidence: 0,
		confidenceLayers: { sensor: 0, signal: 0, classification: 0 },
		pulseModel: {
			mode: 'calibrating',
			activityPulse: 60, arousalPulse: 60,
			locomotionPulse: 60, statePulse: 60, finalPulse: 60,
		},
		smoothBPM: 0,
		// Legacy compat
		activityLevel: 0, baselineActivity: 0,
		calibrated: false, available: false,
		spikeCount: 0, inSpike: false,
	};

	// ── DeviceMotion handler ──

	function onDeviceMotion(event: DeviceMotionEvent): void {
		const now = performance.now();
		const cutoff = now - WINDOW_SEC * 1000;
		const rawAcc = event.accelerationIncludingGravity || event.acceleration;
		const linearAcc = event.acceleration;
		const rot = event.rotationRate;

		if (rawAcc) {
			const x = rawAcc.x || 0;
			const y = rawAcc.y || 0;
			const z = rawAcc.z || 0;

			// Gravity filter (EMA)
			const dtG = gravity.lastTime > 0
				? clamp((now - gravity.lastTime) / 1000, 0.01, 0.20)
				: 1 / SAMPLE_RATE;

			if (!gravity.ready) {
				gravity.x = x; gravity.y = y; gravity.z = z;
				gravity.ready = true;
			} else {
				const alphaG = 1 - Math.exp(-dtG / GRAVITY_TAU);
				gravity.x += alphaG * (x - gravity.x);
				gravity.y += alphaG * (y - gravity.y);
				gravity.z += alphaG * (z - gravity.z);
			}
			gravity.lastTime = now;

			// Linear acceleration (remove gravity)
			let lx = x - gravity.x;
			let ly = y - gravity.y;
			let lz = z - gravity.z;

			// Prefer device-provided linear if available
			if (event.accelerationIncludingGravity && linearAcc) {
				lx = linearAcc.x ?? lx;
				ly = linearAcc.y ?? ly;
				lz = linearAcc.z ?? lz;
			}

			const linMag = Math.sqrt(lx * lx + ly * ly + lz * lz);
			const sample: AccSample = { x, y, z, lx, ly, lz, linMag, t: now };

			// Jerk (derivative of linear acc)
			if (prevLinear) {
				const dt = (now - prevLinearTime) / 1000;
				if (dt > 0 && dt < 0.25) {
					const jx = (lx - prevLinear.x) / dt;
					const jy = (ly - prevLinear.y) / dt;
					const jz = (lz - prevLinear.z) / dt;
					sample.jerkMag = Math.sqrt(jx * jx + jy * jy + jz * jz);
				}
			}
			prevLinear = { x: lx, y: ly, z: lz };
			prevLinearTime = now;

			accSamples.push(sample);
			trimTimedBuffer(accSamples, cutoff);
		}

		if (rot) {
			const gx = rot.alpha || 0;
			const gy = rot.beta || 0;
			const gz = rot.gamma || 0;
			const gMag = Math.sqrt(gx * gx + gy * gy + gz * gz);
			gyroSamples.push({ x: gx, y: gy, z: gz, mag: gMag, t: now });
			trimTimedBuffer(gyroSamples, cutoff);
		}
	}

	// ── Touch handlers ──

	function pushTouch(ev: TouchSample): void {
		touchEvents.push(ev);
		trimTimedBuffer(touchEvents, ev.t - WINDOW_SEC * 1000);
	}

	function onTouchStart(event: TouchEvent): void {
		const now = performance.now();
		for (let i = 0; i < event.changedTouches.length; i++) {
			const t = event.changedTouches[i];
			pushTouch({ t: now, type: 'start', force: t.force || 0, x: t.clientX, y: t.clientY });
		}
	}

	function onTouchMove(event: TouchEvent): void {
		const now = performance.now();
		for (let i = 0; i < event.changedTouches.length; i++) {
			const t = event.changedTouches[i];
			pushTouch({ t: now, type: 'move', force: t.force || 0, x: t.clientX, y: t.clientY });
		}
	}

	function onTouchEnd(event: TouchEvent): void {
		const now = performance.now();
		for (let i = 0; i < event.changedTouches.length; i++) {
			const t = event.changedTouches[i];
			pushTouch({ t: now, type: 'end', force: t.force || 0, x: t.clientX, y: t.clientY });
		}
	}

	function onPointerDown(event: PointerEvent): void {
		if (event.pointerType !== 'mouse') return;
		pushTouch({ t: performance.now(), type: 'start', force: 0.5, x: event.clientX, y: event.clientY });
	}

	// ── Feature extraction ──

	function extractFeatures(): void {
		const f = state.features;
		const now = performance.now();

		// Motion + jerk
		if (accSamples.length > 8) {
			const linearMags = accSamples.map(s => s.linMag);
			f.motionRMS = rms(linearMags);
			f.motionStd = std(linearMags);
			const jerks = accSamples.filter(s => s.jerkMag !== undefined).map(s => s.jerkMag!);
			f.jerk = jerks.length ? mean(jerks) : 0;
		} else {
			f.motionRMS = 0; f.motionStd = 0; f.jerk = 0;
		}

		// Gyro
		if (gyroSamples.length > 8) {
			const gMags = gyroSamples.map(s => s.mag);
			f.gyroRMS = rms(gMags);
			f.gyroStd = std(gMags);
		} else {
			f.gyroRMS = 0; f.gyroStd = 0;
		}

		// Tremor band (3-12 Hz) — spectral on best gyro axis
		if (gyroSamples.length > 16) {
			let bestValues: number[] = [];
			let bestRate = SAMPLE_RATE;
			let bestVar = -1;

			for (const axis of ['x', 'y', 'z'] as const) {
				const series = resampleTimedSeries(gyroSamples, s => s[axis]);
				const v = variance(series.values);
				if (series.values.length && v > bestVar) {
					bestValues = series.values;
					bestRate = series.sampleRate;
					bestVar = v;
				}
			}

			const spec = analyzeSpectralBand(bestValues, bestRate, 3, 12);
			f.tremorBandPower = spec.bandPower;
			f.tremorPeakHz = spec.peakHz;
			f.tremorSharpness = spec.sharpness;
			f.tremorIndex = clamp01(
				clamp01((spec.bandPower - 0.15) / 0.90) * 0.65 +
				clamp01((spec.sharpness - 1.15) / 3.4) * 0.35
			);
		} else {
			f.tremorBandPower = 0; f.tremorPeakHz = 0;
			f.tremorSharpness = 0; f.tremorIndex = 0;
		}

		// Walk band (0.9-3.2 Hz) — spectral on acc linMag
		if (accSamples.length > 16) {
			const walkSeries = resampleTimedSeries(accSamples, s => s.linMag);
			const spec = analyzeSpectralBand(walkSeries.values, walkSeries.sampleRate, 0.9, 3.2);
			f.walkBandPower = spec.bandPower;
			f.walkPeakHz = spec.peakHz;
			f.walkSharpness = spec.sharpness;
			f.walkRhythm = clamp01(
				clamp01((spec.bandPower - 0.18) / 0.95) * 0.60 +
				clamp01((spec.sharpness - 1.05) / 2.4) * 0.40
			);
		} else {
			f.walkBandPower = 0; f.walkPeakHz = 0;
			f.walkSharpness = 0; f.walkRhythm = 0;
		}

		// Touch features
		const recentTouches = touchEvents.filter(e => e.t > now - WINDOW_SEC * 1000);
		const starts = recentTouches.filter(e => e.type === 'start');
		const moves = recentTouches.filter(e => e.type === 'move');

		f.touchRate = starts.length / WINDOW_SEC;
		f.touchMoveRate = moves.length / WINDOW_SEC;

		// Touch burst (max starts in any 1s window)
		let maxBurst = 0;
		for (let i = 0; i < starts.length; i++) {
			const windowEnd = starts[i].t + 1000;
			let count = 0;
			for (let j = i; j < starts.length; j++) {
				if (starts[j].t <= windowEnd) count++; else break;
			}
			maxBurst = Math.max(maxBurst, count);
		}
		f.touchBurst = maxBurst;

		// Touch hesitation (irregularity of tap intervals)
		if (starts.length >= 3) {
			const intervals: number[] = [];
			for (let i = 1; i < starts.length; i++) {
				intervals.push((starts[i].t - starts[i - 1].t) / 1000);
			}
			const avgInterval = mean(intervals);
			f.touchHesitation = avgInterval > 0 ? clamp01(std(intervals, avgInterval) / avgInterval) : 0;
		} else {
			f.touchHesitation = 0;
		}
	}

	// ── Adaptive baseline ──

	function updateBaseline(): void {
		const bl = state.baseline;
		const f = state.features;
		const now = performance.now();

		if (!bl.startedAt) bl.startedAt = now;
		bl.progress = clamp01((now - bl.startedAt) / CALIBRATION_MS);

		const alpha = bl.ready ? 0.02 : 0.08;
		bl.motion = softStep(bl.motion, clamp(f.motionRMS, 0, 1.6), alpha);
		bl.jerk = softStep(bl.jerk, clamp(f.jerk, 0, 25), alpha);
		bl.rotation = softStep(bl.rotation, clamp(f.gyroRMS, 0, 40), alpha);
		bl.tremor = softStep(bl.tremor, clamp(f.tremorBandPower, 0, 0.8), alpha * 0.7);
		bl.touch = softStep(
			bl.touch,
			clamp(f.touchRate + f.touchMoveRate * 0.20 + f.touchBurst * 0.08, 0, 2.5),
			alpha * 0.8
		);

		if (!bl.ready && now - bl.startedAt > CALIBRATION_MS) {
			bl.ready = true;
		}
	}

	// ── Score computation ──

	function computeScores(): void {
		const f = state.features;
		const s = state.scores;
		const bl = state.baseline;

		s.motion = clamp01((f.motionRMS - bl.motion * 0.80) / Math.max(0.18, bl.motion * 2.6 + 0.30));
		s.jerk = clamp01((f.jerk - bl.jerk * 0.85) / Math.max(4, bl.jerk * 3.0 + 8));
		s.rotation = clamp01((f.gyroRMS - bl.rotation * 0.85) / Math.max(8, bl.rotation * 2.8 + 16));

		const touchComposite = f.touchRate * 0.60 + f.touchBurst * 0.16 + f.touchMoveRate * 0.22 + f.touchHesitation * 0.45;
		s.touch = clamp01((touchComposite - bl.touch * 0.75) / Math.max(0.35, bl.touch * 1.9 + 1.2));

		const tremorPower = clamp01((f.tremorBandPower - bl.tremor * 0.80) / Math.max(0.12, bl.tremor * 3.2 + 0.25));
		const tremorSharp = clamp01((f.tremorSharpness - 1.10) / 3.4);
		s.tremor = clamp01(tremorPower * 0.65 + tremorSharp * 0.35);

		// Composites
		s.activity = clamp01(0.46 * s.motion + 0.26 * s.jerk + 0.20 * s.rotation + 0.08 * s.touch);
		s.arousal = clamp01(0.35 * s.tremor + 0.24 * s.touch + 0.21 * s.rotation + 0.20 * s.jerk);
		s.rhythm = f.walkRhythm;

		// Legacy compat
		state.activityLevel = s.activity;
		state.baselineActivity = 0; // baseline now built into scores
	}

	// ── State classification ──

	function classifyState(): void {
		const s = state.scores;
		const f = state.features;

		const rawW = {
			rest: clamp01(1.18 - 0.98 * s.activity - 0.84 * s.arousal),
			walking: clamp01(0.15 + 0.88 * s.rhythm + 0.56 * s.motion + 0.10 * s.rotation - 0.28 * s.touch - 0.26 * s.tremor),
			active: clamp01(0.22 + 0.84 * s.activity + 0.18 * s.rotation - 0.12 * s.rhythm - 0.06 * s.tremor),
			rush: clamp01(0.10 + 0.80 * s.activity + 0.54 * s.arousal + 0.18 * s.jerk + (f.walkPeakHz > 2.2 ? 0.08 : 0)),
			tense: clamp01(0.16 + 0.80 * s.arousal + 0.18 * (1 - s.motion) + 0.16 * s.touch + 0.12 * s.tremor),
		};

		// Softmax
		let sum = 0;
		const soft: Record<string, number> = {};
		for (const [key, val] of Object.entries(rawW)) {
			const score = Math.exp(val * 3.2);
			soft[key] = score;
			sum += score;
		}
		for (const key of Object.keys(soft)) {
			state.weights[key] = sum > 0 ? soft[key] / sum : 0;
		}

		// Ordered by weight
		const ordered = Object.entries(state.weights)
			.sort((a, b) => b[1] - a[1]) as [SensorStateName, number][];

		updateConfidence(ordered);

		// State transition with hysteresis
		const nextState = ordered[0][0];
		const nextWeight = ordered[0][1];
		const currentWeight = state.weights[state.currentState] || 0;
		const now = performance.now();

		if (nextState !== state.currentState) {
			const canSwitch = now - stateStartTime > STATE_HOLD_MS;
			const margin = nextWeight - currentWeight;
			if (canSwitch && (margin > 0.08 || nextWeight > 0.46)) {
				state.currentState = nextState;
				stateStartTime = now;
			}
		}
	}

	// ── Confidence ──

	function updateConfidence(ordered: [SensorStateName, number][]): void {
		const cl = state.confidenceLayers;

		cl.sensor = clamp01(
			0.50 * clamp01(estimateObservedRate(accSamples) / 14) +
			0.35 * clamp01(estimateObservedRate(gyroSamples) / 10) +
			0.15 * clamp01(touchEvents.length / 6)
		);

		cl.signal = clamp01(
			0.40 * clamp01((Math.max(state.features.walkSharpness, state.features.tremorSharpness) - 1) / 3.2) +
			0.35 * clamp01(1 - state.features.motionStd / 2.5) +
			0.25 * clamp01(1 - state.features.touchHesitation)
		);

		const topWeight = ordered[0]?.[1] || 0;
		const secondWeight = ordered[1]?.[1] || 0;
		cl.classification = clamp01((topWeight - secondWeight) * 4.5);

		state.confidence = clamp01(0.38 * cl.sensor + 0.27 * cl.signal + 0.35 * cl.classification);
	}

	// ── Multi-model pulse estimation ──

	function estimatePulse(): void {
		const f = state.features;
		const s = state.scores;
		const w = state.weights;
		const m = state.pulseModel;

		m.mode = !state.baseline.ready ? 'calibrating'
			: state.confidenceLayers.sensor < 0.25 ? 'lowdata'
			: 'tracking';

		const restingBase = 56 + clamp01((state.baseline.touch - 0.10) / 0.50) * 4;
		m.activityPulse = restingBase + s.activity * 34 + s.jerk * 8 + s.rotation * 5;
		m.arousalPulse = 60 + s.arousal * 24 + s.tremor * 11 + s.touch * 6;
		m.locomotionPulse = f.walkPeakHz > 0
			? 60 + f.walkPeakHz * 16 + s.motion * 10 + s.rotation * 4
			: restingBase + s.motion * 12;

		// State-weighted pulse anchors
		const anchors = {
			rest: 56 + s.arousal * 5,
			walking: 66 + f.walkPeakHz * 16 + s.motion * 9,
			active: 74 + s.activity * 16 + s.rotation * 4,
			rush: 88 + s.activity * 16 + s.arousal * 10,
			tense: 66 + s.arousal * 14 + s.tremor * 8 + s.touch * 4,
		};

		m.statePulse =
			w.rest * anchors.rest +
			w.walking * anchors.walking +
			w.active * anchors.active +
			w.rush * anchors.rush +
			w.tense * anchors.tense;

		let fusedPulse =
			0.42 * m.statePulse +
			0.30 * m.activityPulse +
			0.18 * m.arousalPulse +
			0.10 * m.locomotionPulse;

		// Walking boost: give more weight to locomotion model
		if (w.walking > 0.35) {
			fusedPulse = 0.34 * m.statePulse + 0.22 * m.activityPulse + 0.14 * m.arousalPulse + 0.30 * m.locomotionPulse;
		}

		const confidenceBias = clamp01(0.25 + state.confidence * 0.75);
		m.finalPulse = clamp(Math.round(fusedPulse * confidenceBias + 62 * (1 - confidenceBias)), 46, 158);

		// Smooth BPM
		const alpha = 0.05 + state.confidence * EMA_ALPHA;
		state.smoothBPM = state.smoothBPM === 0
			? m.finalPulse
			: softStep(state.smoothBPM, m.finalPulse, alpha);
	}

	// ── Compute loop (called at 4Hz) ──

	function computeLoop(): void {
		extractFeatures();
		updateBaseline();
		computeScores();
		classifyState();
		estimatePulse();

		// Legacy: spike detection
		if (state.scores.activity > 0.25 && !state.inSpike) {
			state.inSpike = true;
			state.spikeCount++;
		} else if (state.scores.activity < 0.15) {
			state.inSpike = false;
		}
	}

	// ── Public API ──

	async function requestPermission(): Promise<boolean> {
		if (typeof DeviceMotionEvent !== 'undefined' &&
			typeof (DeviceMotionEvent as any).requestPermission === 'function') {
			try {
				const perm = await (DeviceMotionEvent as any).requestPermission();
				return perm === 'granted';
			} catch (_) { return false; }
		}
		return typeof DeviceMotionEvent !== 'undefined';
	}

	function startListening(): void {
		if (listening) return;
		listening = true;
		state.available = typeof DeviceMotionEvent !== 'undefined';
		stateStartTime = performance.now();

		window.addEventListener('devicemotion', onDeviceMotion as any, { passive: true });
		document.addEventListener('touchstart', onTouchStart as any, { passive: true });
		document.addEventListener('touchmove', onTouchMove as any, { passive: true });
		document.addEventListener('touchend', onTouchEnd as any, { passive: true });
		document.addEventListener('pointerdown', onPointerDown as any, { passive: true });

		// Compute at 4Hz
		computeTimer = setInterval(computeLoop, 250);
	}

	function stopListening(): void {
		if (!listening) return;
		listening = false;
		window.removeEventListener('devicemotion', onDeviceMotion as any);
		document.removeEventListener('touchstart', onTouchStart as any);
		document.removeEventListener('touchmove', onTouchMove as any);
		document.removeEventListener('touchend', onTouchEnd as any);
		document.removeEventListener('pointerdown', onPointerDown as any);
		if (computeTimer) { clearInterval(computeTimer); computeTimer = null; }
	}

	function calibrate(): void {
		state.baseline.ready = true;
		state.calibrated = true;
	}

	function effectiveActivity(): number {
		if (!state.available) return 0;
		return state.scores.activity;
	}

	function arousalLevel(): number {
		return state.scores.arousal;
	}

	function predictedBPM(): number {
		// Multi-model pulse estimate — realistic BPM prediction
		return state.smoothBPM > 0 ? state.smoothBPM : state.pulseModel.finalPulse;
	}

	function update(_dt: number): void {
		// No-op: compute loop runs on its own 4Hz interval.
		// Kept for API compatibility.
	}

	function reset(): void {
		accSamples = [];
		gyroSamples = [];
		touchEvents = [];
		prevLinear = null;
		prevLinearTime = 0;
		gravity.ready = false;
		gravity.lastTime = 0;
		stateStartTime = 0;

		// Reset features
		const f = state.features;
		f.motionRMS = 0; f.motionStd = 0; f.jerk = 0;
		f.gyroRMS = 0; f.gyroStd = 0;
		f.tremorBandPower = 0; f.tremorPeakHz = 0; f.tremorSharpness = 0; f.tremorIndex = 0;
		f.walkBandPower = 0; f.walkPeakHz = 0; f.walkSharpness = 0; f.walkRhythm = 0;
		f.touchRate = 0; f.touchBurst = 0; f.touchMoveRate = 0; f.touchHesitation = 0;

		// Reset scores
		const s = state.scores;
		s.motion = 0; s.jerk = 0; s.rotation = 0; s.touch = 0; s.tremor = 0;
		s.activity = 0; s.arousal = 0; s.rhythm = 0;

		// Reset baseline
		state.baseline.startedAt = 0; state.baseline.progress = 0; state.baseline.ready = false;
		state.baseline.motion = 0.08; state.baseline.jerk = 1.8; state.baseline.rotation = 4.0;
		state.baseline.tremor = 0.04; state.baseline.touch = 0.10;

		// Reset weights/state
		state.weights.rest = 1; state.weights.walking = 0; state.weights.active = 0;
		state.weights.rush = 0; state.weights.tense = 0;
		state.currentState = 'rest';
		state.confidence = 0;
		state.confidenceLayers.sensor = 0; state.confidenceLayers.signal = 0; state.confidenceLayers.classification = 0;

		// Reset pulse model
		state.pulseModel.mode = 'calibrating';
		state.pulseModel.activityPulse = 60; state.pulseModel.arousalPulse = 60;
		state.pulseModel.locomotionPulse = 60; state.pulseModel.statePulse = 60;
		state.pulseModel.finalPulse = 60;
		state.smoothBPM = 0;

		// Legacy
		state.activityLevel = 0; state.baselineActivity = 0;
		state.calibrated = false; state.spikeCount = 0; state.inSpike = false;
	}

	return {
		state, update,
		requestPermission, startListening, stopListening,
		calibrate, effectiveActivity, arousalLevel, predictedBPM,
		reset,
	};
}
