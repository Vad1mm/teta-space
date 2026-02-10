/** Training screen — core game loop */
import { t } from '../core/i18n.js';
import { state } from '../core/state.js';
import { Trainer, TrainerState } from '../engine/trainer.js';
import { formatTime } from '../utils/timing.js';
import { playCorrect, playError, playStart, playComplete, initAudio } from '../audio/audio-manager.js';
import { Numpad } from '../components/numpad.js';

const STREAK_MESSAGES = ['', '', '', 'Combo x3!', 'Combo x4!', 'On Fire! x5', 'Unstoppable!', 'LEGENDARY!'];

export class TrainingScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
    this._trainer = null;
    this._numpad = null;
    this._inputBuffer = '';
    this._numberEl = null;
    this._timerEl = null;
    this._progressEl = null;
    this._feedbackEl = null;
    this._promptEl = null;
    this._countdownEl = null;
    this._inputDisplayEl = null;
    this._centerEl = null;
    this._streakEl = null;
    this._lastHandledState = null;
    this._streakTimeout = null;
  }

  mount(container, params = {}) {
    this._el = document.createElement('div');
    this._el.className = 'screen training-screen';

    this._el.innerHTML = `
      <div class="training-header">
        <div class="training-top-row">
          <button class="training-back" data-action="back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="progress-bar" style="flex:1">
            <div class="progress-bar-fill" data-ref="progress"></div>
          </div>
        </div>
        <div class="training-meta">
          <div class="timer" data-ref="timer">--:--</div>
          <div class="training-meta-item">${t('training.session')} ${(state.get('user.totalSessions') || 0) + 1}</div>
        </div>
      </div>

      <div class="training-center" data-ref="center">
        <div class="streak-banner" data-ref="streak"></div>
        <div class="countdown-display" data-ref="countdown"></div>
        <div class="number-display" data-ref="number"></div>
        <div class="training-prompt" data-ref="prompt"></div>

        <div class="feedback-overlay" data-ref="feedback">
          <div class="feedback-label" data-ref="feedback-label"></div>
          <div class="feedback-digits" data-ref="feedback-digits"></div>
          <div class="feedback-correct-answer" data-ref="feedback-correct"></div>
          <div class="feedback-speed" data-ref="feedback-speed"></div>
        </div>
      </div>

      <div class="training-bottom">
        <div class="input-display" data-ref="input-display"></div>
        <div class="numpad-container" data-ref="numpad-container"></div>
      </div>
    `;

    container.appendChild(this._el);

    // Cache refs
    this._numberEl = this._el.querySelector('[data-ref="number"]');
    this._timerEl = this._el.querySelector('[data-ref="timer"]');
    this._progressEl = this._el.querySelector('[data-ref="progress"]');
    this._feedbackEl = this._el.querySelector('[data-ref="feedback"]');
    this._promptEl = this._el.querySelector('[data-ref="prompt"]');
    this._countdownEl = this._el.querySelector('[data-ref="countdown"]');
    this._inputDisplayEl = this._el.querySelector('[data-ref="input-display"]');
    this._centerEl = this._el.querySelector('[data-ref="center"]');
    this._streakEl = this._el.querySelector('[data-ref="streak"]');
    this._feedbackLabelEl = this._el.querySelector('[data-ref="feedback-label"]');
    this._feedbackDigitsEl = this._el.querySelector('[data-ref="feedback-digits"]');
    this._feedbackCorrectEl = this._el.querySelector('[data-ref="feedback-correct"]');
    this._feedbackSpeedEl = this._el.querySelector('[data-ref="feedback-speed"]');

    // Create numpad
    this._numpad = new Numpad(
      (digit) => this._onDigitPress(digit),
      () => this._onDeletePress()
    );
    this._el.querySelector('[data-ref="numpad-container"]').appendChild(this._numpad.render());
    this._numpad.setDisabled(true);

    // Back button
    this._el.querySelector('[data-action="back"]').addEventListener('click', () => {
      this._app.navigate('home');
    });

    // Init audio on first interaction (mobile requirement)
    const soundEnabled = state.get('settings.soundEnabled') !== false;
    this._soundEnabled = soundEnabled;
    if (soundEnabled) {
      initAudio();
    }

    // Start trainer
    this._startTraining();

    return this._el;
  }

  _startTraining() {
    const settings = {
      mode: state.get('settings.mode') || 'standard',
      digitLength: state.get('settings.startingDigitLength') || 4,
      displaySpeedMs: state.get('settings.startingSpeedMs') || 800,
      sessionDurationMs: state.get('settings.sessionDurationMs') || 1 * 60 * 1000,
      onStateChange: (trainerState, status) => this._onTrainerStateChange(trainerState, status),
    };

    this._trainer = new Trainer(settings);
    this._trainer.start();
  }

  _onTrainerStateChange(trainerState, status) {
    // Update timer (only after countdown)
    if (trainerState !== TrainerState.COUNTDOWN) {
      this._timerEl.textContent = formatTime(status.timeRemainingMs);
      if (status.timeRemainingMs < 30000) {
        this._timerEl.classList.add('warning');
      }

      // Update progress bar (time-based)
      const elapsed = status.sessionDurationMs - status.timeRemainingMs;
      const percent = Math.min(100, (elapsed / status.sessionDurationMs) * 100);
      this._progressEl.style.width = `${percent}%`;
    }

    // Only handle state transitions, not repeated timer updates
    if (trainerState === this._lastHandledState && trainerState !== TrainerState.COMPLETE && trainerState !== TrainerState.COUNTDOWN) {
      return;
    }

    switch (trainerState) {
      case TrainerState.COUNTDOWN:
        this._showCountdown(status.countdown);
        break;

      case TrainerState.SHOWING:
        this._showNumber(status.currentNumber);
        break;

      case TrainerState.WAITING_INPUT:
        this._hideNumber();
        this._enableInput();
        break;

      case TrainerState.FEEDBACK:
        if (status.lastRound) {
          this._showFeedback(status.lastRound, status);
        }
        break;

      case TrainerState.COMPLETE:
        this._onComplete();
        break;
    }

    this._lastHandledState = trainerState;
  }

  _showCountdown(value) {
    this._countdownEl.textContent = value;
    this._countdownEl.classList.add('visible');
    this._numberEl.classList.add('hidden');
    this._promptEl.textContent = '';
    this._feedbackEl.classList.remove('visible', 'correct', 'error');
    this._inputDisplayEl.innerHTML = '';
    this._numpad.setDisabled(true);

    // Pulse animation per tick
    this._countdownEl.classList.remove('animate-countdown-pulse');
    void this._countdownEl.offsetWidth; // reflow
    this._countdownEl.classList.add('animate-countdown-pulse');

    if (value === 1 && this._soundEnabled) {
      playStart();
    }
  }

  _showNumber(number) {
    this._countdownEl.classList.remove('visible');
    this._feedbackEl.classList.remove('visible', 'correct', 'error');
    this._numberEl.textContent = number;
    this._numberEl.classList.remove('hidden', 'correct', 'error');
    this._numberEl.classList.add('animate-number-appear');
    this._promptEl.textContent = t('training.prompt');
    this._inputBuffer = '';
    this._inputDisplayEl.innerHTML = '';
    this._numpad.setDisabled(true);
  }

  _hideNumber() {
    this._numberEl.textContent = '';
    this._numberEl.classList.add('hidden');
    this._numberEl.classList.remove('animate-number-appear');
    this._promptEl.textContent = '';
  }

  _enableInput() {
    this._inputBuffer = '';
    this._numpad.setDisabled(false);
    this._renderInputDisplay();
  }

  _renderInputDisplay() {
    if (!this._trainer) return;
    const len = this._trainer.digitLength;
    let html = '';
    for (let i = 0; i < len; i++) {
      if (i < this._inputBuffer.length) {
        html += `<span class="input-digit filled">${this._inputBuffer[i]}</span>`;
      } else if (i === this._inputBuffer.length) {
        html += `<span class="input-digit active">_</span>`;
      } else {
        html += `<span class="input-digit">_</span>`;
      }
    }
    this._inputDisplayEl.innerHTML = html;
  }

  _onDigitPress(digit) {
    if (!this._trainer || this._trainer.state !== TrainerState.WAITING_INPUT) return;

    this._inputBuffer += digit;
    this._renderInputDisplay();

    // Auto-submit when enough digits entered
    if (this._inputBuffer.length >= this._trainer.digitLength) {
      this._numpad.setDisabled(true);
      this._trainer.submitAnswer(this._inputBuffer.slice(0, this._trainer.digitLength));
    }
  }

  _onDeletePress() {
    if (!this._trainer || this._trainer.state !== TrainerState.WAITING_INPUT) return;
    if (this._inputBuffer.length > 0) {
      this._inputBuffer = this._inputBuffer.slice(0, -1);
      this._renderInputDisplay();
    }
  }

  _showFeedback(round, status) {
    this._numpad.setDisabled(true);
    const isCorrect = round.correct;
    const streak = status.consecutiveCorrects;

    // Clear previous
    this._feedbackEl.classList.remove('correct', 'error');

    if (isCorrect) {
      this._feedbackEl.classList.add('visible', 'correct');
      this._feedbackLabelEl.textContent = t('feedback.correct');
      this._feedbackLabelEl.className = 'feedback-label correct';
      this._feedbackDigitsEl.innerHTML = `<span class="digit-compare-correct">${round.number}</span>`;
      this._feedbackCorrectEl.textContent = '';
      this._feedbackSpeedEl.textContent = t('feedback.new_speed', { value: status.displaySpeedMs });
      this._numberEl.textContent = '';
      this._inputDisplayEl.innerHTML = '';
      if (this._soundEnabled) playCorrect();

      // Streak combo effect
      if (streak >= 3) {
        this._showStreak(streak);
      }
    } else {
      this._feedbackEl.classList.add('visible', 'error');
      this._feedbackLabelEl.textContent = t('feedback.error');
      this._feedbackLabelEl.className = 'feedback-label error';

      // Per-digit comparison
      this._feedbackDigitsEl.innerHTML = this._renderDigitComparison(round.answer, round.number);
      this._feedbackCorrectEl.textContent = round.number;
      this._feedbackSpeedEl.textContent = '';
      this._numberEl.textContent = '';
      this._inputDisplayEl.innerHTML = '';
      if (this._soundEnabled) playError();

      // Shake animation
      this._feedbackDigitsEl.classList.add('animate-error-shake');
      setTimeout(() => this._feedbackDigitsEl.classList.remove('animate-error-shake'), 400);

      // Hide streak
      this._hideStreak();
    }
  }

  _showStreak(count) {
    const idx = Math.min(count, STREAK_MESSAGES.length - 1);
    const msg = STREAK_MESSAGES[idx] || `Combo x${count}!`;
    this._streakEl.textContent = msg;
    this._streakEl.classList.remove('visible', 'streak-3', 'streak-5', 'streak-7');
    void this._streakEl.offsetWidth;

    if (count >= 7) this._streakEl.classList.add('streak-7');
    else if (count >= 5) this._streakEl.classList.add('streak-5');
    else this._streakEl.classList.add('streak-3');

    this._streakEl.classList.add('visible');

    // Spawn particles
    this._spawnParticles(count);

    clearTimeout(this._streakTimeout);
    this._streakTimeout = setTimeout(() => this._hideStreak(), 1500);
  }

  _hideStreak() {
    clearTimeout(this._streakTimeout);
    this._streakEl.classList.remove('visible');
  }

  _spawnParticles(count) {
    const num = Math.min(count * 3, 20);
    const center = this._centerEl;
    for (let i = 0; i < num; i++) {
      const p = document.createElement('div');
      p.className = 'streak-particle';
      const angle = (Math.PI * 2 * i) / num + (Math.random() - 0.5) * 0.5;
      const dist = 60 + Math.random() * 80;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.left = '50%';
      p.style.top = '50%';
      center.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  _renderDigitComparison(answer, correct) {
    let html = '';
    for (let i = 0; i < correct.length; i++) {
      const a = answer[i] || '';
      const c = correct[i];
      if (a === c) {
        html += `<span class="digit-compare-ok">${a}</span>`;
      } else {
        html += `<span class="digit-compare-wrong">${a || '·'}</span>`;
      }
    }
    return html;
  }

  _onComplete() {
    if (this._soundEnabled) playComplete();
    const stats = this._trainer.getSessionStats();
    this._app.navigate('complete', { stats });
  }

  unmount() {
    clearTimeout(this._streakTimeout);
    if (this._trainer) {
      this._trainer.stop();
      this._trainer = null;
    }
    if (this._numpad) {
      this._numpad.destroy();
      this._numpad = null;
    }
  }

  getElement() {
    return this._el;
  }
}
