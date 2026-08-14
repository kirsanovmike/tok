/**
 * Фаза 10 — хранение беседы (ADR-0004).
 *
 * Время в тестах подменяется: ждать месяц ради проверки TTL — не вариант.
 */
import { addDays, subDays, subMonths } from 'date-fns';

import {
  createConversationStorage,
  isExpired,
  STORAGE_KEY_PREFIX,
  STORAGE_VERSION,
  storageKey,
} from '@/Tok/services/store/persistence';
import { createTokStore } from '@/Tok/services/store';
import { MESSAGE_AUTHOR, REPLY_KIND, WORKFLOW_STATUS } from '@/Tok/services/api/contract';
import { createControlledApi, createInstantApi, flush, mountPanel } from './support/tok';

const NOW = new Date('2026-08-12T10:00:00Z').getTime();

/** Хранилище в памяти с теми же капризами, что у настоящего. */
function createFakeStorage(options) {
  const settings = options || {};
  const data = new Map();

  return {
    data,
    getItem: jest.fn((key) => {
      if (settings.readThrows) throw new Error('доступ к хранилищу запрещён');
      return data.has(key) ? data.get(key) : null;
    }),
    setItem: jest.fn((key, value) => {
      if (settings.quotaAfter !== undefined && value.length > settings.quotaAfter) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data.set(key, value);
    }),
    removeItem: jest.fn((key) => data.delete(key)),
  };
}

function userMessage(overrides) {
  return {
    id: 'msg-1',
    author: MESSAGE_AUTHOR.USER,
    text: 'Какой у меня тариф?',
    createdAt: NOW,
    ...(overrides || {}),
  };
}

function assistantMessage(overrides) {
  return {
    id: 'msg-2',
    author: MESSAGE_AUTHOR.ASSISTANT,
    text: 'Тариф — 6,71 ₽/кВт·ч',
    kind: REPLY_KIND.SUCCESS,
    workflow: { status: WORKFLOW_STATUS.COMPLETED, awaitingConfirmation: false },
    contents: [],
    createdAt: NOW,
    failed: false,
    confirmationResolved: false,
    ...(overrides || {}),
  };
}

function setup(options) {
  const settings = options || {};
  const storage = settings.storage || createFakeStorage();
  const persistence = createConversationStorage({
    storage,
    namespace: settings.namespace,
    now: () => NOW,
  });

  return { storage, persistence };
}

describe('хранение беседы', () => {
  describe('ключ', () => {
    it('версионированный и с пространством имён пользователя', () => {
      expect(storageKey()).toBe(`${STORAGE_KEY_PREFIX}:v${STORAGE_VERSION}`);
      // Сменился пользователь — сменился ключ: чужую переписку он не прочитает.
      expect(storageKey('user-42')).toBe(`${STORAGE_KEY_PREFIX}:v${STORAGE_VERSION}:user-42`);
      expect(storageKey('user-42')).not.toBe(storageKey('user-7'));
    });

    it('беседа другого пользователя не читается', () => {
      const storage = createFakeStorage();
      setup({ storage, namespace: 'user-42' }).persistence.save({
        conversationId: 'c-1',
        messages: [userMessage()],
      });

      expect(setup({ storage, namespace: 'user-7' }).persistence.load().messages).toEqual([]);
      expect(setup({ storage, namespace: 'user-42' }).persistence.load().messages).toHaveLength(1);
    });
  });

  describe('сохранение и чтение', () => {
    it('переписка и conversationId переживают перезагрузку', () => {
      const { storage, persistence } = setup();

      persistence.save({ conversationId: 'c-1', messages: [userMessage(), assistantMessage()] });

      const restored = setup({ storage }).persistence.load();
      expect(restored.conversationId).toBe('c-1');
      expect(restored.messages).toHaveLength(2);
      expect(restored.messages[0].text).toBe('Какой у меня тариф?');
    });

    it('в хранилище нет ничего, кроме версии, идентификатора и сообщений', () => {
      const { storage, persistence } = setup();
      persistence.save({ conversationId: 'c-1', messages: [userMessage()] });

      const record = JSON.parse(storage.data.get(persistence.key));
      // Токенов, адресов и конфигурации в хранилище быть не должно.
      expect(Object.keys(record).sort()).toEqual(['conversationId', 'messages', 'version']);
    });

    it('пустая беседа не оставляет ключа', () => {
      const { storage, persistence } = setup();
      persistence.save({ conversationId: 'c-1', messages: [userMessage()] });
      persistence.save({ conversationId: null, messages: [] });

      expect(storage.data.has(persistence.key)).toBe(false);
    });

    it('шаг подтверждения после перезагрузки считается пройденным', () => {
      const { storage, persistence } = setup();
      persistence.save({
        conversationId: 'c-1',
        messages: [
          assistantMessage({
            workflow: { status: WORKFLOW_STATUS.CONFIRMING, awaitingConfirmation: true },
            confirmationResolved: false,
          }),
        ],
      });

      // Нажать «Подтвердить» по беседе недельной давности — почти наверняка не то,
      // чего хочет человек.
      expect(setup({ storage }).persistence.load().messages[0].confirmationResolved).toBe(true);
    });
  });

  describe('TTL — один месяц', () => {
    it('«месяц и день назад» просрочено, «месяц минус день» — нет', () => {
      const monthAndDay = subDays(subMonths(NOW, 1), 1).getTime();
      const monthMinusDay = addDays(subMonths(NOW, 1), 1).getTime();

      expect(isExpired({ createdAt: monthAndDay }, NOW)).toBe(true);
      expect(isExpired({ createdAt: monthMinusDay }, NOW)).toBe(false);
      // Сообщение без метки времени доверия не заслуживает.
      expect(isExpired({}, NOW)).toBe(true);
    });

    it('просроченные удаляются при инициализации, свежие остаются', () => {
      const storage = createFakeStorage();
      setup({ storage }).persistence.save({
        conversationId: 'c-1',
        messages: [
          userMessage({ id: 'старое', createdAt: subDays(subMonths(NOW, 1), 1).getTime() }),
          userMessage({ id: 'свежее', createdAt: addDays(subMonths(NOW, 1), 1).getTime() }),
        ],
      });

      const restored = setup({ storage }).persistence.load();
      expect(restored.messages.map((message) => message.id)).toEqual(['свежее']);
      expect(restored.conversationId).toBe('c-1');
    });

    it('когда просрочено всё, идентификатор беседы тоже выбрасывается', () => {
      const storage = createFakeStorage();
      const old = subDays(subMonths(NOW, 1), 1).getTime();
      setup({ storage }).persistence.save({
        conversationId: 'c-1',
        messages: [userMessage({ createdAt: old })],
      });

      const { persistence } = setup({ storage });
      const restored = persistence.load();

      // На сервере беседы месячной давности всё равно нет — держаться за её id незачем.
      expect(restored).toEqual({ conversationId: null, messages: [] });
      expect(storage.data.has(persistence.key)).toBe(false);
    });
  });

  describe('устойчивость к повреждённым данным', () => {
    it('мусор в ключе не роняет приложение и убирается', () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      storage.data.set(persistence.key, 'это не JSON');

      expect(persistence.load()).toEqual({ conversationId: null, messages: [] });
      expect(storage.data.has(persistence.key)).toBe(false);
    });

    it('чужая версия схемы игнорируется', () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      storage.data.set(
        persistence.key,
        JSON.stringify({ version: 999, conversationId: 'c-1', messages: [userMessage()] }),
      );

      expect(persistence.load().messages).toEqual([]);
    });

    it('записи не похожие на сообщения отбрасываются поштучно', () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      storage.data.set(
        persistence.key,
        JSON.stringify({
          version: STORAGE_VERSION,
          conversationId: 'c-1',
          messages: [
            null,
            'строка',
            { id: 'нет автора', text: 'x', createdAt: NOW },
            { id: 'нет времени', author: MESSAGE_AUTHOR.USER, text: 'x' },
            userMessage({ id: 'годное' }),
          ],
        }),
      );

      // Одна кривая запись не должна стоить всей переписки.
      expect(persistence.load().messages.map((m) => m.id)).toEqual(['годное']);
    });

    it('ответ с испорченным workflow и contents подставляется безопасными значениями', () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      storage.data.set(
        persistence.key,
        JSON.stringify({
          version: STORAGE_VERSION,
          conversationId: null,
          messages: [assistantMessage({ workflow: 'сломано', contents: 'сломано' })],
        }),
      );

      const [message] = persistence.load().messages;
      expect(message.workflow.status).toBe(WORKFLOW_STATUS.COMPLETED);
      expect(message.contents).toEqual([]);
    });

    it('недоступное хранилище означает пустую беседу, а не исключение', () => {
      const storage = createFakeStorage({ readThrows: true });
      const { persistence } = setup({ storage });

      expect(persistence.load()).toEqual({ conversationId: null, messages: [] });
      expect(() =>
        persistence.save({ conversationId: null, messages: [userMessage()] }),
      ).not.toThrow();
    });

    it('переполнение квоты оставляет хвост переписки, а не теряет беседу', () => {
      // Квота подобрана так, что полная запись не влезает, а укороченная — да.
      const messages = Array.from({ length: 40 }, (unused, index) =>
        userMessage({ id: `msg-${index}`, text: 'вопрос'.repeat(20) }),
      );
      const record = (list) =>
        JSON.stringify({ version: STORAGE_VERSION, conversationId: 'c-1', messages: list });
      const trimmed = record(messages.slice(-20)).length;
      const storage = createFakeStorage({ quotaAfter: trimmed });
      const { persistence } = setup({ storage });

      persistence.save({ conversationId: 'c-1', messages });

      const stored = JSON.parse(storage.data.get(persistence.key));
      expect(stored.messages).toHaveLength(20);
      // Оставлен именно хвост: последние сообщения важнее первых.
      expect(stored.messages[19].id).toBe('msg-39');
    });
  });

  describe('стор', () => {
    it('отправка и ответ попадают в хранилище, перезагрузка их восстанавливает', async () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      const api = createControlledApi();
      const store = createTokStore({ api, storage: persistence });

      store.dispatch('conversation/send', 'Какой у меня тариф?');
      await api.respond({
        conversationId: 'c-99',
        reply: { kind: REPLY_KIND.SUCCESS, text: 'Тариф — 6,71 ₽/кВт·ч' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      // «Перезагрузка страницы»: новый стор на том же хранилище.
      const reloaded = createTokStore({
        api: createInstantApi({}),
        storage: setup({ storage }).persistence,
      });

      expect(reloaded.state.conversation.messages).toHaveLength(2);
      expect(reloaded.state.conversation.conversationId).toBe('c-99');
      // Ни флага отправки, ни ошибки из прошлой сессии.
      expect(reloaded.state.conversation.sending).toBe(false);
      expect(reloaded.state.conversation.error).toBeNull();
    });

    it('следующий вопрос после перезагрузки уходит с прежним conversationId', async () => {
      const storage = createFakeStorage();
      setup({ storage }).persistence.save({
        conversationId: 'c-99',
        messages: [userMessage(), assistantMessage()],
      });

      const api = createControlledApi();
      const store = createTokStore({ api, storage: setup({ storage }).persistence });

      store.dispatch('conversation/send', 'А за июль?');
      await flush();

      expect(api.calls[0].conversationId).toBe('c-99');
    });

    it('reset стирает и ленту, и ключ; следующее сообщение уходит с conversationId: null', async () => {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      const api = createControlledApi();
      const store = createTokStore({ api, storage: persistence });

      store.dispatch('conversation/send', 'вопрос');
      await api.respond({
        conversationId: 'c-99',
        reply: { kind: REPLY_KIND.SUCCESS, text: 'ответ' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });
      expect(storage.data.has(persistence.key)).toBe(true);

      await store.dispatch('conversation/reset');

      expect(store.state.conversation.messages).toEqual([]);
      expect(storage.data.has(persistence.key)).toBe(false);

      store.dispatch('conversation/send', 'новый вопрос');
      await flush();
      expect(api.calls[1].conversationId).toBeNull();
    });

    it('без хранилища стор работает как прежде', async () => {
      const api = createControlledApi();
      const store = createTokStore({ api });

      store.dispatch('conversation/send', 'вопрос');
      await flush();

      expect(store.state.conversation.messages).toHaveLength(1);
    });
  });

  describe('кнопка «Очистить беседу»', () => {
    async function withHistory() {
      const storage = createFakeStorage();
      const { persistence } = setup({ storage });
      const api = createControlledApi();
      const store = createTokStore({ api, storage: persistence });
      const wrapper = mountPanel({ api, store });

      store.dispatch('conversation/send', 'вопрос');
      await api.respond({
        conversationId: 'c-1',
        reply: { kind: REPLY_KIND.SUCCESS, text: 'ответ' },
        workflow: { status: WORKFLOW_STATUS.COMPLETED },
        contents: [],
      });

      return { api, storage, persistence, store, wrapper };
    }

    function trash(wrapper) {
      return wrapper
        .findAll('.tok-panel__icon-button')
        .filter((button) => button.attributes('aria-label') === 'Очистить беседу')
        .at(0);
    }

    it('одно нажатие только спрашивает, ничего не удаляя', async () => {
      const { wrapper, store, storage, persistence } = await withHistory();

      trash(wrapper).trigger('click');
      await flush();

      expect(wrapper.find('.tok-confirm-menu__popover').exists()).toBe(true);
      expect(store.state.conversation.messages).toHaveLength(2);
      expect(storage.data.has(persistence.key)).toBe(true);

      wrapper.destroy();
    });

    it('«Отмена» оставляет переписку на месте', async () => {
      const { wrapper, store } = await withHistory();

      trash(wrapper).trigger('click');
      await flush();
      wrapper.findAll('.tok-confirm-menu__actions .tok-button').at(1).trigger('click');
      await flush();

      expect(wrapper.find('.tok-confirm-menu__popover').exists()).toBe(false);
      expect(store.state.conversation.messages).toHaveLength(2);

      wrapper.destroy();
    });

    it('«Очистить» стирает ленту, conversationId и ключ в хранилище', async () => {
      const { wrapper, store, storage, persistence } = await withHistory();

      trash(wrapper).trigger('click');
      await flush();
      wrapper.findAll('.tok-confirm-menu__actions .tok-button').at(0).trigger('click');
      await flush();

      expect(store.state.conversation.messages).toEqual([]);
      expect(store.state.conversation.conversationId).toBeNull();
      expect(storage.data.has(persistence.key)).toBe(false);
      // Пустая беседа снова показывает домашний экран.
      expect(wrapper.find('.tok-empty').exists()).toBe(true);

      wrapper.destroy();
    });

    it('Esc при открытом вопросе отменяет вопрос, а не закрывает панель', async () => {
      const { wrapper } = await withHistory();

      trash(wrapper).trigger('click');
      await flush();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flush();

      expect(wrapper.find('.tok-confirm-menu__popover').exists()).toBe(false);
      // Панель закрывать не просили — события `close` не было.
      expect(wrapper.emitted('close')).toBeUndefined();

      wrapper.destroy();
    });

    it('клик мимо меню закрывает его, ничего не удаляя', async () => {
      const { wrapper, store } = await withHistory();

      trash(wrapper).trigger('click');
      await flush();
      expect(wrapper.find('.tok-confirm-menu__popover').exists()).toBe(true);

      // Именно `mousedown` на документе: меню закрывается до того, как клик
      // сработает по элементу под ним.
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await flush();

      expect(wrapper.find('.tok-confirm-menu__popover').exists()).toBe(false);
      expect(store.state.conversation.messages).toHaveLength(2);

      wrapper.destroy();
    });
  });
});
