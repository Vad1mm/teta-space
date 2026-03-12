export function glowValues(breath: number, beatVal: number = 0) {
	const bv = beatVal || 0;
	const bb = bv * 0.04;
	return {
		g1op: 0.14 + breath * 0.2 + Math.sin(performance.now() * 0.0037) * 0.006 + bb,
		g1scale: 0.95 + breath * 0.22,
		g2op: 0.10 + breath * 0.18 + bb * 1.2,
		g2scale: 0.95 + breath * 0.18 + bv * 0.01,
		brandGlow: 16 + breath * 20,
		brandOp: 0.04 + breath * 0.1,
	};
}
