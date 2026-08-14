/**
 * Голосовой ввод целиком: микрофон → MP3 → расшифровка → текст.
 *
 * Вынесено из компонента, потому что это конвейер из трёх независимых шагов,
 * каждый со своим способом сломаться, и разбирать его вперемешку с состоянием
 * кнопки было бы нечитаемо. Компонент отвечает только за то, как это выглядит.
 *
 * Кодировщик и клиент расшифровки приходят снаружи: в тестах на их месте заглушки,
 * и весь сценарий проверяется без микрофона и без 31 МБ wasm.
 */
import { createRecorder, createVoiceError, VOICE_ERROR } from './recorder';

export const VOICE_STATE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  // Кодирование и расшифровка — для пользователя одно ожидание, разделять незачем.
  PROCESSING: 'processing',
};

export function createVoiceSession({ encode, transcription, recorder }) {
  const device = recorder || createRecorder();
  let cancelled = false;

  return {
    start() {
      cancelled = false;
      return device.start();
    },

    /**
     * Остановка: вернёт распознанный текст.
     * @param {(state: string) => void} [onState] — переход в «обрабатываю»
     */
    stop(onState) {
      return device
        .stop()
        .then((blob) => {
          if (cancelled) return '';
          if (typeof onState === 'function') onState(VOICE_STATE.PROCESSING);
          return encode(blob);
        })
        .then((mp3) => {
          // Пользователь мог нажать «отмена», пока шло кодирование: тогда на сервер
          // не уходит ничего — это прямое требование постановки.
          if (cancelled || !mp3) return '';
          return transcription.transcribe(mp3);
        })
        .then((text) => {
          if (cancelled) return '';
          const result = String(text || '').trim();
          if (!result) throw createVoiceError(VOICE_ERROR.EMPTY);
          return result;
        });
    },

    cancel() {
      cancelled = true;
      device.cancel();
      if (transcription && typeof transcription.cancel === 'function') transcription.cancel();
    },

    isCancelled() {
      return cancelled;
    },
  };
}

export default createVoiceSession;
