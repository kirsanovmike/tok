/**
 * Транспорт к ассистенту: один эндпоинт, один round-trip на сообщение.
 *
 * Наружу торчит только `sendMessage({ conversationId, message })` и `cancel()` —
 * ровно этот интерфейс реализует и мок-слой, поэтому стор не знает, с кем говорит.
 */
import axios from 'axios';

import { createRequest, normalizeResponse } from './contract';
import { isCancelError } from './errors';

export function createHttpAssistantClient(config) {
  const http = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers: { 'Content-Type': 'application/json' },
  });

  // Одна беседа — один активный запрос. Новый вопрос отменяет предыдущий.
  let pending = null;

  function authHeaders() {
    if (typeof config.getAuthToken !== 'function') return {};
    const token = config.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return {
    sendMessage({ conversationId, message }) {
      const source = axios.CancelToken.source();
      pending = source;

      return http
        .post(config.messagePath, createRequest({ conversationId, message }), {
          cancelToken: source.token,
          headers: authHeaders(),
        })
        .then((response) => {
          pending = null;
          return normalizeResponse(response.data);
        })
        .catch((error) => {
          pending = null;
          throw error;
        });
    },

    cancel(reason) {
      if (!pending) return;
      pending.cancel(reason || 'Запрос отменён');
      pending = null;
    },

    isCancelError,
  };
}

export default createHttpAssistantClient;
