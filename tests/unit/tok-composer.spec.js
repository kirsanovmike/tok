/**
 * Доработка 1, пункт 5 — поле ввода как в ChatGPT/Perplexity.
 *
 * Высота меряется по `scrollHeight`, а jsdom layout не считает и всегда отдаёт 0 —
 * поэтому саму арифметику проверяем на чистой функции, а на компоненте только то,
 * что jsdom действительно умеет: какая клавиша отправляет, а какая переносит строку.
 */
import fs from 'fs';
import path from 'path';

import { mount } from '@vue/test-utils';

import TokComposer from '@/Tok/SubComponents/TokComposer.vue';
import TokIcon from '@/Tok/SubComponents/TokIcon.vue';
import {
  COMPOSER_MAX_HEIGHT,
  COMPOSER_MIN_HEIGHT,
  isMultiline,
  isScrollable,
  nextTextareaHeight,
} from '@/Tok/services/utils/autoGrow';

// jsdom не считает layout: выравнивание проверяется по исходнику компонента —
// так же, как в tests/unit/tok-loader.spec.js.
const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/Tok/SubComponents/TokComposer.vue'),
  'utf8',
);

describe('выравнивание в поле ввода', () => {
  it('полоса записи выравнивается по центру, а не по низу', () => {
    const voice = SOURCE.slice(SOURCE.indexOf('&--voice'));

    expect(voice.slice(0, 200)).toContain('align-items: center;');
  });

  it('надпись записи занимает высоту соседних кнопок', () => {
    const status = SOURCE.slice(SOURCE.indexOf('&__voice-status {'));

    expect(status.slice(0, 400)).toContain('min-height: 36px;');
  });

  it('иконка остановки — сплошная заливка, а не обводка', () => {
    const wrapper = mount(TokIcon, { propsData: { name: 'stop' } });
    const shape = wrapper.find('path');

    expect(shape.attributes('fill')).toBe('currentColor');
    expect(shape.attributes('stroke')).toBe('none');

    wrapper.destroy();
  });

  it('кнопка остановки рисует иконку крупнее — 22, а не 20', () => {
    expect(SOURCE).toContain('<TokIcon name="stop" :size="22" />');
  });
});

describe('высота поля ввода', () => {
  it('одна строка держит минимум, а не схлопывается', () => {
    expect(nextTextareaHeight(0)).toBe(COMPOSER_MIN_HEIGHT);
    expect(nextTextareaHeight(COMPOSER_MIN_HEIGHT)).toBe(COMPOSER_MIN_HEIGHT);
  });

  it('поле растёт вместе с содержимым до потолка', () => {
    const middle = (COMPOSER_MIN_HEIGHT + COMPOSER_MAX_HEIGHT) / 2;
    expect(nextTextareaHeight(middle)).toBe(middle);
  });

  it('выше потолка поле не растёт — дальше внутренний скролл', () => {
    expect(nextTextareaHeight(COMPOSER_MAX_HEIGHT + 400)).toBe(COMPOSER_MAX_HEIGHT);
    expect(isScrollable(COMPOSER_MAX_HEIGHT + 1)).toBe(true);
    expect(isScrollable(COMPOSER_MAX_HEIGHT)).toBe(false);
  });

  it('мусор вместо измерения не превращается в NaN-высоту', () => {
    expect(nextTextareaHeight(undefined)).toBe(COMPOSER_MIN_HEIGHT);
    expect(nextTextareaHeight(NaN)).toBe(COMPOSER_MIN_HEIGHT);
  });
});

describe('раскладка поля ввода по референсам', () => {
  /** jsdom не считает layout: подсовываем измерение вручную. */
  function withScrollHeight(element, value) {
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value });
  }

  it('одна строка — это одна строка, несколько — уже многострочно', () => {
    expect(isMultiline(COMPOSER_MIN_HEIGHT)).toBe(false);
    expect(isMultiline(COMPOSER_MIN_HEIGHT + 1)).toBe(true);
    // Незамеренное поле — это не «многострочное»: раскладка не имеет права
    // прыгать на пустом месте.
    expect(isMultiline(0)).toBe(false);
    expect(isMultiline(undefined)).toBe(false);
    expect(isMultiline(NaN)).toBe(false);
  });

  it('однострочный ввод держит кнопки в том же ряду', async () => {
    const wrapper = mount(TokComposer);
    const field = wrapper.find('.tok-composer__input');

    withScrollHeight(field.element, COMPOSER_MIN_HEIGHT);
    wrapper.vm.resize();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.multiline).toBe(false);
    expect(wrapper.find('.tok-composer__field--multiline').exists()).toBe(false);

    wrapper.destroy();
  });

  it('выросшее поле переносит кнопки в нижний ряд', async () => {
    const wrapper = mount(TokComposer);
    const field = wrapper.find('.tok-composer__input');

    withScrollHeight(field.element, 96);
    wrapper.vm.resize();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.multiline).toBe(true);
    expect(wrapper.find('.tok-composer__field--multiline').exists()).toBe(true);

    wrapper.destroy();
  });

  it('обе раскладки заданы областями грида, а не порядком детей', () => {
    const field = SOURCE.slice(SOURCE.indexOf('&__field {'));

    // Однострочная: очистка, поле, микрофон, отправка — в один ряд.
    expect(field).toContain("grid-template-areas: 'clear input mic send';");
    // Многострочная: поле во всю ширину сверху, кнопки внизу; очистка слева
    // (пункт 3 постановки), микрофон и отправка справа.
    expect(field).toContain("'input input input input'");
    expect(field).toContain("'clear . mic send'");
  });

  it('поле прокручивается тонкой полосой, как в референсе', () => {
    const input = SOURCE.slice(SOURCE.indexOf('&__input {'));

    const rules = input.slice(0, 1200);

    expect(rules).toContain('scrollbar-width: thin;');
    expect(rules).toContain('scrollbar-color: var(--v-tok-border-strong) transparent;');
    // Внутри поля полоса ещё тоньше, чем в ленте: 4px против 6px.
    expect(rules).toContain('width: 4px;');
  });

  it('потолок высоты — восемь строк по референсу «когда много текста»', () => {
    expect(COMPOSER_MAX_HEIGHT).toBe(160);
  });
});

describe('клавиши поля ввода', () => {
  function mountComposer() {
    return mount(TokComposer);
  }

  it('поле ввода — многострочное', () => {
    const wrapper = mountComposer();

    expect(wrapper.find('textarea.tok-composer__input').exists()).toBe(true);
    expect(wrapper.find('input.tok-composer__input').exists()).toBe(false);

    wrapper.destroy();
  });

  it('Enter отправляет вопрос и очищает поле', async () => {
    const wrapper = mountComposer();
    const field = wrapper.find('.tok-composer__input');

    field.setValue('Какой у меня тариф');
    await wrapper.vm.$nextTick();
    field.trigger('keydown.enter');

    expect(wrapper.emitted('send')).toEqual([['Какой у меня тариф']]);
    expect(wrapper.vm.value).toBe('');

    wrapper.destroy();
  });

  it('Shift+Enter не отправляет: это перенос строки', async () => {
    const wrapper = mountComposer();
    const field = wrapper.find('.tok-composer__input');

    field.setValue('Первая строка');
    await wrapper.vm.$nextTick();
    field.trigger('keydown.enter', { shiftKey: true });

    expect(wrapper.emitted('send')).toBeUndefined();
    expect(wrapper.vm.value).toBe('Первая строка');

    wrapper.destroy();
  });

  it('многострочный вопрос уходит целиком, вместе с переносами', async () => {
    const wrapper = mountComposer();
    const field = wrapper.find('.tok-composer__input');

    field.setValue('Первая строка\nВторая строка');
    await wrapper.vm.$nextTick();
    field.trigger('keydown.enter');

    expect(wrapper.emitted('send')).toEqual([['Первая строка\nВторая строка']]);

    wrapper.destroy();
  });
});
