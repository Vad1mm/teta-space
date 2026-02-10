/** Session complete screen */
import { t, getLocale } from '../core/i18n.js';
import { saveSessionToHistory } from '../engine/session.js';
import { updateBSI } from '../engine/bsi-calculator.js';

export class CompleteScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
  }

  mount(container, params = {}) {
    const stats = params.stats || {};

    // Save session and calculate BSI
    const sessionRecord = saveSessionToHistory(stats);
    const { newBSI, oldBSI, delta } = updateBSI(sessionRecord);

    const deltaSign = delta >= 0 ? '+' : '';
    const deltaText = oldBSI > 0 ? `${deltaSign}${delta}` : '';

    this._el = document.createElement('div');
    this._el.className = 'screen complete-screen';
    this._el.innerHTML = `
      <div class="complete-title animate-fade-in">${t('complete.title')}</div>

      <div class="complete-bsi animate-fade-in-up">
        <div class="complete-bsi-value">${newBSI}</div>
        ${deltaText ? `<div class="complete-bsi-delta">${deltaText}</div>` : ''}
        <div class="stat-card-label" style="margin-top: 8px;">${t('complete.new_bsi')}</div>
      </div>

      <div class="complete-insight animate-fade-in">
        ${this._getInsight(stats)}
      </div>

      <div class="complete-stats animate-fade-in-up">
        <div class="stat-card">
          <div class="stat-card-value">${stats.totalRounds || 0}</div>
          <div class="stat-card-label">${t('complete.rounds')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${stats.accuracy || 0}%</div>
          <div class="stat-card-label">${t('complete.accuracy')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${isFinite(stats.bestSpeed) ? stats.bestSpeed + t('general.ms') : '-'}</div>
          <div class="stat-card-label">${t('complete.best_speed')}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${isFinite(stats.maxDigits) ? stats.maxDigits : '-'}</div>
          <div class="stat-card-label">${t('complete.max_digits')}</div>
        </div>
      </div>

      <div class="complete-actions">
        <button class="btn-primary" data-action="again">${t('complete.another')}</button>
        <button class="btn-ghost" data-action="home">${t('complete.home')}</button>
      </div>
    `;

    container.appendChild(this._el);

    // Event handlers
    this._el.querySelector('[data-action="again"]').addEventListener('click', () => {
      this._app.navigate('training');
    });

    this._el.querySelector('[data-action="home"]').addEventListener('click', () => {
      this._app.navigate('home');
    });

    return this._el;
  }

  _getInsight(stats) {
    const isUk = getLocale() === 'uk';
    if (stats.accuracy >= 90) {
      return isUk
        ? 'Вражаюча точність. Твій мозок тримає фокус.'
        : 'Impressive accuracy. Your brain is locked in.';
    }
    if (stats.maxDigits >= 7) {
      return isUk
        ? 'Ти бачиш більше, ніж думаєш.'
        : 'You see more than you think.';
    }
    if (stats.totalRounds >= 20) {
      return isUk
        ? 'Стабільний темп. Потік тримається.'
        : 'Steady pace. The flow holds.';
    }
    return isUk
      ? 'Кожна сесія — крок до автоматичного бачення.'
      : 'Every session is a step toward automatic perception.';
  }

  unmount() {}

  getElement() {
    return this._el;
  }
}
