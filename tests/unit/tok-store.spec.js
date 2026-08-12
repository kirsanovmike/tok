/**
 * Фаза 4 — стор беседы: цепочка «отправка → загрузка → ответ → история пополнилась»
 * и отдельное состояние сбоя.
 */
import { MESSAGE_AUTHOR, REPLY_KIND, WORKFLOW_STATUS } from '@/tok/api/contract';
import { createCancelError } from '@/tok/api/errors';
import { createTokStore } from '@/tok/store';
import { CONFIRM_TEXT, DECLINE_TEXT } from '@/tok/store/conversation';
import { createControlledApi, flush } from './support/tok';

function setup() {
  const api = createControlledApi();
  const store = createTokStore({ api });

  return {
    api,
    store,
    get state() {
      return store.state.conversation;
    },
    getter(name) {
      return store.getters[`conversation/${name}`];
    },
    send(text) {
      return store.dispatch('conversation/send', text);
    },
  };
}

const SUCCESS = {
  conversationId: 'c-42',
  reply: { kind: REPLY_KIND.SUCCESS, text: 'Стоимость за июнь — 2 500 146 ₽' },
  workflow: { status: WORKFLOW_STATUS.COMPLETED, awaitingConfirmation: false },
  contents: [],
};

describe('стор беседы', () => {
  it('проводит сообщение через загрузку в историю', async () => {
    const ctx = setup();

    expect(ctx.getter('isEmpty')).toBe(true);

    ctx.send('Сколько я потратил за июнь?');
    await flush();

    // Реплика пользователя появляется сразу, не дожидаясь сервера.
    expect(ctx.state.messages).toHaveLength(1);
    expect(ctx.state.messages[0].author).toBe(MESSAGE_AUTHOR.USER);
    expect(ctx.state.sending).toBe(true);
    // Первый запрос уходит без идентификатора беседы.
    expect(ctx.api.calls[0]).toEqual({
      conversationId: null,
      message: 'Сколько я потратил за июнь?',
    });

    await ctx.api.respond(SUCCESS);

    expect(ctx.state.sending).toBe(false);
    expect(ctx.state.messages).toHaveLength(2);
    expect(ctx.state.messages[1].author).toBe(MESSAGE_AUTHOR.ASSISTANT);
    expect(ctx.state.messages[1].text).toBe(SUCCESS.reply.text);
    expect(ctx.state.conversationId).toBe('c-42');
    expect(ctx.state.error).toBeNull();
  });

  it('второе сообщение уходит с полученным conversationId', async () => {
    const ctx = setup();

    ctx.send('первый');
    await ctx.api.respond(SUCCESS);
    ctx.send('второй');
    await flush();

    expect(ctx.api.calls[1]).toEqual({ conversationId: 'c-42', message: 'второй' });
  });

  it('не отправляет пустую строку и строку из пробелов', async () => {
    const ctx = setup();

    await ctx.send('   ');
    await ctx.send('');

    expect(ctx.api.calls).toHaveLength(0);
    expect(ctx.getter('isEmpty')).toBe(true);
  });

  it('сетевой сбой становится отдельным сообщением, а не вечной загрузкой', async () => {
    const ctx = setup();

    ctx.send('Сколько я потратил?');
    await flush();
    await ctx.api.fail({ request: {} });

    expect(ctx.state.sending).toBe(false);
    expect(ctx.state.error).toContain('Не удалось связаться');

    const last = ctx.state.messages[ctx.state.messages.length - 1];
    expect(last.author).toBe(MESSAGE_AUTHOR.ASSISTANT);
    expect(last.kind).toBe(REPLY_KIND.ERROR);
    expect(last.failed).toBe(true);
  });

  it('reply.kind: error — обычный ответ сервера, а не сбой транспорта', async () => {
    const ctx = setup();

    ctx.send('ошибка');
    await ctx.api.respond({
      reply: { kind: REPLY_KIND.ERROR, text: 'Не смог получить данные по договору.' },
      workflow: { status: WORKFLOW_STATUS.FALLBACK },
      contents: [],
    });

    const last = ctx.state.messages[1];
    expect(last.kind).toBe(REPLY_KIND.ERROR);
    // Именно этим он и отличается от обрыва связи.
    expect(last.failed).toBe(false);
    expect(ctx.state.error).toBeNull();
  });

  it('отмена не оставляет следа в ленте', async () => {
    const ctx = setup();

    ctx.api.isCancelError = () => true;
    ctx.send('вопрос');
    await flush();
    await ctx.api.fail(createCancelError());

    expect(ctx.state.sending).toBe(false);
    expect(ctx.state.messages).toHaveLength(1);
    expect(ctx.state.error).toBeNull();
  });

  it('шаг подтверждения: кнопки гаснут сразу, ответ уходит текстом', async () => {
    const ctx = setup();

    ctx.send('Выгрузи отчёт');
    await ctx.api.respond({
      reply: { kind: REPLY_KIND.CONFIRMATION, text: 'Посчитать за первое полугодие?' },
      workflow: { status: WORKFLOW_STATUS.CONFIRMING, awaitingConfirmation: true },
      contents: [],
    });

    expect(ctx.getter('awaitingConfirmation')).toBe(true);

    ctx.store.dispatch('conversation/answerConfirmation', true);
    await flush();

    expect(ctx.getter('awaitingConfirmation')).toBe(false);
    expect(ctx.api.calls[1].message).toBe(CONFIRM_TEXT);

    await ctx.api.respond(SUCCESS);
    ctx.store.dispatch('conversation/answerConfirmation', false);
    await flush();

    expect(ctx.api.calls[2].message).toBe(DECLINE_TEXT);
  });

  it('статус forbidden блокирует ввод', async () => {
    const ctx = setup();

    ctx.send('чужой договор');
    await ctx.api.respond({
      reply: { kind: REPLY_KIND.ERROR, text: 'Нет доступа к договору.' },
      workflow: { status: WORKFLOW_STATUS.FORBIDDEN },
      contents: [],
    });

    expect(ctx.getter('isInputBlocked')).toBe(true);
  });

  it('очистка обнуляет и историю, и conversationId', async () => {
    const ctx = setup();

    ctx.send('вопрос');
    await ctx.api.respond(SUCCESS);
    ctx.store.dispatch('conversation/reset');

    expect(ctx.getter('isEmpty')).toBe(true);
    expect(ctx.state.conversationId).toBeNull();
    expect(ctx.api.cancel).toHaveBeenCalled();

    // Следующее сообщение снова уходит с `conversationId: null`.
    ctx.send('новый вопрос');
    await flush();

    expect(ctx.api.calls[1]).toEqual({ conversationId: null, message: 'новый вопрос' });
  });
});
