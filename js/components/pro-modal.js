/** PRO purchase modal */
import { t } from '../core/i18n.js';

export class ProModal {
  constructor(onPurchase, onDismiss) {
    this._onPurchase = onPurchase;
    this._onDismiss = onDismiss;
    this._el = null;
  }

  show(container) {
    this._el = document.createElement('div');
    this._el.className = 'pro-modal-overlay';
    this._el.innerHTML = `
      <div class="pro-modal-card">
        <button class="pro-modal-close" data-action="close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div class="pro-modal-icon">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.2">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </div>

        <div class="pro-modal-title">${t('pro.modal_title')}</div>

        <div class="pro-modal-features">
          <div class="pro-modal-feature">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>${t('pro.feature_modes')}</span>
          </div>
          <div class="pro-modal-feature">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>${t('pro.feature_stats')}</span>
          </div>
          <div class="pro-modal-feature">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>${t('pro.feature_noads')}</span>
          </div>
        </div>

        <button class="btn-primary pro-modal-buy" data-action="buy">${t('pro.buy_button')}</button>
        <button class="pro-modal-later" data-action="later">${t('pro.later')}</button>
      </div>
    `;

    container.appendChild(this._el);

    // Animate in
    requestAnimationFrame(() => {
      this._el.classList.add('visible');
    });

    // Close on overlay click
    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this._dismiss();
    });

    // Close button
    this._el.querySelector('[data-action="close"]').addEventListener('click', () => this._dismiss());

    // Buy
    this._el.querySelector('[data-action="buy"]').addEventListener('click', () => {
      if (this._onPurchase) this._onPurchase();
      this._remove();
    });

    // Later
    this._el.querySelector('[data-action="later"]').addEventListener('click', () => this._dismiss());
  }

  _dismiss() {
    if (this._onDismiss) this._onDismiss();
    this._remove();
  }

  _remove() {
    if (this._el) {
      this._el.classList.remove('visible');
      setTimeout(() => {
        this._el.remove();
        this._el = null;
      }, 200);
    }
  }
}
