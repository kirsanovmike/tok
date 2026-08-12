import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';

import { installTok, TokApp } from '@/tok';

// Хост-обёртка: имитирует место вёрстки, куда Трансфера вставляет <TokApp />.
const HostStub = {
  name: 'HostStub',
  components: { TokApp },
  template: '<div id="in-place"><TokApp /></div>',
};

describe('портал Тока', () => {
  it('рендерит содержимое в body, а не в месте вставки', async () => {
    const localVue = createLocalVue();
    installTok(localVue);

    const anchor = document.createElement('div');
    document.body.appendChild(anchor);

    const wrapper = mount(HostStub, {
      localVue,
      vuetify: new Vuetify(),
      attachTo: anchor,
    });

    // Wormhole доставляет содержимое в цель портала на следующем тике.
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    const rendered = document.body.querySelector('[data-tok-root]');
    const inPlace = document.getElementById('in-place');

    expect(rendered).not.toBeNull();
    expect(inPlace).not.toBeNull();
    // Портал вынес разметку за пределы поддерева, куда вставлен <TokApp />.
    expect(inPlace.contains(rendered)).toBe(false);

    wrapper.destroy();
  });
});
