/** Top-level orchestrator */
import { Router } from './router.js';
import { state } from './state.js';
import { initLocale, t } from './i18n.js';
import { SplashScreen } from '../screens/splash-screen.js';
import { TrainingScreen } from '../screens/training-screen.js';
import { CompleteScreen } from '../screens/complete-screen.js';
import { HomeScreen } from '../screens/home-screen.js';
import { SettingsScreen } from '../screens/settings-screen.js';
import { OnboardingScreen } from '../screens/onboarding-screen.js';

const TAB_SCREENS = ['home', 'settings'];

export class AppController {
  constructor() {
    this._appEl = document.getElementById('app');
    this._router = new Router(this._appEl);
    this._tabBar = null;
    this._init();
  }

  _init() {
    const savedLocale = state.get('settings.locale');
    initLocale(savedLocale);

    this._createTabBar();

    this._router.register('splash', new SplashScreen(this));
    this._router.register('onboarding', new OnboardingScreen(this));
    this._router.register('training', new TrainingScreen(this));
    this._router.register('complete', new CompleteScreen(this));
    this._router.register('home', new HomeScreen(this));
    this._router.register('settings', new SettingsScreen(this));

    const isFirstVisit = state.get('user.isFirstVisit');
    this.navigate(isFirstVisit ? 'splash' : 'home');
  }

  _createTabBar() {
    this._tabBar = document.createElement('nav');
    this._tabBar.className = 'tab-bar';
    this._tabBar.innerHTML = `
      <button class="tab-bar-item" data-tab="home">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <path d="M9 21V13h6v8"/>
        </svg>
      </button>
      <button class="tab-bar-item tab-bar-start" data-tab="training">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
        </svg>
      </button>
      <button class="tab-bar-item" data-tab="settings">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </button>
    `;

    this._appEl.appendChild(this._tabBar);

    this._tabBar.querySelectorAll('.tab-bar-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.tab));
    });
  }

  _updateTabBar(screen) {
    const show = TAB_SCREENS.includes(screen);
    this._tabBar.classList.toggle('visible', show);
    this._tabBar.querySelectorAll('.tab-bar-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === screen);
    });
  }

  navigate(screen, params) {
    this._router.navigate(screen, params);
    this._updateTabBar(screen);
  }

  getRouter() {
    return this._router;
  }
}
