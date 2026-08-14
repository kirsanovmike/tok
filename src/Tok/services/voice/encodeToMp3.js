/**
 * Кодирование записи в MP3 через ffmpeg.wasm.
 *
 * Эндпоинт транскрипции принимает строго MP3, а `MediaRecorder` его не умеет
 * ни в одном браузере — конвертация в браузере обязательна (ADR-0002).
 *
 * Ядро **однопоточное**: `@ffmpeg/core-mt` требует `SharedArrayBuffer`, а тот —
 * заголовков COOP/COEP на всей странице-хосте, что в Трансфере сломало бы сторонние
 * ресурсы и iframe. `core-mt` не подключается ни при каком сценарии.
 *
 * Библиотека не импортируется, а подгружается тегом `<script>` из `public/ffmpeg/`:
 *   — `@ffmpeg/ffmpeg@0.12` написан с приватными полями классов, парсер webpack 4
 *     их не понимает и падает на сборке;
 *   — библиотека сама поднимает Worker по пути от `currentScript.src`, и рядом
 *     со своим воркером в `public/ffmpeg/` она находит его без настроек сборки;
 *   — 31 МБ wasm не попадает ни в один чанк и не скачивается до первой записи.
 *
 * Всё это спрятано за одной функцией `encodeToMp3(blob)`: если заказчик добавит
 * `mediabunny`, замена сведётся к этому файлу.
 */

export const DEFAULT_FFMPEG_BASE_URL = '/ffmpeg';

const INPUT_NAME = 'voice-input';
const OUTPUT_NAME = 'voice.mp3';
const GLOBAL_NAMESPACE = 'FFmpegWASM';

// Речь, а не музыка: моно, 16 кГц, 64 кбит/с. Меньше файл — быстрее транскрипция,
// а разборчивость речи от этого не страдает.
const ENCODE_ARGS = ['-vn', '-ac', '1', '-ar', '16000', '-b:a', '64k'];

// Одна загрузка на страницу: 31 МБ wasm скачивать повторно незачем.
let pending = null;

function extensionOf(blob) {
  const type = (blob && blob.type) || '';
  if (type.indexOf('mp4') !== -1) return 'mp4';
  if (type.indexOf('ogg') !== -1) return 'ogg';
  return 'webm';
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-tok-ffmpeg="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-tok-ffmpeg', url);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Не удалось загрузить ${url}`));
    document.head.appendChild(script);
  });
}

function loadFFmpeg(baseUrl) {
  const base = String(baseUrl || DEFAULT_FFMPEG_BASE_URL).replace(/\/$/, '');

  return loadScript(`${base}/ffmpeg.js`).then(() => {
    const namespace = window[GLOBAL_NAMESPACE];
    if (!namespace || !namespace.FFmpeg) {
      throw new Error('ffmpeg.wasm загрузился, но не объявил себя в window');
    }

    const ffmpeg = new namespace.FFmpeg();

    return ffmpeg
      .load({
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
      })
      .then(() => ffmpeg);
  });
}

/** Инстанс ffmpeg: грузится при первой записи и переиспользуется дальше. */
export function getFFmpeg(baseUrl) {
  if (!pending) {
    pending = loadFFmpeg(baseUrl).catch((error) => {
      // Неудачную загрузку не кэшируем: следующая попытка должна начаться заново.
      pending = null;
      throw error;
    });
  }

  return pending;
}

/**
 * @param {Blob} blob — запись в том формате, что дал браузер
 * @param {object} [options]
 * @param {string} [options.baseUrl] — где лежат файлы ffmpeg (по умолчанию `/ffmpeg`)
 * @returns {Promise<Blob>} тот же звук в MP3
 */
export function encodeToMp3(blob, options) {
  const settings = options || {};
  const inputName = `${INPUT_NAME}.${extensionOf(blob)}`;

  return getFFmpeg(settings.baseUrl).then((ffmpeg) =>
    blob
      .arrayBuffer()
      .then((buffer) => ffmpeg.writeFile(inputName, new Uint8Array(buffer)))
      .then(() => ffmpeg.exec(['-i', inputName].concat(ENCODE_ARGS, OUTPUT_NAME)))
      .then(() => ffmpeg.readFile(OUTPUT_NAME))
      .then((data) => {
        // Временные файлы живут в памяти воркера: без уборки каждая запись
        // отъедает ещё столько же.
        const cleanup = Promise.all([
          ffmpeg.deleteFile(inputName),
          ffmpeg.deleteFile(OUTPUT_NAME),
        ]).catch(() => null);

        return cleanup.then(() => new Blob([data], { type: 'audio/mpeg' }));
      }),
  );
}

/** Только для тестов: забыть загруженный инстанс. */
export function resetFFmpeg() {
  pending = null;
}

export default encodeToMp3;
