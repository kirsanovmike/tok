/**
 * Выбор следующей фразы загрузки.
 *
 * Требование: одна и та же фраза не выпадает дважды подряд. Простой `Math.random()`
 * по всему списку такого не гарантирует, поэтому берём случайный сдвиг от 1 до N-1 —
 * нулевой сдвиг (то есть повтор) невозможен по построению.
 *
 * `random` вынесен параметром ради теста: подменяется на предсказуемый генератор.
 */
export function nextPhraseIndex(currentIndex, total, random) {
  if (total <= 1) return 0;

  const roll = typeof random === 'function' ? random() : Math.random();
  const offset = 1 + Math.floor(roll * (total - 1));
  const safeOffset = Math.min(offset, total - 1);

  return (currentIndex + safeOffset) % total;
}

export default nextPhraseIndex;
