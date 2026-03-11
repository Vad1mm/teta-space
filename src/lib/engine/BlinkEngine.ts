import { lp, clamp, easeInCubic, easeOutQuart, easeOutCubic } from './easing';
import {
	TOP_OPEN_L, TOP_OPEN_R, BOT_OPEN_L, BOT_OPEN_R,
	TOP_SHUT_L, TOP_SHUT_R, BOT_SHUT_L, BOT_SHUT_R,
	IRIS_RX, IRIS_RY, IRIS_BOT
} from './geometry';
import { breathCurve } from './BreathEngine';

export interface EyeState {
	topL: number;
	topR: number;
	botL: number;
	botR: number;
	iRy: number;
	iRx: number;
	iCy: number;
	iOp: number;
}

export interface BlinkState {
	phase: 'idle' | 'closing' | 'shut' | 'opening' | 'settle';
	elapsed: number;
	waitDur: number;
	closeDur: number;
	shutDur: number;
	openDur: number;
	settleDur: number;
	settleAmp: number;
	hapticOnBlink: boolean;
	isPaused: boolean;
	breathPhase: 'in' | 'out' | null;
	onHaptic: (() => void) | null;
}

export function createOpenEyeState(): EyeState {
	return {
		topL: TOP_OPEN_L, topR: TOP_OPEN_R,
		botL: BOT_OPEN_L, botR: BOT_OPEN_R,
		iRy: IRIS_RY, iRx: IRIS_RX, iCy: IRIS_BOT - IRIS_RY, iOp: 1
	};
}

export function createClosedEyeState(): EyeState {
	return {
		topL: TOP_SHUT_L, topR: TOP_SHUT_R,
		botL: BOT_SHUT_L, botR: BOT_SHUT_R,
		iRy: 0.2, iRx: IRIS_RX - 2, iCy: IRIS_BOT - 0.2, iOp: 0
	};
}

export function createBlinkEngine(B: EyeState) {
	const blink: BlinkState = {
		phase: 'idle', elapsed: 0, waitDur: 3000,
		closeDur: 0, shutDur: 0, openDur: 0, settleDur: 0, settleAmp: 0,
		hapticOnBlink: false, isPaused: false,
		breathPhase: null, onHaptic: null,
	};

	function begin(): void {
		blink.phase = 'closing'; blink.elapsed = 0;
		const r = Math.random();
		if (r < 0.25) {
			blink.closeDur = 45 + Math.random() * 20; blink.shutDur = 15 + Math.random() * 20;
			blink.openDur = 130 + Math.random() * 70; blink.settleAmp = 0.5 + Math.random() * 0.8;
		} else if (r < 0.82) {
			blink.closeDur = 65 + Math.random() * 30; blink.shutDur = 30 + Math.random() * 50;
			blink.openDur = 200 + Math.random() * 130; blink.settleAmp = 0.8 + Math.random() * 1.4;
		} else {
			blink.closeDur = 110 + Math.random() * 70; blink.shutDur = 70 + Math.random() * 100;
			blink.openDur = 300 + Math.random() * 200; blink.settleAmp = 1.2 + Math.random() * 1.8;
		}
		blink.settleDur = 180 + Math.random() * 120;
	}

	function next(): void {
		blink.phase = 'idle'; blink.elapsed = 0;
		const r = Math.random();
		if (r < 0.20) blink.waitDur = 70 + Math.random() * 180;
		else if (r < 0.26) blink.waitDur = 30 + Math.random() * 80;
		else if (r < 0.40) blink.waitDur = 900 + Math.random() * 1100;
		else if (r < 0.52) blink.waitDur = 5000 + Math.random() * 4000;
		else blink.waitDur = 2200 + Math.random() * 2800;
	}

	function breathBlink(type: 'soft' | 'wake'): void {
		if (blink.isPaused || blink.phase !== 'idle') return;
		blink.phase = 'closing'; blink.elapsed = 0;
		if (type === 'soft') {
			blink.closeDur = 110 + Math.random() * 30;
			blink.shutDur = 70 + Math.random() * 50;
			blink.openDur = 280 + Math.random() * 120;
			blink.settleAmp = 0.3 + Math.random() * 0.4;
		} else {
			blink.closeDur = 40 + Math.random() * 15;
			blink.shutDur = 12 + Math.random() * 15;
			blink.openDur = 130 + Math.random() * 50;
			blink.settleAmp = 0.7 + Math.random() * 1.0;
		}
		blink.settleDur = 140 + Math.random() * 80;
	}

	function forceClose(dur?: number): void {
		blink.phase = 'closing'; blink.elapsed = 0;
		blink.closeDur = dur || 300; blink.shutDur = 1e9;
		blink.openDur = 400; blink.settleAmp = 0.5; blink.settleDur = 200;
	}

	function forceOpen(dur?: number): void {
		blink.phase = 'opening'; blink.elapsed = 0;
		blink.openDur = dur || 400; blink.settleAmp = 0.6; blink.settleDur = 200;
	}

	function update(dt: number): void {
		blink.elapsed += dt;

		if (blink.phase === 'idle') {
			if (blink.breathPhase === null && blink.elapsed >= blink.waitDur) begin();
			const n = performance.now();
			const br = Math.sin(n * 0.0007) * 0.5 + Math.sin(n * 0.0013) * 0.2;
			const eb = blink.breathPhase !== null ? breathCurve(n) : 0;
			B.topL = TOP_OPEN_L - br * 0.8 - eb * 3;
			B.topR = TOP_OPEN_R - br * 0.7 - eb * 3;
			B.botL = BOT_OPEN_L + br * 0.2 + eb * 1.5;
			B.botR = BOT_OPEN_R + br * 0.15 + eb * 1.5;
			B.iRy = IRIS_RY + br * 0.3; B.iCy = IRIS_BOT - B.iRy;
			B.iRx = IRIS_RX; B.iOp = 1;
			return;
		}

		if (blink.phase === 'closing') {
			const t = clamp(blink.elapsed / blink.closeDur, 0, 1);
			const p = easeInCubic(t), pb = t * 0.12;
			B.topL = lp(TOP_OPEN_L, TOP_SHUT_L, p); B.topR = lp(TOP_OPEN_R, TOP_SHUT_R, p);
			B.botL = lp(BOT_OPEN_L, BOT_SHUT_L, pb); B.botR = lp(BOT_OPEN_R, BOT_SHUT_R, pb);
			B.iRy = lp(IRIS_RY, 0.2, p); B.iCy = IRIS_BOT - B.iRy;
			B.iRx = lp(IRIS_RX, IRIS_RX - 2, p);
			B.iOp = B.iRy > 3 ? 1 : clamp(B.iRy / 3, 0, 1);
			if (blink.elapsed >= blink.closeDur) {
				blink.phase = 'shut'; blink.elapsed = 0;
				if (blink.hapticOnBlink && blink.onHaptic) blink.onHaptic();
			}
			return;
		}

		if (blink.phase === 'shut') {
			B.topL = TOP_SHUT_L; B.topR = TOP_SHUT_R;
			B.botL = lp(BOT_OPEN_L, BOT_SHUT_L, 0.12); B.botR = lp(BOT_OPEN_R, BOT_SHUT_R, 0.12);
			B.iRy = 0.2; B.iCy = IRIS_BOT - 0.2; B.iRx = IRIS_RX - 2; B.iOp = 0;
			if (blink.elapsed >= blink.shutDur) { blink.phase = 'opening'; blink.elapsed = 0; }
			return;
		}

		if (blink.phase === 'opening') {
			const t = clamp(blink.elapsed / blink.openDur, 0, 1);
			const p = easeOutQuart(t), pb = easeOutCubic(t * 0.5);
			const n_ = performance.now();
			const eb = blink.breathPhase !== null ? breathCurve(n_) : 0;
			const tTopL = TOP_OPEN_L - eb * 3, tTopR = TOP_OPEN_R - eb * 3;
			const tBotL = BOT_OPEN_L + eb * 1.5, tBotR = BOT_OPEN_R + eb * 1.5;
			B.topL = lp(TOP_SHUT_L, tTopL, p); B.topR = lp(TOP_SHUT_R, tTopR, p);
			B.botL = lp(lp(BOT_OPEN_L, BOT_SHUT_L, 0.12), tBotL, pb);
			B.botR = lp(lp(BOT_OPEN_R, BOT_SHUT_R, 0.12), tBotR, pb);
			B.iRy = lp(0.2, IRIS_RY, p); B.iCy = IRIS_BOT - B.iRy;
			B.iRx = lp(IRIS_RX - 2, IRIS_RX, p);
			B.iOp = B.iRy > 3 ? 1 : clamp(B.iRy / 3, 0, 1);
			if (blink.elapsed >= blink.openDur) { blink.phase = 'settle'; blink.elapsed = 0; }
			return;
		}

		if (blink.phase === 'settle') {
			const t = clamp(blink.elapsed / blink.settleDur, 0, 1);
			const damp = Math.pow(1 - t, 2.5);
			const osc = Math.sin(t * Math.PI * 3) * blink.settleAmp * damp;
			const n_ = performance.now();
			const eb = blink.breathPhase !== null ? breathCurve(n_) : 0;
			B.topL = TOP_OPEN_L - eb * 3 - osc * 1.2; B.topR = TOP_OPEN_R - eb * 3 - osc * 1.0;
			B.botL = BOT_OPEN_L + eb * 1.5 + osc * 0.2; B.botR = BOT_OPEN_R + eb * 1.5 + osc * 0.15;
			B.iRy = IRIS_RY + osc * 0.4; B.iCy = IRIS_BOT - B.iRy;
			B.iRx = IRIS_RX; B.iOp = 1;
			if (blink.elapsed >= blink.settleDur) next();
		}
	}

	return { blink, update, breathBlink, forceClose, forceOpen };
}
