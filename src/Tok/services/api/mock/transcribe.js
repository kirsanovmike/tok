/**
 * Мок транскрипции: тот же интерфейс, что у транспорта.
 *
 * Реальный эндпоинт из среды разработки недоступен, поэтому весь голосовой сценарий
 * проверяется здесь. Форма ответа взята из контракта — `{ "text": "..." }`.
 *
 * **Отличие от постановки.** В плане зафиксировано, что мок отвечает `{ "text": "" }`.
 * По умолчанию мок отдаёт осмысленную фразу: иначе сценарий «запись → остановка →
 * текст появился в поле ввода» на стенде показать нечем. Пустой ответ никуда не делся —
 * это отдельный, тоже важный случай: `config.mockTranscript = ''`.
 */
import { createCancelError, isCancelError } from '../errors';

export const DEFAULT_MOCK_TRANSCRIPT = 'Сколько я потратил на электроэнергию за июнь';

export function createMockTranscriptionClient(config) {
  let pending = null;

  return {
    transcribe() {
      const text =
        typeof config.mockTranscript === 'string' ? config.mockTranscript : DEFAULT_MOCK_TRANSCRIPT;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending = null;
          resolve(text);
        }, config.mockDelayMs);

        pending = () => {
          clearTimeout(timer);
          pending = null;
          reject(createCancelError('Расшифровка отменена'));
        };
      });
    },

    cancel() {
      if (pending) pending();
    },

    isCancelError,
  };
}

export default createMockTranscriptionClient;
