/** Session lifecycle and stats computation */
import { state } from '../core/state.js';

export function saveSessionToHistory(sessionStats) {
  const sessionRecord = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    mode: sessionStats.mode,
    totalRounds: sessionStats.totalRounds,
    correctRounds: sessionStats.correctRounds,
    accuracy: sessionStats.accuracy,
    bestSpeed: isFinite(sessionStats.bestSpeed) ? sessionStats.bestSpeed : 0,
    maxDigits: isFinite(sessionStats.maxDigits) ? sessionStats.maxDigits : 0,
    avgResponseTime: sessionStats.avgResponseTime,
    duration: Math.round(sessionStats.duration),
    timestamp: Date.now(),
  };

  // Add to sessions history
  const sessions = state.get('history.sessions') || [];
  sessions.push(sessionRecord);

  // Prune: keep only last 100 sessions
  if (sessions.length > 100) {
    sessions.splice(0, sessions.length - 100);
  }

  state.set('history.sessions', sessions);

  // Update user stats
  state.set('user.totalSessions', (state.get('user.totalSessions') || 0) + 1);
  state.set('user.isFirstVisit', false);

  // Update streak
  updateStreak(sessionRecord.date);

  return sessionRecord;
}

function updateStreak(todayDate) {
  const lastDate = state.get('user.lastSessionDate');
  const currentStreak = state.get('user.streak') || 0;

  if (lastDate === todayDate) {
    // Already trained today, no streak change
    return;
  }

  const yesterday = getYesterdayDate(todayDate);

  if (lastDate === yesterday) {
    // Consecutive day
    const newStreak = currentStreak + 1;
    state.set('user.streak', newStreak);
    if (newStreak > (state.get('user.longestStreak') || 0)) {
      state.set('user.longestStreak', newStreak);
    }
  } else if (lastDate === null) {
    // First ever session
    state.set('user.streak', 1);
    state.set('user.longestStreak', 1);
  } else {
    // Streak broken (check freeze day)
    const freezeDaysUsed = state.get('user.freezeDaysUsed') || 0;
    const freezeWeekStart = state.get('user.freezeWeekStart');
    const currentWeekStart = getWeekStart(todayDate);

    if (freezeWeekStart !== currentWeekStart) {
      // New week, reset freeze counter
      state.set('user.freezeDaysUsed', 0);
      state.set('user.freezeWeekStart', currentWeekStart);
    }

    const daysMissed = daysBetween(lastDate, todayDate);
    if (daysMissed === 2 && state.get('user.freezeDaysUsed') < 1) {
      // 1 day missed, use freeze
      state.set('user.freezeDaysUsed', (state.get('user.freezeDaysUsed') || 0) + 1);
      state.set('user.streak', currentStreak + 1);
    } else {
      // Streak broken
      state.set('user.streak', 1);
    }
  }

  state.set('user.lastSessionDate', todayDate);
}

function getYesterdayDate(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2 - d1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
