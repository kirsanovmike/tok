/**
 * Фаза 9 — голосовой ввод.
 *
 * Сценарий целиком проходится на заглушках: микрофон, ffmpeg и эндпоинт расшифровки
 * подменены. Иначе тест требовал бы разрешения на микрофон и 31 МБ wasm.
 *
 * **Не проверено и не может быть проверено здесь:** реальный эндпоинт
 * `llm-prod.tne.tn.corp:9000` из среды разработки недоступен. Проверяется форма
 * запроса, а не то, что сервер её принял.
 */
import axios from 'axios';

import {
  createHttpTranscriptionClient,
  normalizeTranscript,
  TRANSCRIBE_FIELD,
  TRANSCRIBE_FILENAME,
} from '@/tok/api/transcribe';
import { createMockTranscriptionClient, DEFAULT_MOCK_TRANSCRIPT } from '@/tok/api/mock/transcribe';
import { createTranscriptionApi } from '@/tok/api';
import { createTokConfig } from '@/tok/config';
import { createVoiceSession, VOICE_STATE } from '@/tok/voice/session';
import {
  createRecorder,
  describeVoiceError,
  isVoiceSupported,
  VOICE_ERROR,
} from '@/tok/voice/recorder';
import { DEFAULT_FFMPEG_BASE_URL, encodeToMp3, resetFFmpeg } from '@/tok/voice/encodeToMp3';
import { createControlledApi, createFakeVoice, flush, mountPanel } from './support/tok';

jest.mock('axios');

function composerOf(wrapper) {
  return wrapper.find('.tok-composer');
}

describe('голосовой ввод', () => {
  describe('запись', () => {
    afterEach(() => {
      delete window.MediaRecorder;
      delete window.navigator.mediaDevices;
    });

    function fakeMedia({ stopTracks }) {
      const track = { stop: jest.fn(() => stopTracks && stopTracks()) };

      Object.defineProperty(window.navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [track] })) },
        configurable: true,
      });

      window.MediaRecorder = function MediaRecorderStub() {
        this.state = 'recording';
        this.mimeType = 'audio/webm;codecs=opus';
        this.start = jest.fn();
        this.stop = jest.fn(() => {
          this.state = 'inactive';
          this.ondataavailable({ data: new Blob(['звук'], { type: this.mimeType }) });
          this.onstop();
        });
      };
      window.MediaRecorder.isTypeSupported = () => true;

      return { track };
    }

    it('без MediaRecorder голос честно объявляется неподдержанным', () => {
      expect(isVoiceSupported()).toBe(false);
    });

    it('пишет и отдаёт blob, а микрофон после остановки отпускает', async () => {
      const { track } = fakeMedia({});
      const recorder = createRecorder();

      await recorder.start();
      expect(recorder.isRecording()).toBe(true);

      const blob = await recorder.stop();

      expect(blob.size).toBeGreaterThan(0);
      // Трек остановлен — иначе в браузере остаётся гореть индикатор записи.
      expect(track.stop).toHaveBeenCalled();
    });

    it('отмена отпускает микрофон и ничего не возвращает', async () => {
      const { track } = fakeMedia({});
      const recorder = createRecorder();

      await recorder.start();
      recorder.cancel();

      expect(track.stop).toHaveBeenCalled();
      expect(recorder.isRecording()).toBe(false);
    });

    it('отказ в доступе к микрофону отличается от отсутствия устройства', async () => {
      Object.defineProperty(window.navigator, 'mediaDevices', {
        value: {
          getUserMedia: jest.fn(() => {
            const error = new Error('denied');
            error.name = 'NotAllowedError';
            return Promise.reject(error);
          }),
        },
        configurable: true,
      });
      window.MediaRecorder = function MediaRecorderStub() {};

      const denied = await createRecorder()
        .start()
        .catch((error) => error);

      expect(denied.voiceCode).toBe(VOICE_ERROR.DENIED);
      expect(describeVoiceError(denied)).toContain('Разрешите его в настройках браузера');
    });
  });

  describe('кодирование в MP3', () => {
    afterEach(() => {
      resetFFmpeg();
      delete window.FFmpegWASM;
      document.querySelectorAll('[data-tok-ffmpeg]').forEach((node) => node.remove());
    });

    function fakeFFmpeg() {
      const ffmpeg = {
        load: jest.fn(() => Promise.resolve()),
        writeFile: jest.fn(() => Promise.resolve()),
        exec: jest.fn(() => Promise.resolve(0)),
        readFile: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
        deleteFile: jest.fn(() => Promise.resolve()),
      };

      // Скрипт «загружается» синхронно: в jsdom событие onload у <script> не наступает.
      const observer = new MutationObserver(() => {
        document.querySelectorAll('[data-tok-ffmpeg]').forEach((node) => {
          window.FFmpegWASM = {
            FFmpeg: function FFmpeg() {
              return ffmpeg;
            },
          };
          if (node.onload) node.onload();
        });
      });
      observer.observe(document.head, { childList: true });

      return { ffmpeg, observer };
    }

    it('загружает ядро лениво, из public/, и отдаёт MP3', async () => {
      const { ffmpeg, observer } = fakeFFmpeg();

      // До первой записи не загружено ничего.
      expect(document.querySelectorAll('[data-tok-ffmpeg]')).toHaveLength(0);

      const blob = new Blob(['звук'], { type: 'audio/webm;codecs=opus' });
      blob.arrayBuffer = () => Promise.resolve(new ArrayBuffer(4));

      const mp3 = await encodeToMp3(blob);
      observer.disconnect();

      expect(document.querySelector('[data-tok-ffmpeg]').src).toContain(
        `${DEFAULT_FFMPEG_BASE_URL}/ffmpeg.js`,
      );
      expect(ffmpeg.load).toHaveBeenCalledWith({
        coreURL: `${DEFAULT_FFMPEG_BASE_URL}/ffmpeg-core.js`,
        wasmURL: `${DEFAULT_FFMPEG_BASE_URL}/ffmpeg-core.wasm`,
      });
      expect(mp3.type).toBe('audio/mpeg');

      // Речь, а не музыка: моно, 16 кГц. И на выходе именно mp3.
      const args = ffmpeg.exec.mock.calls[0][0];
      expect(args).toContain('-ac');
      expect(args[args.indexOf('-ac') + 1]).toBe('1');
      expect(args[args.length - 1]).toMatch(/\.mp3$/);
      // Временные файлы убираются: иначе каждая запись отъедает память воркера.
      expect(ffmpeg.deleteFile).toHaveBeenCalledTimes(2);
    });

    it('ядро загружается один раз на страницу', async () => {
      const { ffmpeg, observer } = fakeFFmpeg();

      const blob = new Blob(['звук'], { type: 'audio/webm' });
      blob.arrayBuffer = () => Promise.resolve(new ArrayBuffer(4));

      await encodeToMp3(blob);
      await encodeToMp3(blob);
      observer.disconnect();

      expect(ffmpeg.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('отправка на расшифровку', () => {
    it('формирует multipart с полем file и именем voice.mp3', async () => {
      const post = jest.fn(() => Promise.resolve({ data: { text: 'Какой у меня тариф' } }));
      axios.post = post;
      axios.CancelToken = { source: () => ({ token: 'token', cancel: jest.fn() }) };

      const config = createTokConfig({
        transcribeUrl: 'https://llm.example/transcribe',
        getAuthToken: () => 'jwt-от-хоста',
      });
      const client = createHttpTranscriptionClient(config);

      const text = await client.transcribe(new Blob(['mp3'], { type: 'audio/mpeg' }));

      const [url, form, options] = post.mock.calls[0];
      expect(url).toBe('https://llm.example/transcribe');
      expect(form).toBeInstanceOf(FormData);
      expect(form.get(TRANSCRIBE_FIELD).name).toBe(TRANSCRIBE_FILENAME);
      // Токен приходит из провайдера хоста; в исходниках его нет.
      expect(options.headers.Authorization).toBe('Bearer jwt-от-хоста');
      // Content-Type с boundary проставляет браузер — руками его задавать нельзя.
      expect(options.headers['Content-Type']).toBeUndefined();
      expect(text).toBe('Какой у меня тариф');
    });

    it('без провайдера токена заголовка авторизации нет', async () => {
      axios.post = jest.fn(() => Promise.resolve({ data: { text: '' } }));
      axios.CancelToken = { source: () => ({ token: 'token', cancel: jest.fn() }) };

      const client = createHttpTranscriptionClient(
        createTokConfig({ transcribeUrl: 'https://llm.example/transcribe' }),
      );
      await client.transcribe(new Blob(['mp3']));

      expect(axios.post.mock.calls[0][2].headers.Authorization).toBeUndefined();
    });

    it('ответ приводится к строке: и `{text}`, и мусор', () => {
      expect(normalizeTranscript({ text: 'ок' })).toBe('ок');
      expect(normalizeTranscript({ text: '' })).toBe('');
      expect(normalizeTranscript(null)).toBe('');
      expect(normalizeTranscript({ nothing: 1 })).toBe('');
    });

    it('без адреса эндпоинта включается мок, с адресом — транспорт', () => {
      expect(createTokConfig({}).useTranscriptionMock).toBe(true);
      expect(createTokConfig({ transcribeUrl: 'https://llm.example/x' }).useTranscriptionMock).toBe(
        false,
      );

      const mocked = createTranscriptionApi(createTokConfig({ mockDelayMs: 0 }));
      return expect(mocked.transcribe(new Blob([]))).resolves.toBe(DEFAULT_MOCK_TRANSCRIPT);
    });

    it('мок умеет воспроизвести пустой ответ {"text": ""}', async () => {
      const client = createMockTranscriptionClient(
        createTokConfig({ mockDelayMs: 0, mockTranscript: '' }),
      );

      await expect(client.transcribe(new Blob([]))).resolves.toBe('');
    });
  });

  describe('сессия', () => {
    it('проходит цепочку запись → кодирование → расшифровка', async () => {
      const voice = createFakeVoice();
      const states = [];
      const session = createVoiceSession(voice);

      await session.start();
      const text = await session.stop((state) => states.push(state));

      expect(states).toEqual([VOICE_STATE.PROCESSING]);
      expect(voice.calls).toMatchObject({ encoded: 1, transcribed: 1 });
      expect(text).toBe('Какой у меня тариф');
    });

    it('отмена во время кодирования не отправляет на сервер ничего', async () => {
      const voice = createFakeVoice();
      const session = createVoiceSession(voice);

      await session.start();
      const pending = session.stop(() => session.cancel());

      await expect(pending).resolves.toBe('');
      expect(voice.transcription.transcribe).not.toHaveBeenCalled();
    });

    it('пустая расшифровка — это ошибка «ничего не расслышал», а не пустой ввод', async () => {
      const session = createVoiceSession(createFakeVoice({ text: '   ' }));

      await session.start();
      const error = await session.stop().catch((reason) => reason);

      expect(error.voiceCode).toBe(VOICE_ERROR.EMPTY);
    });
  });

  describe('композер', () => {
    function setup(voiceOptions) {
      const api = createControlledApi();
      const voice = createFakeVoice(voiceOptions);
      const wrapper = mountPanel({ api, voice });

      return { api, voice, wrapper };
    }

    it('состояние записи: отмена, таймер и остановка вместо строки ввода', async () => {
      const { wrapper } = setup();

      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      expect(composerOf(wrapper).find('.tok-composer__input').exists()).toBe(false);
      expect(wrapper.find('.tok-composer__voice-cancel').exists()).toBe(true);
      expect(wrapper.find('.tok-composer__voice-stop').exists()).toBe(true);
      expect(wrapper.find('.tok-composer__voice-status').text()).toContain('Идёт запись');
      expect(wrapper.find('.tok-composer__voice-status').text()).toContain('0:00');

      wrapper.destroy();
    });

    it('запись → остановка → текст появился в поле ввода', async () => {
      const { wrapper, voice } = setup();

      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      wrapper.find('.tok-composer__voice-stop').trigger('click');
      await flush();

      expect(voice.calls.transcribed).toBe(1);
      expect(wrapper.find('.tok-composer__input').element.value).toBe('Какой у меня тариф');
      // Расшифровка попадает в поле, но не отправляется: последнее слово за человеком.
      expect(wrapper.tokApi.calls).toHaveLength(0);

      wrapper.destroy();
    });

    it('отмена записи не отправляет на сервер ничего и возвращает строку ввода', async () => {
      const { wrapper, voice } = setup();

      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      wrapper.find('.tok-composer__voice-cancel').trigger('click');
      await flush();

      expect(voice.calls.cancelled).toBe(1);
      expect(voice.transcription.transcribe).not.toHaveBeenCalled();
      expect(wrapper.find('.tok-composer__input').exists()).toBe(true);
      expect(wrapper.find('.tok-composer__voice-status').exists()).toBe(false);

      wrapper.destroy();
    });

    it('отказ в доступе показывает подсказку и не оставляет интерфейс в записи', async () => {
      const denied = new Error('нет доступа');
      denied.voiceCode = VOICE_ERROR.DENIED;
      denied.message = 'Нет доступа к микрофону. Разрешите его в настройках браузера.';

      const { wrapper } = setup({ startError: denied });

      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      expect(wrapper.find('.tok-composer__notice--error').text()).toContain(
        'Нет доступа к микрофону',
      );
      expect(wrapper.find('.tok-composer__voice-status').exists()).toBe(false);
      expect(wrapper.find('.tok-composer__input').exists()).toBe(true);

      wrapper.destroy();
    });

    it('пустая расшифровка объясняется, а поле ввода остаётся прежним', async () => {
      const { wrapper } = setup({ text: '' });

      wrapper.find('.tok-composer__input').setValue('уже набрано');
      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      wrapper.find('.tok-composer__voice-stop').trigger('click');
      await flush();

      expect(wrapper.find('.tok-composer__notice--error').text()).toContain('Ничего не расслышал');
      expect(wrapper.find('.tok-composer__input').element.value).toBe('уже набрано');

      wrapper.destroy();
    });

    it('закрытие панели во время записи гасит микрофон', async () => {
      const { wrapper, voice } = setup();

      wrapper.find('.tok-composer__mic').trigger('click');
      await flush();

      wrapper.destroy();

      expect(voice.recorder.cancel).toHaveBeenCalled();
    });
  });
});
