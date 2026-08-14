import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';

import { installTok, Tok } from '@/Tok';

Vue.use(Vuetify);

describe('каркас проекта', () => {
  it('монтирует переносимый компонент Тока', () => {
    const localVue = createLocalVue();
    installTok(localVue);

    const wrapper = mount(Tok, {
      localVue,
      vuetify: new Vuetify(),
    });

    expect(wrapper.exists()).toBe(true);
    wrapper.destroy();
  });
});
