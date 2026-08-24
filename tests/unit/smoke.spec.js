import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';

// Импорт по умолчанию и именованный `Tok` — один и тот же компонент (index.js),
// поэтому предупреждение правила здесь ложное.
// eslint-disable-next-line import/no-named-as-default
import Tok from '@/Tok';

Vue.use(Vuetify);

describe('каркас проекта', () => {
  it('монтирует переносимый компонент Тока', () => {
    const wrapper = mount(Tok, {
      localVue: createLocalVue(),
      vuetify: new Vuetify(),
    });

    expect(wrapper.exists()).toBe(true);
    wrapper.destroy();
  });
});
