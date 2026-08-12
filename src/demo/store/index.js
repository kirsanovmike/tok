import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

// Стор демо-хоста. Беседы Тока здесь нет и не будет: у Тока собственный стор,
// он раздаётся через `provide`/`inject` внутри панели — см. ADR-0006.
export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {},
});
