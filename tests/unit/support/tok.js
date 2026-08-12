/**
 * Общие помощники тестов Тока.
 *
 * Файл лежит в `tests/unit/support/`, а не рядом со спеками: `testMatch` подхватывает
 * только `*.spec.js`, поэтому помощник не станет пустым тестовым набором.
 */
import { createLocalVue, mount } from '@vue/test-utils';

import TokPanel from '@/tok/components/TokPanel.vue';
import { createTokConfig } from '@/tok/config';
import { createTokStore } from '@/tok/store';
import { normalizeResponse } from '@/tok/api/contract';

/** Даём отработать микрозадачам и очереди перерисовки Vue. */
export function flush() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Клиент ассистента с ручным управлением: ответ отдаётся тогда, когда нужно тесту. */
export function createControlledApi() {
  const calls = [];
  let resolveCurrent = null;
  let rejectCurrent = null;

  return {
    calls,

    sendMessage(request) {
      calls.push(request);
      return new Promise((resolve, reject) => {
        resolveCurrent = (raw) => resolve(normalizeResponse(raw));
        rejectCurrent = reject;
      });
    },

    cancel: jest.fn(),
    isCancelError: () => false,

    respond(raw) {
      resolveCurrent(raw);
      return flush();
    },

    fail(error) {
      rejectCurrent(error);
      return flush();
    },
  };
}

/** Клиент, который отвечает готовым телом сразу же. */
export function createInstantApi(response) {
  return {
    sendMessage: jest.fn(() => Promise.resolve(normalizeResponse(response))),
    cancel: jest.fn(),
    isCancelError: () => false,
  };
}

/**
 * Точка монтирования панели.
 *
 * Панель монтируется **в документ**, а не в воздух: amCharts следит за тем, что его
 * контейнер жив, и на графике в оторванном от документа поддереве честно ругается
 * «Chart was not disposed» — уже в следующем тесте, потому что проверка идёт по
 * `requestAnimationFrame`.
 *
 * Именно дочерний div, а не `document.body`: @vue/test-utils 1.0.3 **заменяет**
 * элемент из `attachTo`.
 */
function createHost() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

export function mountPanel(options) {
  const settings = options || {};
  const api = settings.api || createInstantApi({});
  const store = settings.store || createTokStore({ api });

  const wrapper = mount(TokPanel, {
    localVue: createLocalVue(),
    propsData: {
      open: settings.open !== false,
      config: createTokConfig({ mockDelayMs: 0, ...(settings.config || {}) }),
    },
    provide: { tokStore: store, tokVoice: settings.voice || null },
    attachTo: settings.attachTo || createHost(),
  });

  wrapper.tokStore = store;
  wrapper.tokApi = api;

  return wrapper;
}

/**
 * Голосовой конвейер целиком из заглушек: поддельный микрофон, поддельный
 * кодировщик, поддельная расшифровка. Позволяет пройти сценарий без разрешения
 * на микрофон и без 31 МБ wasm.
 */
export function createFakeVoice(options) {
  const settings = options || {};
  const calls = { started: 0, encoded: 0, transcribed: 0, cancelled: 0 };

  const recorder = {
    start: jest.fn(() => {
      calls.started += 1;
      return settings.startError ? Promise.reject(settings.startError) : Promise.resolve(true);
    }),
    stop: jest.fn(() => {
      if (settings.stopError) return Promise.reject(settings.stopError);
      return Promise.resolve(new Blob(['звук'], { type: 'audio/webm' }));
    }),
    cancel: jest.fn(() => {
      calls.cancelled += 1;
    }),
    isRecording: () => true,
  };

  return {
    calls,
    recorder,
    encode: jest.fn((blob) => {
      calls.encoded += 1;
      return Promise.resolve(new Blob([blob], { type: 'audio/mpeg' }));
    }),
    transcription: {
      transcribe: jest.fn(() => {
        calls.transcribed += 1;
        if (settings.transcribeError) return Promise.reject(settings.transcribeError);
        return Promise.resolve('text' in settings ? settings.text : 'Какой у меня тариф');
      }),
      cancel: jest.fn(),
      isCancelError: () => false,
    },
  };
}
