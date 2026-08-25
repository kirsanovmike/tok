/**
 * Фаза 8 — графики amCharts 4.
 *
 * Тесты работают с **настоящим** amCharts, а не с моком: проверять утилизацию
 * инстансов по подставному объекту бессмысленно — вся суть проверки в том, что
 * библиотека действительно освобождает `registry.baseSprites`.
 *
 * Чего эти тесты не проверяют: как график выглядит. jsdom не считает вёрстку
 * (см. заплатки в `support/jsdomSvg.js`), поэтому геометрия, подписи и заливка —
 * визуальная сверка на стенде.
 */
import fs from 'fs';
import path from 'path';

import * as am4core from '@amcharts/amcharts4/core';
import { mount } from '@vue/test-utils';

import TokContentChart from '@/Tok/SubComponents/TokContentChart.vue';
import { CONTENT_COMPONENTS } from '@/Tok/services/contentRegistry';
import { toXYData } from '@/Tok/services/charts/createChart';
import { resolveChartPalette } from '@/Tok/services/charts/palette';
import { normalizeSeries } from '@/Tok/services/api/contentShape';
import { CONTENT_TYPE } from '@/Tok/services/api/contract';
import { findFixtureById } from '@/Tok/services/api/mock/fixtures';
import tokens from '@/Tok/theme/tokens';
import { createControlledApi, flush, mountPanel } from './support/tok';

const CHART_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/Tok/SubComponents/TokContentChart.vue'),
  'utf8',
);

function blockOf(fixtureId) {
  return findFixtureById(fixtureId).response.contents[0];
}

// Точки монтирования: график живёт в документе, иначе amCharts нечего измерять.
// Именно в дочерний div, а не в `document.body`: @vue/test-utils 1.0.3 **заменяет**
// элемент, указанный в `attachTo`, — с `body` документ остался бы без него.
const hosts = [];

function mountChart(block, options) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);

  return mount(TokContentChart, {
    propsData: { block },
    attachTo: host,
    ...(options || {}),
  });
}

/** Живые инстансы amCharts на странице. Ноль — значит утечки нет. */
function liveCharts() {
  return am4core.registry.baseSprites.length;
}

describe('графики', () => {
  afterEach(() => {
    // Ни один тест не имеет права оставить инстанс следующему.
    expect(liveCharts()).toBe(0);
    hosts.splice(0).forEach((host) => host.remove());
  });

  describe('данные', () => {
    it('серии контракта разворачиваются в строки «категория + колонка на ряд»', () => {
      const series = normalizeSeries(blockOf('line-multi'));
      const data = toXYData(series);

      expect(series).toHaveLength(3);
      expect(data).toHaveLength(6);
      // Категории в порядке первого появления, а не по алфавиту: месяцы прислал
      // сервер, и переставлять их нельзя.
      expect(data.map((row) => row.category)).toEqual([
        'Январь',
        'Февраль',
        'Март',
        'Апрель',
        'Май',
        'Июнь',
      ]);
      // Три ряда — три колонки значений в одной строке.
      expect(Object.keys(data[0]).sort()).toEqual(['category', 'v0', 'v1', 'v2']);
    });

    it('точки с нечисловым значением отбрасываются, а не превращаются в NaN', () => {
      const series = normalizeSeries({
        type: CONTENT_TYPE.LINE,
        xField: 'x',
        yField: 'y',
        series: [
          { name: 'Ряд', data: [{ x: 'а', y: 1 }, { x: 'б', y: 'нет данных' }, { x: 'в' }] },
        ],
      });

      expect(series[0].points).toEqual([{ category: 'а', value: 1 }]);
    });
  });

  describe('палитра', () => {
    it('цвета берутся из токенов темы, а не из дефолтов amCharts', () => {
      // В jsdom Vuetify свой `:root` не пишет, поэтому срабатывает запасной источник —
      // те же самые токены. Проверяем именно его: на стенде значение приезжает
      // из CSS-переменной, но набор ключей и источник истины одни и те же.
      const light = resolveChartPalette(null, false);
      const dark = resolveChartPalette(null, true);

      expect(light.series).toEqual([
        tokens.light['tok-chart-1'],
        tokens.light['tok-chart-2'],
        tokens.light['tok-chart-3'],
        tokens.light['tok-chart-4'],
      ]);
      expect(light.grid).toBe(tokens.light['tok-chart-grid']);
      expect(dark.grid).toBe(tokens.dark['tok-chart-grid']);
      // Светлая и тёмная действительно различаются — иначе «перерисовка при смене
      // темы» ничего бы не меняла.
      expect(dark.series).not.toEqual(light.series);
    });

    it('CSS-переменная темы имеет приоритет над запасным значением', () => {
      const host = document.createElement('div');
      host.style.setProperty('--v-tok-chart-1', 'rgb(1, 2, 3)');
      document.body.appendChild(host);

      expect(resolveChartPalette(host, false).series[0]).toBe('rgb(1, 2, 3)');

      host.remove();
    });
  });

  describe('построение', () => {
    it('линейный график строится и утилизируется', () => {
      const wrapper = mountChart(blockOf('line'));

      expect(liveCharts()).toBe(1);
      expect(wrapper.find('.tok-chart__canvas').exists()).toBe(true);

      wrapper.destroy();
      expect(liveCharts()).toBe(0);
    });

    it('столбчатый и круговой строятся из своих фикстур', () => {
      const bar = mountChart(blockOf('bar'));
      expect(liveCharts()).toBe(1);
      bar.destroy();

      const circle = mountChart(blockOf('circle'));
      expect(liveCharts()).toBe(1);
      circle.destroy();

      expect(liveCharts()).toBe(0);
    });

    it('легенда появляется у нескольких рядов и не мешает одному', () => {
      const single = mountChart(blockOf('line'));
      expect(single.vm.chart.legend).toBeUndefined();
      single.destroy();

      const multi = mountChart(blockOf('line-multi'));
      expect(multi.vm.chart.legend).toBeDefined();
      // Три ряда — три серии в графике, а не одна склеенная.
      expect(multi.vm.chart.series.length).toBe(3);
      multi.destroy();
    });

    it('на 30 точках есть зум-скроллбар, курсор и тултип со значением', () => {
      const wrapper = mountChart(blockOf('line-daily'));
      const { chart } = wrapper.vm;

      expect(chart.data).toHaveLength(30);
      expect(chart.scrollbarX).toBeDefined();
      expect(chart.cursor).toBeDefined();
      expect(chart.cursor.behavior).toBe('zoomX');

      // Зум — это диапазон оси категорий: скроллбар выставляет start/end.
      const axis = chart.xAxes.getIndex(0);
      axis.start = 0.5;
      axis.end = 1;
      expect(axis.start).toBe(0.5);

      // Тултип показывает и категорию, и значение.
      const series = chart.series.getIndex(0);
      expect(series.tooltipText).toContain('{categoryX}');
      expect(series.tooltipText).toContain('{valueY}');

      wrapper.destroy();
    });

    it('подпись оси значений — это HTML над холстом, а не элемент amCharts', () => {
      const wrapper = mountChart(blockOf('line'));
      const { chart } = wrapper.vm;

      expect(chart.xAxes.getIndex(0).dataFields.category).toBe('category');
      expect(chart.yAxes.length).toBe(1);

      // Внутри графика подписи оси нет: развёрнутая на 0° подпись резервировала
      // горизонтальную полосу во всю свою ширину и ужимала график вдвое
      // (см. docs/charterr.png).
      expect(chart.yAxes.getIndex(0).title.text).toBeFalsy();
      // Имя единственного ряда при этом никуда не делось — оно над холстом.
      expect(wrapper.find('.tok-chart__caption').text()).toBe('Объём потребления, кВт·ч');

      wrapper.destroy();
    });

    it('подпись отделена от холста, а не приклеена к нему', () => {
      const caption = CHART_SOURCE.slice(CHART_SOURCE.indexOf('&__caption {'));

      // 4px не хватало: верхняя подпись оси значений наезжала на текст.
      // Окно 300, а не 200: объяснение этого решения живёт прямо в блоке.
      expect(caption.slice(0, 300)).toContain('margin: 0 0 8px;');
    });

    it('холст держит собственный верхний отступ', () => {
      const wrapper = mountChart(blockOf('line'));

      expect(wrapper.vm.chart.paddingTop).toBe(8);

      wrapper.destroy();
    });

    it('у нескольких рядов подписи нет — её роль играет легенда снизу', () => {
      const wrapper = mountChart(blockOf('line-multi'));

      expect(wrapper.find('.tok-chart__caption').exists()).toBe(false);
      expect(wrapper.vm.chart.legend.position).toBe('bottom');

      wrapper.destroy();
    });

    it('ось значений сокращает большие числа, а тултип оставляет полные', () => {
      const wrapper = mountChart(blockOf('line'));
      const axis = wrapper.vm.chart.yAxes.getIndex(0);

      // Собственный форматтер, а не общий с графиком: иначе сокращение утекло бы
      // в тултип, где нужны точные значения.
      expect(axis.numberFormatter).not.toBe(wrapper.vm.chart.numberFormatter);
      expect(axis.numberFormatter.numberFormat).toBe('#.#a');
      expect(axis.numberFormatter.bigNumberPrefixes.map((item) => item.suffix)).toEqual([
        ' тыс.',
        ' млн',
        ' млрд',
      ]);
      expect(wrapper.vm.chart.numberFormatter.numberFormat).toBe('#,###.##');

      wrapper.destroy();
    });

    it('шкала масштаба есть и на коротком ряде — она тонкая', () => {
      const wrapper = mountChart(blockOf('line'));
      const scrollbar = wrapper.vm.chart.scrollbarX;

      // Порог по количеству точек отменён: шкала стоит своей высоты всегда.
      expect(wrapper.vm.chart.data.length).toBeLessThan(14);
      expect(scrollbar).toBeDefined();
      expect(scrollbar.height).toBe(10);
      // «Гантели» дефолтных хватов ломали линию полосы — иконки сняты, но сами
      // хваты остались: без них шкалу не потянуть за край.
      expect(scrollbar.startGrip.icon.disabled).toBe(true);
      expect(scrollbar.endGrip.icon.disabled).toBe(true);
      expect(scrollbar.startGrip.width).toBe(14);

      wrapper.destroy();
    });

    it('у кругового графика шкалы масштаба нет', () => {
      const wrapper = mountChart(blockOf('circle'));

      expect(wrapper.vm.chart.scrollbarX).toBeUndefined();

      wrapper.destroy();
    });

    it('пустые данные показывают пояснение, а не пустую рамку графика', () => {
      const wrapper = mountChart({ type: CONTENT_TYPE.LINE, series: [] });

      expect(wrapper.find('.tok-chart__canvas').exists()).toBe(false);
      expect(wrapper.find('.tok-chart__empty').text()).toContain('данных не пришло');
      expect(liveCharts()).toBe(0);

      wrapper.destroy();
    });

    it('логотип amCharts прячется только при подтверждённой лицензии', () => {
      const unlicensed = mountChart(blockOf('line'));
      expect(am4core.options.commercialLicense).toBe(false);
      // Без лицензии логотип есть, и снимать его нельзя.
      expect(unlicensed.vm.chart.logo).toBeDefined();
      unlicensed.destroy();

      const licensed = mountChart(blockOf('line'), {
        provide: { tokConfig: { amchartsLicensed: true } },
      });
      expect(am4core.options.commercialLicense).toBe(true);
      // При поднятом флаге amCharts сам не создаёт логотип — своего кода не нужно.
      expect(licensed.vm.chart.logo).toBeUndefined();
      licensed.destroy();

      // Флаг статический на весь модуль amCharts — иначе порядок тестов начнёт
      // влиять на результат.
      am4core.options.commercialLicense = false;
    });
  });

  describe('переключатель типов', () => {
    it('меняет вид графика, не теряя данных', async () => {
      const wrapper = mountChart(blockOf('line'));
      const before = wrapper.vm.chart.data.length;

      expect(wrapper.vm.kind).toBe(CONTENT_TYPE.LINE);

      wrapper.findAll('.tok-chart__switch').at(1).trigger('click');
      await flush();

      expect(wrapper.vm.kind).toBe(CONTENT_TYPE.BAR);
      expect(wrapper.vm.chart.data).toHaveLength(before);
      // Один живой инстанс, а не два: прежний утилизирован до сборки нового.
      expect(liveCharts()).toBe(1);

      wrapper.findAll('.tok-chart__switch').at(2).trigger('click');
      await flush();

      expect(wrapper.vm.kind).toBe(CONTENT_TYPE.CIRCLE);
      expect(liveCharts()).toBe(1);

      wrapper.destroy();
    });

    it('активная кнопка помечена для скринридера', async () => {
      const wrapper = mountChart(blockOf('bar'));
      const switches = () => wrapper.findAll('.tok-chart__switch');

      expect(switches().at(1).attributes('aria-pressed')).toBe('true');
      expect(switches().at(0).attributes('aria-pressed')).toBe('false');

      switches().at(0).trigger('click');
      await flush();

      expect(switches().at(0).attributes('aria-pressed')).toBe('true');

      wrapper.destroy();
    });
  });

  describe('тема', () => {
    it('переключение темы пересобирает график новыми цветами, без перезагрузки', async () => {
      // `$vuetify.theme` подменяется реактивным объектом: настоящий Vuetify в этом
      // тесте не нужен, важна сама реакция компонента на смену флага.
      const theme = { dark: false };
      const wrapper = mountChart(blockOf('line'), { mocks: { $vuetify: { theme } } });

      const first = wrapper.vm.chart;
      const lightStroke = first.series.getIndex(0).stroke.hex;

      theme.dark = true;
      await flush();
      await flush();

      const second = wrapper.vm.chart;
      expect(second).not.toBe(first);
      expect(first.isDisposed()).toBe(true);
      expect(second.series.getIndex(0).stroke.hex).not.toBe(lightStroke);
      expect(liveCharts()).toBe(1);

      wrapper.destroy();
    });
  });

  describe('утечки', () => {
    it('20 циклов открытия и закрытия обнуляют registry.baseSprites', () => {
      for (let i = 0; i < 20; i += 1) {
        const wrapper = mountChart(blockOf('line'));
        expect(liveCharts()).toBe(1);
        wrapper.destroy();
        expect(liveCharts()).toBe(0);
      }
    });

    it('несколько графиков в одном ответе утилизируются все', () => {
      const first = mountChart(blockOf('line'));
      const second = mountChart(blockOf('bar'));
      const third = mountChart(blockOf('circle'));

      expect(liveCharts()).toBe(3);

      first.destroy();
      second.destroy();
      third.destroy();

      expect(liveCharts()).toBe(0);
    });
  });

  describe('загрузка кода', () => {
    it('график подключён как асинхронный компонент — amCharts не в основном чанке', async () => {
      const factory = CONTENT_COMPONENTS[CONTENT_TYPE.LINE];

      // Асинхронная фабрика: функция, возвращающая Promise. Ни описанием компонента
      // (объект), ни его конструктором (есть `cid`) это быть не может — значит
      // webpack вынесет её содержимое в отдельный чанк.
      expect(typeof factory).toBe('function');
      expect(factory.cid).toBeUndefined();

      const pending = factory();
      expect(typeof pending.then).toBe('function');

      const resolved = await pending;
      expect(resolved.default.name).toBe('TokContentChart');
      // Все три вида графика ведут в один и тот же чанк.
      expect(CONTENT_COMPONENTS[CONTENT_TYPE.BAR]).toBe(factory);
      expect(CONTENT_COMPONENTS[CONTENT_TYPE.CIRCLE]).toBe(factory);
    });

    it('в ленте график всё-таки появляется, несмотря на асинхронную загрузку', async () => {
      const api = createControlledApi();
      const wrapper = mountPanel({ api });

      wrapper.tokStore.dispatch('conversation/send', 'Покажи динамику');
      await api.respond(findFixtureById('line').response);
      await flush();

      expect(wrapper.find('.tok-chart__canvas').exists()).toBe(true);
      expect(liveCharts()).toBe(1);

      wrapper.destroy();
      expect(liveCharts()).toBe(0);
    });
  });
});
