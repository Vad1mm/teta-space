/** High-precision timing utilities */

export function now() {
  return performance.now();
}

export function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatMs(ms) {
  return `${Math.round(ms)}`;
}
