/**
 * Модуль беседы: история, `conversationId`, флаги загрузки и ошибки.
 *
 * Модуль namespaced и создаётся фабрикой, потому что зависит от клиента ассистента:
 * в тестах и на стенде это мок, в Трансфере — транспорт. Стор ничего не знает
 * ни про axios, ни про фикстуры.
 */
import { MESSAGE_AUTHOR, REPLY_KIND, WORKFLOW_STATUS } from '../api/contract';
import { describeError } from '../api/errors';
import { createLocalId } from '../utils/id';

export const CONFIRM_TEXT = 'Подтверждаю';
export const DECLINE_TEXT = 'Отменить';

function createUserMessage(text) {
  return {
    id: createLocalId('msg'),
    author: MESSAGE_AUTHOR.USER,
    text,
    createdAt: Date.now(),
  };
}

function createAssistantMessage(response) {
  return {
    id: createLocalId('msg'),
    author: MESSAGE_AUTHOR.ASSISTANT,
    text: response.reply.text,
    kind: response.reply.kind,
    workflow: response.workflow,
    contents: response.contents,
    createdAt: Date.now(),
    // Локальный сбой транспорта, а не `reply.kind: error` от сервера.
    failed: false,
    // Пользователь уже ответил на шаг подтверждения — кнопки убраны.
    confirmationResolved: false,
  };
}

function createFailureMessage(error) {
  return {
    id: createLocalId('msg'),
    author: MESSAGE_AUTHOR.ASSISTANT,
    text: describeError(error),
    kind: REPLY_KIND.ERROR,
    workflow: {
      status: WORKFLOW_STATUS.FALLBACK,
      intent: null,
      domain: null,
      awaitingConfirmation: false,
    },
    contents: [],
    createdAt: Date.now(),
    failed: true,
    confirmationResolved: false,
  };
}

export function createConversationModule({ api, storage }) {
  // Беседа поднимается из хранилища один раз, при создании модуля: просроченные
  // сообщения отсеиваются там же (ADR-0004). Хранилища нет — беседа пустая.
  const restored = storage ? storage.load() : { conversationId: null, messages: [] };

  return {
    namespaced: true,

    state() {
      return {
        conversationId: restored.conversationId,
        messages: restored.messages,
        sending: false,
        // Техническая ошибка последнего запроса. `reply.kind: error` сюда не попадает:
        // это нормальный ответ сервера, он живёт в ленте отдельным сообщением.
        error: null,
      };
    },

    getters: {
      isEmpty: (state) => state.messages.length === 0,

      lastAssistantMessage: (state) => {
        for (let i = state.messages.length - 1; i >= 0; i -= 1) {
          if (state.messages[i].author === MESSAGE_AUTHOR.ASSISTANT) return state.messages[i];
        }
        return null;
      },

      workflow: (state, getters) =>
        getters.lastAssistantMessage ? getters.lastAssistantMessage.workflow : null,

      // Шаг подтверждения активен, пока пользователь не нажал одну из двух кнопок.
      awaitingConfirmation: (state, getters) => {
        const last = getters.lastAssistantMessage;
        if (!last || last.confirmationResolved) return false;
        return last.workflow.awaitingConfirmation === true;
      },

      // `forbidden` — не ошибка, а состояние автомата: спрашивать дальше бессмысленно.
      isInputBlocked: (state, getters) => {
        const last = getters.workflow;
        return Boolean(last) && last.status === WORKFLOW_STATUS.FORBIDDEN;
      },
    },

    mutations: {
      ADD_MESSAGE(state, message) {
        state.messages.push(message);
      },

      SET_SENDING(state, value) {
        state.sending = value;
      },

      SET_ERROR(state, value) {
        state.error = value;
      },

      SET_CONVERSATION_ID(state, value) {
        state.conversationId = value;
      },

      RESOLVE_CONFIRMATION(state, id) {
        const message = state.messages.filter((item) => item.id === id)[0];
        if (message) message.confirmationResolved = true;
      },

      RESET(state) {
        state.conversationId = null;
        state.messages = [];
        state.sending = false;
        state.error = null;
      },
    },

    actions: {
      send({ commit, state }, rawText) {
        const text = String(rawText || '').trim();
        if (!text || state.sending) return Promise.resolve(null);

        commit('ADD_MESSAGE', createUserMessage(text));
        commit('SET_ERROR', null);
        commit('SET_SENDING', true);

        return api
          .sendMessage({ conversationId: state.conversationId, message: text })
          .then((response) => {
            commit('SET_SENDING', false);
            if (response.conversationId) {
              commit('SET_CONVERSATION_ID', response.conversationId);
            }
            commit('ADD_MESSAGE', createAssistantMessage(response));
            return response;
          })
          .catch((error) => {
            commit('SET_SENDING', false);
            // Отмена — не сбой: пользователь сам прервал ожидание, ленту не пачкаем.
            if (api.isCancelError(error)) return null;

            commit('SET_ERROR', describeError(error));
            commit('ADD_MESSAGE', createFailureMessage(error));
            return null;
          });
      },

      // Ответ на шаг подтверждения: кнопки исчезают сразу, ещё до ответа сервера,
      // иначе на них можно нажать дважды.
      answerConfirmation({ commit, dispatch, getters }, confirmed) {
        const last = getters.lastAssistantMessage;
        if (last) commit('RESOLVE_CONFIRMATION', last.id);
        return dispatch('send', confirmed ? CONFIRM_TEXT : DECLINE_TEXT);
      },

      cancel({ commit, state }) {
        if (!state.sending) return;
        api.cancel('Пользователь прервал ожидание');
        commit('SET_SENDING', false);
      },

      reset({ commit }) {
        api.cancel('Беседа очищена');
        commit('RESET');
        // Явная очистка, а не «сохраним пустое»: после «Очистить беседу» ключа
        // в хранилище не должно остаться вовсе.
        if (storage) storage.clear();
      },
    },
  };
}

export default createConversationModule;
