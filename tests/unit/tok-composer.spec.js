/**
 * Доработка 1, пункт 5 — поле ввода как в ChatGPT/Perplexity.
 *
 * Высота меряется по `scrollHeight`, а jsdom layout не считает и всегда отдаёт 0 —
 * поэтому саму арифметику проверяем на чистой функции, а на компоненте только то,
 * что jsdom действительно умеет: какая клавиша отправляет, а какая переносит строку.
 */
import { mount } from '@vue/test-utils';

import TokComposer from '@/tok/components/TokComposer.vue';
import {
  COMPOSER_MAX_HEIGHT,
  COMPOSER_MIN_HEIGHT,
  isScrollable,
  nextTextareaHeight,
} from '@/tok/utils/autoGrow';

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
