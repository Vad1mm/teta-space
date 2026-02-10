/** Animated Theta (Θ) almond-eye logo — ported from teta-eye-almond.html */

export class ThetaLogo {
  /**
   * @param {number} size - pixel size
   * @param {'calm'|'focus'|'flow'|'zen'} state - wave state
   * @param {'intro'|'alive'|'static'} mode - operational mode
   */
  constructor(size = 120, state = 'calm', mode = 'alive') {
    this._size = size;
    this._mode = mode;
    this._el = null;
    this._animId = null;
    this._prevNow = 0;

    // Geometry constants
    this.CX = 110; this.CY = 110;
    this.TOP_OPEN = 44; this.BOT_OPEN = 176;
    this.TOP_SHUT = 170; this.BOT_SHUT = 176;
    this.IRIS_RX = 28; this.IRIS_RY = 40;
    this.IRIS_BOT = this.CY + this.IRIS_RY; // 150

    // SVG refs
    this._eyePath = null;
    this._iris = null;
    this._clipEllipse = null;
    this._wavePath = null;
    this._glowEl = null;

    // Wave state
    this._wT = 0;
    this._wA = 0; this._wAT = 0;
    this._wF = 0; this._wFT = 0;
    this._wS = 0; this._wST = 0;

    this._states = {
      calm:  { a: 12,  f: 0.05,  s: 0.015 },
      focus: { a: 18,  f: 0.065, s: 0.028 },
      flow:  { a: 24,  f: 0.085, s: 0.044 },
      zen:   { a: 3,   f: 0.028, s: 0.006 },
    };

    // Eye state for blink engine
    this._B = {
      topY: this.TOP_OPEN, botY: this.BOT_OPEN,
      iRy: this.IRIS_RY, iRx: this.IRIS_RX,
      iCy: this.CY, iOp: 1,
    };

    // Blink engine
    this._bPhase = 'idle';
    this._bElapsed = 0;
    this._bWaitDur = 3000;
    this._bCloseDur = 0; this._bShutDur = 0;
    this._bOpenDur = 0; this._bSettleDur = 0; this._bSettleAmp = 0;

    // Intro
    this._introT0 = null;
    this._eyeLen = 0;
    this._irisLen = 0;
    this._phase = mode === 'intro' ? 'intro' : 'alive';

    // Callback
    this.onIntroComplete = null;

    this._initWaveState(state);
  }

  _initWaveState(name) {
    const s = this._states[name] || this._states.calm;
    this._wA = s.a; this._wAT = s.a;
    this._wF = s.f; this._wFT = s.f;
    this._wS = s.s; this._wST = s.s;
  }

  setState(name) {
    const s = this._states[name];
    if (!s) return;
    this._wAT = s.a; this._wFT = s.f; this._wST = s.s;
  }

  setMode(mode) {
    this._mode = mode;
    if (mode === 'intro') {
      this._phase = 'intro';
      this._introT0 = null;
    } else if (mode === 'alive') {
      this._phase = 'alive';
      this._bPhase = 'idle';
      this._bElapsed = 0;
      this._bWaitDur = 200 + Math.random() * 300;
    } else {
      this._phase = 'alive'; // static just skips blink
    }
  }

  render() {
    this._el = document.createElement('div');
    this._el.className = 'theta-logo-container';
    this._el.style.cssText = `width:${this._size}px;height:${this._size}px;position:relative;`;

    const uid = 'tl' + Math.random().toString(36).slice(2, 8);

    this._el.innerHTML = `
      <div class="tl-glow"></div>
      <svg viewBox="0 0 220 220" width="${this._size}" height="${this._size}" style="position:relative;z-index:1;">
        <defs>
          <linearGradient id="${uid}_wg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.03)" />
            <stop offset="20%" stop-color="rgba(150,155,255,0.55)" />
            <stop offset="50%" stop-color="rgba(255,255,255,0.92)" />
            <stop offset="80%" stop-color="rgba(150,155,255,0.55)" />
            <stop offset="100%" stop-color="rgba(255,255,255,0.03)" />
          </linearGradient>
          <clipPath id="${uid}_ic">
            <ellipse cx="110" cy="110" rx="${this.IRIS_RX}" ry="${this.IRIS_RY}" />
          </clipPath>
        </defs>
        <path class="tl-eye"
              d="${this._eyeD(this.TOP_OPEN, this.BOT_OPEN)}"
              fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="2" stroke-linejoin="round" />
        <ellipse class="tl-iris"
                 cx="110" cy="110" rx="${this.IRIS_RX}" ry="${this.IRIS_RY}"
                 fill="none" stroke="rgba(255,255,255,0.88)" stroke-width="1.8" />
        <g clip-path="url(#${uid}_ic)">
          <path class="tl-wave" d=""
                fill="none" stroke="url(#${uid}_wg)" stroke-width="1.8" stroke-linecap="round"
                opacity="0" />
        </g>
      </svg>
    `;

    this._eyePath = this._el.querySelector('.tl-eye');
    this._iris = this._el.querySelector('.tl-iris');
    this._clipEllipse = this._el.querySelector(`#${uid}_ic ellipse`);
    this._wavePath = this._el.querySelector('.tl-wave');
    this._glowEl = this._el.querySelector('.tl-glow');

    // Intro: compute dash lengths
    if (this._mode === 'intro') {
      requestAnimationFrame(() => this._initIntro());
    } else if (this._mode === 'static') {
      // Static: show everything, glow at low opacity
      this._wavePath.style.opacity = '1';
      this._glowEl.style.opacity = '0.4';
    } else {
      // Alive: show everything, start blinking
      this._wavePath.style.opacity = '1';
      this._bPhase = 'idle';
      this._bElapsed = 0;
      this._bWaitDur = 200 + Math.random() * 300;
    }

    this._startAnimation();
    return this._el;
  }

  _initIntro() {
    // Eye path dash
    this._eyeLen = this._eyePath.getTotalLength();
    this._eyePath.style.strokeDasharray = this._eyeLen;
    this._eyePath.style.strokeDashoffset = this._eyeLen;

    // Iris ellipse dash (Ramanujan approximation)
    const a = this.IRIS_RX, b = this.IRIS_RY;
    this._irisLen = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    this._iris.style.strokeDasharray = this._irisLen;
    this._iris.style.strokeDashoffset = this._irisLen;

    this._wavePath.style.opacity = '0';
    this._glowEl.style.opacity = '0';
  }

  // ═══ GEOMETRY ═══

  _eyeD(topY, botY) {
    return `M 25,${this.CY} C 60,${topY} 160,${topY} 195,${this.CY} C 160,${botY} 60,${botY} 25,${this.CY} Z`;
  }

  // ═══ EASING ═══

  _easeInOutQuart(t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  _easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
  _easeInCubic(t) { return t * t * t; }
  _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  _lp(a, b, t) { return a + (b - a) * t; }
  _clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ═══ WAVE ═══

  _renderWave(opacity) {
    this._wA = this._lp(this._wA, this._wAT, 0.02);
    this._wF = this._lp(this._wF, this._wFT, 0.02);
    this._wS = this._lp(this._wS, this._wST, 0.02);
    this._wT += this._wS;

    let d = '';
    for (let x = 24; x <= 196; x += 1.5) {
      const r = Math.abs(x - this.CX) / 86;
      const e = Math.cos(this._clamp(r, 0, 1) * Math.PI * 0.5);
      const y = this.CY + Math.sin(x * this._wF + this._wT) * this._wA * e * e;
      d += (d ? ' L ' : 'M ') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    this._wavePath.setAttribute('d', d);
    this._wavePath.style.opacity = opacity;
  }

  // ═══ BLINK ENGINE ═══

  _blinkBegin() {
    this._bPhase = 'closing';
    this._bElapsed = 0;
    this._bCloseDur = 65 + Math.random() * 25;
    this._bShutDur = 30 + Math.random() * 45;
    this._bOpenDur = 200 + Math.random() * 130;
    this._bSettleDur = 200 + Math.random() * 100;
    this._bSettleAmp = 0.8 + Math.random() * 1.4;
  }

  _blinkNext() {
    this._bPhase = 'idle';
    this._bElapsed = 0;
    const r = Math.random();
    if (r < 0.18) this._bWaitDur = 100 + Math.random() * 220;       // double
    else if (r < 0.28) this._bWaitDur = 1200 + Math.random() * 800;  // short
    else this._bWaitDur = 2800 + Math.random() * 4500;                // normal
  }

  _blinkUpdate(dt) {
    this._bElapsed += dt;
    const B = this._B;

    if (this._bPhase === 'idle') {
      if (this._bElapsed >= this._bWaitDur) this._blinkBegin();
      // Micro-breathing
      const n = performance.now();
      const br = Math.sin(n * 0.0007) * 0.5 + Math.sin(n * 0.0013) * 0.2;
      B.topY = this.TOP_OPEN - br * 0.8;
      B.botY = this.BOT_OPEN + br * 0.2;
      B.iRy = this.IRIS_RY + br * 0.3;
      B.iCy = this.IRIS_BOT - B.iRy;
      B.iRx = this.IRIS_RX;
      B.iOp = 1;
      return;
    }

    if (this._bPhase === 'closing') {
      const t = this._clamp(this._bElapsed / this._bCloseDur, 0, 1);
      const pTop = this._easeInCubic(t);
      const pBot = t * 0.15;
      B.topY = this._lp(this.TOP_OPEN, this.TOP_SHUT, pTop);
      B.botY = this._lp(this.BOT_OPEN, this.BOT_SHUT, pBot);
      B.iRy = this._lp(this.IRIS_RY, 0.2, pTop);
      B.iCy = this.IRIS_BOT - B.iRy;
      B.iRx = this._lp(this.IRIS_RX, this.IRIS_RX - 1.5, pTop);
      B.iOp = B.iRy > 3 ? 1 : this._clamp(B.iRy / 3, 0, 1);
      if (this._bElapsed >= this._bCloseDur) { this._bPhase = 'shut'; this._bElapsed = 0; }
      return;
    }

    if (this._bPhase === 'shut') {
      B.topY = this.TOP_SHUT;
      B.botY = this._lp(this.BOT_OPEN, this.BOT_SHUT, 0.15);
      B.iRy = 0.2; B.iCy = this.IRIS_BOT - 0.2;
      B.iRx = this.IRIS_RX - 1.5; B.iOp = 0;
      if (this._bElapsed >= this._bShutDur) { this._bPhase = 'opening'; this._bElapsed = 0; }
      return;
    }

    if (this._bPhase === 'opening') {
      const t = this._clamp(this._bElapsed / this._bOpenDur, 0, 1);
      const pTop = this._easeOutQuart(t);
      const pBot = this._easeOutCubic(t * 0.5);
      B.topY = this._lp(this.TOP_SHUT, this.TOP_OPEN, pTop);
      B.botY = this._lp(this._lp(this.BOT_OPEN, this.BOT_SHUT, 0.15), this.BOT_OPEN, pBot);
      B.iRy = this._lp(0.2, this.IRIS_RY, pTop);
      B.iCy = this.IRIS_BOT - B.iRy;
      B.iRx = this._lp(this.IRIS_RX - 1.5, this.IRIS_RX, pTop);
      B.iOp = B.iRy > 3 ? 1 : this._clamp(B.iRy / 3, 0, 1);
      if (this._bElapsed >= this._bOpenDur) { this._bPhase = 'settle'; this._bElapsed = 0; }
      return;
    }

    if (this._bPhase === 'settle') {
      const t = this._clamp(this._bElapsed / this._bSettleDur, 0, 1);
      const damp = Math.pow(1 - t, 2.5);
      const osc = Math.sin(t * Math.PI * 3) * this._bSettleAmp * damp;
      B.topY = this.TOP_OPEN - osc * 1.2;
      B.botY = this.BOT_OPEN + osc * 0.2;
      B.iRy = this.IRIS_RY + osc * 0.4;
      B.iCy = this.IRIS_BOT - B.iRy;
      B.iRx = this.IRIS_RX;
      B.iOp = 1;
      if (this._bElapsed >= this._bSettleDur) {
        B.topY = this.TOP_OPEN; B.botY = this.BOT_OPEN;
        B.iRy = this.IRIS_RY; B.iCy = this.CY; B.iRx = this.IRIS_RX;
        this._blinkNext();
      }
      return;
    }
  }

  _applyEye() {
    const B = this._B;
    this._eyePath.setAttribute('d', this._eyeD(B.topY, B.botY));
    this._iris.setAttribute('cy', B.iCy);
    this._iris.setAttribute('ry', Math.max(0, B.iRy));
    this._iris.setAttribute('rx', B.iRx);
    this._iris.style.opacity = B.iOp;
    this._clipEllipse.setAttribute('cy', B.iCy);
    this._clipEllipse.setAttribute('ry', Math.max(0, B.iRy));
    this._clipEllipse.setAttribute('rx', B.iRx);
  }

  // ═══ GLOW ═══

  _glowTick(now) {
    const s = Math.sin(now * 0.0007) * 0.15 + 0.6;
    const sc = 1 + Math.sin(now * 0.0005) * 0.04;
    this._glowEl.style.opacity = s;
    this._glowEl.style.transform = `translate(-50%,-55%) scale(${sc})`;
  }

  // ═══ INTRO ═══

  _introTick(now) {
    if (this._introT0 === null) this._introT0 = now;
    const ms = now - this._introT0;

    const TL = {
      glowIn:   [0,    2800],
      eyeDraw:  [400,  2600],
      irisDraw: [1000, 2800],
      waveIn:   [2400, 3100],
      alive:    4200,
    };

    const prog = (ms, r) => {
      if (ms < r[0]) return 0;
      if (ms > r[1]) return 1;
      return (ms - r[0]) / (r[1] - r[0]);
    };

    // Glow
    const gp = this._easeOutCubic(prog(ms, TL.glowIn));
    this._glowEl.style.opacity = gp * 0.65;
    this._glowEl.style.transform = `translate(-50%,-55%) scale(${0.8 + gp * 0.2})`;

    // Eye draw
    if (this._eyeLen > 0) {
      this._eyePath.style.strokeDashoffset = this._eyeLen * (1 - this._easeInOutQuart(prog(ms, TL.eyeDraw)));
    }

    // Iris draw
    if (this._irisLen > 0) {
      this._iris.style.strokeDashoffset = this._irisLen * (1 - this._easeInOutQuart(prog(ms, TL.irisDraw)));
    }

    // Wave
    this._renderWave(this._easeOutCubic(prog(ms, TL.waveIn)));

    // Transition to alive
    if (ms >= TL.alive) {
      this._eyePath.style.strokeDasharray = 'none';
      this._eyePath.style.strokeDashoffset = '0';
      this._iris.style.strokeDasharray = 'none';
      this._iris.style.strokeDashoffset = '0';
      this._phase = 'alive';
      this._bPhase = 'idle';
      this._bElapsed = 0;
      this._bWaitDur = 200 + Math.random() * 300;
      if (this.onIntroComplete) this.onIntroComplete();
    }
  }

  // ═══ MAIN LOOP ═══

  _startAnimation() {
    const tick = (now) => {
      const dt = this._prevNow ? Math.min(now - this._prevNow, 50) : 16;
      this._prevNow = now;

      if (this._phase === 'intro') {
        this._introTick(now);
      } else {
        // Wave
        if (this._mode === 'static') {
          this._renderWave(1);
        } else {
          const op = this._clamp((this._B.iRy - 0.2) / (this.IRIS_RY - 0.2), 0, 1);
          this._renderWave(op > 0.3 ? 1 : op / 0.3);
          this._blinkUpdate(dt);
          this._applyEye();
          this._glowTick(now);
        }
      }

      this._animId = requestAnimationFrame(tick);
    };
    this._animId = requestAnimationFrame(tick);
  }

  destroy() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  getElement() {
    return this._el;
  }
}
