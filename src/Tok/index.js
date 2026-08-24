/**
 * Публичный вход переносимой папки `src/Tok/`.
 *
 * Хост подключает Ток двумя действиями:
 *   1. `installTok(Vue)` — регистрирует внешние плагины, нужные Току;
 *   2. вставляет `<Tok />` в корневой компонент приложения;
 *   3. вливает `tokThemeTokens` в палитры Vuetify (см. README.md).
 *
 * Всё, что различается между стендом и Трансферой, передаётся пропом `config`
 * (см. `services/config.js`). Собственный стор Ток создаёт сам — стор хоста не трогает.
 */
import PortalVue from 'portal-vue';

import Tok from './Tok.vue';
import tokThemeTokens from './theme/tokens';

// Собственного флага «уже установлено» здесь нет намеренно: `Vue.use` сам по себе
// идемпотентен в пределах одного конструктора, а модульный флаг ломал бы установку
// во второй конструктор (например, в `createLocalVue()` соседнего теста).
export function installTok(Vue) {
  Vue.use(PortalVue);
}

// `TokApp` — прежнее имя корневого компонента. Алиас стоит одной строки, а код
// хоста, написанный до переезда в библиотечную раскладку, продолжает работать.
export { Tok, Tok as TokApp, tokThemeTokens };
export { applyTokTheme, tokThemeCssVars, hasHostTokTheme } from './theme/applyTokTheme';
export { createTokConfig, DEFAULT_CONFIG } from './services/config';
export {
  REPLY_KIND,
  WORKFLOW_STATUS,
  CONTENT_TYPE,
  MESSAGE_AUTHOR,
  REPLY_KINDS,
  WORKFLOW_STATUSES,
  CONTENT_TYPES,
} from './services/api/contract';

export default { installTok, Tok, TokApp: Tok, tokThemeTokens };
