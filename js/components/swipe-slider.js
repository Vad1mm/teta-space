/** Vertical swipe slider for settings */
export class SwipeSlider {
  constructor(values, labels, currentValue, onChange) {
    this._values = values;
    this._labels = labels;
    this._currentIndex = values.indexOf(currentValue);
    if (this._currentIndex < 0) this._currentIndex = 0;
    this._onChange = onChange;
    this._el = null;
    this._startY = 0;
    this._isDragging = false;
  }

  render() {
    this._el = document.createElement('div');
    this._el.className = 'swipe-slider';
    this._update();
    this._bindEvents();
    return this._el;
  }

  _update() {
    const idx = this._currentIndex;
    const prev = idx > 0 ? this._labels[idx - 1] : '';
    const current = this._labels[idx];
    const next = idx < this._values.length - 1 ? this._labels[idx + 1] : '';

    this._el.innerHTML = `
      <button class="swipe-slider-arrow swipe-slider-up ${idx === 0 ? 'disabled' : ''}" data-dir="up">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
      </button>
      <div class="swipe-slider-track">
        <div class="swipe-slider-item swipe-slider-prev">${prev}</div>
        <div class="swipe-slider-item swipe-slider-current">${current}</div>
        <div class="swipe-slider-item swipe-slider-next">${next}</div>
      </div>
      <button class="swipe-slider-arrow swipe-slider-down ${idx === this._values.length - 1 ? 'disabled' : ''}" data-dir="down">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    `;

    // Rebind arrow clicks
    this._el.querySelector('.swipe-slider-up')?.addEventListener('click', () => this._move(-1));
    this._el.querySelector('.swipe-slider-down')?.addEventListener('click', () => this._move(1));
  }

  _bindEvents() {
    this._el.addEventListener('touchstart', (e) => {
      this._startY = e.touches[0].clientY;
      this._isDragging = true;
    }, { passive: true });

    this._el.addEventListener('touchmove', (e) => {
      if (!this._isDragging) return;
      // Prevent page scroll while swiping
      e.preventDefault();
    }, { passive: false });

    this._el.addEventListener('touchend', (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      const endY = e.changedTouches[0].clientY;
      const delta = this._startY - endY;
      if (Math.abs(delta) > 20) {
        this._move(delta > 0 ? 1 : -1);
      }
    });
  }

  _move(dir) {
    const newIndex = this._currentIndex + dir;
    if (newIndex < 0 || newIndex >= this._values.length) return;
    this._currentIndex = newIndex;
    this._update();
    if (this._onChange) {
      this._onChange(this._values[this._currentIndex]);
    }
  }

  getValue() {
    return this._values[this._currentIndex];
  }

  destroy() {
    this._el = null;
  }
}
