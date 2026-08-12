/**
 * Хранение беседы в `localStorage` (ADR-0004).
 *
 * Что здесь важно помнить: в переписке оказываются объёмы и стоимость по договорам
 * конкретных юрлиц, а `localStorage` переживает закрытие браузера и доступен на общем
 * компьютере. Заказчик принял этот риск осознанно, поэтому файл держит три ограничения,
 * которые его снижают:
 *
 *   1. хранятся **только** сообщения и `conversationId` — ни токенов, ни конфигурации;
 *   2. **TTL сообщения — один календарный месяц**, просроченные удаляются при старте;
 *   3. ключ версионированный и с пространством имён пользователя: смена схемы или
 *      смена учётной записи не читает чужие данные, а начинает с пустой беседы.
 *
 * Никакое повреждение хранилища не имеет права уронить панель: любая неудача
 * чтения означает «беседы нет», а не исключение в консоли хоста.
 */
import { subMonths } from 'date-fns';

import { MESSAGE_AUTHOR, WORKFLOW_STATUS } from '../api/contract';

export const STORAGE_VERSION = 1;
export const STORAGE_KEY_PREFIX = 'tok:conversation';

/** Сколько сообщений оставить, если хранилище переполнено. */
const TRIM_TO_MESSAGES = 20;

export function storageKey(namespace) {
  // Пространство имён — идентификатор пользователя из хоста. Сменился пользователь —
  // сменился ключ, и прошлая переписка новому не покажется (ADR-0004).
  const suffix = namespace ? `:${namespace}` : '';
  return `${STORAGE_KEY_PREFIX}:v${STORAGE_VERSION}${suffix}`;
}

/** Просрочено ли сообщение. Месяц календарный, а не «30 дней». */
export function isExpired(message, now) {
  const createdAt = message && message.createdAt;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return true;
  return createdAt < subMonths(now, 1).getTime();
}

const EMPTY_WORKFLOW = {
  status: WORKFLOW_STATUS.COMPLETED,
  intent: null,
  domain: null,
  awaitingConfirmation: false,
};

/**
 * Приведение прочитанного сообщения к форме, на которую опирается лента.
 * Возвращает `null`, если запись не похожа на сообщение, — такие отбрасываются.
 */
function reviveMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.text !== 'string') return null;
  if (raw.author !== MESSAGE_AUTHOR.USER && raw.author !== MESSAGE_AUTHOR.ASSISTANT) return null;
  if (typeof raw.createdAt !== 'number') return null;

  if (raw.author === MESSAGE_AUTHOR.USER) {
    return { id: raw.id, author: raw.author, text: raw.text, createdAt: raw.createdAt };
  }

  return {
    id: raw.id,
    author: raw.author,
    text: raw.text,
    kind: typeof raw.kind === 'string' ? raw.kind : null,
    workflow: raw.workflow && typeof raw.workflow === 'object' ? raw.workflow : EMPTY_WORKFLOW,
    contents: Array.isArray(raw.contents) ? raw.contents : [],
    createdAt: raw.createdAt,
    failed: raw.failed === true,
    // Шаг подтверждения после перезагрузки считается пройденным: нажать «Подтвердить»
    // по беседе месячной давности — почти наверняка не то, чего хочет человек.
    confirmationResolved: true,
  };
}

function getStorage(provided) {
  if (provided) return provided;
  try {
    // Обращение к localStorage бросает исключение при запрете сторонних данных.
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} [options]
 * @param {Storage} [options.storage]  — подменяется в тестах
 * @param {string}  [options.namespace] — идентификатор пользователя из хоста
 * @param {() => number} [options.now]  — источник времени, подменяется в тестах
 */
export function createConversationStorage(options) {
  const settings = options || {};
  const storage = getStorage(settings.storage);
  const key = storageKey(settings.namespace);
  const now = typeof settings.now === 'function' ? settings.now : () => Date.now();

  function remove() {
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch (e) {
      // Удалить не вышло — читать всё равно нечего: `load` отфильтрует.
    }
  }

  function write(record) {
    if (!storage) return false;
    try {
      storage.setItem(key, JSON.stringify(record));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    key,

    /** @returns {{conversationId: string|null, messages: object[]}} — пусто, если данных нет */
    load() {
      const empty = { conversationId: null, messages: [] };
      if (!storage) return empty;

      let raw;
      try {
        raw = storage.getItem(key);
      } catch (e) {
        return empty;
      }
      if (!raw) return empty;

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        // Мусор в ключе — начинаем с пустой беседы и убираем за собой.
        remove();
        return empty;
      }

      // Ключ версионированный, но поле версии проверяется тоже: ключ мог остаться
      // от ручной правки или от будущей версии Тока.
      if (!parsed || typeof parsed !== 'object' || parsed.version !== STORAGE_VERSION) {
        remove();
        return empty;
      }

      const stamp = now();
      const messages = (Array.isArray(parsed.messages) ? parsed.messages : [])
        .map(reviveMessage)
        .filter(Boolean)
        .filter((message) => !isExpired(message, stamp));

      // Все сообщения просрочены — идентификатор беседы тоже бесполезен:
      // на сервере такой беседы давно нет.
      if (!messages.length) {
        remove();
        return empty;
      }

      return {
        conversationId: typeof parsed.conversationId === 'string' ? parsed.conversationId : null,
        messages,
      };
    },

    save(state) {
      if (!state || !Array.isArray(state.messages) || !state.messages.length) {
        remove();
        return;
      }

      const record = {
        version: STORAGE_VERSION,
        conversationId: state.conversationId || null,
        messages: state.messages,
      };

      if (write(record)) return;

      // Переполнение квоты: ответ с широкой таблицей легко занимает сотни килобайт.
      // Ронять беседу из-за этого нельзя — оставляем хвост переписки.
      write({ ...record, messages: state.messages.slice(-TRIM_TO_MESSAGES) });
    },

    clear: remove,
  };
}

export default createConversationStorage;
