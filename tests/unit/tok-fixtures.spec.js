/**
 * Фаза 4 — мок-слой.
 *
 * Каждая фикстура проходит через стор и рендерится в панели: и рукописные,
 * и 35 сочетаний решётки `kind × status`. Любое `console.error` / `console.warn`
 * во время рендера роняет тест — «отрендерилось с предупреждением» не считается.
 *
 * Единственное исключение — диагностика диспетчера блоков о пропущенном блоке
 * (`CONTENT_WARNING_PREFIX`). Она не дефект, а заявленное поведение: фикстура
 * `unknown-content` специально содержит тип, которого в контракте нет. Проверяется
 * такая диагностика отдельно, в `tok-contents.spec.js`.
 */
import { REPLY_KINDS, WORKFLOW_STATUSES, CONTENT_TYPES } from '@/tok/api/contract';
import { createMockAssistantClient } from '@/tok/api/mock';
import { allFixtures, fixtures } from '@/tok/api/mock/fixtures';
import { CONTENT_WARNING_PREFIX } from '@/tok/components/contents/warn';
import { createTokConfig } from '@/tok/config';
import { createTokStore } from '@/tok/store';
import { flush, mountPanel } from './support/tok';

/** Предупреждения, которые не являются заявленным поведением диспетчера блоков. */
function unexpected(spy) {
  return spy.mock.calls.filter((args) => String(args[0]).indexOf(CONTENT_WARNING_PREFIX) !== 0);
}

function mockConfig(overrides) {
  return createTokConfig({ useMock: true, mockDelayMs: 0, ...(overrides || {}) });
}

describe('мок-слой', () => {
  let errors;
  let warnings;

  beforeEach(() => {
    errors = jest.spyOn(console, 'error').mockImplementation((...args) => args);
    warnings = jest.spyOn(console, 'warn').mockImplementation((...args) => args);
  });

  afterEach(() => {
    errors.mockRestore();
    warnings.mockRestore();
  });

  it('покрывает контракт целиком', () => {
    const covered = (pick) =>
      allFixtures.map(pick).filter((value, index, all) => all.indexOf(value) === index);

    const kinds = covered((fixture) => fixture.response.reply.kind);
    const statuses = covered((fixture) => fixture.response.workflow.status);
    const types = allFixtures
      .reduce((acc, fixture) => acc.concat(fixture.response.contents), [])
      .map((block) => block.type);

    REPLY_KINDS.forEach((kind) => expect(kinds).toContain(kind));
    WORKFLOW_STATUSES.forEach((status) => expect(statuses).toContain(status));
    CONTENT_TYPES.forEach((type) => expect(types).toContain(type));

    // Решётка целиком: 5 kind × 7 status.
    expect(allFixtures.length - fixtures.length).toBe(
      REPLY_KINDS.length * WORKFLOW_STATUSES.length,
    );
    // Ответ из нескольких блоков и неизвестный тип блока — тоже часть покрытия.
    expect(fixtures.filter((f) => f.response.contents.length > 1).length).toBeGreaterThan(0);
    expect(types).toContain('unknown_future_type');
  });

  it('подбирает фикстуру по ключевым словам вопроса', async () => {
    const api = createMockAssistantClient(mockConfig());
    const response = await api.sendMessage({ conversationId: null, message: 'Покажи динамику' });

    expect(response.contents[0].type).toBe('line');
  });

  it('выдаёт conversationId на первом ответе и не меняет его дальше', async () => {
    const api = createMockAssistantClient(mockConfig());
    const first = await api.sendMessage({ conversationId: null, message: 'вопрос' });
    const second = await api.sendMessage({
      conversationId: first.conversationId,
      message: 'ещё вопрос',
    });

    expect(first.conversationId).toEqual(expect.any(String));
    expect(second.conversationId).toBe(first.conversationId);
  });

  it('принудительная фикстура перекрывает подбор по словам', async () => {
    const api = createMockAssistantClient(mockConfig({ fixtureId: 'forbidden' }));
    const response = await api.sendMessage({ conversationId: null, message: 'Покажи динамику' });

    expect(response.workflow.status).toBe('forbidden');
  });

  it('отмена прерывает ожидание ответа', async () => {
    const api = createMockAssistantClient(mockConfig({ mockDelayMs: 5000 }));
    const promise = api.sendMessage({ conversationId: null, message: 'вопрос' });

    api.cancel();
    const error = await promise.catch((reason) => reason);

    expect(api.isCancelError(error)).toBe(true);
  });

  describe('каждая фикстура проходит через стор и рендерится', () => {
    allFixtures.forEach((fixture) => {
      it(`${fixture.id} — ${fixture.title}`, async () => {
        const api = createMockAssistantClient(mockConfig({ fixtureId: fixture.id }));
        const store = createTokStore({ api });
        const wrapper = mountPanel({ api, store });

        await store.dispatch('conversation/send', 'вопрос стенда');
        await flush();

        const text = wrapper.text();

        expect(text).toContain('вопрос стенда');
        expect(text).toContain(fixture.response.reply.text);
        expect(unexpected(errors)).toEqual([]);
        expect(unexpected(warnings)).toEqual([]);

        wrapper.destroy();
      });
    });
  });
});
