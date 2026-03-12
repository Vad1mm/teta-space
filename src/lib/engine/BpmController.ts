import { clamp } from './easing';

const DEFAULT_START_BPM = 65;
const END_BPM = 35;
const ACTIVITY_BOOST = 60;    // strong — every movement felt
const ALPHA_UP = 0.010;       // ~1-2s to feel, ~4s to peak — instant feedback
const ALPHA_DOWN = 0.0012;    // ~15-20s to calm back down

export interface BpmState {
	startBPM: number;
	currentBPM: number;
}

export function createBpmController() {
	const state: BpmState = {
		startBPM: DEFAULT_START_BPM,
		currentBPM: DEFAULT_START_BPM,
	};

	function setStartBPM(bpm: number): void {
		state.startBPM = clamp(Math.round(bpm), 65, 85);
		state.currentBPM = state.startBPM;
	}

	function update(effectiveActivity: number): void {
		// Pure sensor-driven: target is always 35 + activity boost
		// No time curve — movement speeds up, stillness calms down
		const target = END_BPM + effectiveActivity * ACTIVITY_BOOST;

		// Asymmetric EMA: fast up (feel every move), slow down (gradual calm)
		const alpha = target > state.currentBPM ? ALPHA_UP : ALPHA_DOWN;
		state.currentBPM += alpha * (target - state.currentBPM);
		state.currentBPM = clamp(state.currentBPM, 30, 100);
	}

	/** Normalized intensity: 0 at 35 BPM, 1 at 85+ BPM */
	function intensity(): number {
		return clamp((state.currentBPM - END_BPM) / (85 - END_BPM), 0, 1);
	}

	function reset(): void {
		state.startBPM = DEFAULT_START_BPM;
		state.currentBPM = DEFAULT_START_BPM;
	}

	return { state, update, setStartBPM, intensity, reset };
}
