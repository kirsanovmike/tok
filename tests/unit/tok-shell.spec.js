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

import { installTok, Tok } from '@/Tok';
import { resetPageScrollLock } from '@/Tok/services/utils/scrollLock';
import { flush, mountPanel } from './support/tok';

const PANEL_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/Tok/SubComponents/TokPanel.vue'),
  'utf8',
);

const TOK_DIR = path.resolve(__dirname, '../../src/Tok');
const FEED_SOURCE = fs.readFileSync(path.join(TOK_DIR, 'SubComponents/TokMessageList.vue'), 'utf8');
const TOKENS_SCSS = fs.readFileSync(path.join(TOK_DIR, 'styles/_tokens.scss'), 'utf8');
const EMPTY_SOURCE = fs.readFileSync(path.join(TOK_DIR, 'SubComponents/TokEmptyState.vue'), 'utf8');

function mountApp() {
  const localVue = createLocalVue();
  installTok(localVue);
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
      expect(source).toContain('@include tok-gradient');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('панель', () => {
    it('правый край строго прямой: правые радиусы равны нулю', () => {
      const rule = PANEL_SOURCE.match(/border-radius: \$tok-panel-radius[^;]*;/);

      expect(rule).not.toBeNull();
      // `<левый-верхний> <правый-верхний> <правый-нижний> <левый-нижний>`
      expect(rule[0]).toBe('border-radius: $tok-panel-radius 0 0 $tok-panel-radius;');
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

      const focusable = wrapper.element.querySelectorAll('button, input');
      const last = focusable[focusable.length - 1];
      last.focus();

      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      // С последнего элемента фокус ушёл на первый внутри панели, а не на кнопку хоста.
      expect(document.activeElement).toBe(focusable[0]);
      expect(document.activeElement).not.toBe(outside);

      wrapper.destroy();
    });

    it('после закрытия фокус возвращается на точку входа', async () => {
      const anchor = document.createElement('div');
      document.body.appendChild(anchor);

      const localVue = createLocalVue();
      installTok(localVue);
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
      expect(feed.slice(0, 400)).toContain('padding: 0 $tok-space-md 0 $tok-space-lg;');
      expect(EMPTY_SOURCE).toContain('padding: 0 $tok-space-lg;');
    });

    it('лента красит полосу тонким миксином, а не дефолтом браузера', () => {
      expect(FEED_SOURCE).toContain('@include tok-thin-scrollbar;');
    });

    it('миксин тонкой полосы есть, он вдвое тоньше дефолта и приглушённого цвета', () => {
      expect(TOKENS_SCSS).toContain('$tok-scrollbar-size: 6px;');
      expect(TOKENS_SCSS).toContain('@mixin tok-thin-scrollbar');
      // Firefox настраивается парой свойств, WebKit — псевдоэлементами: нужны оба.
      expect(TOKENS_SCSS).toContain('scrollbar-width: thin;');
      expect(TOKENS_SCSS).toContain('&::-webkit-scrollbar-thumb {');
      expect(TOKENS_SCSS).toContain('tok-color(border-strong)');
    });
  });
});
