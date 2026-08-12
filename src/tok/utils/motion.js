/**
 * Уважение системной настройки «уменьшить движение».
 *
 * Анимации Тока выключаются в CSS через `@media (prefers-reduced-motion: reduce)`.
 * Эта функция нужна там, где движением управляет JS (смена фразы загрузки идёт
 * дальше, а вращение звёздочки — нет).
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default prefersReducedMotion;
