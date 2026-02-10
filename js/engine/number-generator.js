/** Random number generation with constraints */

export function generateNumber(length) {
  const digits = [];
  // First digit: 1-9 (no leading zero)
  digits.push(Math.floor(Math.random() * 9) + 1);

  // Remaining digits: 0-9, not same as previous (avoid "111...")
  for (let i = 1; i < length; i++) {
    let d;
    do {
      d = Math.floor(Math.random() * 10);
    } while (d === digits[i - 1]);
    digits.push(d);
  }

  return digits;
}

export function digitsToString(digits) {
  return digits.join('');
}

export function stringToDigits(str) {
  return str.split('').map(Number);
}
