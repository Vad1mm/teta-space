function getTgHaptic() {
	const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
	return tg?.HapticFeedback ?? null;
}

const hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

function tgImpact(style: string): void {
	const h = getTgHaptic();
	if (h) { try { h.impactOccurred(style); } catch (_) { /* ignore */ } }
}

function vibrate(pattern: number | number[]): void {
	if (hasVibrate) { try { navigator.vibrate(pattern); } catch (_) { /* ignore */ } }
}

export function hapticLight(): void {
	tgImpact('light');
	if (!getTgHaptic()) vibrate(10);
}

export function hapticSoft(): void {
	tgImpact('soft');
	if (!getTgHaptic()) vibrate(15);
}

export function hapticMedium(): void {
	tgImpact('medium');
	if (!getTgHaptic()) vibrate(25);
}

export function hapticHeavy(): void {
	tgImpact('heavy');
	if (!getTgHaptic()) vibrate(40);
}

export function hapticRigid(): void {
	tgImpact('rigid');
	if (!getTgHaptic()) vibrate(20);
}

export function hapticSelection(): void {
	const h = getTgHaptic();
	if (h) { try { h.selectionChanged(); } catch (_) { /* ignore */ } }
	else vibrate(5);
}

export function hapticSuccess(): void {
	const h = getTgHaptic();
	if (h) { try { h.notificationOccurred('success'); } catch (_) { /* ignore */ } }
	else vibrate([15, 50, 10]);
}
