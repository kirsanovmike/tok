/**
 * Фаза 7 — рендерер `contents[]`.
 *
 * Проверяется ровно то, что обещано планом: порядок блоков, устойчивость к блоку
 * без рендерера, каждый из четырёх типов и копирование ответа целиком.
 */
import { mount } from '@vue/test-utils';

import TokContents from '@/tok/components/contents/TokContents.vue';
import TokContentTable from '@/tok/components/contents/TokContentTable.vue';
import {
  CONTENT_WARNING_PREFIX,
  resetMissingRendererWarnings,
} from '@/tok/components/contents/warn';
import { CONTENT_TYPE, REPLY_KIND, WORKFLOW_STATUS } from '@/tok/api/contract';
import { findFixtureById } from '@/tok/api/mock/fixtures';
import { answerToText, contentsToText } from '@/tok/utils/answerText';
import { formatValue } from '@/tok/utils/format';
import { createControlledApi, flush, mountPanel } from './support/tok';

function contentsOf(fixtureId) {
  return findFixtureById(fixtureId).response.contents;
}

function mountContents(contents) {
  return mount(TokContents, { propsData: { contents } });
}

describe('рендерер contents[]', () => {
  let warnings;

  beforeEach(() => {
    resetMissingRendererWarnings();
    warnings = jest.spyOn(console, 'warn').mockImplementation((...args) => args);
  });

  afterEach(() => {
    warnings.mockRestore();
  });

  describe('диспетчер', () => {
    it('рендерит блоки по порядку, а не по типу', () => {
      // Фикстура `contents-order`: stat → text → table. Порядок специально
      // не совпадает с порядком типов в реестре — иначе проверка ничего не значит.
      const contents = contentsOf('contents-order');
      expect(contents.map((block) => block.type)).toEqual([
        CONTENT_TYPE.STAT,
        CONTENT_TYPE.TEXT,
        CONTENT_TYPE.TABLE,
      ]);

      const wrapper = mountContents(contents);
      const rendered = wrapper.findAll('.tok-contents__block');

      expect(rendered).toHaveLength(3);
      expect(rendered.at(0).find('.tok-content-stat').exists()).toBe(true);
      expect(rendered.at(1).find('.tok-content-text').exists()).toBe(true);
      expect(rendered.at(2).find('.tok-table').exists()).toBe(true);

      wrapper.destroy();
    });

    it('несколько блоков одного типа не схлопываются в один', () => {
      const block = { type: CONTENT_TYPE.STAT, label: 'Июнь', value: 1 };
      const wrapper = mountContents([block, { ...block, label: 'Июль' }]);

      expect(wrapper.findAll('.tok-content-stat')).toHaveLength(2);

      wrapper.destroy();
    });

    it('пустой contents[] не оставляет в разметке пустого контейнера', () => {
      const wrapper = mountContents([]);
      expect(wrapper.find('.tok-contents').exists()).toBe(false);
      wrapper.destroy();
    });

    it('блок без рендерера пропускается, соседний блок показан, факт логируется', () => {
      const contents = contentsOf('unknown-content');
      const wrapper = mountContents(contents);

      expect(contents[0].type).toBe('unknown_future_type');
      // Показан ровно один блок из двух — известный.
      expect(wrapper.findAll('.tok-contents__block')).toHaveLength(1);
      expect(wrapper.find('.tok-content-text').exists()).toBe(true);
      expect(warnings).toHaveBeenCalledTimes(1);
      expect(warnings.mock.calls[0][0]).toContain(CONTENT_WARNING_PREFIX);
      expect(warnings.mock.calls[0][0]).toContain('unknown_future_type');

      wrapper.destroy();
    });

    it('о том же типе не ругается дважды: лента перерисовывается постоянно', () => {
      const contents = contentsOf('unknown-content');
      const first = mountContents(contents);
      const second = mountContents(contents);

      expect(warnings).toHaveBeenCalledTimes(1);

      first.destroy();
      second.destroy();
    });

    it('мусор вместо блока не роняет ленту', () => {
      const wrapper = mountContents([null, 'строка', 42, { type: CONTENT_TYPE.TEXT, text: 'ок' }]);

      expect(wrapper.findAll('.tok-contents__block')).toHaveLength(1);
      expect(wrapper.text()).toBe('ок');

      wrapper.destroy();
    });
  });

  describe('text', () => {
    it('пустая строка разбивает на абзацы, одиночный перенос остаётся внутри абзаца', () => {
      const wrapper = mountContents(contentsOf('text-multiline'));
      const paragraphs = wrapper.findAll('.tok-content-text__paragraph');

      expect(paragraphs).toHaveLength(2);
      expect(paragraphs.at(0).text()).toContain('объём снизился, тариф вырос');

      wrapper.destroy();
    });

    it('HTML из строки не интерпретируется', () => {
      const wrapper = mountContents(contentsOf('text-multiline'));
      const second = wrapper.findAll('.tok-content-text__paragraph').at(1);

      expect(second.text()).toContain('<b>вырос</b>');
      expect(second.find('b').exists()).toBe(false);

      wrapper.destroy();
    });
  });

  describe('list', () => {
    it('рендерит текстовые элементы', () => {
      const wrapper = mountContents(contentsOf('list'));
      const items = wrapper.findAll('.tok-content-list__item');

      expect(items).toHaveLength(4);
      expect(items.at(0).text()).toContain('Электроэнергия и мощность');

      wrapper.destroy();
    });

    it('числа показывает разрядами, как и в таблице', () => {
      const wrapper = mountContents(contentsOf('list-numeric'));
      const items = wrapper.findAll('.tok-content-list__item');

      expect(items).toHaveLength(6);
      expect(items.at(0).text()).toBe(formatValue(2648250));
      // Разряды действительно разделены: «2648250» одним куском в разметке нет.
      expect(items.at(0).text()).not.toBe('2648250');

      wrapper.destroy();
    });
  });

  describe('stat', () => {
    it('показывает label, value и unit', () => {
      const wrapper = mountContents(contentsOf('stat'));

      expect(wrapper.find('.tok-content-stat__label').text()).toBe(
        'Стоимость электроэнергии за июнь',
      );
      expect(wrapper.find('.tok-content-stat__value').text()).toContain('2 500 146');
      expect(wrapper.find('.tok-content-stat__unit').text()).toBe('₽');

      wrapper.destroy();
    });

    it('без unit вёрстка не ломается: элемента просто нет', () => {
      const wrapper = mountContents(contentsOf('stat-no-unit'));

      expect(wrapper.find('.tok-content-stat__unit').exists()).toBe(false);
      expect(wrapper.find('.tok-content-stat__value').text()).toBe('+9,0%');

      wrapper.destroy();
    });
  });

  describe('table', () => {
    it('рендерит колонки и строки', () => {
      const wrapper = mountContents(contentsOf('table'));

      const headers = wrapper.findAll('.tok-table__grid th').wrappers.map((th) => th.text());
      expect(headers).toEqual(['Месяц', 'Объём, кВт·ч', 'Тариф, ₽/кВт·ч', 'Стоимость, ₽']);
      expect(wrapper.findAll('.tok-table__grid tbody tr')).toHaveLength(6);

      wrapper.destroy();
    });

    it('шесть строк умещаются на одну страницу — пагинации нет', () => {
      const wrapper = mountContents(contentsOf('table'));
      expect(wrapper.find('.tok-table__pager').exists()).toBe(false);
      wrapper.destroy();
    });

    it('50 строк разбиты на страницы по 14, листание меняет содержимое', async () => {
      const wrapper = mount(TokContentTable, {
        propsData: { block: contentsOf('table-wide')[0] },
      });

      expect(wrapper.findAll('.tok-table__grid th')).toHaveLength(8);
      expect(wrapper.findAll('.tok-table__grid tbody tr')).toHaveLength(14);
      expect(wrapper.find('.tok-table__page-counter').text()).toBe('1 / 4');

      const firstPage = wrapper.find('.tok-table__grid tbody').text();

      wrapper.findAll('.tok-table__page-button').at(1).trigger('click');
      await flush();

      expect(wrapper.find('.tok-table__page-counter').text()).toBe('2 / 4');
      expect(wrapper.find('.tok-table__grid tbody').text()).not.toBe(firstPage);

      wrapper.destroy();
    });

    it('на первой странице «назад» недоступно, на последней — «вперёд»', async () => {
      const wrapper = mount(TokContentTable, {
        propsData: { block: contentsOf('table-wide')[0] },
      });

      const buttons = () => wrapper.findAll('.tok-table__page-button');
      expect(buttons().at(0).attributes('disabled')).toBeTruthy();

      for (let i = 0; i < 3; i += 1) {
        buttons().at(1).trigger('click');
        // eslint-disable-next-line no-await-in-loop
        await flush();
      }

      expect(wrapper.find('.tok-table__page-counter').text()).toBe('4 / 4');
      expect(buttons().at(1).attributes('disabled')).toBeTruthy();
      // Последняя страница неполная: 50 = 14 * 3 + 8.
      expect(wrapper.findAll('.tok-table__grid tbody tr')).toHaveLength(8);

      wrapper.destroy();
    });

    it('горизонтальная прокрутка живёт внутри таблицы, а индикатор — от реальных метрик', async () => {
      const wrapper = mount(TokContentTable, {
        propsData: { block: contentsOf('table-wide')[0] },
      });

      // jsdom не считает layout, поэтому метрики задаём сами: иначе «индикатора нет»
      // и «индикатор не нужен» неотличимы.
      expect(wrapper.find('.tok-table__indicator').exists()).toBe(false);

      const scroller = wrapper.find('.tok-table__scroller').element;
      Object.defineProperty(scroller, 'scrollWidth', { value: 1200, configurable: true });
      Object.defineProperty(scroller, 'clientWidth', { value: 400, configurable: true });
      scroller.scrollLeft = 800;

      wrapper.find('.tok-table__scroller').trigger('scroll');
      await flush();

      const thumb = wrapper.find('.tok-table__thumb');
      expect(wrapper.find('.tok-table__indicator').exists()).toBe(true);
      // Видно треть таблицы, прокручено до конца — ползунок шириной 1/3 и прижат вправо.
      expect(thumb.element.style.width).toBe(`${(400 / 1200) * 100}%`);
      expect(thumb.element.style.left).toBe(`${(1 - 400 / 1200) * 100}%`);

      wrapper.destroy();
    });

    it('есть слот под будущую выгрузку в Excel', () => {
      const wrapper = mount(TokContentTable, {
        propsData: { block: contentsOf('table')[0] },
        slots: { actions: '<button class="stub-export">Excel</button>' },
      });

      expect(wrapper.find('.tok-table__actions .stub-export').exists()).toBe(true);

      wrapper.destroy();
    });
  });

  describe('копирование ответа целиком', () => {
    it('таблица уходит в буфер колонками через табуляцию — вставляется в Excel', () => {
      const text = contentsToText(contentsOf('table'));
      const lines = text.split('\n');

      expect(lines[0]).toBe('Месяц\tОбъём, кВт·ч\tТариф, ₽/кВт·ч\tСтоимость, ₽');
      // Все строки, а не текущая страница: страницы — способ показа.
      expect(lines).toHaveLength(7);
      expect(lines[1].split('\t')[0]).toBe('Январь');
    });

    it('копируются все блоки в порядке показа, а вводная фраза идёт первой', () => {
      const fixture = findFixtureById('contents-order').response;
      const text = answerToText({
        text: fixture.reply.text,
        contents: fixture.contents,
      });

      expect(text.indexOf('Разбор по июню:')).toBe(0);
      expect(text.indexOf('Стоимость электроэнергии за июнь')).toBeGreaterThan(0);
      expect(text.indexOf('Месяц\tОбъём')).toBeGreaterThan(
        text.indexOf('Стоимость электроэнергии за июнь'),
      );
    });

    it('блок без рендерера в буфер не попадает: копируется то, что видно', () => {
      const text = contentsToText(contentsOf('unknown-content'));

      expect(text).not.toContain('unknown_future_type');
      expect(text).toContain('Объём потребления в июне');
    });

    it('в буфер уходит ответ целиком, а не только reply.text', async () => {
      const writeText = jest.fn(() => Promise.resolve());
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      const api = createControlledApi();
      const wrapper = mountPanel({ api });

      wrapper.tokStore.dispatch('conversation/send', 'вопрос');
      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: 'Стоимость за июнь:' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [{ type: CONTENT_TYPE.STAT, label: 'Итого', value: 2500146, unit: '₽' }],
      });

      wrapper.find('.tok-actions__button').trigger('click');
      await flush();

      expect(writeText).toHaveBeenCalledWith(
        `Стоимость за июнь:\n\nИтого: ${formatValue(2500146)} ₽`,
      );

      wrapper.destroy();
    });

    it('ответ из одних блоков, без вводной фразы, тоже можно скопировать', async () => {
      const api = createControlledApi();
      const wrapper = mountPanel({ api });

      wrapper.tokStore.dispatch('conversation/send', 'вопрос');
      await api.respond({
        reply: { kind: REPLY_KIND.SUCCESS, text: '' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [{ type: CONTENT_TYPE.TEXT, text: 'Только блок, вводной фразы нет.' }],
      });

      expect(wrapper.find('.tok-message__text').exists()).toBe(false);
      expect(wrapper.find('.tok-actions').exists()).toBe(true);

      wrapper.destroy();
    });
  });
});
