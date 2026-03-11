<script lang="ts">
	import { hapticSelection } from '$lib/engine/HapticEngine';

	let {
		initialText = 'ТЕТА',
		glowSize = 16,
		glowOpacity = 0.04,
		fading = false,
	}: {
		initialText?: string;
		glowSize?: number;
		glowOpacity?: number;
		fading?: boolean;
	} = $props();

	const UKR = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ';
	function rndCh(): string { return UKR[Math.floor(Math.random() * UKR.length)]; }

	// Each char slot: width(24) + margin-left(10) + margin-right(10) = 44px
	const CHAR_W = 44; // width(24) + margin-left(10) + margin-right(10)
	const SPACE_W = 12; // narrower space character

	function textWidth(text: string): number {
		let w = 0;
		for (const ch of text) w += ch === ' ' ? SPACE_W : CHAR_W;
		return w;
	}

	let brandEl: HTMLDivElement;
	let chars: HTMLSpanElement[] = [];
	let activeSpinIv: ReturnType<typeof setInterval> | null = null;
	let morphTimeouts: ReturnType<typeof setTimeout>[] = [];

	// ─── Init: set brand text instantly, no animation ───
	export function initBrand(text: string): void {
		if (!brandEl) return;
		brandEl.innerHTML = '';
		brandEl.style.transition = 'none';
		brandEl.style.width = `${textWidth(text)}px`;
		chars = [];
		for (const ch of text) {
			const s = document.createElement('span');
			s.className = 'anim-char';
			(s as any)._target = ch;
			s.textContent = ch;
			(s as any)._locked = true;
			if (ch === ' ') { s.style.width = '0px'; s.style.margin = `0 ${SPACE_W / 2}px`; }
			brandEl.appendChild(s);
			chars.push(s);
		}
		void brandEl.offsetHeight;
		brandEl.style.transition = '';
	}

	// ─── Morph: spin chars, lock one by one, smooth width transition ───
	export function morphTo(toText: string, cb?: () => void): void {
		if (activeSpinIv) { clearInterval(activeSpinIv); activeSpinIv = null; }
		morphTimeouts.forEach(id => clearTimeout(id));
		morphTimeouts = [];

		const oldLen = chars.length;
		const maxLen = Math.max(oldLen, toText.length);

		// Add ghost chars if target is longer
		while (chars.length < maxLen) {
			const s = document.createElement('span');
			s.className = 'anim-char';
			(s as any)._target = '';
			s.textContent = rndCh();
			s.style.opacity = '0';
			brandEl.appendChild(s);
			chars.push(s);
		}

		const growing = toText.length > oldLen;
		const shrinking = toText.length < oldLen;
		const oldW = parseFloat(brandEl.style.width) || 0;
		const newW = textWidth(toText);

		// Anchor: first char stays if same letter
		const anchorStays = chars[0] && (chars[0] as any)._target === toText[0];
		const startIdx = anchorStays ? 1 : 0;
		const step = anchorStays ? 0 : 1;

		const SPIN_DUR = 800;
		const LOCK_STEP = 180;
		const lastLockDelay = SPIN_DUR + (chars.length - 2 + step) * LOCK_STEP;

		// Width transitions — always transition if width changes (handles space chars too)
		if (Math.abs(newW - oldW) > 1) {
			if (growing || (!shrinking && newW > oldW)) {
				const dur = Math.max(0.6, (lastLockDelay + 200) / 1000);
				brandEl.style.transition = `width ${dur}s ease`;
				brandEl.style.width = `${newW}px`;
			} else {
				const delay = SPIN_DUR * 0.3;
				const dur = (lastLockDelay - delay + 300) / 1000;
				const tid = setTimeout(() => {
					brandEl.style.transition = `width ${dur}s ease-in-out`;
					brandEl.style.width = `${newW}px`;
				}, delay);
				morphTimeouts.push(tid);
			}
		}

		// Unlock chars for spinning — reset space-styled chars to normal dimensions
		for (let i = startIdx; i < chars.length; i++) {
			(chars[i] as any)._locked = false;
			chars[i].style.color = 'rgba(255,255,255,0.45)';
			chars[i].style.textShadow = '';
			chars[i].style.width = '24px';
			chars[i].style.margin = '0 10px';
		}

		// Spin interval
		let tick = 0;
		activeSpinIv = setInterval(() => {
			for (let i = startIdx; i < chars.length; i++) {
				if (!(chars[i] as any)._locked) {
					chars[i].textContent = rndCh();
					chars[i].style.opacity = (0.12 + Math.random() * 0.48).toFixed(2);
				}
			}
			if (++tick % 3 === 0) hapticSelection();
		}, 55);

		function lockChar(c: HTMLSpanElement, targetCh: string | null, delay: number): void {
			const tid = setTimeout(() => {
				if (targetCh) {
					c.textContent = targetCh;
					(c as any)._target = targetCh;
					(c as any)._locked = true;
					c.style.opacity = '1';
					c.style.color = 'rgba(255,255,255,1)';
					c.style.textShadow = '0 0 14px rgba(99,102,241,0.55)';
					// Set correct dimensions for space vs normal char
					if (targetCh === ' ') {
						c.style.width = '0px';
						c.style.margin = `0 ${SPACE_W / 2}px`;
					} else {
						c.style.width = '24px';
						c.style.margin = '0 10px';
					}
					hapticSelection();
					const fadeId = setTimeout(() => {
						c.style.textShadow = '0 0 6px rgba(99,102,241,0.1)';
					}, 700);
					morphTimeouts.push(fadeId);
				} else {
					// Ghost: fade out (width already transitioning smoothly)
					(c as any)._locked = true;
					c.style.opacity = '0';
				}
			}, delay);
			morphTimeouts.push(tid);
		}

		// Schedule locks
		if (!anchorStays) {
			lockChar(chars[0], toText[0], SPIN_DUR);
		}

		for (let i = 1; i < chars.length; i++) {
			const targetCh = i < toText.length ? toText[i] : null;
			lockChar(chars[i], targetCh, SPIN_DUR + (i - 1 + step) * LOCK_STEP);
		}

		// Cleanup after all animations
		const totalTime = lastLockDelay + 500;
		morphTimeouts.push(setTimeout(() => {
			if (activeSpinIv) { clearInterval(activeSpinIv); activeSpinIv = null; }
			brandEl.style.transition = 'none';
			while (chars.length > toText.length) {
				const g = chars.pop();
				g?.remove();
			}
			brandEl.style.width = `${textWidth(toText)}px`;
			void brandEl.offsetHeight;
			brandEl.style.transition = '';
		}, totalTime));
		if (cb) morphTimeouts.push(setTimeout(cb, totalTime + 200));
	}

	// ─── Remorph: same-length spin (no width change) ───
	export function remorphBrand(text: string, cb?: () => void): void {
		if (activeSpinIv) { clearInterval(activeSpinIv); activeSpinIv = null; }
		morphTimeouts.forEach(id => clearTimeout(id));
		morphTimeouts = [];

		for (let i = 0; i < chars.length; i++) {
			(chars[i] as any)._locked = false;
			chars[i].style.color = 'rgba(255,255,255,0.45)';
			chars[i].style.textShadow = '';
		}

		let tick = 0;
		activeSpinIv = setInterval(() => {
			for (let i = 0; i < chars.length; i++) {
				if (!(chars[i] as any)._locked) {
					chars[i].textContent = rndCh();
					chars[i].style.opacity = (0.12 + Math.random() * 0.48).toFixed(2);
				}
			}
			if (++tick % 3 === 0) hapticSelection();
		}, 55);

		const SPIN_DUR = 400, LOCK_STEP = 140;

		for (let i = 0; i < chars.length; i++) {
			const targetCh = text[i];
			const delay = SPIN_DUR + i * LOCK_STEP;
			const tid = setTimeout(() => {
				chars[i].textContent = targetCh;
				(chars[i] as any)._target = targetCh;
				(chars[i] as any)._locked = true;
				chars[i].style.opacity = '1';
				chars[i].style.color = 'rgba(255,255,255,1)';
				chars[i].style.textShadow = '0 0 14px rgba(99,102,241,0.55)';
				hapticSelection();
				const fadeId = setTimeout(() => {
					chars[i].style.textShadow = '0 0 6px rgba(99,102,241,0.1)';
				}, 700);
				morphTimeouts.push(fadeId);
			}, delay);
			morphTimeouts.push(tid);
		}

		const totalTime = SPIN_DUR + (chars.length - 1) * LOCK_STEP + 400;
		morphTimeouts.push(setTimeout(() => {
			if (activeSpinIv) { clearInterval(activeSpinIv); activeSpinIv = null; }
		}, totalTime));
		if (cb) morphTimeouts.push(setTimeout(cb, totalTime + 200));
	}

	export function cleanup(): void {
		if (activeSpinIv) { clearInterval(activeSpinIv); activeSpinIv = null; }
		morphTimeouts.forEach(id => clearTimeout(id));
		morphTimeouts = [];
	}

	// Init via use: action — runs synchronously during mount, before first paint
	function initAction(node: HTMLDivElement) {
		brandEl = node;
		initBrand(initialText);
		return { destroy: () => cleanup() };
	}
</script>

<div class="wm" class:fading>
	<div class="brand-name" use:initAction
		style:text-shadow="0 0 {glowSize}px rgba(99,102,241,{glowOpacity})">
	</div>
</div>

<style>
	.wm {
		display: flex; flex-direction: column; align-items: center;
		opacity: 1; z-index: 1;
		overflow: hidden; width: 100%;
		transition: opacity 0.6s ease;
	}
	.wm.fading {
		opacity: 0;
		transition: opacity 2s ease;
	}
	.brand-name {
		font-size: 32px; font-weight: 300;
		color: rgba(255,255,255,1);
		display: flex;
	}
	.brand-name :global(.anim-char) {
		display: block; width: 24px; text-align: center;
		margin: 0 10px; flex-shrink: 0;
		transition: opacity 0.4s ease, color 0.4s ease, text-shadow 0.8s ease;
	}
</style>
