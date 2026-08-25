/**
 * Фаза 3 — оболочка: точка входа, оверлей, панель, фокус.
 *
 * Про скругления: jsdom не применяет стили из SFC, поэтому «правый край прямой»
 * проверяется по исходнику — в DevTools это же правило смотрит заказчик.
 */
import fs from 'fs';
import path from 'path';

import Vue from 'vue';
import { createLocalVue, mount } from '@vue/test-utils';

// Импорт по умолчанию и именованный `Tok` — один и тот же компонент (index.js),
// поэтому предупреждение правила здесь ложное.
// eslint-disable-next-line import/no-named-as-default
import Tok from '@/Tok';
import { resetPageScrollLock } from '@/Tok/services/utils/scrollLock';
import { PANEL_MIN_WIDTH, PANEL_WIDTH_STEP } from '@/Tok/services/utils/panelWidth';
import { flush, mountPanel } from './support/tok';

const PANEL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/Tok/SubComponents/TokPanel.vue'),
  'utf8',
);

const TOK_DIR = path.resolve(__dirname, '../../src/Tok');
const FEED_SOURCE = fs.readFileSync(path.join(TOK_DIR, 'SubComponents/TokMessageList.vue'), 'utf8');
const EMPTY_SOURCE = fs.readFileSync(path.join(TOK_DIR, 'SubComponents/TokEmptyState.vue'), 'utf8');

function mountApp() {
  const localVue = createLocalVue();
  return mount(Tok, { localVue });
}

describe('оболочка Тока', () => {
  afterEach(() => {
    resetPageScrollLock();
    document.body.innerHTML = '';
  });

  describe('точка входа', () => {
    it('рендерится в body и открывает панель', async () => {
      const wrapper = mountApp();
      await flush();

      const entry = document.querySelector('.tok-entry');
      expect(entry).not.toBeNull();
      expect(entry.getAttribute('aria-label')).toBe('Открыть ассистента Ток');
      expect(entry.getAttribute('aria-expanded')).toBe('false');
      // Панель ещё не открыта — в разметке её нет вовсе.
      expect(document.querySelector('[data-tok-panel]')).toBeNull();

      entry.click();
      await flush();

      expect(document.querySelector('[data-tok-panel]')).not.toBeNull();
      expect(wrapper.vm.open).toBe(true);

      wrapper.destroy();
    });

    it('градиент и позиция заданы токенами, а не хардкодом', () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../src/Tok/SubComponents/TokEntryButton.vue'),
        'utf8',
      );

      expect(source).toContain('position: fixed');
      expect(source).toContain(
        'linear-gradient(160deg, var(--v-tok-gradient-from), var(--v-tok-gradient-to))',
      );
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('панель', () => {
    it('правый край строго прямой: правые радиусы равны нулю', () => {
      const rule = PANEL_SOURCE.match(/border-radius: 24px[^;]*;/);

      expect(rule).not.toBeNull();
      // `<левый-верхний> <правый-верхний> <правый-нижний> <левый-нижний>`
      expect(rule[0]).toBe('border-radius: 24px 0 0 24px;');
      // И прижата к правому краю viewport.
      expect(PANEL_SOURCE).toContain('right: 0;');
    });

    it('закрывается по Esc', async () => {
      const wrapper = mountPanel();
      await flush();

      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
      await flush();

      expect(wrapper.emitted('close')).toBeTruthy();
      wrapper.destroy();
    });

    it('закрывается по клику вне панели — по оверлею', async () => {
      const wrapper = mountPanel();
      await flush();

      wrapper.find('[data-tok-overlay]').trigger('click');
      await flush();

      expect(wrapper.emitted('close')).toBeTruthy();
      wrapper.destroy();
    });

    it('блокирует скролл страницы, пока открыта, и возвращает его при закрытии', async () => {
      const wrapper = mountPanel({ open: false });
      expect(document.body.style.overflow).toBe('');

      wrapper.setProps({ open: true });
      await flush();
      expect(document.body.style.overflow).toBe('hidden');

      wrapper.setProps({ open: false });
      await flush();
      expect(document.body.style.overflow).toBe('');

      wrapper.destroy();
    });

    // Vuetify в своём сбросе объявляет `html { overflow-y: scroll }`, а переполнение
    // `<body>` наследуется вьюпортом только пока у `<html>` оно `visible`. Без этой
    // строки страница хоста прокручивалась колесом под открытой панелью —
    // воспроизведено в браузере на приёмке фазы 12.
    it('глушит прокрутку на <html>, а не только на <body>', async () => {
      const root = document.documentElement;
      const wrapper = mountPanel({ open: false });
      expect(root.style.overflow).toBe('');

      wrapper.setProps({ open: true });
      await flush();
      expect(root.style.overflow).toBe('hidden');

      wrapper.setProps({ open: false });
      await flush();
      expect(root.style.overflow).toBe('');

      wrapper.destroy();
    });

    // Хост мог держать собственный inline-`overflow` ещё до открытия панели:
    // «вернуть как было» — это вернуть его значение, а не пустую строку.
    it('возвращает прежний inline-overflow хоста, а не затирает его', async () => {
      const root = document.documentElement;
      root.style.overflow = 'auto';

      const wrapper = mountPanel({ open: false });
      wrapper.setProps({ open: true });
      await flush();
      expect(root.style.overflow).toBe('hidden');

      wrapper.setProps({ open: false });
      await flush();
      expect(root.style.overflow).toBe('auto');

      wrapper.destroy();
      root.style.overflow = '';
    });

    it('уважает prefers-reduced-motion: анимация выезда отключается', () => {
      const reduced = PANEL_SOURCE.slice(PANEL_SOURCE.indexOf('prefers-reduced-motion'));

      expect(reduced).toContain('.tok-panel-enter-active');
      expect(reduced).toContain('transition: none;');
      expect(reduced).toContain('transform: none;');
    });
  });

  describe('фокус', () => {
    it('Tab не выходит за пределы панели', async () => {
      const outside = document.createElement('button');
      outside.textContent = 'Кнопка хоста';
      document.body.appendChild(outside);

      const anchor = document.createElement('div');
      document.body.appendChild(anchor);

      const wrapper = mountPanel({ attachTo: anchor });
      await flush();

      // Ручка изменения ширины — тоже фокусируемый элемент (`[tabindex="0"]`),
      // и она стоит первой в панели: селектор обязан её учитывать, иначе
      // «первый внутри панели» окажется не тем, на что попадает Tab.
      const focusable = wrapper.element.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      const last = focusable[focusable.length - 1];
      last.focus();

      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      // С последнего элемента фокус ушёл на первый внутри панели, а не на кнопку хоста.
      expect(focusable[0].classList.contains('tok-resize-handle')).toBe(true);
      expect(document.activeElement).toBe(focusable[0]);
      expect(document.activeElement).not.toBe(outside);

      wrapper.destroy();
    });

    it('после закрытия фокус возвращается на точку входа', async () => {
      const anchor = document.createElement('div');
      document.body.appendChild(anchor);

      const localVue = createLocalVue();
      const wrapper = mount(Tok, { localVue, attachTo: anchor });
      await flush();

      const entry = document.querySelector('.tok-entry');
      entry.focus();
      entry.click();
      await flush();

      // Фокус ушёл внутрь панели.
      expect(document.querySelector('[data-tok-panel]').contains(document.activeElement)).toBe(
        true,
      );

      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
      await flush();
      await Vue.nextTick();

      expect(document.activeElement).toBe(entry);

      wrapper.destroy();
    });
  });

  describe('полоса прокрутки ленты', () => {
    it('прокручиваемый элемент дотянут до края панели: отступов у тела панели нет', () => {
      const body = PANEL_SOURCE.slice(PANEL_SOURCE.indexOf('&__body {'));

      // Отступы переехали на детей — иначе полоса прокрутки висит в 24px от края.
      // Окно 400, а не 200: объяснение этого решения живёт прямо в блоке.
      expect(body.slice(0, 400)).toContain('padding: 0;');
    });

    it('отступы держат сами дети — и лента, и пустой экран', () => {
      const feed = FEED_SOURCE.slice(FEED_SOURCE.indexOf('.tok-feed {'));

      expect(feed.slice(0, 400)).toContain('box-sizing: border-box;');
      expect(feed.slice(0, 400)).toContain('padding: 0 16px 0 24px;');
      expect(EMPTY_SOURCE).toContain('padding: 0 24px;');
    });

    it('лента красит полосу сама: вдвое тоньше дефолта и приглушённого цвета', () => {
      // Дефолт WebKit — 12–15px тёмно-серого: в панели 520px это заметная линия,
      // спорящая с содержимым. Firefox настраивается парой свойств,
      // WebKit — псевдоэлементами: нужны оба набора.
      expect(FEED_SOURCE).toContain('scrollbar-width: thin;');
      expect(FEED_SOURCE).toContain('scrollbar-color: var(--v-tok-border-strong) transparent;');
      expect(FEED_SOURCE).toContain('&::-webkit-scrollbar-thumb {');
      expect(FEED_SOURCE).toContain('background-color: var(--v-tok-border-strong);');
      expect(FEED_SOURCE).toMatch(/&::-webkit-scrollbar \{\n\s+width: 6px;/);
    });
  });

  describe('ширина панели', () => {
    /** jsdom не меняет innerWidth сам — подменяем его на время теста. */
    function setViewport(width) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      window.dispatchEvent(new Event('resize'));
    }

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    });

    it('минимальная ширина одна и та же в стилях и в JS', () => {
      expect(PANEL_SOURCE).toContain(`width: ${PANEL_MIN_WIDTH}px;`);
      // Планшетный медиазапрос снят: 60vw с минимумом 420px противоречит новому
      // минимуму 520px.
      expect(PANEL_SOURCE).not.toContain('max-width: 959px');
    });

    it('до перетаскивания инлайновой ширины нет — её задаёт таблица стилей', () => {
      const wrapper = mountPanel();
      const panel = wrapper.find('[data-tok-panel]');

      expect(wrapper.vm.width).toBeNull();
      expect(panel.attributes('style') || '').not.toContain('width');

      wrapper.destroy();
    });

    it('перетаскивание ручки расширяет панель влево', async () => {
      setViewport(1024);
      const wrapper = mountPanel();
      const handle = wrapper.find('.tok-resize-handle');

      handle.trigger('pointerdown', { clientX: 504, pointerId: 1 });
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 324 }));
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.width).toBe(700);
      expect(wrapper.find('[data-tok-panel]').attributes('style')).toContain('width: 700px');

      window.dispatchEvent(new MouseEvent('pointerup'));
      wrapper.destroy();
    });

    it('шире экрана не растягивается и на всю ширину теряет скругления', async () => {
      setViewport(1024);
      const wrapper = mountPanel();
      const handle = wrapper.find('.tok-resize-handle');

      handle.trigger('pointerdown', { clientX: 504, pointerId: 1 });
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: -300 }));
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.width).toBe(1024);
      expect(wrapper.find('.tok-panel--full').exists()).toBe(true);

      window.dispatchEvent(new MouseEvent('pointerup'));
      wrapper.destroy();
    });

    it('клавиатура двигает край: стрелки, Home и End', async () => {
      setViewport(1024);
      const wrapper = mountPanel();
      const handle = wrapper.find('.tok-resize-handle');

      handle.trigger('keydown', { key: 'ArrowLeft' });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.width).toBe(PANEL_MIN_WIDTH + PANEL_WIDTH_STEP);

      handle.trigger('keydown', { key: 'ArrowRight' });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.width).toBe(PANEL_MIN_WIDTH);

      handle.trigger('keydown', { key: 'End' });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.width).toBe(1024);

      handle.trigger('keydown', { key: 'Home' });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.width).toBe(PANEL_MIN_WIDTH);

      wrapper.destroy();
    });

    it('ручка — window splitter для скринридера', () => {
      const wrapper = mountPanel();
      const handle = wrapper.find('.tok-resize-handle');

      expect(handle.attributes('role')).toBe('separator');
      expect(handle.attributes('aria-orientation')).toBe('vertical');
      expect(handle.attributes('tabindex')).toBe('0');
      expect(handle.attributes('aria-valuemin')).toBe(String(PANEL_MIN_WIDTH));

      wrapper.destroy();
    });

    it('на узком окне ручки нет, а набранная ширина снимается', async () => {
      setViewport(1024);
      const wrapper = mountPanel();

      wrapper.find('.tok-resize-handle').trigger('keydown', { key: 'End' });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.width).toBe(1024);

      setViewport(500);
      await wrapper.vm.$nextTick();

      // Инлайновая ширина сильнее медиазапроса `100vw` — её обязательно снять.
      expect(wrapper.vm.width).toBeNull();
      expect(wrapper.find('.tok-resize-handle').exists()).toBe(false);

      wrapper.destroy();
    });
  });
});
