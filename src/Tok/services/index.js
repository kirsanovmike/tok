/**
 * Витрина сервисов Тока: всё, чем пользуются компоненты папки.
 *
 * Родительский компонент импортирует отсюда, а не из глубины (`./api/mock/fixtures`
 * и подобного): так внутреннюю раскладку `services/` можно менять, не трогая ни
 * одного SFC. Наружу папки этот файл не экспортируется — публичный вход один,
 * `../index.js`.
 *
 * Чего здесь намеренно нет — `contentRegistry`: он импортирует SFC, и компонент,
 * потянувший его через витрину, получил бы цикл. Реестр нужен одному
 * `TokContents.vue`, и тот берёт его напрямую.
 *
 * Дочерние компоненты (`../SubComponents/`) импортируют точечно — `../services/utils/format`
 * и подобное: лист ленты не должен тянуть за собой ни транспорт, ни голосовой конвейер.
 */

// Конфигурация
export { createTokConfig, DEFAULT_CONFIG, readFixtureIdFromLocation } from './config';

// Транспорт и контракт
export { createAssistantApi, createTranscriptionApi } from './api';
export {
  REPLY_KIND,
  WORKFLOW_STATUS,
  CONTENT_TYPE,
  MESSAGE_AUTHOR,
  isKnownContentType,
} from './api/contract';
export { describeError } from './api/errors';

// Состояние
export { createTokStore, createConversationStorage, TOK_STORE_KEY, CONVERSATION } from './store';
export { default as tokStoreMixin } from './tokStore';

// Голос
export { encodeToMp3 } from './voice/encodeToMp3';
export { createVoiceSession, VOICE_STATE } from './voice/session';
