/** Core training engine: state machine, timing, adaptive difficulty */
import { generateNumber, digitsToString } from './number-generator.js';
import { getMode, adjustSpeed, shouldIncreaseLength, shouldDecreaseLength } from './difficulty.js';

export const TrainerState = {
  IDLE: 'idle',
  COUNTDOWN: 'countdown',
  SHOWING: 'showing',
  WAITING_INPUT: 'waiting_input',
  FEEDBACK: 'feedback',
  PAUSED: 'paused',
  COMPLETE: 'complete',
};

export class Trainer {
  constructor(config = {}) {
    this.state = TrainerState.IDLE;
    this.mode = getMode(config.mode || 'standard');
    this.digitLength = config.digitLength || 4;
    this.displaySpeedMs = config.displaySpeedMs || 800;
    this.sessionDurationMs = config.sessionDurationMs || 1 * 60 * 1000;
    this.onStateChange = config.onStateChange || (() => {});

    // Session tracking
    this.rounds = [];
    this.currentNumber = null;
    this.currentDigits = null;
    this.roundStartTime = 0;
    this.sessionStartTime = 0;
    this.consecutiveErrors = 0;
    this.consecutiveCorrects = 0;
    this.correctsAtCurrentLength = 0;
    this.errorsAtCurrentLength = 0;
    this._lastRound = null;

    // Timing
    this._showingRAF = null;
    this._feedbackTimeout = null;
    this._timerInterval = null;
    this.timeRemainingMs = this.sessionDurationMs;
  }

  start() {
    this.state = TrainerState.IDLE;
    this.rounds = [];
    this.consecutiveErrors = 0;
    this.consecutiveCorrects = 0;
    this.correctsAtCurrentLength = 0;
    this.errorsAtCurrentLength = 0;
    this.timeRemainingMs = this.sessionDurationMs;
    this._countdownValue = 3;

    // Start with countdown
    this._startCountdown();
  }

  _startCountdown() {
    this.state = TrainerState.COUNTDOWN;
    this._countdownValue = 3;
    this.onStateChange(this.state, { ...this.getStatus(), countdown: 3 });

    this._countdownInterval = setInterval(() => {
      this._countdownValue--;
      if (this._countdownValue <= 0) {
        clearInterval(this._countdownInterval);
        this._beginSession();
      } else {
        this.onStateChange(this.state, { ...this.getStatus(), countdown: this._countdownValue });
      }
    }, 1000);
  }

  _beginSession() {
    this.sessionStartTime = performance.now();
    this.timeRemainingMs = this.sessionDurationMs;

    // Start timer
    this._timerInterval = setInterval(() => {
      const elapsed = performance.now() - this.sessionStartTime;
      this.timeRemainingMs = Math.max(0, this.sessionDurationMs - elapsed);

      if (this.timeRemainingMs <= 0) {
        this._completeSession();
      }

      this.onStateChange(this.state, this.getStatus());
    }, 100);

    this._nextRound();
  }

  _nextRound() {
    if (this.timeRemainingMs <= 0) {
      this._completeSession();
      return;
    }

    // Generate number
    this.currentDigits = generateNumber(this.digitLength);
    this.currentNumber = digitsToString(this.currentDigits);
    this.roundStartTime = performance.now();

    // Show number
    this.state = TrainerState.SHOWING;
    this.onStateChange(this.state, this.getStatus());

    // Hide after displaySpeedMs using RAF for precision
    const showStart = performance.now();
    const checkTime = () => {
      if (performance.now() - showStart >= this.displaySpeedMs) {
        this.state = TrainerState.WAITING_INPUT;
        this.onStateChange(this.state, this.getStatus());
        return;
      }
      this._showingRAF = requestAnimationFrame(checkTime);
    };
    this._showingRAF = requestAnimationFrame(checkTime);
  }

  submitAnswer(answerStr) {
    if (this.state !== TrainerState.WAITING_INPUT) return null;

    const responseTime = performance.now() - this.roundStartTime;
    const isCorrect = answerStr === this.currentNumber;

    // Record round
    const round = {
      number: this.currentNumber,
      answer: answerStr,
      correct: isCorrect,
      digitLength: this.digitLength,
      displaySpeedMs: this.displaySpeedMs,
      responseTimeMs: Math.round(responseTime),
      timestamp: Date.now(),
    };
    this.rounds.push(round);
    this._lastRound = round;

    // Update consecutive counters
    if (isCorrect) {
      this.consecutiveErrors = 0;
      this.consecutiveCorrects++;
      this.correctsAtCurrentLength++;
      this.errorsAtCurrentLength = 0;
    } else {
      this.consecutiveCorrects = 0;
      this.consecutiveErrors++;
      this.correctsAtCurrentLength = 0;
      this.errorsAtCurrentLength++;
    }

    // Adjust speed
    this.displaySpeedMs = adjustSpeed(
      this.displaySpeedMs,
      this.mode,
      isCorrect,
      this.consecutiveErrors
    );

    // Check digit length changes
    if (shouldIncreaseLength(this.correctsAtCurrentLength, this.mode) && this.digitLength < 10) {
      this.digitLength++;
      this.correctsAtCurrentLength = 0;
      this.errorsAtCurrentLength = 0;
      this.displaySpeedMs = Math.round(this.displaySpeedMs * this.mode.lengthCompensation);
    } else if (shouldDecreaseLength(this.errorsAtCurrentLength, this.mode) && this.digitLength > 3) {
      this.digitLength--;
      this.correctsAtCurrentLength = 0;
      this.errorsAtCurrentLength = 0;
      this.displaySpeedMs = Math.round(this.displaySpeedMs / this.mode.lengthCompensation);
    }

    // Show feedback
    this.state = TrainerState.FEEDBACK;
    this.onStateChange(this.state, { ...this.getStatus(), lastRound: round });

    // Proceed to next round after feedback delay
    const feedbackDuration = isCorrect ? 800 : 1200;
    this._feedbackTimeout = setTimeout(() => {
      this._nextRound();
    }, feedbackDuration);

    return round;
  }

  _completeSession() {
    this.state = TrainerState.COMPLETE;
    clearInterval(this._timerInterval);
    clearInterval(this._countdownInterval);
    cancelAnimationFrame(this._showingRAF);
    clearTimeout(this._feedbackTimeout);
    this.onStateChange(this.state, this.getStatus());
  }

  stop() {
    clearInterval(this._timerInterval);
    clearInterval(this._countdownInterval);
    cancelAnimationFrame(this._showingRAF);
    clearTimeout(this._feedbackTimeout);
    this.state = TrainerState.IDLE;
  }

  getStatus() {
    const totalRounds = this.rounds.length;
    const correctRounds = this.rounds.filter(r => r.correct).length;
    const accuracy = totalRounds > 0 ? Math.round((correctRounds / totalRounds) * 100) : 0;
    const correctSpeeds = this.rounds.filter(r => r.correct).map(r => r.displaySpeedMs);
    const correctDigits = this.rounds.filter(r => r.correct).map(r => r.digitLength);
    const bestSpeed = correctSpeeds.length > 0 ? Math.min(...correctSpeeds) : this.displaySpeedMs;
    const maxDigits = correctDigits.length > 0 ? Math.max(...correctDigits) : this.digitLength;

    return {
      state: this.state,
      currentNumber: this.currentNumber,
      digitLength: this.digitLength,
      displaySpeedMs: this.displaySpeedMs,
      roundNumber: totalRounds + 1,
      totalRounds,
      correctRounds,
      accuracy,
      bestSpeed,
      maxDigits,
      consecutiveCorrects: this.consecutiveCorrects,
      consecutiveErrors: this.consecutiveErrors,
      timeRemainingMs: this.timeRemainingMs,
      sessionDurationMs: this.sessionDurationMs,
      rounds: this.rounds,
      lastRound: this._lastRound,
    };
  }

  getSessionStats() {
    const status = this.getStatus();
    const avgResponseTime = status.totalRounds > 0
      ? Math.round(this.rounds.reduce((sum, r) => sum + r.responseTimeMs, 0) / this.rounds.length)
      : 0;

    return {
      ...status,
      avgResponseTime,
      mode: this.mode.name,
      startTime: this.sessionStartTime,
      endTime: performance.now(),
      duration: performance.now() - this.sessionStartTime,
    };
  }
}
