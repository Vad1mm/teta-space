export function lp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function clamp(v: number, lo: number, hi: number): number {
	return Math.min(hi, Math.max(lo, v));
}

export function easeInOutQuart(t: number): number {
	return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function easeOutQuart(t: number): number {
	return 1 - Math.pow(1 - t, 4);
}

export function easeInCubic(t: number): number {
	return t * t * t;
}

export function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}
