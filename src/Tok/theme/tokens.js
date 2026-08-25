/**
 * Цвета графиков Тока.
 *
 * ЕДИНСТВЕННЫЙ файл внутри `src/Tok/`, где допустимы hex-литералы, и
 * единственное, ради чего папке вообще нужен `theme/`.
 *
 * Вся остальная покраска идёт CSS-переменными `--v-tok-*` прямо в стилях
 * компонентов: `background-color: var(--v-tok-surface);`. Переменные объявляет
 * хост: в Трансфере — `@tne-ui/core`, на стенде — сам стенд. Тему переключает
 * Vuetify. Своего механизма темы у Тока нет (ADR-0010).
 *
 * Здесь остались только те токены, которые нужны amCharts: SVG, нарисованный
 * из JavaScript, строку `var(…)` не понимает — ему нужно настоящее значение.
 * Штатно `services/charts/palette.js` читает переменные из `getComputedStyle`,
 * а этот набор — запасной источник для окружений, где их нет (jsdom в тестах,
 * изолированный рендер). Значения обязаны совпадать с объявлениями хоста.
 *
 * Светлые значения сняты с макетов Figma (`docs/referencies from FIGMA/`),
 * тёмные выведены по инвертирующей логике палитры хоста.
 *
 * Наборы ключей `light` и `dark` обязаны совпадать — проверяется тестом
 * `tests/unit/theme-parity.spec.js`.
 */

const light = {
  // Подписи осей и легенды. Тот же текст, что и в панели, — иначе график
  // читался бы отдельной картинкой, вклеенной в ответ.
  'tok-text': '#14161A',
  'tok-text-muted': '#6B6B6B',

  'tok-chart-grid': '#EDEEF5',
  'tok-chart-fill': '#E3E4FA', // заливка под линией, по `chart пример.png`

  // Категориальная палитра: круговой график и ответы с несколькими рядами.
  'tok-chart-1': '#3355FF',
  'tok-chart-2': '#54B6F9',
  'tok-chart-3': '#8E7BFF',
  'tok-chart-4': '#A9B0D6',

  'tok-tooltip-surface': '#3D3D47',
  'tok-tooltip-text': '#FFFFFF',
};

const dark = {
  'tok-text': '#F2F2F2',
  'tok-text-muted': '#A1A1A1',

  'tok-chart-grid': '#2A2B4F',
  'tok-chart-fill': '#252A5E',

  'tok-chart-1': '#5A7BFF',
  'tok-chart-2': '#4DA8F8',
  'tok-chart-3': '#9E8DFF',
  'tok-chart-4': '#6C74A8',

  'tok-tooltip-surface': '#33355E',
  'tok-tooltip-text': '#F2F2F2',
};

export default { light, dark };
