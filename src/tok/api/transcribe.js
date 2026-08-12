/**
 * Транскрипция голоса: `multipart/form-data` с полем `file`.
 *
 * Эндпоинт живёт на **отдельном** хосте от ассистента (в перечне заказчика это
 * `llm-prod.tne.tn.corp:9000`), поэтому в конфигурации он задаётся полным URL,
 * а не путём от `baseUrl`.
 *
 * Токена в исходниках нет и быть не может: он приходит из той же функции
 * `config.getAuthToken()`, что и у ассистента.
 */
import axios from 'axios';

import { isCancelError } from './errors';

export const TRANSCRIBE_FIELD = 'file';
export const TRANSCRIBE_FILENAME = 'voice.mp3';

/** Ответ описан как `{ "text": "..." }`; пустая строка — допустимый ответ. */
export function normalizeTranscript(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return typeof data.text === 'string' ? data.text : '';
}

export function createHttpTranscriptionClient(config) {
  let pending = null;

  function authHeaders() {
    if (typeof config.getAuthToken !== 'function') return {};
    const token = config.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return {
    transcribe(blob) {
      const form = new FormData();
      // Имя файла обязательно: без него сервер получит поле без расширения
      // и не поймёт, что это MP3.
      form.append(TRANSCRIBE_FIELD, blob, TRANSCRIBE_FILENAME);

      const source = axios.CancelToken.source();
      pending = source;

      return axios
        .post(config.transcribeUrl, form, {
          // `Content-Type` с boundary проставляет сам браузер — руками нельзя.
          headers: authHeaders(),
          timeout: config.transcribeTimeoutMs,
          cancelToken: source.token,
        })
        .then((response) => {
          pending = null;
          return normalizeTranscript(response.data);
        })
        .catch((error) => {
          pending = null;
          throw error;
        });
    },

    cancel(reason) {
      if (!pending) return;
      pending.cancel(reason || 'Расшифровка отменена');
      pending = null;
    },

    isCancelError,
  };
}

export default createHttpTranscriptionClient;
