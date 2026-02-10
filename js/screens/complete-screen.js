/** Session complete screen */
import { t, getLocale } from '../core/i18n.js';
import { saveSessionToHistory } from '../engine/session.js';
import { updateBSI } from '../engine/bsi-calculator.js';
import { getRandomFact } from '../data/brain-facts.js';

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

      <div class="complete-brain-fact animate-fade-in">
        ${getRandomFact(getLocale())}
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

  unmount() {}

  getElement() {
    return this._el;
  }
}
