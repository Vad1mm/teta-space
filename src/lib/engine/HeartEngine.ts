import { clamp } from './easing';
import { hapticMedium, hapticLight } from './HapticEngine';

const HR_START = 54;
const HR_SETTLE = 50;
const HR_SETTLE_DUR = 40000;
const HR_AMP = 5;
const S1_DUR = 70;
const S1_S2_GAP = 200;
const S2_DUR = 38;
const AFTERGLOW_DUR = 300;

function jit(r: number): number {
	return (Math.random() * 2 - 1) * r;
}

export interface HeartState {
	heartT: number;
	cycleLen: number;
	s1Fired: boolean;
	s2Fired: boolean;
	beatVal: number;
	sessionStart: number | null;
	hapticEnabled: boolean;
	hapticOnly: boolean;
	jGap: number;
	jS1: number;
	jS2: number;
	jS1Dur: number;
	jS2Dur: number;
	externalHR: number | null;
}

export function createHeartEngine() {
	const state: HeartState = {
		heartT: 0, cycleLen: 60000 / HR_START,
		s1Fired: false, s2Fired: false, beatVal: 0,
		sessionStart: null, hapticEnabled: false, hapticOnly: false, externalHR: null,
		jGap: S1_S2_GAP, jS1: 1.0, jS2: 0.62,
		jS1Dur: S1_DUR, jS2Dur: S2_DUR,
	};

	function newBeat(hr: number): void {
		state.cycleLen = 60000 / clamp(hr, 5, 100) + jit(15);
		state.jGap = S1_S2_GAP + jit(12);
		state.jS1 = 1.0 + jit(0.03);
		state.jS2 = 0.62 + jit(0.06);
		state.jS1Dur = S1_DUR + jit(5);
		state.jS2Dur = S2_DUR + jit(4);
	}

	function s1Shape(ms: number): number {
		const attack = state.jS1Dur * 0.25, sustain = state.jS1Dur * 0.15, decay = state.jS1Dur * 0.60;
		if (ms < attack) return Math.pow(ms / attack, 0.7) * state.jS1;
		if (ms < attack + sustain) return state.jS1;
		return Math.cos((ms - attack - sustain) / decay * Math.PI * 0.5) * state.jS1;
	}

	function s2Shape(ms: number): number {
		const half = state.jS2Dur / 2;
		if (ms < half) return Math.sin(ms / half * Math.PI * 0.5) * state.jS2;
		return Math.cos((ms - half) / half * Math.PI * 0.5) * state.jS2;
	}

	function tetaBeat(ms: number): number {
		if (ms < state.jS1Dur) return s1Shape(ms);
		const s2Start = state.jS1Dur + state.jGap;
		if (ms < s2Start) return 0;
		const s2End = s2Start + state.jS2Dur;
		if (ms < s2End) return s2Shape(ms - s2Start);
		const rest = ms - s2End;
		if (rest < AFTERGLOW_DUR) return Math.pow(1 - rest / AFTERGLOW_DUR, 2.5) * 0.06;
		return 0;
	}

	function getSessionHR(now: number): number {
		if (!state.sessionStart) state.sessionStart = now;
		const elapsed = now - state.sessionStart;
		const t = clamp(elapsed / HR_SETTLE_DUR, 0, 1);
		return HR_START + (HR_SETTLE - HR_START) * (1 - Math.pow(1 - t, 2.5));
	}

	function update(dt: number, breath: number, now: number): void {
		const baseHR = state.externalHR ?? getSessionHR(now);
		const hr = baseHR + (breath * 2 - 1) * HR_AMP;
		state.heartT += dt;
		if (state.heartT >= state.cycleLen) {
			state.heartT -= state.cycleLen;
			state.s1Fired = false;
			state.s2Fired = false;
			newBeat(hr);
		}
		state.beatVal = state.hapticOnly ? 0 : tetaBeat(state.heartT);

		if (state.hapticEnabled || state.hapticOnly) {
			if (state.heartT < state.jS1Dur && !state.s1Fired) { hapticMedium(); state.s1Fired = true; }
			const s2Start = state.jS1Dur + state.jGap;
			if (state.heartT >= s2Start && state.heartT < s2Start + state.jS2Dur && !state.s2Fired) {
				hapticLight(); state.s2Fired = true;
			}
		}
	}

	function reset(): void {
		state.heartT = 0; state.cycleLen = 60000 / HR_START;
		state.s1Fired = false; state.s2Fired = false; state.beatVal = 0;
		state.sessionStart = null; state.hapticEnabled = false; state.hapticOnly = false; state.externalHR = null;
		newBeat(HR_START);
	}

	newBeat(HR_START);

	return { state, update, reset };
}
