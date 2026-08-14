import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import { mount, createLocalVue } from '@vue/test-utils';

import { installTok } from '@/Tok';
import App from '@/demo/App.vue';
import DemoDashboard from '@/demo/views/DemoDashboard.vue';
import { THEME_STORAGE_KEY, themes } from '@/demo/theme';
import { createDemoTokConfig, readDemoMockDelay } from '@/demo/tokConfig';

Vue.use(Vuetify);

function mountHost() {
  const localVue = createLocalVue();
  localVue.use(VueRouter);
  installTok(localVue);

  const router = new VueRouter({
    routes: [{ path: '/', component: DemoDashboard }],
  });

  return mount(App, {
    localVue,
    router,
    vuetify: new Vuetify({
      theme: { options: { customProperties: true }, themes },
    }),
  });
}

describe('демо-хост', () => {
  let errors;
  let warnings;

  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation((...args) => args);
    warnings = jest.spyOn(console, 'warn').mockImplementation((...args) => args);
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  afterEach(() => {
    errors.mockRestore();
    warnings.mockRestore();
  });

  it('рендерит шапку, дашборд и футер без ошибок в консоли', () => {
    const wrapper = mountHost();
    const text = wrapper.text();

    expect(wrapper.find('.demo-header').exists()).toBe(true);
    expect(wrapper.find('.demo-dashboard').exists()).toBe(true);
    expect(wrapper.find('.demo-footer').exists()).toBe(true);

    // Узнаваемые блоки дашборда Трансферы: четыре карточки.
    expect(wrapper.findAll('.demo-card')).toHaveLength(4);
    ['Потребление', 'Планирование', 'Задолженность', 'Качество электроэнергии'].forEach((title) => {
      expect(text).toContain(title);
    });

    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();

    wrapper.destroy();
  });

  it('переключает тему и запоминает выбор', async () => {
    const wrapper = mountHost();

    expect(wrapper.vm.$vuetify.theme.dark).toBe(false);

    wrapper.find('.demo-header').vm.$emit('toggle-theme');
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.$vuetify.theme.dark).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    wrapper.find('.demo-header').vm.$emit('toggle-theme');
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.$vuetify.theme.dark).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    wrapper.destroy();
  });

  it('демо-стенд просит мок отвечать медленно — чтобы лоадер было видно', () => {
    expect(createDemoTokConfig().mockDelayMs).toBe(6000);
  });

  it('задержку можно перебить адресной строкой', () => {
    window.history.replaceState({}, '', '/?tokDelay=0');
    expect(readDemoMockDelay()).toBe(0);
    window.history.replaceState({}, '', '/');
  });

  it('панель Тока живёт в body, а не внутри разметки хоста', async () => {
    const wrapper = mountHost();
    // Wormhole доставляет содержимое в цель портала не в текущем тике.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const rendered = document.body.querySelector('[data-tok-root]');

    expect(rendered).not.toBeNull();
    expect(wrapper.element.contains(rendered)).toBe(false);

    wrapper.destroy();
  });
});
