/**
 * Запасной источник CSS-переменных Тока.
 *
 * Штатно `--v-tok-*` объявляет `@tne-ui/core` — Ток их только читает
 * (`tok-color()` в `styles/_tokens.scss`). Но компонент обязан оставаться
 * смотрибельным и там, где библиотеки нет: демо-стенд этого репозитория,
 * изолированный просмотр в Storybook, страница-песочница. Для таких мест
 * здесь лежит функция, раскладывающая значения из `theme/tokens.js`
 * в те же самые переменные.
 *
 * Вызывать это в Трансфере не нужно и вредно: инлайновый стиль на элементе
 * сильнее правил `@tne-ui/core`, и тема перестала бы переключаться. Поэтому
 * по умолчанию функция сначала проверяет, не объявлены ли переменные уже.
 */
import tokens from './tokens';

/** Префикс переменных темы. Ключи токенов уже начинаются с `tok-`. */
export const TOK_CSS_PREFIX = '--v-';

/**
 * По какому токену проверяется «переменные уже объявлены».
 * Фон панели есть в любой сборке темы — если нет его, нет ничего.
 */
const PROBE_TOKEN = 'tok-surface';

function probeName() {
  return `${TOK_CSS_PREFIX}${PROBE_TOKEN}`;
}

/**
 * Значения темы в виде «имя CSS-переменной → цвет».
 *
 * @param {'light'|'dark'} mode
 * @returns {Object<string, string>}
 */
export function tokThemeCssVars(mode) {
  const source = tokens[mode === 'dark' ? 'dark' : 'light'];

  return Object.keys(source).reduce((acc, name) => {
    acc[`${TOK_CSS_PREFIX}${name}`] = source[name];
    return acc;
  }, {});
}

/**
 * Объявил ли переменные Тока кто-то снаружи (обычно `@tne-ui/core`).
 *
 * @param {Element|null} target
 * @returns {boolean}
 */
export function hasHostTokTheme(target) {
  if (!target || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return false;
  }

  try {
    return window.getComputedStyle(target).getPropertyValue(probeName()).trim() !== '';
  } catch (e) {
    return false;
  }
}

/**
 * Переменные, записанные инлайново нами же на прошлом вызове.
 *
 * Без этой проверки вторая смена темы отвалилась бы: `getComputedStyle`
 * видит и инлайновый стиль, поэтому `hasHostTokTheme` после первого вызова
 * всегда правдив.
 */
function ownsTokTheme(target) {
  return Boolean(target.style) && target.style.getPropertyValue(probeName()).trim() !== '';
}

/**
 * Разложить тему Тока в CSS-переменные элемента.
 *
 * @param {'light'|'dark'} mode тема хоста
 * @param {{ target?: Element, force?: boolean }} [options]
 *   `target` — куда писать, по умолчанию `<html>`;
 *   `force` — писать даже поверх переменных хоста.
 * @returns {boolean} записали ли переменные
 */
export function applyTokTheme(mode, options) {
  const settings = options || {};
  const target =
    settings.target || (typeof document !== 'undefined' ? document.documentElement : null);

  if (!target || !target.style) return false;
  if (!settings.force && !ownsTokTheme(target) && hasHostTokTheme(target)) return false;

  const vars = tokThemeCssVars(mode);
  Object.keys(vars).forEach((name) => target.style.setProperty(name, vars[name]));

  return true;
}

export default applyTokTheme;
