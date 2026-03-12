/**
 * signal.ts — Pure math utilities for sensor signal processing.
 * Ported from sensor-pulse.html. No side effects, no DOM.
 */

import { clamp } from './easing';

// ── Basic stats ─────────────────────────────────────────────

export function clamp01(v: number): number {
	return clamp(v, 0, 1);
}

export function softStep(current: number, target: number, alpha: number): number {
	return current + alpha * (target - current);
}

export function mean(values: number[]): number {
	if (!values.length) return 0;
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function variance(values: number[], avg?: number): number {
	if (!values.length) return 0;
	const m = avg ?? mean(values);
	return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
}

export function std(values: number[], avg?: number): number {
	return Math.sqrt(variance(values, avg));
}

export function rms(values: number[]): number {
	if (!values.length) return 0;
	return Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);
}

// ── Timed buffer helpers ────────────────────────────────────

export function trimTimedBuffer<T extends { t: number }>(list: T[], cutoff: number): void {
	// Find first element that's within the window (binary-ish scan)
	let drop = 0;
	while (drop < list.length && list[drop].t < cutoff) drop++;
	if (drop > 0) list.splice(0, drop);
}

// ── Resampling ──────────────────────────────────────────────

const DEFAULT_RATE = 20;
const DEFAULT_WINDOW_SEC = 5;

export function resampleTimedSeries<T extends { t: number }>(
	samples: T[],
	valueGetter: (s: T) => number,
	rate: number = DEFAULT_RATE,
	durationSec: number = DEFAULT_WINDOW_SEC
): { values: number[]; sampleRate: number } {
	if (samples.length < 4) return { values: [], sampleRate: rate };

	const end = samples[samples.length - 1].t;
	const start = Math.max(samples[0].t, end - durationSec * 1000);
	// Find start index without allocating a new array
	let startIdx = 0;
	while (startIdx < samples.length && samples[startIdx].t < start) startIdx++;
	if (samples.length - startIdx < 4) return { values: [], sampleRate: rate };

	const stepMs = 1000 / rate;
	const values: number[] = [];
	let idx = startIdx;

	for (let t = start; t <= end; t += stepMs) {
		while (idx < samples.length - 2 && samples[idx + 1].t < t) idx++;
		const a = samples[idx];
		const b = samples[Math.min(idx + 1, samples.length - 1)];
		const span = Math.max(1, b.t - a.t);
		const mix = clamp01((t - a.t) / span);
		values.push(a === b ? valueGetter(a) : valueGetter(a) + (valueGetter(b) - valueGetter(a)) * mix);
	}

	return { values, sampleRate: rate };
}

// ── Spectral analysis (DFT + Hamming) ───────────────────────

export interface SpectralResult {
	bandPower: number;
	peakHz: number;
	sharpness: number;
	narrowbandRatio: number;
	peakPower: number;
}

const EMPTY_SPECTRAL: SpectralResult = { bandPower: 0, peakHz: 0, sharpness: 0, narrowbandRatio: 0, peakPower: 0 };

export function analyzeSpectralBand(
	values: number[],
	sampleRate: number,
	minHz: number,
	maxHz: number,
	stepHz: number = 0.25
): SpectralResult {
	if (values.length < 20) return { ...EMPTY_SPECTRAL };

	const avg = mean(values);
	const centered = values.map(v => v - avg);
	const rawVar = variance(centered, 0);
	if (rawVar < 1e-8) return { ...EMPTY_SPECTRAL };

	const upperHz = Math.min(maxHz, sampleRate / 2 - 0.25);
	if (upperHz <= minHz) return { ...EMPTY_SPECTRAL };

	// Hamming window
	const n = centered.length;
	const windowed = centered.map((v, i) => {
		const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1));
		return v * w;
	});

	// DFT over frequency band
	let totalPower = 0;
	let peakPower = 0;
	let peakHz = 0;
	let bins = 0;
	const powerBins: { freq: number; power: number }[] = [];

	for (let freq = minHz; freq <= upperHz + 1e-9; freq += stepHz) {
		let re = 0;
		let im = 0;
		for (let i = 0; i < n; i++) {
			const angle = (2 * Math.PI * freq * i) / sampleRate;
			re += windowed[i] * Math.cos(angle);
			im -= windowed[i] * Math.sin(angle);
		}
		const power = (re * re + im * im) / (n * n);
		totalPower += power;
		bins++;
		powerBins.push({ freq, power });
		if (power > peakPower) {
			peakPower = power;
			peakHz = freq;
		}
	}

	const avgPower = bins ? totalPower / bins : 0;
	const localPeakPower = powerBins
		.filter(b => Math.abs(b.freq - peakHz) <= 0.75)
		.reduce((sum, b) => sum + b.power, 0);

	return {
		bandPower: rawVar > 1e-8 ? totalPower / rawVar : 0,
		peakHz,
		sharpness: avgPower > 1e-9 ? peakPower / avgPower : 0,
		narrowbandRatio: totalPower > 1e-9 ? localPeakPower / totalPower : 0,
		peakPower,
	};
}

// ── Observed sample rate estimator ──────────────────────────

export function estimateObservedRate(samples: { t: number }[]): number {
	if (samples.length < 2) return 0;
	const duration = (samples[samples.length - 1].t - samples[0].t) / 1000;
	return duration > 0 ? (samples.length - 1) / duration : 0;
}
