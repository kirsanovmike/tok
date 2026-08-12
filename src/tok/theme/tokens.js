/**
 * Токены темы Тока.
 *
 * ЕДИНСТВЕННЫЙ файл внутри `src/tok/`, где допустимы hex-литералы.
 * Компоненты обращаются к цветам только через CSS-переменные Vuetify —
 * см. функцию `tok-color()` в `src/tok/styles/_tokens.scss`.
 *
 * Почему плоские цвета верхнего уровня, а не вложенная группа:
 * парсер темы Vuetify 2 (`vuetify/lib/services/theme/utils.js`, `parse`) внутри
 * вложенной группы оставляет только ключи `base`, `lighten*`, `darken*` — семантические
 * имена вроде `surface` он бы выбросил. Плоский цвет `tok-surface` превращается
 * в CSS-переменную `--v-tok-surface-base`, которая переключается вместе с темой.
 *
 * Светлые значения сняты с макетов Figma (`docs/referencies from FIGMA/`),
 * тёмные выведены по инвертирующей логике палитры хоста: референса тёмной панели нет.
 *
 * Наборы ключей `light` и `dark` обязаны совпадать — проверяется тестом
 * `tests/unit/theme-parity.spec.js`.
 */

const light = {
  // Поверхности
  'tok-surface': '#FFFFFF', // фон панели
  'tok-surface-muted': '#F2F2F2', // чипы-подсказки, пузырь пользователя
  'tok-surface-elevated': '#F8F9FF', // блоки контента: таблица, stat, график
  'tok-overlay': '#0A0B21', // затемнение хоста, прозрачность задаётся в стилях
  // Тень панели и точки входа. Только 6-значный hex: парсер темы Vuetify 2
  // (`colorToInt`) не понимает alpha-канал и молча заменяет такой цвет белым.
  // Прозрачность даёт само размытие box-shadow.
  'tok-shadow': '#C9CEE4',

  // Текст
  'tok-text': '#14161A',
  // Приглушённый текст обязан оставаться читаемым: им набраны заголовки колонок
  // таблицы, подпись `stat`, подписи осей и плейсхолдер — это содержательный
  // текст, а не декор. Прежний `#909090` давал 2,85:1 на `surface-muted` при
  // требуемых WCAG AA 4,5:1. `#6B6B6B` даёт 4,76:1 на `surface-muted`,
  // 5,07:1 на `surface-elevated` и 5,33:1 на белом.
  'tok-text-muted': '#6B6B6B',
  'tok-text-inverse': '#FFFFFF',

  // Линии
  'tok-border': '#E0E0E0',
  'tok-border-strong': '#CDCDCD',

  // Акцент.
  // Работает в обе стороны: белым по акценту набраны «Подтвердить» и активный
  // переключатель типа графика, самим акцентом — иконки и маркеры списка.
  // Исходный `#3879F6` давал 4,03:1 и с белым, и на белом — ниже AA для текста.
  // `#2F6FE0` — тот же синий на пару тонов глубже: 4,73:1 в обе стороны.
  'tok-accent': '#2F6FE0',
  'tok-accent-soft': '#E9F2FF',

  // Градиент: точка входа, аватар-звёздочка, индикатор загрузки
  'tok-gradient-from': '#54B6F9',
  'tok-gradient-to': '#1D2DF5',

  // Статусы ответа.
  // `danger` — это цвет **текста** сообщения об ошибке, а не только точки-индикатора,
  // поэтому он обязан проходить AA. Исходный `#E43636` давал 4,30:1 на белом.
  'tok-danger': '#C62828',
  'tok-success': '#26C13F',
  'tok-warning': '#FFA900',

  // Графики. amCharts не умеет читать CSS-переменные — цвета достаются из этих же
  // токенов в рантайме (`charts/palette.js`), поэтому дефолтная палитра amCharts
  // в Ток не попадает ни при каком раскладе.
  'tok-chart-grid': '#EDEEF5',
  'tok-chart-fill': '#E3E4FA', // заливка под линией, по `chart пример.png`
  'tok-chart-1': '#3355FF',
  'tok-chart-2': '#54B6F9',
  'tok-chart-3': '#8E7BFF',
  'tok-chart-4': '#A9B0D6',
  'tok-tooltip-surface': '#3D3D47',
  'tok-tooltip-text': '#FFFFFF',
};

const dark = {
  'tok-surface': '#151537',
  'tok-surface-muted': '#212134',
  'tok-surface-elevated': '#1D1F2C',
  'tok-overlay': '#000000',
  'tok-shadow': '#05060F',

  'tok-text': '#F2F2F2',
  'tok-text-muted': '#A1A1A1',
  'tok-text-inverse': '#0A0B21',

  'tok-border': '#33335C',
  'tok-border-strong': '#4C5070',

  'tok-accent': '#5297FF',
  'tok-accent-soft': '#1F3B65',

  'tok-gradient-from': '#4DA8F8',
  'tok-gradient-to': '#2437A2',

  // Тёмная тема требует обратного сдвига: тот же `#E43636` на тёмной поверхности
  // давал 4,09:1. Красный здесь светлее, а не темнее, — как и весь остальной
  // текст в инвертированной палитре.
  'tok-danger': '#FF6B6B',
  'tok-success': '#26C13F',
  'tok-warning': '#FFA900',

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
