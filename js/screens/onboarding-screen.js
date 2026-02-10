/** Onboarding screen — motivational intro explaining how to play and benefits */
import { t } from '../core/i18n.js';
import { state } from '../core/state.js';
import { ThetaLogo } from '../components/theta-logo.js';

const SLIDES = [
  {
    key: 'welcome',
    icon: () => {
      const logo = new ThetaLogo(100, 'calm', 'static');
      return { el: logo.render(), destroy: () => logo.destroy() };
    },
    titleKey: 'onboarding.welcome_title',
    descKey: 'onboarding.welcome_desc',
  },
  {
    key: 'how',
    svg: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="8" y="4" width="48" height="56" rx="6"/>
      <text x="32" y="32" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-size="18" fill="currentColor" stroke="none">4 7 2 9</text>
      <path d="M20 48h24" stroke-dasharray="4 3"/>
    </svg>`,
    titleKey: 'onboarding.how_title',
    descKey: 'onboarding.how_desc',
  },
  {
    key: 'brain',
    svg: `<svg viewBox="0 0 80 64" width="80" height="64" fill="none" stroke-width="1.5">
      <path d="M8 56 L20 54 L32 50 L44 42 L56 28 L68 8" stroke="var(--correct)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M8 56 L20 55.5 L32 55 L44 54.5 L56 54 L68 54" stroke="var(--error)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
      <text x="72" y="10" font-size="8" fill="var(--correct)" font-family="monospace" stroke="none">×37</text>
      <text x="72" y="56" font-size="8" fill="var(--error)" font-family="monospace" stroke="none" opacity="0.5">×0.03</text>
      <text x="8" y="62" font-size="6" fill="currentColor" font-family="monospace" stroke="none" opacity="0.3">1%</text>
    </svg>`,
    titleKey: 'onboarding.brain_title',
    descKey: 'onboarding.brain_desc',
  },
  {
    key: 'benefits',
    svg: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 52l10-16 8 8 12-20 10 12"/>
      <circle cx="52" cy="12" r="8"/>
      <path d="M49 12l2 2 4-4" stroke-width="2"/>
    </svg>`,
    titleKey: 'onboarding.benefits_title',
    descKey: 'onboarding.benefits_desc',
  },
  {
    key: 'start',
    svg: `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M32 6C32 6 16 20 16 36a16 16 0 0032 0C48 20 32 6 32 6z" fill="currentColor" opacity="0.06"/>
      <path d="M32 6C32 6 16 20 16 36a16 16 0 0032 0C48 20 32 6 32 6z"/>
      <path d="M32 46a6 6 0 006-6c0-4.5-6-10-6-10s-6 5.5-6 10a6 6 0 006 6z" fill="currentColor" opacity="0.15"/>
      <text x="32" y="30" text-anchor="middle" font-size="11" fill="currentColor" font-weight="600" stroke="none" font-family="monospace">365</text>
    </svg>`,
    titleKey: 'onboarding.start_title',
    descKey: 'onboarding.start_desc',
  },
];

export class OnboardingScreen {
  constructor(app) {
    this._app = app;
    this._el = null;
    this._current = 0;
    this._slideDestroys = [];
  }

  mount(container, params = {}) {
    // Allow starting from a specific slide (e.g. from settings "How to use")
    if (params.startSlide != null && params.startSlide >= 0 && params.startSlide < SLIDES.length) {
      this._current = params.startSlide;
    } else {
      this._current = 0;
    }

    this._el = document.createElement('div');
    this._el.className = 'screen onboarding-screen';

    this._el.innerHTML = `
      <div class="onboarding-slides" data-ref="slides"></div>
      <div class="onboarding-dots" data-ref="dots"></div>
      <div class="onboarding-actions">
        <button class="onboarding-skip" data-action="skip">${t('onboarding.skip')}</button>
        <button class="btn-primary onboarding-next" data-action="next">${t('onboarding.next')}</button>
      </div>
    `;

    container.appendChild(this._el);

    this._slidesEl = this._el.querySelector('[data-ref="slides"]');
    this._dotsEl = this._el.querySelector('[data-ref="dots"]');
    this._nextBtn = this._el.querySelector('[data-action="next"]');
    this._skipBtn = this._el.querySelector('[data-action="skip"]');

    this._nextBtn.addEventListener('click', () => this._advance());
    this._skipBtn.addEventListener('click', () => this._finish());

    // Swipe support
    let startX = 0;
    this._slidesEl.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    this._slidesEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) this._advance();
        else if (this._current > 0) { this._current--; this._renderSlide(); }
      }
    });

    this._renderDots();
    this._renderSlide();

    return this._el;
  }

  _renderDots() {
    this._dotsEl.innerHTML = SLIDES.map((_, i) =>
      `<div class="onboarding-dot ${i === this._current ? 'active' : ''}" data-idx="${i}"></div>`
    ).join('');
  }

  _renderSlide() {
    // Destroy previous custom elements
    this._slideDestroys.forEach(fn => fn());
    this._slideDestroys = [];

    const slide = SLIDES[this._current];
    let iconHtml = '';

    if (slide.icon) {
      const { el, destroy } = slide.icon();
      this._slidesEl.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'onboarding-slide animate-fade-in';
      wrapper.innerHTML = `
        <div class="onboarding-icon" data-ref="icon-mount"></div>
        <div class="onboarding-title">${t(slide.titleKey)}</div>
        <div class="onboarding-desc">${t(slide.descKey)}</div>
      `;
      this._slidesEl.appendChild(wrapper);
      wrapper.querySelector('[data-ref="icon-mount"]').appendChild(el);
      this._slideDestroys.push(destroy);
    } else {
      this._slidesEl.innerHTML = `
        <div class="onboarding-slide animate-fade-in">
          <div class="onboarding-icon">${slide.svg || ''}</div>
          <div class="onboarding-title">${t(slide.titleKey)}</div>
          <div class="onboarding-desc">${t(slide.descKey)}</div>
        </div>
      `;
    }

    this._renderDots();

    // Update button text
    if (this._current === SLIDES.length - 1) {
      this._nextBtn.textContent = t('onboarding.begin');
      this._skipBtn.style.display = 'none';
    } else {
      this._nextBtn.textContent = t('onboarding.next');
      this._skipBtn.style.display = '';
    }
  }

  _advance() {
    if (this._current < SLIDES.length - 1) {
      this._current++;
      this._renderSlide();
    } else {
      this._finish();
    }
  }

  _finish() {
    state.set('user.isFirstVisit', false);
    state.set('user.onboardingComplete', true);
    this._app.navigate('home');
  }

  unmount() {
    this._slideDestroys.forEach(fn => fn());
    this._slideDestroys = [];
  }

  getElement() {
    return this._el;
  }
}
