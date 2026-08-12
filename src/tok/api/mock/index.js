/**
 * Мок-слой ассистента: тот же интерфейс, что у транспорта, но ответ берётся из фикстур.
 *
 * Работает по двум правилам:
 *   1. `config.fixtureId` (в демо приходит из `?tokFixture=<id>`) — любой вопрос
 *      получает именно эту фикстуру. Так прогоняются все комбинации контракта;
 *   2. иначе фикстура подбирается по ключевым словам вопроса.
 *
 * Задержка настоящая: без неё не увидеть индикатор загрузки.
 */
import { normalizeResponse } from '../contract';
import { createCancelError, isCancelError } from '../errors';
import { findFixtureById, matchFixture } from './fixtures';

let conversationCounter = 0;

function nextConversationId() {
  conversationCounter += 1;
  // Формой похоже на Guid из контракта, но это заглушка стенда, а не настоящий id.
  return `00000000-0000-4000-8000-${String(conversationCounter).padStart(12, '0')}`;
}

export function createMockAssistantClient(config) {
  let pending = null;

  return {
    sendMessage({ conversationId, message }) {
      const forced = config.fixtureId ? findFixtureById(config.fixtureId) : null;
      const fixture = forced || matchFixture(message);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending = null;
          resolve(
            normalizeResponse({
              ...fixture.response,
              conversationId: conversationId || nextConversationId(),
            }),
          );
        }, config.mockDelayMs);

        pending = () => {
          clearTimeout(timer);
          pending = null;
          reject(createCancelError());
        };
      });
    },

    cancel() {
      if (pending) pending();
    },

    isCancelError,
  };
}

export { fixtures, allFixtures, findFixtureById, matchFixture } from './fixtures';

export default createMockAssistantClient;
