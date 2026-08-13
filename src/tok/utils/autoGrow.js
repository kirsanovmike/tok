/**
 * Высота авто-растущего поля ввода.
 *
 * Отдельный модуль, а не метод компонента: `scrollHeight` в jsdom всегда 0, и
 * проверить арифметику внутри компонента невозможно. Здесь она проверяется честно,
 * а компоненту остаётся только чтение DOM и присвоение стиля.
 *
 * Высоты в пикселях и связаны с вёрсткой: `line-height: 20px` плюс `padding: 6px`
 * сверху и снизу дают ровно 32px на одну строку. Менять одно без другого нельзя.
 */

/** Одна строка. Базовая высота поля, ниже которой оно не схлопывается. */
export const COMPOSER_MIN_HEIGHT = 32;

/** Примерно шесть строк. Дальше поле не растёт, а прокручивается внутри себя. */
export const COMPOSER_MAX_HEIGHT = 128;

/**
 * @param {number} scrollHeight — измеренная высота содержимого поля
 * @param {number} [min] — базовая высота
 * @param {number} [max] — потолок, после которого включается внутренний скролл
 * @returns {number} высота, которую нужно выставить полю
 */
export function nextTextareaHeight(scrollHeight, min, max) {
  const floor = typeof min === 'number' ? min : COMPOSER_MIN_HEIGHT;
  const ceiling = typeof max === 'number' ? max : COMPOSER_MAX_HEIGHT;
  // Незамеренное поле (jsdom, скрытый контейнер) — это не «нулевая высота»,
  // а «нечего измерять»: отдаём базу, а не схлопнутую строку.
  const measured = Number.isFinite(scrollHeight) ? scrollHeight : 0;

  return Math.min(Math.max(measured, floor), ceiling);
}

/** Содержимое переросло потолок — поле обязано показать собственную прокрутку. */
export function isScrollable(scrollHeight, max) {
  const ceiling = typeof max === 'number' ? max : COMPOSER_MAX_HEIGHT;
  return Number.isFinite(scrollHeight) && scrollHeight > ceiling;
}

export default nextTextareaHeight;
