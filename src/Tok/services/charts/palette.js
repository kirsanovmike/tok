/**
 * Цвета графиков в терминах, понятных amCharts.
 *
 * Проблема: компоненты Тока красятся CSS-переменными Vuetify, а amCharts рисует
 * SVG из JavaScript и строку `var(--v-tok-chart-1-base)` не понимает — ему нужно
 * настоящее значение цвета. Поэтому значение достаётся из вычисленных стилей
 * документа: так график берёт ровно ту тему, что сейчас включена, и переключается
 * вместе с ней.
 *
 * Запасной источник — сами токены (`theme/tokens.js`). Он срабатывает там, где
 * Vuetify не установил свой `:root` (jsdom в тестах, изолированный рендер), и
 * держит правило «hex только в tokens.js»: здесь ни одного литерала цвета нет.
 */
import tokens from '../../theme/tokens';

/** Токены, которые нужны графику. Ключ — имя внутри графика, значение — имя токена. */
const CHART_TOKENS = {
  text: 'tok-text',
  textMuted: 'tok-text-muted',
  grid: 'tok-chart-grid',
  fill: 'tok-chart-fill',
  tooltipSurface: 'tok-tooltip-surface',
  tooltipText: 'tok-tooltip-text',
};

/** Категориальная палитра: круговой график и ответы с несколькими рядами. */
const SERIES_TOKENS = ['tok-chart-1', 'tok-chart-2', 'tok-chart-3', 'tok-chart-4'];

function readCssToken(root, name) {
  if (!root || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return '';
  }

  try {
    return window.getComputedStyle(root).getPropertyValue(`--v-${name}-base`).trim();
  } catch (e) {
    return '';
  }
}

/**
 * @param {Element|null} root — элемент, от которого считаются стили. Панель Тока
 *   живёт в портале в `<body>`, поэтому подойдёт и она, и `documentElement`.
 * @param {boolean} isDark — какая тема включена; нужна только запасному источнику.
 */
export function resolveChartPalette(root, isDark) {
  const fallback = tokens[isDark ? 'dark' : 'light'];
  const element = root || (typeof document !== 'undefined' ? document.documentElement : null);

  const pick = (name) => readCssToken(element, name) || fallback[name];

  const palette = Object.keys(CHART_TOKENS).reduce((acc, key) => {
    acc[key] = pick(CHART_TOKENS[key]);
    return acc;
  }, {});

  palette.series = SERIES_TOKENS.map(pick);

  return palette;
}

export default resolveChartPalette;
