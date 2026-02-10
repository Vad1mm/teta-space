/** AppState with pub/sub pattern */
import { Storage } from './storage.js';

const DEFAULT_STATE = {
  user: {
    bsi: 0,
    streak: 0,
    lastSessionDate: null,
    longestStreak: 0,
    level: 'novice',
    totalSessions: 0,
    isFirstVisit: true,
    freezeDaysUsed: 0,
    freezeWeekStart: null,
    pro: false,
  },
  settings: {
    mode: 'standard',
    sessionDurationMs: 1 * 60 * 1000,  // 1 minute
    soundEnabled: true,
    locale: null,  // auto-detect
    startingDigitLength: 4,
    startingSpeedMs: 800,
  },
  history: {
    sessions: [],
    dailyBSI: [],
  },
};

class AppStateManager {
  constructor() {
    this._state = null;
    this._subscribers = {};
    this._init();
  }

  _init() {
    const saved = Storage.loadState();
    if (saved) {
      this._state = this._merge(DEFAULT_STATE, saved);
    } else {
      this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  _merge(defaults, saved) {
    const result = {};
    for (const key of Object.keys(defaults)) {
      if (saved[key] !== undefined && typeof defaults[key] === 'object' && !Array.isArray(defaults[key]) && defaults[key] !== null) {
        result[key] = this._merge(defaults[key], saved[key]);
      } else if (saved[key] !== undefined) {
        result[key] = saved[key];
      } else {
        result[key] = JSON.parse(JSON.stringify(defaults[key]));
      }
    }
    // Preserve extra keys from saved that are not in defaults
    for (const key of Object.keys(saved)) {
      if (!(key in defaults)) {
        result[key] = saved[key];
      }
    }
    return result;
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  set(path, value) {
    const keys = path.split('.');
    let obj = this._state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (obj[keys[i]] === undefined) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this._notify(path, value);
    this._persist();
  }

  subscribe(path, callback) {
    if (!this._subscribers[path]) {
      this._subscribers[path] = [];
    }
    this._subscribers[path].push(callback);
    return () => {
      this._subscribers[path] = this._subscribers[path].filter(cb => cb !== callback);
    };
  }

  _notify(changedPath, value) {
    for (const [path, callbacks] of Object.entries(this._subscribers)) {
      if (changedPath.startsWith(path) || path.startsWith(changedPath)) {
        callbacks.forEach(cb => cb(value, changedPath));
      }
    }
  }

  _persist() {
    Storage.saveState(this._state);
  }

  getAll() {
    return this._state;
  }

  reset() {
    this._state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this._persist();
    this._notify('', this._state);
  }
}

export const state = new AppStateManager();
