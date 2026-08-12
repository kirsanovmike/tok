/**
 * Стор Тока.
 *
 * Ток заводит **собственный** экземпляр Vuex-стора, а не регистрирует модуль в сторе
 * хоста. Причины:
 *   — перенос в Трансферу не требует ни строчки в её сторе и не занимает namespace;
 *   — Ток остаётся работоспособным там, где стора у хоста вообще нет;
 *   — состояние беседы никого за пределами панели не касается.
 *
 * Экземпляр раздаётся вниз через `provide`/`inject` (ключ `tokStore`), а не через
 * `this.$store`: подменять хосту его собственный стор нельзя.
 */
import Vue from 'vue';
import Vuex from 'vuex';

import { createConversationModule } from './conversation';
import { createConversationStorage } from './persistence';

export const TOK_STORE_KEY = 'tokStore';
export const CONVERSATION = 'conversation';

/** Мутации, после которых лента изменилась и её надо переписать в хранилище. */
const PERSISTED_MUTATIONS = ['ADD_MESSAGE', 'SET_CONVERSATION_ID', 'RESOLVE_CONFIRMATION'].map(
  (name) => `${CONVERSATION}/${name}`,
);

export function createTokStore({ api, storage }) {
  // Идемпотентно: если хост уже сделал `Vue.use(Vuex)`, повтор ничего не меняет.
  Vue.use(Vuex);

  const store = new Vuex.Store({
    modules: {
      [CONVERSATION]: createConversationModule({ api, storage }),
    },
  });

  if (storage) {
    // Подписка, а не запись внутри каждого действия: сохранение — это про хранилище,
    // а не про логику беседы, и модуль о нём знать не обязан. `RESET` в список
    // не входит намеренно — он чистит ключ сам.
    store.subscribe((mutation, state) => {
      if (PERSISTED_MUTATIONS.indexOf(mutation.type) === -1) return;
      storage.save(state[CONVERSATION]);
    });
  }

  return store;
}

export { createConversationModule, createConversationStorage };

export default createTokStore;
