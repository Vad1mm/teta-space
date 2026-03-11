export function glowValues(breath: number, beatVal: number = 0) {
	const bv = beatVal || 0;
	const bb = bv * 0.06;
	return {
		g1op: 0.28 + breath * 0.38 + Math.sin(performance.now() * 0.0037) * 0.008 + bb,
		g1scale: 0.9 + breath * 0.18,
		g2op: 0.22 + breath * 0.35 + bb * 1.5,
		g2scale: 0.92 + breath * 0.14 + bv * 0.015,
		brandGlow: 16 + breath * 20,
		brandOp: 0.04 + breath * 0.1,
	};
}
