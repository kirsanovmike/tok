/**
 * Истории Storybook.
 *
 * Storybook в этом репозитории не установлен — истории собирает библиотека
 * `@tne-ui/components`. Здесь проверяется то, что от них требует постановка:
 * компонент монтируется без единого действия по установке, а тему истории
 * не трогают вовсе — её переключает окружение превью (ADR-0010).
 */
import fs from 'fs';
import path from 'path';

import { createLocalVue, mount } from '@vue/test-utils';

import * as stories from '@/Tok/Tok.stories';

const STORIES_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../src/Tok/Tok.stories.js'),
  'utf8',
);

/** Собрать компонент истории так же, как это делает Storybook 6 (CSF). */
function mountStory(story) {
  const { argTypes } = stories.default;
  const definition = story(story.args, { argTypes });

  return mount(definition, {
    localVue: createLocalVue(),
    propsData: { ...story.args },
  });
}

describe('истории Тока', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('не устанавливают плагинов: компонент подключается одним импортом', () => {
    // Постановка `docs/Задача на доработку 1.md`, строка 90.
    expect(stories.default.component).toBeDefined();
    expect(STORIES_SOURCE).not.toContain('installTok');
    expect(STORIES_SOURCE).not.toContain('Vue.use(');
  });

  it('история с закрытой шторкой монтируется и рисует точку входа', async () => {
    const wrapper = mountStory(stories.Primary);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(document.querySelector('.tok-entry')).not.toBeNull();

    wrapper.destroy();
  });

  it('история с открытой шторкой монтируется и рисует панель', async () => {
    const wrapper = mountStory(stories.Opened);
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(document.querySelector('[data-tok-panel]')).not.toBeNull();

    wrapper.destroy();
  });

  it('темой не управляют: переменные объявляет окружение превью', async () => {
    // Раньше истории раскладывали `--v-tok-*` сами. Теперь это забота хоста:
    // в Трансфере — `@tne-ui/core`, в превью — его же стили. Истории не должны
    // писать инлайновые переменные: они оказались бы сильнее объявлений core.
    expect(STORIES_SOURCE).not.toContain('setProperty');
    expect(STORIES_SOURCE).not.toContain('applyTokTheme');

    document.documentElement.removeAttribute('style');

    const wrapper = mountStory(stories.Opened);
    await wrapper.vm.$nextTick();

    // `overflow: hidden` от блокировки прокрутки страницы — единственное,
    // что Ток пишет в стиль документа.
    expect(document.documentElement.style.getPropertyValue('--v-tok-surface')).toBe('');

    wrapper.destroy();
  });
});
