/**
 * Доступ к стору Тока из компонентов панели.
 *
 * `inject`, а не `this.$store`: стор Тока — свой собственный, хост о нём не знает
 * (см. `src/tok/store/index.js`). Хелперов `mapState`/`mapGetters` из Vuex здесь нет
 * именно поэтому — они смотрят в `this.$store`.
 */
import { CONVERSATION, TOK_STORE_KEY } from '../store';

export default {
  inject: [TOK_STORE_KEY],

  computed: {
    // Состояние реактивно: это `state` живого экземпляра Vuex.
    conversation() {
      return this.tokStore.state[CONVERSATION];
    },
  },

  methods: {
    tokGetter(name) {
      return this.tokStore.getters[`${CONVERSATION}/${name}`];
    },

    tokDispatch(action, payload) {
      return this.tokStore.dispatch(`${CONVERSATION}/${action}`, payload);
    },
  },
};
