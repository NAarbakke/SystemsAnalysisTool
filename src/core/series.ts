/**
 * The two samples either side of `t` in an increasing series, and how far `t` lies between
 * them (0–1, clamped at the ends). Binary search keeps seeking cheap on long exports.
 */
export function bracket(length: number, timeAt: (index: number) => number, t: number) {
  let low = 0, high = Math.max(0, length - 1);
  while (high - low > 1) {
    const mid = (low + high) >>> 1;
    if (timeAt(mid) <= t) low = mid; else high = mid;
  }
  const span = timeAt(high) - timeAt(low);
  return { low, high, fraction: span > 0 ? Math.max(0, Math.min(1, (t - timeAt(low)) / span)) : 0 };
}

/** Index of the sample nearest to `t`; ties go to the earlier one. */
export function nearestIndex(times: ArrayLike<number>, t: number) {
  const { low, high } = bracket(times.length, i => times[i], t);
  return Math.abs(times[low] - t) <= Math.abs(times[high] - t) ? low : high;
}
