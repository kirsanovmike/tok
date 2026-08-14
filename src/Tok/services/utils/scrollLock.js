/**
 * Блокировка скролла страницы-хоста на время открытой панели.
 *
 * Счётчик, а не булев флаг: в Трансфере поверх Тока может открыться ещё один
 * модальный слой, и он не должен разблокировать страницу за нас.
 *
 * Ширина полосы прокрутки компенсируется padding-ом, иначе контент хоста
 * дёргается вправо в момент открытия панели.
 *
 * Почему `overflow` ставится на `<html>`, а не только на `<body>`.
 * Переполнение `<body>` наследуется вьюпортом **только пока у `<html>` оно
 * `visible`** (CSS Overflow, propagation to the viewport). Vuetify в своём
 * сбросе объявляет `html { overflow-y: scroll }` — и тогда `body { overflow:
 * hidden }` не значит ничего: страница под панелью продолжает прокручиваться
 * колесом. Найдено на приёмке фазы 12 живым событием `mouseWheel`; программный
 * `window.scrollBy()` этот дефект не показывает, потому что `overflow: hidden`
 * по определению запрещает пользовательскую прокрутку, но разрешает скриптовую.
 * Трансфера — приложение на Vuetify с тем же сбросом, так что чинить обязательно.
 */

let locks = 0;
let savedBodyOverflow = '';
let savedRootOverflow = '';
let savedPaddingRight = '';

export function lockPageScroll() {
  locks += 1;
  if (locks > 1) return;

  const { body, documentElement } = document;
  const scrollbar = window.innerWidth - documentElement.clientWidth;

  savedBodyOverflow = body.style.overflow;
  savedRootOverflow = documentElement.style.overflow;
  savedPaddingRight = body.style.paddingRight;

  // Оба элемента: `<html>` перекрывает сброс хоста, `<body>` остаётся ради
  // окружений, где прокручивается именно он.
  documentElement.style.overflow = 'hidden';
  body.style.overflow = 'hidden';

  if (scrollbar > 0) {
    const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbar}px`;
  }
}

export function unlockPageScroll() {
  if (locks === 0) return;
  locks -= 1;
  if (locks > 0) return;

  // Возвращаются именно прежние инлайновые значения, а не пустая строка:
  // хост мог держать свой `overflow` на `<html>` ещё до открытия панели.
  document.documentElement.style.overflow = savedRootOverflow;
  document.body.style.overflow = savedBodyOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

// Только для тестов и горячей перезагрузки: сбрасывает счётчик в исходное состояние.
export function resetPageScrollLock() {
  locks = 0;
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
