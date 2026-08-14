/**
 * Ширина шторки Тока.
 *
 * Отдельный модуль по той же причине, что и `autoGrow.js`: jsdom не считает
 * layout, и проверить арифметику перетаскивания внутри компонента невозможно.
 * Здесь она проверяется честно, а компоненту остаётся чтение события указателя
 * и присвоение стиля.
 *
 * Пиксели связаны с вёрсткой `TokPanel.vue`: `PANEL_MIN_WIDTH` обязан совпадать
 * со SCSS-переменной `$tok-panel-min-width` (`styles/_tokens.scss`) — совпадение
 * проверяет тест «минимальная ширина одна и та же в SCSS и в JS».
 */

/**
 * Стартовая и минимальная ширина панели. Постановка «Доработки 3», пункт 7:
 * прежние 480px просили увеличить на 30–40 пикселей, и эта же ширина объявлена
 * минимальной — уже неё панель не тянется.
 */
export const PANEL_MIN_WIDTH = 520;

/** Шаг изменения ширины с клавиатуры. */
export const PANEL_WIDTH_STEP = 24;

/**
 * Ниже этой ширины окна панель занимает его целиком (медиазапрос 599px плюс
 * запас): тянуть нечего, и ручка только мешала бы попадать в ленту пальцем.
 */
export const PANEL_RESIZE_MIN_VIEWPORT = 600;

/** Ширина окна, с подстраховкой от `undefined` при рендере без окна. */
function viewportOf(viewportWidth) {
  return Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : PANEL_MIN_WIDTH;
}

/** Потолок: «во весь экран», но не уже минимума. */
export function panelMaxWidth(viewportWidth) {
  return Math.max(viewportOf(viewportWidth), PANEL_MIN_WIDTH);
}

/**
 * Ширина, зажатая между минимумом и шириной окна.
 * Округление обязательно: дробная ширина даёт полупиксельную границу панели,
 * и правый край перестаёт быть строгой линией.
 */
export function clampPanelWidth(width, viewportWidth) {
  const measured = Number.isFinite(width) ? width : PANEL_MIN_WIDTH;
  const bounded = Math.min(Math.max(measured, PANEL_MIN_WIDTH), panelMaxWidth(viewportWidth));
  return Math.round(bounded);
}

/**
 * Ширина по горизонтальному положению указателя. Панель прижата к правому краю
 * окна, поэтому ширина — это расстояние от указателя до этого края.
 */
export function widthFromPointerX(clientX, viewportWidth) {
  const x = Number.isFinite(clientX) ? clientX : 0;
  return clampPanelWidth(viewportOf(viewportWidth) - x, viewportWidth);
}

/** Есть ли смысл в ручке при такой ширине окна. */
export function isPanelResizable(viewportWidth) {
  return viewportOf(viewportWidth) > PANEL_RESIZE_MIN_VIEWPORT;
}

export default clampPanelWidth;
