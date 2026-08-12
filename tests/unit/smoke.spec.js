import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';

import { installTok, TokApp } from '@/tok';

Vue.use(Vuetify);

describe('каркас проекта', () => {
  it('монтирует переносимый компонент Тока', () => {
    const localVue = createLocalVue();
    installTok(localVue);

    const wrapper = mount(TokApp, {
      localVue,
      vuetify: new Vuetify(),
    });

    expect(wrapper.exists()).toBe(true);
    wrapper.destroy();
  });
});
