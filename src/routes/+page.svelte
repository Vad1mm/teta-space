<script lang="ts">
	import { onMount } from 'svelte';
	import { breathCurve, breathTime, DEFAULT_INHALE, DEFAULT_EXHALE } from '$lib/engine/BreathEngine';
	import { createClosedEyeState, createBlinkEngine, type EyeState } from '$lib/engine/BlinkEngine';
	import { createHeartEngine } from '$lib/engine/HeartEngine';
	import { createWanderEngine, createDilationEngine } from '$lib/engine/WanderEngine';
	import { clamp, lp } from '$lib/engine/easing';
	import { CX, CY, TOP_SHUT_L, TOP_SHUT_R, IRIS_RX, IRIS_RY, IRIS_BOT, BOT_SHUT_L, BOT_SHUT_R } from '$lib/engine/geometry';
	import { hapticSoft, hapticMedium, hapticRigid, hapticLight, hapticSelection } from '$lib/engine/HapticEngine';
	import type { ModuleConfig, Phase } from '$lib/types/flow';

	import Eye from '$lib/atoms/eye/Eye.svelte';
	import PupilHeart from '$lib/atoms/pupil/PupilHeart.svelte';
	import PupilWave from '$lib/atoms/pupil/PupilWave.svelte';
	import Glow from '$lib/atoms/background/Glow.svelte';
	import FadeOverlay from '$lib/atoms/background/FadeOverlay.svelte';
	import BrandMorph from '$lib/atoms/text/BrandMorph.svelte';
	import Typewriter from '$lib/atoms/text/Typewriter.svelte';
	import Hint from '$lib/atoms/text/Hint.svelte';
	import ActionButton from '$lib/atoms/controls/ActionButton.svelte';
	import ProgressBar from '$lib/atoms/progress/ProgressBar.svelte';

	// ═══ MODULES CONFIG ═══
	const MODULES: ModuleConfig[] = [
		{ brand: 'ТЕТА', entryDelay: 2000, entryMorphTo: 'ТУТ',
			slogan: 'Усе починається зараз.',
			playText: 'Зупинись. Ти є.\nПобудь із собою без слів.',
			exitMorphTo: 'ЕНЕРГІЯ', blinkHaptic: true, blinkType: 'rigid' },
		{ brand: 'ЕНЕРГІЯ', entryDelay: 1200,
			slogan: 'Вона вже в тобі.\nТвоє серце б\'ється.',
			playText: 'Відчуй його ритм.\nЗалишайся з ним.',
			exitMorphTo: 'ТИША', blinkHaptic: false, blinkType: null },
		{ brand: 'ТИША', entryDelay: 1200,
			slogan: 'Між ударами серця.\nПочуй її.',
			playText: 'Дихай разом із хвилею.\nНехай усе стихає.',
			exitMorphTo: 'АВТОР', blinkHaptic: true, blinkType: 'soft' },
		{ brand: 'АВТОР', entryDelay: 1200,
			slogan: 'Той, хто помічає.\nІ може обирати.',
			playText: 'Слідкуй за ритмом.\nМоргай у такт.',
			exitMorphTo: 'ТИ Є', blinkHaptic: true, blinkType: 'soft' },
		{ brand: 'ТИ Є', entryDelay: 3000, entryMorphTo: 'ТЕТА',
			exitMorphTo: '', blinkHaptic: true, blinkType: 'rigid' },
	];

	// ═══ STATE ═══
	let currentModule = $state(0);
	let phase: Phase = $state('splash');
	let transitioning = $state(false);
	let prevT: number | null = null;
	let eyeOpened = false;
	let heartFadeIn = 0;
	let heartDelay = 0;
	let waveFadeIn = 0;
	let farewellStarted = false;
	let moduleTimeouts: ReturnType<typeof setTimeout>[] = [];

	// Reactive display state
	let breath = $state(0);
	let beatVal = $state(0);
	let eyeState: EyeState = $state(createClosedEyeState());
	let irisCx = $state(CX);
	let irisCy = $state(CY);
	let irisRx = $state(44);
	let irisRy = $state(44);
	let heartOpacity = $state(0);
	let waveOpacity = $state(0);
	let waveTime = $state(0);
	let showBreathEdge = $state(false);
	let breathEdgeOpacity = $state(0);
	let breathEdgeTopOpacity = $state(0);
	let breathEdgeBotOpacity = $state(0);
	let breathEdgeTopDasharray = $state('');
	let breathEdgeTopDashoffset = $state('');
	let breathEdgeBotDasharray = $state('');
	let breathEdgeBotDashoffset = $state('');
	let useBreathProgress = $state(false);
	let contourOpacity = $state(1);
	let fadeOverlayOpacity = $state(0);

	// UI state
	let bottomGroupVisible = $state(false);
	let sloganText = $state('');
	let buttonType: 'play' | 'pause' | 'stop' = $state('play');
	let buttonVisible = $state(false);
	let hintVisible = $state(false);
	let progressVisible = $state(false);
	let progressValue = $state(0);
	let labelText = $state('');
	let labelOpacity = $state(0);
	let glowVisible = $state(true);
	let brandFadeout = $state(false);

	let eyeRef: Eye;

	// ═══ ENGINES ═══
	const B = createClosedEyeState();
	const blinkEng = createBlinkEngine(B);
	const heartEng = createHeartEngine();
	const wander = createWanderEngine();
	const dilationEng = createDilationEngine(wander);

	blinkEng.blink.hapticOnBlink = true;
	blinkEng.blink.onHaptic = () => hapticRigid();

	let hapticCooldown = 0;
	let lastWanderPhase = 'drift';
	let hapticBlinkPulse = false;
	let hapticMoveTick = 0;

	const PROGRESS_DUR = 60000;
	let progressStart: number | null = null;
	let progressDone = false;
	let bpFade = 0;

	let rafId: number | null = null;
	let darkHapticIv: ReturnType<typeof setInterval> | null = null;
	let darkLastT: number | null = null;

	let brandMorph: BrandMorph;
	let sloganRef: Typewriter;
	let aboveTwRef: Typewriter;

	function wanderHapticUpdate(dt: number): void {
		hapticCooldown = Math.max(0, hapticCooldown - dt);
		const vel = Math.hypot(wander.w.velX, wander.w.velY);
		const velNorm = clamp(vel / 0.025, 0, 1);
		if (wander.w.phase !== lastWanderPhase) {
			const wasPause = lastWanderPhase === 'pause' || lastWanderPhase === 'pause2';
			const wasMoving = lastWanderPhase === 'drift' || lastWanderPhase === 'center';
			const isPause = wander.w.phase === 'pause' || wander.w.phase === 'pause2';
			if (wasPause && wander.w.phase === 'drift') { hapticSoft(); hapticCooldown = 200; }
			else if (wasPause && wander.w.phase === 'center') { hapticMedium(); hapticCooldown = 250; }
			else if (wasMoving && isPause) { hapticSelection(); hapticCooldown = 150; }
			lastWanderPhase = wander.w.phase;
		}
		if (wander.w.phase === 'drift' || wander.w.phase === 'center') {
			hapticMoveTick += dt;
			const interval = velNorm > 0.1 ? lp(500, 180, velNorm) : 9999;
			if (hapticMoveTick >= interval && hapticCooldown <= 0) {
				hapticMoveTick = 0;
				if (velNorm > 0.3) hapticLight(); else if (velNorm > 0.1) hapticSelection();
				hapticCooldown = 80;
			}
		} else { hapticMoveTick = 0; }
		if (wander.w.phase === 'center') {
			const dist = Math.hypot(wander.w.offX, wander.w.offY);
			if (dist < 0.5 && hapticCooldown <= 0) { hapticSoft(); hapticCooldown = 600; }
		}
		if (blinkEng.blink.phase === 'closing' && !hapticBlinkPulse) { hapticRigid(); hapticBlinkPulse = true; }
		if (blinkEng.blink.phase === 'idle') hapticBlinkPulse = false;
	}

	function resetVisualState(): void {
		moduleTimeouts.forEach(id => clearTimeout(id)); moduleTimeouts = [];
		if (darkHapticIv) { clearInterval(darkHapticIv); darkHapticIv = null; darkLastT = null; }
		transitioning = false; eyeOpened = false;
		heartFadeIn = 0; heartDelay = 0; waveFadeIn = 0; farewellStarted = false;

		Object.assign(B, createClosedEyeState());
		blinkEng.blink.phase = 'idle'; blinkEng.blink.elapsed = 0;
		blinkEng.blink.breathPhase = null; blinkEng.blink.isPaused = false;

		heartEng.reset(); bpFade = 0;
		progressStart = null; progressDone = false;

		heartOpacity = 0; waveOpacity = 0; waveTime = 0;
		showBreathEdge = false; breathEdgeOpacity = 0;
		breathEdgeTopOpacity = 0; breathEdgeBotOpacity = 0;
		breathEdgeTopDasharray = ''; breathEdgeTopDashoffset = '';
		breathEdgeBotDasharray = ''; breathEdgeBotDashoffset = '';
		useBreathProgress = false;
		contourOpacity = 1; fadeOverlayOpacity = 0;
		brandFadeout = false;

		bottomGroupVisible = false; sloganText = '';
		buttonType = 'play'; buttonVisible = false;
		hintVisible = false; progressVisible = false;
		progressValue = 0; labelText = ''; labelOpacity = 0;
		glowVisible = true;

		wander.w.offX = 0; wander.w.offY = 0;
		wander.w.targetX = (Math.random() - 0.5) * 32;
		wander.w.targetY = (Math.random() - 0.5) * 16;
		wander.w.phase = 'drift'; wander.w.timer = 0;
		hapticCooldown = 0; lastWanderPhase = 'drift';
		hapticBlinkPulse = false; hapticMoveTick = 0;

		if (sloganRef) sloganRef.cancel();
		if (aboveTwRef) aboveTwRef.cancel();
		if (brandMorph) brandMorph.cleanup();
	}

	function startModule(idx: number): void {
		currentModule = idx;
		phase = 'splash';
		resetVisualState();

		blinkEng.blink.hapticOnBlink = MODULES[idx].blinkHaptic;
		const bt = MODULES[idx].blinkType;
		blinkEng.blink.onHaptic = bt === 'soft' ? () => hapticSoft() : bt === 'rigid' ? () => hapticRigid() : null;

		if (brandMorph) brandMorph.initBrand(MODULES[idx].brand);

		if (idx === 0) {
			const tid = setTimeout(() => {
				phase = 'morph';
				brandMorph.morphTo('ТУТ', () => {
					bottomGroupVisible = true;
					sloganText = MODULES[0].slogan!;
				});
			}, MODULES[0].entryDelay);
			moduleTimeouts.push(tid);
		} else if (idx === 4) {
			// Morph ТИ Є → ТЕТА, then open eye
			const tid = setTimeout(() => {
				phase = 'morph';
				brandMorph.morphTo('ТЕТА', () => {
					phase = 'opening'; blinkEng.forceOpen(700);
				});
			}, MODULES[4].entryDelay);
			moduleTimeouts.push(tid);
		} else {
			const mod = MODULES[idx];
			const tid = setTimeout(() => {
				phase = 'slogan';
				bottomGroupVisible = true;
				sloganText = mod.slogan!;
			}, mod.entryDelay);
			moduleTimeouts.push(tid);
		}
	}

	function onSloganDone(): void {
		if (phase === 'morph' || phase === 'slogan') {
			phase = 'waitPlay';
			const tid = setTimeout(() => { buttonVisible = true; hapticSoft(); }, 300);
			moduleTimeouts.push(tid);
		}
	}

	function onEnterLive(): void {
		phase = 'live'; eyeOpened = false;
		blinkEng.blink.breathPhase = 'in';

		if (currentModule === 0) {
			buttonType = 'pause'; buttonVisible = false;
			const tid = setTimeout(() => { buttonVisible = true; hapticSoft(); }, 600);
			moduleTimeouts.push(tid);
		} else if (currentModule >= 1 && currentModule <= 3) {
			progressVisible = true;
			progressStart = performance.now();
		} else if (currentModule === 4) {
			labelOpacity = 1;
			labelText = 'Загуде голова,\nвертайся в';
		}
	}

	function onAboveTextDone(): void {
		if (currentModule !== 4 || phase !== 'live') return;
		// "повертайся в" done → remorph ТЕТА (spin = continuation: "повертайся в ТЕТА")
		brandMorph.remorphBrand('ТЕТА', () => {
			// Full sentence landed → pause, then farewell
			const tid = setTimeout(() => {
				phase = 'farewell';
				blinkEng.blink.breathPhase = null;
				blinkEng.forceClose(600);
			}, 2500);
			moduleTimeouts.push(tid);
		});
	}

	function handleCta(): void {
		if (transitioning) return;
		if (phase !== 'waitPlay' && phase !== 'live') return;
		transitioning = true;

		if (phase === 'waitPlay') {
			if (currentModule === 0) hapticMedium(); else hapticSoft();
			buttonVisible = false;
			if (sloganRef) sloganRef.cancel();
			sloganText = '';
			bottomGroupVisible = false;

			brandMorph.morphTo('ТЕТА', () => {
				bottomGroupVisible = true;
				sloganText = MODULES[currentModule].playText!;
			});
		} else if (phase === 'live') {
			if (currentModule === 0) hapticMedium(); else hapticSoft();
			if (currentModule === 0) {
				wander.returnToCenter();
				const tid = setTimeout(() => {
					blinkEng.blink.breathPhase = null; blinkEng.forceClose(400); phase = 'closing';
					const tid2 = setTimeout(() => exitCurrentModule(), 500);
					moduleTimeouts.push(tid2);
				}, 300);
				moduleTimeouts.push(tid);
			} else {
				blinkEng.blink.breathPhase = null; blinkEng.forceClose(400); phase = 'closing';
				const tid = setTimeout(() => exitCurrentModule(), 500);
				moduleTimeouts.push(tid);
			}
		}
	}

	function onPlayTextDone(): void {
		if (phase === 'waitPlay' && transitioning) {
			phase = 'opening'; blinkEng.forceOpen(700); transitioning = false;
		}
	}

	function exitCurrentModule(): void {
		buttonVisible = false; hintVisible = false;
		if (sloganRef) sloganRef.cancel();
		sloganText = ''; bottomGroupVisible = false;
		heartOpacity = 0; waveOpacity = 0;
		showBreathEdge = false; breathEdgeOpacity = 0;
		breathEdgeTopOpacity = 0; breathEdgeBotOpacity = 0;
		breathEdgeTopDasharray = ''; breathEdgeTopDashoffset = '';
		breathEdgeBotDasharray = ''; breathEdgeBotDashoffset = '';
		useBreathProgress = false;
		contourOpacity = 1;
		progressVisible = false;

		brandMorph.morphTo(MODULES[currentModule].exitMorphTo, () => {
			phase = 'transition'; hapticSoft();
			const tid = setTimeout(() => startModule(currentModule + 1), 800);
			moduleTimeouts.push(tid);
		});
	}

	function onProgressDone(): void {
		progressDone = true; progressVisible = false;
		const tid = setTimeout(() => {
			buttonType = 'pause'; buttonVisible = true; hapticSoft();
			const tid2 = setTimeout(() => { hintVisible = true; }, 400);
			moduleTimeouts.push(tid2);
		}, 600);
		moduleTimeouts.push(tid);
	}

	function eyeBreathClosed(br: number): void {
		const shift = br * 2.5;
		B.topL = TOP_SHUT_L + shift; B.topR = TOP_SHUT_R + shift;
		B.botL = BOT_SHUT_L; B.botR = BOT_SHUT_R;
		B.iRy = 0.2; B.iRx = IRIS_RX - 2; B.iCy = IRIS_BOT - 0.2; B.iOp = 0;
	}

	function frame(now: number): void {
		if (!prevT) prevT = now;
		const dt = Math.min(now - prevT, 50);
		prevT = now;
		const br = breathCurve(now);
		breath = br;

		if (currentModule === 0) { wander.update(dt); dilationEng.update(dt); }

		if (phase === 'splash' || phase === 'morph' || phase === 'slogan' || phase === 'waitPlay' || phase === 'transition') {
			eyeBreathClosed(br);
			if (currentModule === 4 && (phase === 'splash' || phase === 'morph')) heartEng.update(dt, br, now);
			beatVal = 0;
		}

		if (phase === 'opening') {
			blinkEng.update(dt);
			if (!eyeOpened && B.iRy > IRIS_RY * 0.8) eyeOpened = true;

			if (currentModule === 0) {
				if (eyeOpened && heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
			} else if (currentModule === 1) {
				if (eyeOpened && heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				if (eyeOpened) heartDelay += dt;
				if (heartDelay >= 700 && heartFadeIn > 0) { heartEng.state.hapticEnabled = true; heartEng.update(dt, br, now); }
				beatVal = heartEng.state.beatVal * heartFadeIn;
			} else if (currentModule === 2 || currentModule === 3) {
				if (eyeOpened && waveFadeIn < 1) { waveFadeIn = Math.min(1, waveFadeIn + dt * 0.0012); waveOpacity = waveFadeIn * 0.85; }
				waveTime += 0.013;
			} else if (currentModule === 4) {
				heartEng.update(dt, br, now);
				if (eyeOpened && heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				if (heartFadeIn > 0.3 && !heartEng.state.hapticEnabled) heartEng.state.hapticEnabled = true;
			}

			if (blinkEng.blink.phase === 'idle') onEnterLive();
		}

		if (phase === 'live') {
			if (currentModule === 0) wanderHapticUpdate(dt);
			if (currentModule === 1) {
				if (heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				if (heartDelay < 700) heartDelay += dt;
				if (heartDelay >= 700) { heartEng.state.hapticEnabled = true; heartEng.update(dt, br, now); }
				beatVal = heartEng.state.beatVal * heartFadeIn;
			}
			if (currentModule === 2 || currentModule === 3) {
				if (waveFadeIn < 1) { waveFadeIn = Math.min(1, waveFadeIn + dt * 0.0012); waveOpacity = waveFadeIn * 0.85; }
				waveTime += 0.013;
			}
			if (currentModule === 3) {
				showBreathEdge = true;
				useBreathProgress = true;
				bpFade = Math.min(1, bpFade + 0.018);
				const openness = clamp((B.iRy - 0.2) / (IRIS_RY - 0.2), 0, 1);
				const fade = bpFade * openness;
				contourOpacity = 1.0 - bpFade * 0.7;

				const bt = breathTime(now);
				const lens = eyeRef?.getPathLengths() ?? { top: 260, bot: 260 };

				if (bt < DEFAULT_INHALE) {
					// Inhale: top fills L→R, bottom already full
					const p = bt / DEFAULT_INHALE;
					breathEdgeTopDasharray = `${lens.top}`;
					breathEdgeTopDashoffset = `${lens.top * (1 - p)}`;
					breathEdgeTopOpacity = (0.4 + p * 0.5) * fade;
					breathEdgeBotDasharray = `${lens.bot}`;
					breathEdgeBotDashoffset = '0';
					breathEdgeBotOpacity = 0.9 * fade;
				} else {
					// Exhale: bottom fills R→L, top already full
					const p = (bt - DEFAULT_INHALE) / DEFAULT_EXHALE;
					breathEdgeBotDasharray = `${lens.bot}`;
					breathEdgeBotDashoffset = `${lens.bot * (1 - p)}`;
					breathEdgeBotOpacity = (0.4 + p * 0.5) * fade;
					breathEdgeTopDasharray = `${lens.top}`;
					breathEdgeTopDashoffset = '0';
					breathEdgeTopOpacity = 0.9 * fade;
				}
			} else if (currentModule === 1 || currentModule === 2 || currentModule === 4) {
				showBreathEdge = true;
				useBreathProgress = false;
				const op = 0.15 + br * 0.55;
				breathEdgeOpacity = op;
				breathEdgeTopOpacity = op;
				breathEdgeBotOpacity = op;
				breathEdgeTopDasharray = '';
				breathEdgeTopDashoffset = '';
				breathEdgeBotDasharray = '';
				breathEdgeBotDashoffset = '';
			}
			if (currentModule === 4) {
				if (heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				heartEng.update(dt, br, now);
				beatVal = heartEng.state.beatVal;
			}

			const bt = breathTime(now);
			const bp = bt < DEFAULT_INHALE ? 'in' : 'out';
			if (blinkEng.blink.breathPhase !== null && bp !== blinkEng.blink.breathPhase) {
				blinkEng.breathBlink(bp === 'out' ? 'soft' : 'wake');
			}
			blinkEng.blink.breathPhase = bp as 'in' | 'out';
			blinkEng.update(dt);

			if (progressStart && !progressDone) {
				const elapsed = now - progressStart;
				progressValue = clamp(elapsed / PROGRESS_DUR, 0, 1);
				if (progressValue >= 1) onProgressDone();
			}
		}

		if (phase === 'closing') {
			blinkEng.update(dt);
			heartFadeIn = 0; waveFadeIn = 0; heartOpacity = 0; waveOpacity = 0; beatVal = 0;
		}

		if (phase === 'farewell') {
			heartEng.update(dt, br, now);
			if (!farewellStarted) {
				blinkEng.update(dt);
				if (B.iRy < 1) {
					farewellStarted = true; heartEng.state.hapticOnly = true;
					showBreathEdge = false; labelOpacity = 0;
					glowVisible = false; contourOpacity = 0;
					fadeOverlayOpacity = 1;
					brandFadeout = true; // ТЕТА fades immediately like an afterimage
					const tid = setTimeout(() => {
						phase = 'dark'; hapticSoft();
						// Continue heart haptic without rAF (no visual updates needed)
						darkLastT = performance.now();
						darkHapticIv = setInterval(() => {
							const now = performance.now();
							const dt = Math.min(now - (darkLastT ?? now), 50);
							darkLastT = now;
							const br = breathCurve(now);
							heartEng.update(dt, br, now);
						}, 50);
					}, 3000);
					moduleTimeouts.push(tid);
				}
			}
		}

		if (phase === 'dark') {
			// rAF stops here — dark haptic handled by darkHapticInterval
		}

		if (currentModule === 0 && (phase === 'opening' || phase === 'live')) {
			irisCx = CX + wander.w.offX;
			irisCy = CY + wander.w.offY;
			irisRx = dilationEng.getRx();
			irisRy = dilationEng.getRy();
		} else {
			irisCx = CX; irisCy = CY; irisRx = 44; irisRy = 44;
		}

		eyeState = { ...B };

		if (phase !== 'dark') {
			rafId = requestAnimationFrame(frame);
		} else {
			rafId = null;
		}
	}

	onMount(() => {
		startModule(0);
		rafId = requestAnimationFrame(frame);
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (darkHapticIv) clearInterval(darkHapticIv);
		};
	});
</script>

<div class="splash">
	{#if glowVisible}
		<Glow {breath} {beatVal} />
	{/if}

	{#if currentModule === 4 && labelText}
		<div class="above-text" style:opacity={labelOpacity}>
			<Typewriter bind:this={aboveTwRef} text={labelText} ondone={onAboveTextDone} />
		</div>
	{/if}

	<Eye bind:this={eyeRef} {eyeState} {irisCx} {irisCy} {irisRx} {irisRy}
		{showBreathEdge} {breathEdgeOpacity} {breathEdgeTopOpacity} {breathEdgeBotOpacity}
		{breathEdgeTopDasharray} {breathEdgeTopDashoffset}
		{breathEdgeBotDasharray} {breathEdgeBotDashoffset}
		{contourOpacity}>
		{#snippet children()}
			{#if currentModule === 0 || currentModule === 1 || currentModule === 4}
				<PupilHeart beatVal={heartEng.state.beatVal} {breath}
					opacity={heartOpacity} {irisCx} {irisCy} {irisRx} {irisRy} />
			{/if}
			{#if currentModule === 2 || currentModule === 3}
				<PupilWave {breath} opacity={waveOpacity} {waveTime} />
			{/if}
		{/snippet}
	</Eye>

	<BrandMorph bind:this={brandMorph} initialText={MODULES[currentModule].brand} fading={brandFadeout} />

	{#if bottomGroupVisible}
		<div class="bottom-group" class:visible={bottomGroupVisible}>
			{#if sloganText}
				<Typewriter bind:this={sloganRef} text={sloganText}
					ondone={transitioning ? onPlayTextDone : onSloganDone} />
			{/if}
			<ActionButton type={buttonType} visible={buttonVisible} onclick={handleCta} />
			<Hint text="Залишайся стільки, скільки потрібно" visible={hintVisible} />
		</div>
	{/if}
</div>

<ProgressBar progress={progressValue} {breath} {beatVal} visible={progressVisible} />
<FadeOverlay opacity={fadeOverlayOpacity} />

<style>
	.splash {
		position: relative; z-index: 1;
		display: flex; flex-direction: column; align-items: center;
		height: 450px; min-width: 360px;
		gap: 0; user-select: none; -webkit-user-select: none;
	}
	.above-text {
		position: absolute; top: -12px; left: 0; right: 0;
		font-size: 14px; font-weight: 300; font-style: italic;
		letter-spacing: 1px; color: rgba(255,255,255,0.65);
		text-align: center; line-height: 1.6;
		z-index: 2; transition: opacity 1s ease;
		pointer-events: none;
	}
	.bottom-group {
		display: flex; flex-direction: column; align-items: center;
		gap: 28px; margin-top: 56px;
		opacity: 0; transform: translateY(16px);
		z-index: 1;
		transition: opacity 1.2s ease, transform 1.2s ease;
	}
	.bottom-group.visible {
		opacity: 1; transform: translateY(0);
	}
</style>
