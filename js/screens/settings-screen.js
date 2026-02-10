/** Settings screen */
import { t, setLocale, getLocale } from '../core/i18n.js';
import { state } from '../core/state.js';
import { ProModal } from '../components/pro-modal.js';
import { SwipeSlider } from '../components/swipe-slider.js';

const MODES = [
  { key: 'standard', free: true },
  { key: 'soft', free: false },
  { key: 'antianxiety', free: false },
  { key: 'maxspeed', free: false },
  { key: 'accuracy', free: false },
];

export class SettingsScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
    this._digitsSlider = null;
    this._durationSlider = null;
    this._modeDropdownOpen = false;
  }

  mount(container) {
    const mode = state.get('settings.mode') || 'standard';
    const duration = state.get('settings.sessionDurationMs') || 180000;
    const digits = state.get('settings.startingDigitLength') || 4;
    const soundEnabled = state.get('settings.soundEnabled') !== false;
    const locale = getLocale();
    const isPro = state.get('user.pro') === true;

    const durationMin = Math.round(duration / 60000);
    const currentModeName = t(`mode.${mode}`);

    this._el = document.createElement('div');
    this._el.className = 'screen settings-screen';
    this._el.innerHTML = `
      <div class="settings-header">
        <div class="settings-title">${t('settings.title')}</div>
      </div>

      <div class="settings-list">
        ${!isPro ? `
        <button class="settings-pro-card" data-action="pro">
          <div class="settings-pro-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <div class="settings-pro-text">
            <div class="settings-pro-title">${t('settings.pro_title')}</div>
            <div class="settings-pro-desc">${t('settings.pro_desc')}</div>
          </div>
          <div class="settings-pro-arrow">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg>
          </div>
        </button>
        ` : ''}

        <div class="settings-group">
          <div class="settings-label">${t('settings.mode')}</div>
          <div class="settings-hint">${t('settings.mode_desc')}</div>
          <button class="settings-mode-selector" data-action="mode-toggle">
            <span class="mode-selector-name">${currentModeName}</span>
            <svg class="mode-selector-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="settings-mode-dropdown" data-ref="mode-dropdown">
            ${MODES.map(m => {
              const active = m.key === mode ? 'active' : '';
              const locked = !m.free && !isPro ? 'locked' : '';
              const lockBadge = locked ? ` <span class="lock-badge">${t('settings.locked')}</span>` : '';
              return `<button class="settings-mode-option ${active} ${locked}" data-value="${m.key}" data-setting="mode">
                <span class="mode-option-name">${t(`mode.${m.key}`)}${lockBadge}</span>
                <span class="mode-option-desc">${t(`mode.${m.key}_desc`)}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="settings-sliders-row">
          <div class="settings-group settings-slider-group">
            <div class="settings-label">${t('settings.digits')}</div>
            <div data-ref="digits-slider"></div>
          </div>
          <div class="settings-group settings-slider-group">
            <div class="settings-label">${t('settings.duration')}</div>
            <div data-ref="duration-slider"></div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-row">
            <div>
              <div class="settings-label">${t('settings.sound')}</div>
              <div class="settings-hint">${t('settings.sound_desc')}</div>
            </div>
            <label class="settings-toggle">
              <input type="checkbox" ${soundEnabled ? 'checked' : ''} data-setting="sound">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-label">${t('settings.language')}</div>
          <div class="settings-options" data-setting="language">
            ${this._renderOption('uk', 'Українська', locale)}
            ${this._renderOption('en', 'English', locale)}
          </div>
        </div>

        <div class="settings-group">
          <button class="settings-link" data-action="onboarding">
            <span>${t('settings.onboarding')}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      <div class="settings-bottom">
        <button class="btn-ghost settings-reset" data-action="reset">${t('settings.reset')}</button>
      </div>
    `;

    container.appendChild(this._el);

    // Mount sliders
    const digitValues = [3, 4, 5, 6, 7, 8, 9, 10];
    const digitLabels = digitValues.map(v => String(v));
    this._digitsSlider = new SwipeSlider(digitValues, digitLabels, digits, (val) => {
      state.set('settings.startingDigitLength', val);
    });
    this._el.querySelector('[data-ref="digits-slider"]').appendChild(this._digitsSlider.render());

    const durationValues = [1, 3, 5, 10];
    const durationLabels = durationValues.map(v => v + ' ' + t('general.min'));
    this._durationSlider = new SwipeSlider(durationValues, durationLabels, durationMin, (val) => {
      state.set('settings.sessionDurationMs', val * 60000);
    });
    this._el.querySelector('[data-ref="duration-slider"]').appendChild(this._durationSlider.render());

    // Mode dropdown toggle
    const modeToggle = this._el.querySelector('[data-action="mode-toggle"]');
    const modeDropdown = this._el.querySelector('[data-ref="mode-dropdown"]');
    modeToggle.addEventListener('click', () => {
      this._modeDropdownOpen = !this._modeDropdownOpen;
      modeDropdown.classList.toggle('open', this._modeDropdownOpen);
      modeToggle.classList.toggle('open', this._modeDropdownOpen);
    });

    // Mode option clicks
    modeDropdown.querySelectorAll('.settings-mode-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
          this._onProClick();
        } else {
          modeDropdown.querySelectorAll('.settings-mode-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const val = btn.dataset.value;
          state.set('settings.mode', val);
          this._el.querySelector('.mode-selector-name').textContent = t(`mode.${val}`);
          this._modeDropdownOpen = false;
          modeDropdown.classList.remove('open');
          modeToggle.classList.remove('open');
        }
      });
    });

    // Language option clicks
    this._el.querySelectorAll('[data-setting="language"] .settings-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('[data-setting]');
        group.querySelectorAll('.settings-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setLocale(btn.dataset.value);
        state.set('settings.locale', btn.dataset.value);
        this._app.navigate('settings', { _reload: true });
      });
    });

    // Sound toggle
    this._el.querySelector('[data-setting="sound"]').addEventListener('change', (e) => {
      state.set('settings.soundEnabled', e.target.checked);
    });

    // PRO card click
    const proCard = this._el.querySelector('[data-action="pro"]');
    if (proCard) {
      proCard.addEventListener('click', () => this._onProClick());
    }

    // Onboarding link — start from the beginning
    this._el.querySelector('[data-action="onboarding"]').addEventListener('click', () => {
      this._app.navigate('onboarding', { startSlide: 0 });
    });

    // Reset
    this._el.querySelector('[data-action="reset"]').addEventListener('click', () => {
      if (confirm(t('settings.reset') + '?')) {
        state.reset();
        this._app.navigate('home');
      }
    });

    return this._el;
  }

  _renderOption(value, label, current) {
    const active = value === current ? 'active' : '';
    return `<button class="settings-option ${active}" data-value="${value}">${label}</button>`;
  }

  _onProClick() {
    const modal = new ProModal(
      () => {
        // Purchase callback — activate PRO for prototype demo
        state.set('user.pro', true);
        this._app.navigate('settings', { _reload: true });
      },
      () => {
        // Dismiss — do nothing
      }
    );
    modal.show(document.getElementById('app'));
  }

  unmount() {
    if (this._digitsSlider) { this._digitsSlider.destroy(); this._digitsSlider = null; }
    if (this._durationSlider) { this._durationSlider.destroy(); this._durationSlider = null; }
  }

  getElement() {
    return this._el;
  }
}
