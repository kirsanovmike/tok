/**
 * Выбор клиента ассистента.
 *
 * Стор и компоненты работают с одним интерфейсом:
 *   `sendMessage({ conversationId, message }) -> Promise<NormalizedResponse>`
 *   `cancel(reason)`
 *   `isCancelError(error)`
 *
 * Кто за интерфейсом — мок или настоящий сервис — решает конфигурация,
 * а не код компонента.
 */
import { createHttpAssistantClient } from './httpClient';
import { createMockAssistantClient } from './mock';
import { createHttpTranscriptionClient } from './transcribe';
import { createMockTranscriptionClient } from './mock/transcribe';

export function createAssistantApi(config) {
  return config.useMock ? createMockAssistantClient(config) : createHttpAssistantClient(config);
}

/**
 * Клиент расшифровки — отдельный выбор: эндпоинт на другом хосте и может быть
 * недоступен, когда ассистент уже боевой.
 */
export function createTranscriptionApi(config) {
  return config.useTranscriptionMock
    ? createMockTranscriptionClient(config)
    : createHttpTranscriptionClient(config);
}

export * from './contract';
export * from './errors';
export { createHttpAssistantClient } from './httpClient';
export { createMockAssistantClient } from './mock';
export { createHttpTranscriptionClient, normalizeTranscript } from './transcribe';
export { createMockTranscriptionClient } from './mock/transcribe';

export default createAssistantApi;
