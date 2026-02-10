/** Audio feedback via Web Audio API — programmatic tones, no files needed */

let ctx = null;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (mobile requirement: needs user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  // Fade out to avoid clicks
  gain.gain.setValueAtTime(volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration / 1000);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration / 1000);
}

export function playCorrect() {
  // Clean, bright ascending tone
  playTone(880, 150, 'sine', 0.12);
}

export function playError() {
  // Dissonant low tone
  const ac = getContext();
  const dur = 0.2;

  // Two dissonant frequencies
  [220, 277].forEach(freq => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  });
}

export function playStart() {
  // Quick ascending arpeggio
  [440, 554, 659].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 100, 'sine', 0.08), i * 80);
  });
}

export function playComplete() {
  // Satisfying completion chord
  [523, 659, 784].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 400, 'sine', 0.08), i * 100);
  });
}

/** Must be called from a user gesture to unlock audio on mobile */
export function initAudio() {
  getContext();
}
