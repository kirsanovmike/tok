/**
 * Публичный вход переносимой папки `src/tok/`.
 *
 * Хост подключает Ток двумя действиями:
 *   1. `installTok(Vue)` — регистрирует внешние плагины, нужные Току;
 *   2. вставляет `<TokApp />` в корневой компонент приложения;
 *   3. вливает `tokThemeTokens` в палитры Vuetify (см. README.md).
 *
 * Всё, что различается между стендом и Трансферой, передаётся пропом `config`
 * (см. `src/tok/config.js`). Собственный стор Ток создаёт сам — стор хоста не трогает.
 */
import PortalVue from 'portal-vue';

import TokApp from './TokApp.vue';
import tokThemeTokens from './theme/tokens';

// Собственного флага «уже установлено» здесь нет намеренно: `Vue.use` сам по себе
// идемпотентен в пределах одного конструктора, а модульный флаг ломал бы установку
// во второй конструктор (например, в `createLocalVue()` соседнего теста).
export function installTok(Vue) {
  Vue.use(PortalVue);
}

export { TokApp, tokThemeTokens };
export { createTokConfig, DEFAULT_CONFIG } from './config';
export {
  REPLY_KIND,
  WORKFLOW_STATUS,
  CONTENT_TYPE,
  MESSAGE_AUTHOR,
  REPLY_KINDS,
  WORKFLOW_STATUSES,
  CONTENT_TYPES,
} from './api/contract';

export default { installTok, TokApp, tokThemeTokens };
