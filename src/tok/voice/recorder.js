/**
 * Запись с микрофона через `MediaRecorder`.
 *
 * Наружу — четыре метода и ни одного упоминания о том, во что запись превратится
 * дальше: кодирование и отправка живут отдельно (`encodeToMp3`, `transcribe`).
 *
 * Формат записи выбирает браузер: Chrome отдаёт `audio/webm;codecs=opus`,
 * Safari — `audio/mp4`. MP3 не умеет ни один, поэтому конвертация обязательна
 * (ADR-0002) и происходит уже после остановки.
 */

// Порядок важен: opus в webm — самый компактный из общедоступных, mp4 — запасной
// для Safari. Пустая строка означает «пусть браузер решает сам».
const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', ''];

export const VOICE_ERROR = {
  UNSUPPORTED: 'unsupported',
  DENIED: 'denied',
  NO_DEVICE: 'noDevice',
  FAILED: 'failed',
  EMPTY: 'empty',
};

const MESSAGES = {
  [VOICE_ERROR.UNSUPPORTED]: 'Браузер не умеет записывать звук. Наберите вопрос текстом.',
  [VOICE_ERROR.DENIED]: 'Нет доступа к микрофону. Разрешите его в настройках браузера.',
  [VOICE_ERROR.NO_DEVICE]: 'Микрофон не найден. Проверьте, подключён ли он.',
  [VOICE_ERROR.FAILED]: 'Не удалось записать звук. Попробуйте ещё раз.',
  [VOICE_ERROR.EMPTY]: 'Ничего не расслышал. Попробуйте сказать ещё раз.',
};

export function createVoiceError(code, cause) {
  const error = new Error(MESSAGES[code] || MESSAGES[VOICE_ERROR.FAILED]);
  error.voiceCode = code;
  error.cause = cause || null;
  return error;
}

/** Человекочитаемое объяснение — то, что увидит пользователь под композером. */
export function describeVoiceError(error) {
  if (error && error.voiceCode) return error.message;
  return MESSAGES[VOICE_ERROR.FAILED];
}

export function isVoiceSupported() {
  if (typeof window === 'undefined') return false;

  const media = window.navigator && window.navigator.mediaDevices;
  return Boolean(media && media.getUserMedia && window.MediaRecorder);
}

function pickMimeType() {
  const { MediaRecorder } = window;
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';

  return PREFERRED_MIME_TYPES.filter(
    (type) => type === '' || MediaRecorder.isTypeSupported(type),
  )[0];
}

/**
 * Отказ в доступе и отсутствие устройства — разные беды и разные подсказки:
 * в первом случае надо лезть в настройки браузера, во втором — искать микрофон.
 */
function classifyGetUserMediaError(error) {
  const name = error && error.name;

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return VOICE_ERROR.DENIED;
  }
  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return VOICE_ERROR.NO_DEVICE;
  }
  return VOICE_ERROR.FAILED;
}

export function createRecorder() {
  let recorder = null;
  let stream = null;
  let chunks = [];

  /** Микрофон отпускается всегда: иначе в браузере остаётся гореть индикатор записи. */
  function releaseStream() {
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    recorder = null;
    chunks = [];
  }

  return {
    isRecording() {
      return Boolean(recorder && recorder.state === 'recording');
    },

    start() {
      if (!isVoiceSupported()) {
        return Promise.reject(createVoiceError(VOICE_ERROR.UNSUPPORTED));
      }

      return window.navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch((error) => {
          throw createVoiceError(classifyGetUserMediaError(error), error);
        })
        .then((granted) => {
          stream = granted;
          chunks = [];

          const mimeType = pickMimeType();
          recorder = new window.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunks.push(event.data);
          };
          recorder.start();

          return true;
        });
    },

    /** @returns {Promise<Blob>} записанный звук в том формате, что дал браузер */
    stop() {
      if (!recorder) return Promise.reject(createVoiceError(VOICE_ERROR.FAILED));

      return new Promise((resolve, reject) => {
        const { mimeType } = recorder;

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
          releaseStream();

          // Нулевой размер — это «кнопку нажали дважды подряд», а не поломка:
          // отправлять на транскрипцию нечего.
          if (!blob.size) reject(createVoiceError(VOICE_ERROR.EMPTY));
          else resolve(blob);
        };

        recorder.onerror = (event) => {
          releaseStream();
          reject(createVoiceError(VOICE_ERROR.FAILED, event && event.error));
        };

        try {
          recorder.stop();
        } catch (error) {
          releaseStream();
          reject(createVoiceError(VOICE_ERROR.FAILED, error));
        }
      });
    },

    /** Отмена: запись выбрасывается, наружу не уходит ничего. */
    cancel() {
      if (!recorder) return;

      recorder.onstop = null;
      recorder.onerror = null;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch (error) {
        // Остановка уже случилась — освободить микрофон это не мешает.
      }
      releaseStream();
    },
  };
}

export default createRecorder;
