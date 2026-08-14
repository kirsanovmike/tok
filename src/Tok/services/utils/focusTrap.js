/**
 * Фокус-ловушка панели.
 *
 * Пока панель открыта, `Tab` и `Shift+Tab` ходят по кругу внутри неё и не уводят
 * фокус в контент хоста. При закрытии фокус возвращается туда, откуда его забрали, —
 * то есть на точку входа.
 *
 * Список фокусируемых элементов пересчитывается на каждое нажатие: состав панели
 * меняется (появляется кнопка отправки, кнопки подтверждения, чипы).
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(root) {
  if (!root) return [];

  return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE_SELECTOR), (element) => {
    if (element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    // offsetParent === null у скрытых элементов; в jsdom он всегда null,
    // поэтому проверка нужна только в браузере — там hidden-элементы отсеиваются.
    return true;
  });
}

export function createFocusTrap(getRoot) {
  let previouslyFocused = null;

  function onKeydown(event) {
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(getRoot());
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !getRoot().contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      previouslyFocused = document.activeElement;
      document.addEventListener('keydown', onKeydown, true);
    },

    focusFirst() {
      const focusable = getFocusableElements(getRoot());
      if (focusable.length > 0) focusable[0].focus();
    },

    deactivate() {
      document.removeEventListener('keydown', onKeydown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    },
  };
}
