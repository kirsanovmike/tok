/**
 * Публичный вход переносимой папки `src/Tok/`.
 *
 * Хост подключает Ток **одним импортом**: `import Tok from '<путь>/Tok';`
 * и `<Tok />` в разметке лейаута. Плагина установки нет — `portal-vue`
 * зарегистрирован локально в `Tok.vue` (ADR-0009).
 *
 * Цвета приходят переменными `--v-tok-*`, которые объявляет хост: в Трансфере —
 * `@tne-ui/core`, на стенде — сам стенд из палитры Vuetify. Ток их только читает
 * и своего механизма темы не имеет: тему переключает Vuetify (ADR-0010).
 *
 * Всё, что различается между стендом и Трансферой, передаётся пропом `config`
 * (см. `services/config.js`). Собственный стор Ток создаёт сам — стор хоста не трогает.
 */
import Tok from './Tok.vue';
import tokChartTokens from './theme/tokens';

// `TokApp` — прежнее имя корневого компонента. Алиас стоит одной строки, а код
// хоста, написанный до переезда в библиотечную раскладку, продолжает работать.
//
// `tokChartTokens` — запасные цвета для amCharts (`theme/tokens.js`). Хосту они
// нужны, только если он рисует свои графики в той же палитре.
export { Tok, Tok as TokApp, tokChartTokens };
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

// Импорт по умолчанию отдаёт сам компонент: так его кладут в лейаут.
export default Tok;
