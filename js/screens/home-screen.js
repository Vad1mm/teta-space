/** Home screen — main hub */
import { t, getLocale } from '../core/i18n.js';
import { state } from '../core/state.js';
import { ThetaLogo } from '../components/theta-logo.js';
import { getRandomFact } from '../data/brain-facts.js';

export class HomeScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
    this._streakPopup = null;
  }

  mount(container) {
    const bsi = state.get('user.bsi') || 0;
    const bsiDisplay = bsi > 0 ? bsi : '?';
    const streak = state.get('user.streak') || 0;
    const sessions = state.get('history.sessions') || [];
    const lastSession = sessions[sessions.length - 1];

    // Mini chart data (last 14 sessions BSI)
    const dailyBSI = state.get('history.dailyBSI') || [];
    const chartData = dailyBSI.slice(-14);

    // Yesterday BSI
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayBSI = dailyBSI.find(e => e.date === yesterdayStr)?.bsi;

    const deltaText = yesterdayBSI != null ? `${bsi - yesterdayBSI >= 0 ? '+' : ''}${bsi - yesterdayBSI}` : '';

    this._logo = new ThetaLogo(100, 'calm', 'alive');

    this._el = document.createElement('div');
    this._el.className = 'screen home-screen';
    this._el.innerHTML = `
      <div class="home-header">
        <div class="home-logo">TETA</div>
        <button class="streak-badge-btn${!state.get('user.streakBadgeTapped') ? ' streak-badge-invite' : ''}" data-action="streak">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M8 1C8 1 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 1 8 1z" fill="var(--theta-400)" opacity="0.2"/>
            <path d="M8 1C8 1 3 5.5 3 9a5 5 0 0010 0C13 5.5 8 1 8 1z" stroke="var(--theta-400)" stroke-width="1.2" fill="none"/>
            <path d="M8 12.5a2 2 0 002-2c0-1.5-2-3.5-2-3.5s-2 2-2 3.5a2 2 0 002 2z" fill="var(--theta-500)" opacity="0.5"/>
          </svg>
          <span>${streak || 1}</span>
          <span class="streak-badge-label">${t('general.day')}</span>
        </button>
      </div>

      <div class="home-content">
        <div class="home-bsi animate-fade-in-up">
          <div class="home-bsi-logo"></div>
          <div class="home-bsi-value">${bsiDisplay}</div>
          <div class="home-bsi-label">${t('home.bsi_label')}</div>
          ${deltaText ? `<div class="home-bsi-delta">${deltaText}</div>` : ''}
        </div>

        ${chartData.length > 1 ? `<div class="mini-chart-container">${this._renderMiniChart(chartData)}</div>` : ''}

        <div class="home-stats">
          <div class="stat-card">
            <div class="stat-card-value">${lastSession && isFinite(lastSession.maxDigits) ? lastSession.maxDigits : '-'}</div>
            <div class="stat-card-label">${t('home.digits')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${lastSession && isFinite(lastSession.bestSpeed) ? lastSession.bestSpeed + t('general.ms') : '-'}</div>
            <div class="stat-card-label">${t('home.speed')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${lastSession ? lastSession.accuracy + '%' : '-'}</div>
            <div class="stat-card-label">${t('home.accuracy')}</div>
          </div>
        </div>

        <div class="home-brain-fact">${getRandomFact(getLocale())}</div>
      </div>
    `;

    container.appendChild(this._el);

    // Insert animated logo
    this._el.querySelector('.home-bsi-logo').appendChild(this._logo.render());

    // Streak badge click → 1% popup
    const streakBtn = this._el.querySelector('[data-action="streak"]');
    streakBtn.addEventListener('click', () => {
      // Remove invite animation permanently after first tap
      if (!state.get('user.streakBadgeTapped')) {
        state.set('user.streakBadgeTapped', true);
        streakBtn.classList.remove('streak-badge-invite');
      }
      this._showStreakPopup(streak);
    });

    return this._el;
  }

  _showStreakPopup(streak) {
    if (this._streakPopup) return;

    const overlay = document.createElement('div');
    overlay.className = 'streak-popup-overlay';
    overlay.innerHTML = `
      <div class="streak-popup-card">
        <button class="streak-popup-close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div class="streak-popup-hero">
          <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
            <path d="M24 4s-10 10-10 20a10 10 0 0020 0C34 14 24 4 24 4z" fill="var(--theta-400)" opacity="0.15"/>
            <path d="M24 4s-10 10-10 20a10 10 0 0020 0C34 14 24 4 24 4z" stroke="var(--theta-400)" stroke-width="1.5" fill="none"/>
            <path d="M24 32a4 4 0 004-4c0-3-4-6-4-6s-4 3-4 6a4 4 0 004 4z" fill="var(--theta-500)" opacity="0.5"/>
          </svg>
          <div class="streak-popup-days">${streak || 1}</div>
        </div>
        <div class="streak-popup-days-label">${t('streak.title').replace('{value}', streak || 1)}</div>
        <div class="streak-popup-subtitle">${t('streak.subtitle')}</div>

        <div class="streak-popup-compound">
          <div class="streak-compound-row">
            <div class="streak-compound-meta">
              <span class="streak-compound-formula streak-good">${t('streak.onepercent_top')}</span>
            </div>
            <div class="streak-compound-bar">
              <div class="streak-compound-fill streak-compound-fill-good"></div>
            </div>
            <div class="streak-compound-label streak-good">${t('streak.message_top')}</div>
          </div>
          <div class="streak-compound-row">
            <div class="streak-compound-meta">
              <span class="streak-compound-formula streak-bad">${t('streak.onepercent_bottom')}</span>
            </div>
            <div class="streak-compound-bar">
              <div class="streak-compound-fill streak-compound-fill-bad"></div>
            </div>
            <div class="streak-compound-label streak-bad">${t('streak.message_bottom')}</div>
          </div>
        </div>

        <div class="streak-popup-daily">${t('streak.daily_reminder')}</div>

        <button class="btn-primary streak-popup-btn">${t('streak.keep_going')}</button>
      </div>
    `;

    document.getElementById('app').appendChild(overlay);
    this._streakPopup = overlay;

    // Animate in
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      // Animate bars after card appears
      setTimeout(() => {
        const goodFill = overlay.querySelector('.streak-compound-fill-good');
        const badFill = overlay.querySelector('.streak-compound-fill-bad');
        if (goodFill) goodFill.style.width = '100%';
        if (badFill) badFill.style.width = '3%';
      }, 400);
    });

    // Close handlers
    const close = () => {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        this._streakPopup = null;
      }, 200);
    };

    overlay.querySelector('.streak-popup-close').addEventListener('click', close);
    overlay.querySelector('.streak-popup-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  _renderMiniChart(data) {
    if (data.length < 2) return '';
    const max = Math.max(...data.map(d => d.bsi), 1);
    const bars = data.map(d => {
      const height = Math.max(4, (d.bsi / max) * 40);
      return `<div style="width: 6px; height: ${height}px; background: var(--theta-400); border-radius: 2px; opacity: 0.7;"></div>`;
    }).join('');

    return `<div style="display: flex; align-items: flex-end; justify-content: center; gap: 3px; height: 44px; padding: 0 var(--space-md);">${bars}</div>`;
  }

  unmount() {
    if (this._logo) {
      this._logo.destroy();
      this._logo = null;
    }
    if (this._streakPopup) {
      this._streakPopup.remove();
      this._streakPopup = null;
    }
  }

  getElement() {
    return this._el;
  }
}
