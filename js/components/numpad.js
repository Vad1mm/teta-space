/** Custom numpad component for training input */
export class Numpad {
  constructor(onDigit, onDelete) {
    this._onDigit = onDigit;
    this._onDelete = onDelete;
    this._el = null;
    this._disabled = false;
  }

  render() {
    this._el = document.createElement('div');
    this._el.className = 'numpad';
    this._el.innerHTML = `
      <div class="numpad-row">
        <button class="numpad-key" data-digit="1">1</button>
        <button class="numpad-key" data-digit="2">2</button>
        <button class="numpad-key" data-digit="3">3</button>
      </div>
      <div class="numpad-row">
        <button class="numpad-key" data-digit="4">4</button>
        <button class="numpad-key" data-digit="5">5</button>
        <button class="numpad-key" data-digit="6">6</button>
      </div>
      <div class="numpad-row">
        <button class="numpad-key" data-digit="7">7</button>
        <button class="numpad-key" data-digit="8">8</button>
        <button class="numpad-key" data-digit="9">9</button>
      </div>
      <div class="numpad-row">
        <button class="numpad-key numpad-empty"></button>
        <button class="numpad-key" data-digit="0">0</button>
        <button class="numpad-key numpad-delete" data-action="delete">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    `;

    this._el.addEventListener('click', (e) => {
      if (this._disabled) return;
      const key = e.target.closest('.numpad-key');
      if (!key) return;

      if (key.dataset.digit != null) {
        this._onDigit(key.dataset.digit);
      } else if (key.dataset.action === 'delete') {
        this._onDelete();
      }
    });

    // Prevent double-tap zoom on mobile
    this._el.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) target.click();
    });

    return this._el;
  }

  setDisabled(disabled) {
    this._disabled = disabled;
    if (this._el) {
      this._el.classList.toggle('numpad-disabled', disabled);
    }
  }

  destroy() {
    this._el = null;
  }
}
