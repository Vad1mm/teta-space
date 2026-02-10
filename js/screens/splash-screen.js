/** Splash screen with animated theta logo intro and tagline */
import { t } from '../core/i18n.js';
import { state } from '../core/state.js';
import { ThetaLogo } from '../components/theta-logo.js';

export class SplashScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
    this._logo = null;
    this._timer = null;
    this._wmTimer = null;
  }

  mount(container) {
    this._el = document.createElement('div');
    this._el.className = 'screen splash-screen';

    // Create logo with intro animation
    this._logo = new ThetaLogo(160, 'calm', 'intro');
    const logoEl = this._logo.render();

    // Build layout
    this._el.innerHTML = `
      <div class="splash-logo-wrapper"></div>
      <div class="splash-text" style="opacity:0;transform:translateY(16px);transition:opacity 0.8s ease-out,transform 0.8s ease-out;">
        <div class="splash-name">TETA</div>
        <div class="splash-divider"></div>
        <div class="splash-tagline">Think less &middot; See more</div>
      </div>
    `;

    this._el.querySelector('.splash-logo-wrapper').appendChild(logoEl);
    container.appendChild(this._el);

    // Fade in wordmark at ~2600ms (synced with intro timeline)
    this._wmTimer = setTimeout(() => {
      const textEl = this._el.querySelector('.splash-text');
      if (textEl) {
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      }
    }, 2600);

    // Determine next screen: onboarding if first visit, home otherwise
    const nextScreen = state.get('user.onboardingComplete') ? 'home' : 'onboarding';

    // Auto-advance after intro completes + first blink (~5500ms)
    this._timer = setTimeout(() => {
      this._app.navigate(nextScreen);
    }, 5500);

    // Tap to skip
    this._el.addEventListener('click', () => {
      clearTimeout(this._timer);
      clearTimeout(this._wmTimer);
      this._app.navigate(nextScreen);
    });

    return this._el;
  }

  unmount() {
    clearTimeout(this._timer);
    clearTimeout(this._wmTimer);
    if (this._logo) {
      this._logo.destroy();
      this._logo = null;
    }
  }

  getElement() {
    return this._el;
  }
}
