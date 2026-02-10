/** Brain Speed Index formula */
import { state } from '../core/state.js';

export function calculateBSI(sessionStats) {
  const sessions = state.get('history.sessions') || [];
  const recent = sessions.slice(-7); // last 7 sessions

  if (recent.length === 0 && !sessionStats) return 0;

  // Include current session
  const allRecent = sessionStats ? [...recent, sessionStats] : recent;

  const avgMaxDigits = avg(allRecent.map(s => s.maxDigits));
  const avgBestSpeed = avg(allRecent.map(s => s.bestSpeed));
  const avgAccuracy = avg(allRecent.map(s => s.accuracy));
  const streak = state.get('user.streak') || 0;

  // Weighted composite score
  const digitScore = avgMaxDigits * 8;
  const speedScore = avgBestSpeed > 0 ? (1000 / avgBestSpeed) * 15 : 0;
  const accuracyScore = avgAccuracy * 0.5;
  const streakBonus = Math.min(streak, 30) * 0.5;

  const bsi = Math.round(digitScore + speedScore + accuracyScore + streakBonus);
  return Math.max(0, bsi);
}

export function updateBSI(sessionStats) {
  const newBSI = calculateBSI(sessionStats);
  const oldBSI = state.get('user.bsi') || 0;
  state.set('user.bsi', newBSI);

  // Save daily BSI
  const today = new Date().toISOString().split('T')[0];
  const dailyBSI = state.get('history.dailyBSI') || [];
  const todayEntry = dailyBSI.find(e => e.date === today);
  if (todayEntry) {
    todayEntry.bsi = newBSI;
  } else {
    dailyBSI.push({ date: today, bsi: newBSI });
  }
  // Keep last 90 days
  if (dailyBSI.length > 90) {
    dailyBSI.splice(0, dailyBSI.length - 90);
  }
  state.set('history.dailyBSI', dailyBSI);

  return { newBSI, oldBSI, delta: newBSI - oldBSI };
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}
