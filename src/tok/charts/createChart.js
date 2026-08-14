/**
 * Сборка графиков amCharts 4.
 *
 * Отдельный модуль, а не код внутри компонента: amCharts настраивается императивно
 * и подробно, и если это перемешать с жизненным циклом Vue, станет невозможно понять,
 * где кончается вёрстка и начинается конфигурация серии.
 *
 * Три вида графика — три функции с осмысленной конфигурацией по умолчанию, а не один
 * «универсальный» график с ветвлениями (ADR-0003). Общее у них — тема, локаль,
 * форматирование чисел и тултип; всё это собрано в `applyChartBasics`.
 *
 * Версия важна: это amCharts **4**, у пятой версии другой API целиком.
 */
import * as am4core from '@amcharts/amcharts4/core';
import * as am4charts from '@amcharts/amcharts4/charts';
import am4langRu from '@amcharts/amcharts4/lang/ru_RU';

import { CONTENT_TYPE } from '../api/contract';
import { prefersReducedMotion } from '../utils/motion';

// Разряды пробелом, максимум два знака после запятой — как в таблице и в `stat`.
const NUMBER_FORMAT = '#,###.##';
const AREA_FILL_OPACITY = 0.18;
const COLUMN_RADIUS = 4;

// Сокращения оси значений. Русские, потому что дефолтные `k`/`M`/`G` в интерфейсе
// энергосбыта читаются как опечатка.
const BIG_NUMBER_PREFIXES = [
  { number: 1e3, suffix: ' тыс.' },
  { number: 1e6, suffix: ' млн' },
  { number: 1e9, suffix: ' млрд' },
];
const AXIS_NUMBER_FORMAT = '#.#a';
const AXIS_FONT_SIZE = 11;

/** Поле данных серии с индексом `i`. amCharts требует плоскую строку данных. */
function valueField(index) {
  return `v${index}`;
}

/**
 * Ряды в форме, которую ждёт XY-график: одна строка на категорию, по колонке на серию.
 * Категории собираются в порядке первого появления — сервер прислал их осмысленно
 * (месяцы, дни), и сортировать их по алфавиту было бы вредительством.
 */
export function toXYData(series) {
  const order = [];
  const byCategory = Object.create(null);

  series.forEach((line, index) => {
    line.points.forEach((point) => {
      if (!byCategory[point.category]) {
        byCategory[point.category] = { category: point.category };
        order.push(point.category);
      }
      byCategory[point.category][valueField(index)] = point.value;
    });
  });

  return order.map((category) => byCategory[category]);
}

function styleAxis(axis, palette) {
  const { renderer } = axis;

  renderer.grid.template.stroke = am4core.color(palette.grid);
  renderer.grid.template.strokeOpacity = 1;
  renderer.labels.template.fill = am4core.color(palette.textMuted);
  renderer.labels.template.fontSize = AXIS_FONT_SIZE;
  // Осевая линия не нужна: сетка уже задаёт систему координат, как в макете.
  renderer.line.strokeOpacity = 0;
  renderer.ticks.template.disabled = true;
}

function styleTooltip(series, palette) {
  const { tooltip } = series;
  if (!tooltip) return;

  // Без этого amCharts красит тултип в цвет серии и наш фон игнорирует.
  tooltip.getFillFromObject = false;
  tooltip.background.fill = am4core.color(palette.tooltipSurface);
  tooltip.background.stroke = am4core.color(palette.tooltipSurface);
  tooltip.background.cornerRadius = 8;
  tooltip.label.fill = am4core.color(palette.tooltipText);
  tooltip.label.fontSize = 13;
}

function createLegend(palette) {
  const legend = new am4charts.Legend();
  // Снизу, а не сверху: сверху легенда отъедала высоту у самого графика, а в
  // узкой панели высота дороже ширины.
  legend.position = 'bottom';
  legend.labels.template.fill = am4core.color(palette.text);
  legend.labels.template.fontSize = 12;
  legend.valueLabels.template.disabled = true;
  legend.markers.template.width = 10;
  legend.markers.template.height = 10;
  legend.itemContainers.template.paddingTop = 2;
  legend.itemContainers.template.paddingBottom = 2;
  legend.marginTop = 8;
  legend.marginBottom = 0;
  // Десяток рядов не имеет права выдавить график: легенда прокручивается сама.
  // 72px — три строки: на панели в 100vw четыре подписи встают в три строки, и
  // при потолке в две последняя пряталась под прокрутку на ровном месте.
  legend.maxHeight = 72;
  legend.scrollable = true;
  return legend;
}

// Высота шкалы масштаба. Дефолтный `am4core.Scrollbar` занимает около 35px —
// это треть холста в панели 480px, ради которых его в прошлый раз и прятали
// за порогом по количеству точек. 10px помещаются всегда.
const SCROLLBAR_HEIGHT = 10;
const SCROLLBAR_GRIP_WIDTH = 14;

/**
 * Тонкая шкала масштаба под осью категорий.
 *
 * Дефолтные хваты — «гантели» с иконкой-стрелками — выше самой полосы и ломают
 * её линию. Иконки убираем, но сами хваты оставляем видимой ширины: это
 * единственная область, за которую шкалу тянут краем, и без неё зум остаётся
 * только колесом и курсором.
 *
 * @param {object} palette цвета темы (`charts/palette.js`).
 * @returns {object} настроенный `am4core.Scrollbar`.
 */
function createZoomScrollbar(palette) {
  const scrollbar = new am4core.Scrollbar();

  scrollbar.height = SCROLLBAR_HEIGHT;
  scrollbar.minHeight = SCROLLBAR_HEIGHT;
  scrollbar.marginTop = 10;
  scrollbar.marginBottom = 0;

  scrollbar.background.fill = am4core.color(palette.grid);
  scrollbar.background.fillOpacity = 1;
  scrollbar.background.cornerRadius(
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
  );

  scrollbar.thumb.background.fill = am4core.color(palette.textMuted);
  scrollbar.thumb.background.fillOpacity = 0.45;
  scrollbar.thumb.background.cornerRadius(
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
    SCROLLBAR_HEIGHT / 2,
  );

  // Без этого amCharts перекрашивает ползунок в свой дефолтный синий при наведении
  // и нажатии — мимо палитры темы.
  ['hover', 'down'].forEach((key) => {
    const state = scrollbar.thumb.background.states.getKey(key);
    if (state) {
      state.properties.fill = am4core.color(palette.textMuted);
      state.properties.fillOpacity = 0.7;
    }
  });

  // Индексный цикл, а не `forEach`: тело настраивает объект целиком, а мутация
  // параметра колбэка запрещена airbnb-конфигом (`no-param-reassign`).
  const grips = [scrollbar.startGrip, scrollbar.endGrip];
  for (let i = 0; i < grips.length; i += 1) {
    const grip = grips[i];

    grip.icon.disabled = true;
    grip.width = SCROLLBAR_GRIP_WIDTH;
    grip.height = SCROLLBAR_HEIGHT;
    grip.background.fill = am4core.color(palette.textMuted);
    grip.background.fillOpacity = 0.7;
    grip.background.strokeOpacity = 0;

    ['hover', 'down'].forEach((key) => {
      const state = grip.background.states.getKey(key);
      if (state) {
        state.properties.fill = am4core.color(palette.textMuted);
        state.properties.fillOpacity = 1;
      }
    });
  }

  return scrollbar;
}

/**
 * Общее для всех видов: локаль, формат чисел, отступы.
 * График создаётся здесь же, а не принимается параметром, — иначе получилась бы
 * функция, которая живёт только ради мутации чужого объекта.
 *
 * Логотип amCharts (`<g opacity="0.4">` внутри SVG, CSS-ом не убирается) снимает
 * сама библиотека: при `am4core.options.commercialLicense = true` она попросту не
 * создаёт `chart.logo`. Отдельного кода это не требует — только поднятого флага
 * `config.amchartsLicensed`, а поднимать его без коммерческой лицензии нельзя.
 */
function createBaseChart(element, ChartClass) {
  const chart = am4core.create(element, ChartClass);

  // Русская локаль: месяцы и разделители в подписях и тултипе — не английские.
  chart.language.locale = am4langRu;
  chart.numberFormatter.numberFormat = NUMBER_FORMAT;
  chart.paddingLeft = 0;
  // Не 0: крайний хват зум-скроллбара выступает за область рисования и при нулевом
  // отступе срезался краем панели (docs/charterr.png).
  chart.paddingRight = 6;
  chart.paddingTop = 4;
  chart.paddingBottom = 0;

  return chart;
}

function createXYChart(element, { series, palette, kind }) {
  const chart = createBaseChart(element, am4charts.XYChart);
  chart.data = toXYData(series);

  const categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
  categoryAxis.dataFields.category = 'category';
  // Реже подписи — больше воздуха между ними. В панели 480px три-четыре подписи
  // читаются, а восемь сливаются в серую полосу.
  categoryAxis.renderer.minGridDistance = 56;
  // Подпись, которая не влезла, поворачивать некуда — панель узкая; лучше показать
  // реже, чем наложить одну на другую.
  categoryAxis.renderer.labels.template.truncate = true;
  categoryAxis.renderer.labels.template.maxWidth = 72;
  styleAxis(categoryAxis, palette);

  // Подпись оси значений внутри графика не задаётся: развёрнутая на 0° подпись
  // резервировала горизонтальную полосу во всю ширину текста и ужимала график
  // вдвое (docs/charterr.png). Её рисует компонент — `.tok-chart__caption`.
  const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
  // Линий сетки должно быть немного: на холсте в 260px шаг в 28px давал девять
  // подписей одна под другой — ровно та «серая полоса», от которой уходили на оси
  // категорий.
  valueAxis.renderer.minGridDistance = 44;
  // Собственный форматтер: сокращение нужно оси, но не тултипу — там человек ждёт
  // точное значение, а не «420 тыс.».
  valueAxis.numberFormatter = new am4core.NumberFormatter();
  valueAxis.numberFormatter.numberFormat = AXIS_NUMBER_FORMAT;
  valueAxis.numberFormatter.bigNumberPrefixes = BIG_NUMBER_PREFIXES;
  styleAxis(valueAxis, palette);

  const isArea = kind === CONTENT_TYPE.LINE;
  const single = series.length === 1;

  series.forEach((line, index) => {
    const color = am4core.color(palette.series[index % palette.series.length]);
    const item = chart.series.push(
      isArea ? new am4charts.LineSeries() : new am4charts.ColumnSeries(),
    );

    item.name = line.name;
    item.dataFields.categoryX = 'category';
    item.dataFields.valueY = valueField(index);
    item.tooltipText = '{categoryX}: [bold]{valueY}[/]';
    styleTooltip(item, palette);

    if (isArea) {
      item.stroke = color;
      item.strokeWidth = 2;
      // Одна серия — плотная заливка из макета; несколько — полупрозрачные,
      // иначе верхняя закроет нижние.
      item.fill = single ? am4core.color(palette.fill) : color;
      item.fillOpacity = single ? 1 : AREA_FILL_OPACITY;
    } else {
      item.columns.template.fill = color;
      item.columns.template.stroke = color;
      item.columns.template.column.cornerRadiusTopLeft = COLUMN_RADIUS;
      item.columns.template.column.cornerRadiusTopRight = COLUMN_RADIUS;
    }
  });

  // Легенда у одной серии — шум: её имя уже стоит подписью оси.
  if (!single) chart.legend = createLegend(palette);

  const cursor = new am4charts.XYCursor();
  cursor.behavior = 'zoomX';
  cursor.lineY.disabled = true;
  cursor.lineX.stroke = am4core.color(palette.textMuted);
  chart.cursor = cursor;

  // Шкала масштаба под осью — всегда: она тонкая (10px) и её постоянное
  // присутствие делает поведение графика предсказуемым. Порог по количеству
  // точек из доработки 1 отменён постановкой «Доработки 2», пункт 5.
  chart.scrollbarX = createZoomScrollbar(palette);
  chart.scrollbarX.parent = chart.bottomAxesContainer;

  return chart;
}

function createPieChart(element, { series, palette }) {
  const chart = createBaseChart(element, am4charts.PieChart);

  // Круговой график показывает одну структуру, а не несколько рядов: берём первый ряд.
  const [first] = series;
  chart.data = first ? first.points.slice() : [];

  // Кольцо, а не сплошной круг: при легенде снизу в узкой панели кольцо читается
  // как доли, а сплошной круг — как пятно.
  chart.radius = am4core.percent(80);
  chart.innerRadius = am4core.percent(50);

  const slices = chart.series.push(new am4charts.PieSeries());
  slices.dataFields.value = 'value';
  slices.dataFields.category = 'category';
  slices.colors.list = palette.series.map((color) => am4core.color(color));
  slices.slices.template.stroke = am4core.color(palette.grid);
  slices.slices.template.strokeWidth = 1;
  slices.slices.template.tooltipText = '{category}: [bold]{value}[/] ({value.percent}%)';
  // Подписи с выносными линиями в узкой панели не помещаются — категории уходят
  // в легенду, а значения показывает тултип.
  slices.labels.template.disabled = true;
  slices.ticks.template.disabled = true;
  styleTooltip(slices, palette);

  chart.legend = createLegend(palette);

  return chart;
}

const BUILDERS = {
  [CONTENT_TYPE.LINE]: createXYChart,
  [CONTENT_TYPE.BAR]: createXYChart,
  [CONTENT_TYPE.CIRCLE]: createPieChart,
};

export function isChartKind(kind) {
  return Object.prototype.hasOwnProperty.call(BUILDERS, kind);
}

/**
 * Единая точка создания графика.
 *
 * @param {HTMLElement} element — контейнер
 * @param {object} options
 * @param {string} options.kind — `line` | `bar` | `circle`
 * @param {Array}  options.series — уже нормализованные серии (`api/contentShape.js`)
 * @param {object} options.palette — цвета темы (`charts/palette.js`)
 * @param {boolean} [options.licensed] — у хоста есть коммерческая лицензия amCharts
 * @returns {object|null} инстанс графика; `null`, если вид неизвестен
 */
export function createChart(element, options) {
  const build = BUILDERS[options.kind];
  if (!build || !element) return null;

  // Анимации выключаются вместе с системным «уменьшить движение»: настройка
  // глобальная для amCharts, но и настройка ОС глобальна для страницы.
  am4core.options.animationsEnabled = !prefersReducedMotion();
  am4core.options.commercialLicense = options.licensed === true;

  return build(element, options);
}

export { am4core };
export default createChart;
