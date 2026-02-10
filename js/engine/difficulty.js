/** Difficulty algorithms for each training mode */

export const MODES = {
  standard: {
    name: 'standard',
    speedIncrease: 0.03,      // +3% faster on correct
    speedDecrease: 0.05,      // -5% slower on 2+ consecutive errors
    singleErrorChange: 0,     // no change on 1 error
    correctsToLevelUp: 5,     // correct in a row to increase digit length
    errorsToLevelDown: 3,     // errors in a row to decrease digit length
    lengthCompensation: 1.15, // speed multiplier when length increases
  },

  soft: {
    name: 'soft',
    speedIncrease: 0.02,
    speedDecrease: 0,
    singleErrorChange: 0,
    correctsToLevelUp: 7,
    errorsToLevelDown: 5,
    lengthCompensation: 1.2,
  },

  antianxiety: {
    name: 'antianxiety',
    speedIncrease: 0,         // fixed speed
    speedDecrease: 0,
    singleErrorChange: 0,
    correctsToLevelUp: 8,
    errorsToLevelDown: 0,     // never decrease
    lengthCompensation: 1,
  },

  maxspeed: {
    name: 'maxspeed',
    speedIncrease: 0.07,      // +7% on correct
    speedDecrease: 0.10,      // -10% on 2+ errors
    singleErrorChange: -0.03, // -3% on single error too
    correctsToLevelUp: 4,
    errorsToLevelDown: 2,
    lengthCompensation: 1.1,
  },

  accuracy: {
    name: 'accuracy',
    speedIncrease: 0.01,      // very slow speed increase
    speedDecrease: 0.02,
    singleErrorChange: 0,
    correctsToLevelUp: 10,    // need many corrects
    errorsToLevelDown: 5,
    lengthCompensation: 1.25,
  },
};

export function getMode(name) {
  return MODES[name] || MODES.standard;
}

export function adjustSpeed(currentSpeedMs, mode, isCorrect, consecutiveErrors) {
  let newSpeed = currentSpeedMs;

  if (isCorrect) {
    // Faster (reduce ms)
    newSpeed = currentSpeedMs * (1 - mode.speedIncrease);
  } else if (consecutiveErrors >= 2) {
    // Slower (increase ms)
    newSpeed = currentSpeedMs * (1 + mode.speedDecrease);
  } else if (consecutiveErrors === 1 && mode.singleErrorChange !== 0) {
    newSpeed = currentSpeedMs * (1 - mode.singleErrorChange);
  }
  // else: no change

  // Clamp: minimum 50ms, maximum 3000ms
  return Math.max(50, Math.min(3000, Math.round(newSpeed)));
}

export function shouldIncreaseLength(correctsAtLength, mode) {
  return mode.correctsToLevelUp > 0 && correctsAtLength >= mode.correctsToLevelUp;
}

export function shouldDecreaseLength(errorsAtLength, mode) {
  return mode.errorsToLevelDown > 0 && errorsAtLength >= mode.errorsToLevelDown;
}
