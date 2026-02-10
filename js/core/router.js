/** Hash-based router with screen lifecycle */

export class Router {
  constructor(appEl) {
    this._appEl = appEl;
    this._screens = {};
    this._currentScreen = null;
    this._currentName = null;

    window.addEventListener('hashchange', () => this._onHashChange());
  }

  register(name, screenInstance) {
    this._screens[name] = screenInstance;
  }

  navigate(name, params = {}) {
    if (this._currentName === name && !params._reload) return;

    const screen = this._screens[name];
    if (!screen) {
      console.warn(`TETA Router: Unknown screen "${name}"`);
      return;
    }

    // Unmount current
    if (this._currentScreen) {
      const oldEl = this._currentScreen.getElement();
      if (oldEl) {
        oldEl.classList.remove('active');
        oldEl.classList.add('exit');
      }
      this._currentScreen.unmount();
      // Remove old element after transition
      setTimeout(() => {
        if (oldEl?.parentNode) {
          oldEl.remove();
        }
      }, 300);
    }

    // Mount new
    this._currentScreen = screen;
    this._currentName = name;
    const newEl = screen.mount(this._appEl, params);
    if (newEl) {
      // Force reflow before adding active class
      newEl.offsetHeight;
      requestAnimationFrame(() => {
        newEl.classList.add('active');
      });
    }

    // Update hash silently
    history.replaceState(null, '', `#${name}`);
  }

  getCurrentScreen() {
    return this._currentName;
  }

  _onHashChange() {
    const name = location.hash.slice(1);
    if (name && this._screens[name] && name !== this._currentName) {
      this.navigate(name);
    }
  }
}
