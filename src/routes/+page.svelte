<script lang="ts">
	import { onMount } from 'svelte';
	import { breathCurve, breathTime, DEFAULT_INHALE, DEFAULT_EXHALE } from '$lib/engine/BreathEngine';
	import { createClosedEyeState, createBlinkEngine, type EyeState } from '$lib/engine/BlinkEngine';
	import { createHeartEngine } from '$lib/engine/HeartEngine';
	import { createWanderEngine, createDilationEngine } from '$lib/engine/WanderEngine';
	import { createAttentionEngine, createWanderState, updateWanderState } from '$lib/engine/AttentionEngine';
	import { clamp, lp } from '$lib/engine/easing';
	import { CX, CY, TOP_SHUT_L, TOP_SHUT_R, IRIS_RX, IRIS_RY, IRIS_BOT, BOT_SHUT_L, BOT_SHUT_R } from '$lib/engine/geometry';
	import { hapticSoft, hapticMedium, hapticRigid, hapticLight, hapticSelection } from '$lib/engine/HapticEngine';
	import { createSensorEngine } from '$lib/engine/SensorEngine';
	import { createBpmController } from '$lib/engine/BpmController';
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
	import AttentionPointLayer from '$lib/atoms/background/AttentionPointLayer.svelte';
	import { createAttentionPointsEngine, type AttentionPointState } from '$lib/engine/AttentionPointsEngine';
	import { module1Points, module2Points, module3Points, module4Points } from '$lib/config/attentionPoints';

	// ═══ MODULES CONFIG ═══
	const MODULES: ModuleConfig[] = [
		{ brand: 'ТЕТА', entryDelay: 1000, entryMorphTo: 'ТУТ',
			slogan: 'Усе відбувається.\nТи у моменті.',
			playText: 'Дивись у середину.\nПобач, як ти бачиш.',
			exitMorphTo: 'ЕНЕРГІЯ', blinkHaptic: true, blinkType: 'rigid' },
		{ brand: 'ЕНЕРГІЯ', entryDelay: 1200,
			slogan: 'Вже в тобі.\nТвоє серце б\'ється.',
			playText: 'Помічай зміни ритму.\nВідчуй: це життя.',
			exitMorphTo: 'ТИША', blinkHaptic: false, blinkType: null },
		{ brand: 'ТИША', entryDelay: 1200,
			slogan: 'Між ударами серця.\nТи не зникаєш.',
			playText: 'Лови хвилю дихання.\nСлухай себе.',
			exitMorphTo: 'АВТОР', blinkHaptic: true, blinkType: 'soft' },
		{ brand: 'АВТОР', entryDelay: 1200,
			slogan: 'Той, хто помічає.\nТой, хто обирає.',
			playText: 'Обирай, як моргати.\nЦе твій момент.',
			exitMorphTo: 'ТИ Є.', blinkHaptic: true, blinkType: 'soft' },
		{ brand: 'ТИ Є.', entryDelay: 3000, entryMorphTo: 'ТЕТА',
			slogan: 'Мить, до якої можна повернутись.',
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
	let eyeOpenness = $state(1);
	let labelText = $state('');
	let labelOpacity = $state(0);
	let glowVisible = $state(true);
	let attGlowX = $state(0);
	let attGlowY = $state(0);
	let spotX = $state(0);
	let spotY = $state(0);
	let spotOp = $state(0);
	let spotScale = $state(1);
	let spotDriftX = $state(0);
	let spotDriftY = $state(0);
	let spotBeat = $state(0);
	let smoothEyeOpen = 1; // low-pass filtered eye openness for spotlight
	// Per-session random drift phases — different trajectory every time
	const driftPh = Array.from({ length: 8 }, () => Math.random() * Math.PI * 2);
	// Spot-field per-layer wander (for spotlight offsets)
	const layerWA = createWanderState(35, 25);
	const layerWB = createWanderState(40, 30);
	const layerWC = createWanderState(25, 20);
	layerWA.gentle = false; layerWB.gentle = false; layerWC.gentle = false;
	let qOffAx = $state(0); let qOffAy = $state(0);
	let qOffBx = $state(0); let qOffBy = $state(0);
	let qOffCx = $state(0); let qOffCy = $state(0);
	// Nebula: 2 conic-gradient layers — continuous varying brightness around 360°
	// When overlapping + rotating at different speeds = alive shifting accents
	function makeConicGrad(cx: number, cy: number): string {
		const n = 6 + Math.floor(Math.random() * 5); // 6-10 stops around ring
		const stops: string[] = [];
		for (let i = 0; i <= n; i++) {
			const a = (i / n) * 360;
			const op = 0.03 + Math.random() * 0.14; // 0.03-0.17 — wide range
			const r = 90 + Math.floor(Math.random() * 50);
			const g = 95 + Math.floor(Math.random() * 50);
			const b = 230 + Math.floor(Math.random() * 25);
			stops.push(`rgba(${r},${g},${b},${op.toFixed(3)}) ${a.toFixed(1)}deg`);
		}
		return `conic-gradient(from ${Math.random() * 360}deg at ${cx}% ${cy}%, ${stops.join(', ')})`;
	}
	const nebulaA = makeConicGrad(35 + Math.random() * 25, 35 + Math.random() * 25);
	const nebulaB = makeConicGrad(40 + Math.random() * 20, 40 + Math.random() * 20);
	let ambientOp = $state(0);
	let bRotA = $state(Math.random() * 360);
	let bRotB = $state(Math.random() * 360);
	const bRotSpA = (Math.random() > 0.5 ? 1 : -1) * (0.0003 + Math.random() * 0.0004);
	const bRotSpB = (Math.random() > 0.5 ? 1 : -1) * (0.0004 + Math.random() * 0.0003);
	let glowDim = $state(0.4);
	let brandFadeout = $state(false);
	let brandFloating = $state(false);
	let brandOpacity = $state(1);
	let farewellT = 0;
	const FAREWELL_DUR = 7000; // 7s single continuous fade
	let glowBoost = $state(0);
	let ghostBlobOp = $state(0);
	let focusDotX = $state(0);
	let focusDotY = $state(0);
	let focusDotOp = $state(0);
	let focusDotVisible = $state(false);

	let eyeRef: Eye;

	const PROGRESS_DUR = 10000;

	// ═══ ENGINES ═══
	const B = createClosedEyeState();
	const blinkEng = createBlinkEngine(B);
	const heartEng = createHeartEngine();
	const wander = createWanderEngine();
	const dilationEng = createDilationEngine(wander);
	const attention = createAttentionEngine();
	const sensorEng = createSensorEngine();
	const bpmCtrl = createBpmController();
	const attPoints = createAttentionPointsEngine();
	let renderedPoints: readonly AttentionPointState[] = $state([]);

	blinkEng.blink.hapticOnBlink = true;
	blinkEng.blink.onHaptic = () => hapticRigid();

	attention.setOnJump(() => {
		if (phase !== 'live' || currentModule !== 0) return;
		hapticMedium();
		if (blinkEng.blink.phase === 'idle') blinkEng.breathBlink('wake');
	});
	attention.setOnDriftStart(() => {
		if (phase !== 'live' || currentModule !== 0) return;
		hapticSoft();
	});

	let hapticCooldown = 0;
	let hapticBlinkPulse = false;
	let hapticMoveTick = 0;
	let progressStart: number | null = null;
	let progressDone = false;
	let bpFade = 0;

	let rafId: number | null = null;
	let darkHapticIv: ReturnType<typeof setInterval> | null = null;
	let darkLastT: number | null = null;

	let brandMorph: BrandMorph;
	let sloganRef: Typewriter;
	let aboveTwRef: Typewriter;

	// Sync phase changes to attention points engine
	$effect(() => { attPoints.setPhase(phase); });

	function attentionHapticUpdate(dt: number): void {
		hapticCooldown = Math.max(0, hapticCooldown - dt);
		const vel = Math.hypot(wander.w.velX, wander.w.velY);
		const velNorm = clamp(vel / 0.025, 0, 1);

		if (attention.a.phase === 'drift' || attention.a.phase === 'arrive') {
			hapticMoveTick += dt;
			const interval = velNorm > 0.1 ? lp(500, 180, velNorm) : 9999;
			if (hapticMoveTick >= interval && hapticCooldown <= 0) {
				hapticMoveTick = 0;
				if (attention.a.phase === 'arrive' && velNorm > 0.2) hapticLight();
				else if (velNorm > 0.1) hapticSelection();
				hapticCooldown = 80;
			}
		} else { hapticMoveTick = 0; }

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
		bpmCtrl.reset(); glowBoost = 0.25; ghostBlobOp = 0;
		focusDotVisible = false; focusDotOp = 0;
		// Don't reset sensorEng fully — keep collecting data across modules
		progressStart = null; progressDone = false;

		heartOpacity = 0; waveOpacity = 0; waveTime = 0;
		showBreathEdge = false; breathEdgeOpacity = 0;
		breathEdgeTopOpacity = 0; breathEdgeBotOpacity = 0;
		breathEdgeTopDasharray = ''; breathEdgeTopDashoffset = '';
		breathEdgeBotDasharray = ''; breathEdgeBotDashoffset = '';
		useBreathProgress = false;
		contourOpacity = 1; fadeOverlayOpacity = 0;
		brandFadeout = false; brandOpacity = 1; farewellT = 0;

		bottomGroupVisible = false; sloganText = '';
		buttonType = 'play'; buttonVisible = false;
		hintVisible = false; progressVisible = false;
		progressValue = 0; labelText = ''; labelOpacity = 0;
		glowVisible = true;

		wander.w.offX = 0; wander.w.offY = 0;
		wander.w.targetX = (Math.random() - 0.5) * 32;
		wander.w.targetY = (Math.random() - 0.5) * 16;
		wander.w.phase = 'gaze'; wander.w.timer = 0;
		wander.w.externalTarget = false;
		attention.a.x = 0; attention.a.y = 0;
		attention.a.phase = 'pause'; attention.a.timer = 0; attention.a.phaseDur = 800;
		attention.a.gentle = true;
		attGlowX = 0; attGlowY = 0; spotX = 0; spotY = 0; spotOp = 0;
		layerWA.x = 0; layerWA.y = 0; layerWA.phase = 'pause'; layerWA.timer = 0;
		layerWB.x = 0; layerWB.y = 0; layerWB.phase = 'pause'; layerWB.timer = 0;
		layerWC.x = 0; layerWC.y = 0; layerWC.phase = 'pause'; layerWC.timer = 0;
		qOffAx = 0; qOffAy = 0; qOffBx = 0; qOffBy = 0; qOffCx = 0; qOffCy = 0;
		ambientOp = 0;
		bRotA = Math.random() * 360; bRotB = Math.random() * 360;
		spotScale = 1; spotDriftX = 0; spotDriftY = 0; spotBeat = 0; smoothEyeOpen = 1; glowDim = 0.6;
		hapticCooldown = 0;
		hapticBlinkPulse = false; hapticMoveTick = 0;
		attPoints.reset(); renderedPoints = [];

		if (sloganRef) sloganRef.cancel();
		if (aboveTwRef) aboveTwRef.cancel();
		if (brandMorph) brandMorph.cleanup();
	}

	function startModule(idx: number): void {
		currentModule = idx;
		phase = 'splash';
		resetVisualState();

		// Load attention points for this module (Module 0 uses direct glow sync, not engine)
		if (idx === 1) attPoints.loadPoints(module1Points());
		else if (idx === 2) attPoints.loadPoints(module2Points());
		else if (idx === 3) attPoints.loadPoints(module3Points());
		else if (idx === 4) attPoints.loadPoints(module4Points());
		if (idx > 0) attPoints.setPhase('splash');

		blinkEng.blink.hapticOnBlink = MODULES[idx].blinkHaptic;
		const bt = MODULES[idx].blinkType;
		blinkEng.blink.onHaptic = bt === 'soft' ? () => hapticSoft() : bt === 'rigid' ? () => hapticRigid() : null;

		// Calibrate sensors on transition to Module 1
		if (idx === 1 && sensorPermissionDone) {
			sensorEng.calibrate();
			bpmCtrl.setStartBPM(sensorEng.predictedBPM());
		}

		// Stop sensors after Module 1 — no longer needed, saves CPU/battery
		if (idx === 2 && sensorPermissionDone) {
			sensorEng.stopListening();
		}

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
			// Module 4 starts at 35 BPM — deep calm baseline
			bpmCtrl.state.startBPM = 35;
			bpmCtrl.state.currentBPM = 35;
			heartEng.state.externalHR = 35;
			heartEng.state.hapticEnabled = true;
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
		if (currentModule === 4) {
			// Single continuous farewell — everything driven by farewellT in frame()
			const tid = setTimeout(() => {
				bottomGroupVisible = false;
				sloganText = '';
				blinkEng.blink.breathPhase = null;
				blinkEng.forceClose(2800); // eye closes over ~40% of FAREWELL_DUR
				phase = 'farewell';
				farewellT = 0;
			}, 1200);
			moduleTimeouts.push(tid);
			return;
		}
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
			attention.a.gentle = false;
			wander.w.externalTarget = true;
			buttonType = 'pause'; buttonVisible = false;
			const tid = setTimeout(() => { buttonVisible = true; hapticSoft(); }, 600);
			const tid2 = setTimeout(() => { hintVisible = true; }, 1000);
			moduleTimeouts.push(tid, tid2);
		} else if (currentModule >= 1 && currentModule <= 3) {
			progressVisible = true;
			progressStart = performance.now();
		} else if (currentModule === 4) {
			bottomGroupVisible = true;
			sloganText = MODULES[4].slogan!;
		}
	}

	function onAboveTextDone(): void {
		if (currentModule !== 4 || phase !== 'live') return;
		brandMorph.remorphBrand('ТЕТА', () => {
			const tid = setTimeout(() => {
				bottomGroupVisible = false;
				labelText = '';
				blinkEng.blink.breathPhase = null;
				blinkEng.forceClose(2800);
				phase = 'farewell';
				farewellT = 0;
			}, 2500);
			moduleTimeouts.push(tid);
		});
	}

	let sensorPermissionDone = false;

	async function handleCta(): Promise<void> {
		if (transitioning) return;
		if (phase !== 'waitPlay' && phase !== 'live') return;
		transitioning = true;

		// Request sensor permission on first CTA (Module 0) — needs user gesture
		if (!sensorPermissionDone && currentModule === 0) {
			await sensorEng.requestPermission();
			sensorEng.startListening();
			sensorPermissionDone = true;
		}

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
				attention.returnToCenter();
				wander.setTarget(0, 0, 0.004);
				const tid = setTimeout(() => {
					blinkEng.blink.breathPhase = null; blinkEng.forceClose(400); phase = 'closing';
					const tid2 = setTimeout(() => exitCurrentModule(), 500);
					moduleTimeouts.push(tid2);
				}, 300);
				moduleTimeouts.push(tid);
			} else {
				// Sync attention to current glow position so closing wander is continuous
				attention.a.x = attGlowX / (2.5 * Math.max(0.1, glowDim));
				attention.a.y = attGlowY / (2.5 * Math.max(0.1, glowDim));
				attention.returnToCenter();
				blinkEng.blink.breathPhase = null; blinkEng.forceClose(400); phase = 'closing';
				const tid = setTimeout(() => exitCurrentModule(), 500);
				moduleTimeouts.push(tid);
			}
		}
	}

	function onPlayTextDone(): void {
		if (phase === 'waitPlay' && transitioning) {
			// Sync wander to attention so eye opens already looking where attention is
			if (currentModule === 0) {
				const eyeX = (attention.a.x / attention.a.maxX) * wander.w.maxX;
				const eyeY = (attention.a.y / attention.a.maxY) * wander.w.maxY;
				wander.w.offX = eyeX;
				wander.w.offY = eyeY;
			}
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
			buttonType = currentModule === 3 ? 'stop' : 'pause'; buttonVisible = true; hapticSoft();
			const tid2 = setTimeout(() => { hintVisible = true; }, 400);
			moduleTimeouts.push(tid2);
		}, 600);
		moduleTimeouts.push(tid);
	}

	// Smoothstep fade: returns 1→0 as t moves from start to end
	function sstep(t: number, start: number, end: number): number {
		const x = clamp((t - start) / (end - start), 0, 1);
		return 1 - x * x * (3 - 2 * x);
	}

	function eyeBreathClosed(br: number): void {
		const shift = br * 2.5;
		B.topL = TOP_SHUT_L + shift; B.topR = TOP_SHUT_R + shift;
		B.botL = BOT_SHUT_L; B.botR = BOT_SHUT_R;
		B.iRy = 0.2; B.iRx = IRIS_RX - 2; B.iCy = IRIS_BOT - 0.2; B.iOp = 0;
	}

	// ═══ QUIET WANDER — natural wandering on closed-eye screens ═══
	// Non-gentle: varied speeds, occasional jumps, organic pauses
	// Sometimes targets UI elements (brand, slogan), sometimes free wander
	function updateQuietAttention(dt: number): void {
		// Full range of wander behaviors — jumps, varied speed, short pauses
		attention.a.gentle = false;
		const prevAPhase = attention.a.phase;
		attention.update(dt);
		// Smart targeting: when new drift/jump starts, sometimes aim at UI elements
		if (prevAPhase === 'pause' && (attention.a.phase === 'drift' || attention.a.phase === 'jump')) {
			const roll = Math.random();
			if (roll < 0.2) {
				// Target brand/title area (upper center)
				attention.a.targetX = (Math.random() - 0.5) * 20;
				attention.a.targetY = -12 + (Math.random() - 0.5) * 8;
			} else if (roll < 0.35 && (phase === 'slogan' || phase === 'waitPlay')) {
				// Target slogan text area (lower center)
				attention.a.targetX = (Math.random() - 0.5) * 24;
				attention.a.targetY = 12 + (Math.random() - 0.5) * 10;
			} else if (roll < 0.5) {
				// Diagonal drift — varied directions
				const angle = Math.random() * Math.PI * 2;
				const dist = 0.4 + Math.random() * 0.6;
				attention.a.targetX = Math.cos(angle) * attention.a.maxX * dist;
				attention.a.targetY = Math.sin(angle) * attention.a.maxY * dist;
			}
			// else: keep engine's random target (free wander)
		}
	}

	function frame(now: number): void {
		if (!prevT) prevT = now;
		const dt = Math.min(now - prevT, 200);
		prevT = now;
		const br = breathCurve(now);
		breath = br;

		if (currentModule === 0) { dilationEng.update(dt); }

		if (phase === 'splash' || phase === 'morph' || phase === 'slogan' || phase === 'waitPlay' || phase === 'transition') {
			eyeBreathClosed(br);
			// Universal: closed eye = base glow level
			glowDim = 0.6;
			beatVal = 0;
			if (phase === 'transition') {
				// Transition: hold at base, don't ramp (position lerp handled in GLOW SYNC)
				if (glowBoost > 0.25) glowBoost = Math.max(0.25, glowBoost - dt * 0.0005);
			} else {
				// Quiet: defocused attention glow — ramp to target
				const qTarget = 0.7;
				if (glowBoost < qTarget) glowBoost = Math.min(qTarget, glowBoost + dt * 0.001);
				else if (glowBoost > qTarget) glowBoost = Math.max(qTarget, glowBoost - dt * 0.001);
			}
			// Quiet wander: ALL modules get attention-driven wandering during closed-eye
			if (phase !== 'transition') {
				updateQuietAttention(dt);
				if (currentModule === 0) wander.update(dt);
			}
			if (currentModule === 4 && (phase === 'splash' || phase === 'morph')) heartEng.update(dt, br, now);
		}

		if (phase === 'closing') {
			blinkEng.update(dt);
			// Universal: glow dims as eye closes
			const closeness = clamp(B.iRy / IRIS_RY, 0, 1);
			glowBoost = 0.25 + closeness * 0.75;
			glowDim = 0.6 + closeness * 0.4;
			attention.update(dt);
			if (currentModule === 0) wander.update(dt);
			heartFadeIn = 0; waveFadeIn = 0; heartOpacity = 0; waveOpacity = 0; beatVal = 0;
			focusDotVisible = false; focusDotOp = 0;
			// Fade out attention points during eye close
			attPoints.setDim(glowDim);
			attPoints.setBoost(glowBoost);
			attPoints.update(dt, now, br, beatVal);
			renderedPoints = attPoints.getPoints().map(p => ({ ...p }));
		}

		if (phase === 'opening') {
			blinkEng.update(dt);
			if (!eyeOpened && B.iRy > IRIS_RY * 0.8) eyeOpened = true;

			// ═══ UNIVERSAL: glow follows eye openness ═══
			const openness = clamp(B.iRy / IRIS_RY, 0, 1);
			glowBoost = 0.25 + openness * 0.75;
			glowDim = 0.6 + openness * 0.4;

			// Module-specific content
			if (currentModule === 0) {
				attention.update(dt);
				wander.update(dt);
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
			if (currentModule === 0) {
				attention.update(dt);
				const eyeTargetX = (attention.a.x / attention.a.maxX) * wander.w.maxX;
				const eyeTargetY = (attention.a.y / attention.a.maxY) * wander.w.maxY;
				let eyeSpeed: number;
				if (attention.a.phase === 'arrive') eyeSpeed = 0.008;
				else if (attention.a.phase === 'drift') eyeSpeed = 0.003;
				else eyeSpeed = 0.001;
				wander.setTarget(eyeTargetX, eyeTargetY, eyeSpeed);
				wander.update(dt);
				attentionHapticUpdate(dt);
				if (heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				// Live: full brightness — blinks don't affect background
				glowBoost = 1;
				glowDim = 1;
				if (ghostBlobOp > 0) ghostBlobOp = Math.max(0, ghostBlobOp - dt * 0.0004);
			}
			if (currentModule === 1) {
				sensorEng.update(dt);
				bpmCtrl.update(sensorEng.effectiveActivity());
				heartEng.state.externalHR = bpmCtrl.state.currentBPM;
				glowBoost = 0.7 + bpmCtrl.intensity() * 1.3;
				glowDim = 0.75 + br * 0.25 + heartEng.state.beatVal * 0.15;
				if (heartFadeIn < 1) { heartFadeIn = Math.min(1, heartFadeIn + dt * 0.0012); heartOpacity = heartFadeIn; }
				if (heartDelay < 700) heartDelay += dt;
				if (heartDelay >= 700) { heartEng.state.hapticEnabled = true; heartEng.update(dt, br, now); }
				beatVal = heartEng.state.beatVal * heartFadeIn;
			}
			if (currentModule === 2 || currentModule === 3) {
				if (waveFadeIn < 1) { waveFadeIn = Math.min(1, waveFadeIn + dt * 0.0012); waveOpacity = waveFadeIn * 0.85; }
				waveTime += 0.013;
				// Breath-reactive glow for wave modules
				if (currentModule === 2) {
					glowBoost = 0.65 + br * 0.4;
					glowDim = 0.7 + br * 0.3;
				}
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

				// Focus dot — follows the tip of breath-progress, same coords as dashoffset
				if (eyeRef) {
					let pathX: number, pathY: number;
					if (bt < DEFAULT_INHALE) {
						const fp = bt / DEFAULT_INHALE;
						const pt = eyeRef.getPointOnPath('top', fp);
						pathX = pt.x; pathY = pt.y;
					} else {
						const fp = (bt - DEFAULT_INHALE) / DEFAULT_EXHALE;
						const pt = eyeRef.getPointOnPath('bot', fp);
						pathX = pt.x; pathY = pt.y;
					}
					focusDotX = CX + (pathX - CX) * fade;
					focusDotY = CY + (pathY - CY) * fade;
					focusDotOp = fade * 0.6;
					focusDotVisible = true;
				}
			} else if (currentModule === 1 || currentModule === 2 || currentModule === 4) {
				showBreathEdge = true;
				useBreathProgress = false;
				// Module 1: sensor-reactive; Modules 2,4: breath-only (sensors stopped)
				const eff = currentModule === 1 ? sensorEng.effectiveActivity() : 0;
				const op = 0.15 + br * 0.55 + eff * 0.15;
				breathEdgeOpacity = op;
				breathEdgeTopOpacity = op;
				breathEdgeBotOpacity = op;
				breathEdgeTopDasharray = '';
				breathEdgeTopDashoffset = '';
				breathEdgeBotDasharray = '';
				breathEdgeBotDashoffset = '';
			}
			if (currentModule === 4) {
				// Sensors stopped after Module 1 — Module 4 runs on fixed 35 BPM
				bpmCtrl.update(0);
				heartEng.state.externalHR = bpmCtrl.state.currentBPM;
				glowBoost = 0.7 + bpmCtrl.intensity() * 1.3;
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

			// Module 3: glow blinks with eye (sharp off, gradual on)
			if (currentModule === 3) {
				const openness = clamp((B.iRy - 0.2) / (IRIS_RY - 0.2), 0, 1);
				glowBoost = openness;
				glowDim = 0.3 + openness * 0.7;
			}

			if (progressStart && !progressDone) {
				const elapsed = now - progressStart;
				progressValue = clamp(elapsed / PROGRESS_DUR, 0, 1);
				if (progressValue >= 1) onProgressDone();
			}
		}

		if (phase === 'farewell') {
			if (currentModule === 4) {
				// ═══ MODULE 4: single continuous fade driven by farewellT ═══
				farewellT = Math.min(1, farewellT + dt / FAREWELL_DUR);
				blinkEng.update(dt);
				bpmCtrl.update(0);
				heartEng.state.externalHR = bpmCtrl.state.currentBPM;
				heartEng.update(dt, br, now);

				// Everything derives from one progress — no steps, no timeouts
				heartOpacity = heartFadeIn * sstep(farewellT, 0, 0.45);
				contourOpacity = sstep(farewellT, 0, 0.40);
				glowBoost = sstep(farewellT, 0.05, 0.55);
				glowDim = sstep(farewellT, 0.05, 0.50);
				const ef = sstep(farewellT, 0, 0.35);
				const edgeBase = 0.15 + br * 0.55;
				breathEdgeOpacity = edgeBase * ef;
				breathEdgeTopOpacity = edgeBase * ef;
				breathEdgeBotOpacity = edgeBase * ef;
				if (farewellT > 0.40) showBreathEdge = false;
				beatVal = heartEng.state.beatVal * sstep(farewellT, 0, 0.35);

				// ТЕТА: natural dimming — power curve like dying light
				brandOpacity = Math.pow(1 - clamp(farewellT / 0.85, 0, 1), 1.6);

				// When fully done → dark phase
				if (farewellT >= 1) {
					glowVisible = false;
					heartEng.state.hapticOnly = true;
					phase = 'dark'; hapticSoft();
					// Start decelerating heart haptic
					let darkElapsed = 0;
					const DARK_DECAY_TAU = 92500;
					darkLastT = performance.now();
					darkHapticIv = setInterval(() => {
						const n = performance.now();
						const d = Math.min(n - (darkLastT ?? n), 50);
						darkLastT = n;
						darkElapsed += d;
						const decayedBPM = 35 * Math.exp(-darkElapsed / DARK_DECAY_TAU);
						if (decayedBPM < 5) {
							clearInterval(darkHapticIv!);
							darkHapticIv = null;
							heartEng.state.hapticEnabled = false;
							heartEng.state.hapticOnly = false;
							return;
						}
						heartEng.state.externalHR = decayedBPM;
						const b = breathCurve(n);
						heartEng.update(d, b, n);
					}, 50);
				}
			} else {
				// Non-module-4 farewell (existing behavior)
				heartEng.update(dt, br, now);
				if (!farewellStarted) {
					blinkEng.update(dt);
					if (B.iRy < 1) {
						farewellStarted = true; heartEng.state.hapticOnly = true;
						showBreathEdge = false; labelOpacity = 0;
						contourOpacity = 0; heartOpacity = 0;
						glowVisible = false;
						fadeOverlayOpacity = 1;
						brandFadeout = true;
						const tid = setTimeout(() => {
							phase = 'dark'; hapticSoft();
							const darkStartBPM = heartEng.state.externalHR ?? 35;
							let darkElapsed = 0;
							const DARK_DECAY_TAU = 92500;
							darkLastT = performance.now();
							darkHapticIv = setInterval(() => {
								const n = performance.now();
								const d = Math.min(n - (darkLastT ?? n), 50);
								darkLastT = n;
								darkElapsed += d;
								const decayedBPM = darkStartBPM * Math.exp(-darkElapsed / DARK_DECAY_TAU);
								if (decayedBPM < 5) {
									clearInterval(darkHapticIv!);
									darkHapticIv = null;
									heartEng.state.hapticEnabled = false;
									heartEng.state.hapticOnly = false;
									return;
								}
								heartEng.state.externalHR = decayedBPM;
								const b = breathCurve(n);
								heartEng.update(d, b, n);
							}, 50);
						}, 3500);
						moduleTimeouts.push(tid);
					}
				}
			}
		}

		if (phase === 'dark') {
			// Visual done — dark haptic handled by darkHapticInterval
		}

		// ═══ GLOW SYNC ═══
		// Smooth eye openness — low-pass filter for pleasant blink reaction
		const rawEyeOpen = clamp(B.iRy / IRIS_RY, 0, 1);
		// Closing follows faster so blink dimming is felt; opening a touch slower for softness
		const eyeLerpRate = rawEyeOpen > smoothEyeOpen ? 0.012 : 0.016;
		smoothEyeOpen += (rawEyeOpen - smoothEyeOpen) * Math.min(1, eyeLerpRate * dt);

		// Universal spotlight: follows smoothed eye openness on ALL modules
		if (phase === 'opening') {
			spotOp = smoothEyeOpen * smoothEyeOpen * glowDim;
		} else if (phase === 'live') {
			// Blink dims spotlight significantly: fully open → full brightness, closed → 15%
			spotOp = glowDim * (0.15 + smoothEyeOpen * 0.85);
		} else if (phase === 'closing') {
			spotOp = smoothEyeOpen * smoothEyeOpen * glowDim;
		} else if (phase === 'farewell' && currentModule === 4) {
			spotOp = sstep(farewellT, 0, 0.45) * glowDim;
		} else if (phase === 'splash' || phase === 'morph' || phase === 'slogan' || phase === 'waitPlay') {
			// Quiet phases: eigengrau handles ambient light, no spotlight circle
			spotOp = 0;
		} else {
			spotOp = 0;
		}

		// Position: who drives glow position?
		const isQuietPhase = phase === 'splash' || phase === 'morph' || phase === 'slogan' || phase === 'waitPlay' || phase === 'closing';
		if (phase === 'transition') {
			// Smooth return to center during transition
			const lr = Math.min(1, dt * 0.003);
			attGlowX *= (1 - lr);
			attGlowY *= (1 - lr);
			spotX *= (1 - lr);
			spotY *= (1 - lr);
		} else if (currentModule === 0 && !isQuietPhase) {
			// Module 0 opening/live: direct attention tracking
			attGlowX = attention.a.x * 2.5 * glowDim;
			attGlowY = attention.a.y * 2.5 * glowDim;
			spotX = attention.a.x * 4 * glowDim;
			spotY = attention.a.y * 4 * glowDim;
		} else if (isQuietPhase || currentModule === 0) {
			// Quiet phases: attention drives directly — jumps, pauses, darts like real attention
			attGlowX = attention.a.x * 2.0 * glowDim;
			attGlowY = attention.a.y * 2.0 * glowDim;
			spotX = attention.a.x * 3.0 * glowDim;
			spotY = attention.a.y * 3.0 * glowDim;
			// Spot-field offsets for eventual opening transition
			updateWanderState(layerWA, dt);
			updateWanderState(layerWB, dt);
			updateWanderState(layerWC, dt);
			qOffAx = layerWA.x; qOffAy = layerWA.y;
			qOffBx = layerWB.x; qOffBy = layerWB.y;
			qOffCx = layerWC.x; qOffCy = layerWC.y;
			// Nebula: fade in + rotate independently → shifting accents
			ambientOp = Math.min(1, ambientOp + dt * 0.0008);
			bRotA += dt * bRotSpA;
			bRotB += dt * bRotSpB;
		} else {
			// Modules 1-4 during opening/live: attention points engine
			attPoints.setDim(glowDim);
			attPoints.setBoost(glowBoost);
			attPoints.update(dt, now, br, beatVal);
			const pts = attPoints.getPoints();
			renderedPoints = pts.map(p => ({ ...p }));
			const bgPt = pts.find(p => p.config.id.endsWith('-glow'));
			attGlowX = bgPt ? bgPt.x : 0;
			attGlowY = bgPt ? bgPt.y : 0;
			spotX = attGlowX * 1.5;
			spotY = attGlowY * 1.5;
		}

		// ═══ SPOTLIGHT DYNAMICS ═══
		// Breath-reactive scale: expands on inhale, contracts on exhale
		spotScale = 0.85 + br * 0.3;
		// Heartbeat bump: quick scale pulse on each beat
		spotBeat = Math.max(0, spotBeat - dt * 0.003);
		if (beatVal > 0.3) spotBeat = Math.max(spotBeat, beatVal * 0.12);
		spotScale += spotBeat;
		// Blink sympathy: spotlight contracts noticeably when eye blinks
		if (phase === 'live' || phase === 'opening') {
			spotScale *= (0.7 + smoothEyeOpen * 0.3);
		}
		// Organic drift: randomized per-session Lissajous
		const st = now * 0.001;
		spotDriftX = Math.sin(st * 0.19 + driftPh[0]) * 12 + Math.sin(st * 0.53 + driftPh[1]) * 7
			+ Math.cos(st * 1.1 + driftPh[2]) * 3 + Math.sin(st * 2.3 + driftPh[3]) * Math.cos(st * 0.7) * 2;
		spotDriftY = Math.cos(st * 0.17 + driftPh[4]) * 10 + Math.sin(st * 0.41 + driftPh[5]) * 6
			+ Math.sin(st * 0.97 + driftPh[6]) * 3 + Math.cos(st * 1.9 + driftPh[7]) * Math.sin(st * 0.5) * 2;

		// Non-quiet: converge layer offsets + fade ambient shape
		if (!isQuietPhase) {
			const conv = Math.min(1, dt * 0.004);
			qOffAx *= (1 - conv); qOffAy *= (1 - conv);
			qOffBx *= (1 - conv); qOffBy *= (1 - conv);
			qOffCx *= (1 - conv); qOffCy *= (1 - conv);
			ambientOp = Math.max(0, ambientOp - dt * 0.002);
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
		eyeOpenness = clamp((B.iRy - 0.2) / (IRIS_RY - 0.2), 0, 1);

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
			moduleTimeouts.forEach(id => clearTimeout(id));
			sensorEng.stopListening();
		};
	});
</script>

<div class="splash">
	{#if glowVisible}
		<div class="glow-track" style:transform="translate({attGlowX}px, {attGlowY}px)">
			<Glow {breath} {beatVal} boost={glowBoost} />
			<div class="ghost-blob"
				class:visible={phase === 'closing' || phase === 'transition'}>
			</div>
		</div>
		<div class="spot-field spot-a"
			style:transform="translate(calc(-50% + {spotX + spotDriftX + qOffAx}px), calc(-50% + {spotY + spotDriftY + qOffAy}px)) scale({spotScale})"
			style:opacity={spotOp * (0.5 + breath * 0.35) + spotBeat * 0.2}>
		</div>
		<div class="spot-field spot-b"
			style:transform="translate(calc(-50% + {spotX - spotDriftY * 2.2 + qOffBx}px), calc(-50% + {spotY + spotDriftX * 1.8 + qOffBy}px)) scale({spotScale * 0.85})"
			style:opacity={spotOp * (0.4 + breath * 0.3) + spotBeat * 0.15}>
		</div>
		<div class="spot-field spot-c"
			style:transform="translate(calc(-50% + {spotX + spotDriftY * 1.3 + spotDriftX * 0.7 + qOffCx}px), calc(-50% + {spotY - spotDriftX * 1.5 + spotDriftY * 0.5 + qOffCy}px)) scale({spotScale * 1.1})"
			style:opacity={spotOp * (0.35 + breath * 0.25) + spotBeat * 0.1}>
		</div>
		<!-- Nebula disabled: back to diffused Glow -->
		{#if currentModule > 0}
			<AttentionPointLayer points={renderedPoints} />
		{/if}
	{/if}

	{#if currentModule === 4 && labelText}
		<div class="above-text" style:opacity={labelOpacity}>
			<Typewriter bind:this={aboveTwRef} text={labelText} ondone={onAboveTextDone} />
		</div>
	{/if}

	<div class="eye-container">
		<Eye bind:this={eyeRef} {eyeState} {irisCx} {irisCy} {irisRx} {irisRy}
			showCrease={currentModule !== 3}
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
		{#if focusDotVisible}
			<div class="focus-dot"
				style:left="{focusDotX}px"
				style:top="{focusDotY}px"
				style:opacity={focusDotOp}>
			</div>
		{/if}
	</div>

	<BrandMorph bind:this={brandMorph} initialText={MODULES[currentModule].brand}
		fading={brandFadeout} opacity={brandOpacity < 1 ? brandOpacity : undefined} />

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

<ProgressBar progress={progressValue} {breath} {beatVal} openness={eyeOpenness} visible={progressVisible} />
<FadeOverlay opacity={fadeOverlayOpacity} />

<style>
	.glow-track {
		position: absolute; top: 0; left: 0;
		width: 100%; height: 100%;
		pointer-events: none; z-index: 0;
		will-change: transform;
	}
	/* PERF: No filter:blur() on animated elements — blur forces repaint on every shape/layout change.
	   Use soft radial-gradients instead. Only use blur on STATIC elements with no animations. */
	.ghost-blob {
		position: absolute;
		width: 500px; height: 400px;
		top: 50%; left: 50%;
		border-radius: 45% 55% 60% 40% / 50% 45% 55% 50%;
		background: radial-gradient(ellipse 70% 60%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.03) 40%, transparent 70%);
		pointer-events: none;
		opacity: 0;
		transition: opacity 2.5s ease-out;
		animation: ghost-drift 18s ease-in-out infinite;
		transform: translate(-50%, -50%) scale(0.92);
		will-change: transform, opacity;
	}
	.ghost-blob.visible {
		opacity: 0.8;
		transition: opacity 4s ease-out;
	}
	.ghost-blob::after {
		content: '';
		position: absolute;
		width: 200px; height: 160px;
		top: 25%; left: 35%;
		border-radius: 55% 45% 50% 50%;
		background: radial-gradient(ellipse, rgba(120,130,255,0.12) 0%, transparent 60%);
		animation: accent-wander 11s ease-in-out infinite;
		will-change: transform;
	}
	@keyframes ghost-drift {
		0%, 100% { transform: translate(-50%, -50%) scale(0.92) rotate(0deg); }
		15% { transform: translate(calc(-50% + 25px), calc(-50% - 18px)) scale(0.98) rotate(2deg); }
		35% { transform: translate(calc(-50% - 30px), calc(-50% + 15px)) scale(1.08) rotate(-3deg); }
		55% { transform: translate(calc(-50% + 15px), calc(-50% + 25px)) scale(0.95) rotate(1deg); }
		75% { transform: translate(calc(-50% - 12px), calc(-50% - 22px)) scale(1.05) rotate(-2deg); }
	}
	@keyframes accent-wander {
		0%, 100% { transform: translate(0, 0); }
		20% { transform: translate(23%, 20%); }
		45% { transform: translate(-10%, 30%); }
		70% { transform: translate(20%, 5%); }
	}
	.spot-field {
		position: absolute;
		top: 50%; left: 50%;
		pointer-events: none; z-index: 0;
		will-change: transform, opacity;
	}
	.spot-a {
		width: 1200px; height: 900px;
		border-radius: 50%;
		background:
			radial-gradient(ellipse 70% 45% at 35% 42%, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.08) 30%, transparent 58%),
			radial-gradient(ellipse 45% 65% at 65% 55%, rgba(120,130,255,0.14) 0%, rgba(120,130,255,0.04) 28%, transparent 52%),
			radial-gradient(ellipse 30% 30% at 48% 48%, rgba(140,145,255,0.08) 0%, transparent 42%);
	}
	.spot-b {
		width: 1000px; height: 1100px;
		border-radius: 50%;
		background:
			radial-gradient(ellipse 50% 70% at 52% 38%, rgba(110,118,255,0.18) 0%, rgba(110,118,255,0.06) 28%, transparent 52%),
			radial-gradient(ellipse 65% 40% at 38% 62%, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.03) 25%, transparent 48%);
	}
	.spot-c {
		width: 600px; height: 500px;
		border-radius: 50%;
		background:
			radial-gradient(ellipse 55% 50% at 50% 50%, rgba(130,138,255,0.14) 0%, rgba(120,130,255,0.04) 28%, transparent 52%);
	}
	.splash {
		position: relative; z-index: 1;
		display: flex; flex-direction: column; align-items: center;
		height: 450px; min-width: 360px;
		gap: 0; user-select: none; -webkit-user-select: none;
		animation: splash-in 0.8s ease both;
	}
	@keyframes splash-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.above-text {
		position: absolute; top: -12px; left: 0; right: 0;
		font-size: 14px; font-weight: 300; font-style: italic;
		letter-spacing: 1px; color: rgba(255,255,255,0.65);
		text-align: center; line-height: 1.6;
		z-index: 2; transition: opacity 1s ease;
		pointer-events: none;
	}
	.eye-container {
		position: relative;
	}
	.focus-dot {
		position: absolute;
		width: 20px; height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0.12) 40%, transparent 70%);
		transform: translate(-50%, -50%);
		pointer-events: none;
		filter: blur(5px);
		z-index: 2;
		will-change: left, top, opacity;
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
