export const DEFAULT_INHALE = 4000;
export const DEFAULT_EXHALE = 6000;

let breathT0: number | null = null;

export function resetBreath(): void {
	breathT0 = null;
}

export function breathTime(
	now: number,
	inhale: number = DEFAULT_INHALE,
	exhale: number = DEFAULT_EXHALE
): number {
	if (breathT0 === null) breathT0 = now;
	return (now - breathT0) % (inhale + exhale);
}

export function breathCurve(
	now: number,
	inhale: number = DEFAULT_INHALE,
	exhale: number = DEFAULT_EXHALE
): number {
	const t = breathTime(now, inhale, exhale);
	if (t < inhale) return (1 - Math.cos(Math.PI * t / inhale)) * 0.5;
	return (1 + Math.cos(Math.PI * (t - inhale) / exhale)) * 0.5;
}

export function flowCycle(
	inhale: number = DEFAULT_INHALE,
	exhale: number = DEFAULT_EXHALE
): number {
	return inhale + exhale;
}
