/** localStorage adapter with versioned schema */

const SCHEMA_VERSION = 1;
const STATE_KEY = `teta_state_v${SCHEMA_VERSION}`;
const SESSION_KEY = 'teta_session';

export class Storage {
  static loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed._version !== SCHEMA_VERSION) {
        return Storage._migrate(parsed);
      }
      return parsed;
    } catch (e) {
      console.warn('TETA: Failed to load state, resetting', e);
      return null;
    }
  }

  static saveState(state) {
    try {
      state._version = SCHEMA_VERSION;
      state._savedAt = Date.now();
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('TETA: Failed to save state', e);
    }
  }

  static loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('TETA: Failed to save session', e);
    }
  }

  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  static clearAll() {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  static _migrate(data) {
    // Future: handle schema migrations
    console.warn('TETA: Unknown schema version, resetting');
    return null;
  }
}
