// Eye center
export const CX = 130;
export const CY = 91;

// Anchors
export const INNER_X = 8;
export const INNER_Y = 91;
export const OUTER_X = 252;
export const OUTER_Y = 91;

// Eyelid control points (open)
export const TOP_OPEN_L = 34;
export const TOP_OPEN_R = 34;
export const BOT_OPEN_L = 150;
export const BOT_OPEN_R = 150;

// Eyelid control points (shut)
export const TOP_SHUT_L = 146;
export const TOP_SHUT_R = 146;
export const BOT_SHUT_L = 150;
export const BOT_SHUT_R = 150;

// Bezier handles
export const TOP_CPX_L = 50;
export const TOP_CPX_R = 210;
export const BOT_CPX_L = 50;
export const BOT_CPX_R = 210;

// Iris
export const IRIS_RX = 34;
export const IRIS_RY = 44;
export const IRIS_BOT = CY + IRIS_RY;

// Theta (wave center)
export const THETA_CX = 130;
export const THETA_CY = 91;

export function eyeD(tL: number, tR: number, bL: number, bR: number): string {
	return `M ${INNER_X},${INNER_Y} C ${TOP_CPX_L},${tL} ${TOP_CPX_R},${tR} ${OUTER_X},${OUTER_Y} C ${BOT_CPX_R},${bR} ${BOT_CPX_L},${bL} ${INNER_X},${INNER_Y} Z`;
}

export function creaseD(tL: number, tR: number): string {
	return `M ${INNER_X + 18},${INNER_Y - 8} C ${TOP_CPX_L + 10},${tL - 16} ${TOP_CPX_R + 6},${tR - 14} ${OUTER_X - 12},${OUTER_Y - 6}`;
}

export function breathTopD(tL: number, tR: number): string {
	return `M ${INNER_X},${INNER_Y} C ${TOP_CPX_L},${tL} ${TOP_CPX_R},${tR} ${OUTER_X},${OUTER_Y}`;
}

export function breathBotD(bL: number, bR: number): string {
	return `M ${OUTER_X},${OUTER_Y} C ${BOT_CPX_R},${bR} ${BOT_CPX_L},${bL} ${INNER_X},${INNER_Y}`;
}
